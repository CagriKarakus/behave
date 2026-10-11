// content/chapters.json tek kaynaktır. Bu eklenti onu derleme (ve geliştirme) sırasında bölerek
// sanal modüller üretir; böylece ana sayfa yalnızca küçük bir özet alır, bölüm ayrıntısı
// (özet metin, kavramlar, deneyler...) bölüm başına ayrı bir parçada (chunk) ve gerektiğinde yüklenir.
//
//   virtual:behave-index     -> { book, chapters: [üst veri] }        (ana paketle birlikte gelir)
//   virtual:behave-chapters  -> { [bölümId]: () => import(ayrıntı) }  (yükleyici tablosu)
//   virtual:behave-chapter/X -> bölüm X'in ayrıntısı                  (dinamik import ile ayrı parça)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { normalizeId } from '../src/content/normalize.ts';

const FILE = fileURLToPath(new URL('../content/chapters.json', import.meta.url));
const INDEX = 'virtual:behave-index';
const LOADERS = 'virtual:behave-chapters';
const CHAPTER = 'virtual:behave-chapter/';
/** Ana sayfa ve gezinti için gereken alanlar. Gerisi bölüm ayrıntısıdır. */
export const META_KEYS = ['id', 'kind', 'number', 'titleEn', 'titleTr', 'timescale', 'timescaleSeconds', 'confidence'] as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export interface SplitContent { book: unknown; meta: Obj[]; details: Map<string, Obj> }

/** Ham içeriği özet + bölüm başına ayrıntı olarak böler. Yinelenen kimliklerde ilki kazanır (normalize ile aynı kural). */
export function splitContent(raw: unknown): SplitContent {
  const root = isObj(raw) ? raw : {};
  const meta: Obj[] = [];
  const details = new Map<string, Obj>();
  const list = Array.isArray(root.chapters) ? root.chapters : [];
  for (const c of list) {
    if (!isObj(c)) continue;
    const id = normalizeId(c.id);
    if (!id || details.has(id)) continue;
    const m: Obj = {};
    const d: Obj = {};
    for (const k of Object.keys(c)) (META_KEYS as readonly string[]).includes(k) ? (m[k] = c[k]) : (d[k] = c[k]);
    m.id = id;
    meta.push(m);
    details.set(id, d);
  }
  return { book: isObj(root.book) ? root.book : {}, meta, details };
}

const mod = (v: unknown) => `export default ${JSON.stringify(v)};\n`;

export function contentPlugin(file: string = FILE): Plugin {
  let cache: SplitContent | null = null;
  const data = (): SplitContent => (cache ??= splitContent(JSON.parse(readFileSync(file, 'utf8'))));
  const ids = [INDEX, LOADERS];
  return {
    name: 'behave-content',
    resolveId(id) {
      if (ids.includes(id) || id.startsWith(CHAPTER)) return '\0' + id;
      return null;
    },
    load(id) {
      if (!id.startsWith('\0')) return null;
      const name = id.slice(1);
      if (name !== INDEX && name !== LOADERS && !name.startsWith(CHAPTER)) return null;
      this.addWatchFile(file);
      const d = data();
      if (name === INDEX) return mod({ book: d.book, chapters: d.meta });
      if (name === LOADERS) {
        const rows = [...d.details.keys()].map((k) => `  ${JSON.stringify(k)}: () => import(${JSON.stringify(CHAPTER + k)}),`);
        return `export default {\n${rows.join('\n')}\n};\n`;
      }
      const detail = d.details.get(name.slice(CHAPTER.length));
      if (!detail) this.error(`Bölüm bulunamadı: ${name}`);
      return mod(detail);
    },
    handleHotUpdate({ file: f, server }) {
      if (f !== file) return;
      cache = null;
      for (const m of server.moduleGraph.idToModuleMap.values()) {
        if (m.id?.startsWith('\0virtual:behave-')) server.moduleGraph.invalidateModule(m);
      }
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
