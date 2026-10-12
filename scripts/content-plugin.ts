// content/chapters.json tek kaynaktır. Bu eklenti onu derleme (ve geliştirme) sırasında bölerek
// sanal modüller üretir; böylece ana sayfa yalnızca küçük bir özet alır, bölüm ayrıntısı
// (özet metin, kavramlar, deneyler...) bölüm başına ayrı bir parçada (chunk) ve gerektiğinde yüklenir.
//
//   virtual:behave-index     -> { book, chapters: [üst veri] }        (ana paketle birlikte gelir)
//   virtual:behave-chapters  -> { [bölümId]: () => import(ayrıntı) }  (yükleyici tablosu)
//   virtual:behave-chapter/X -> bölüm X'in ayrıntısı                  (dinamik import ile ayrı parça)
//
// İngilizce: content/en/<bölümId>.json yalnızca çevrilen alanları taşır (bkz. src/content/overlay.ts).
//   virtual:behave-index/en, virtual:behave-chapters/en, virtual:behave-chapter-en/X  -> aynı biçim, İngilizce birleştirilmiş
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { normalizeId } from '../src/content/normalize.ts';
import { englishBook, englishMeta, mergeDetail, type ChapterOverlay } from '../src/content/overlay.ts';

const FILE = fileURLToPath(new URL('../content/chapters.json', import.meta.url));
const EN_DIR = fileURLToPath(new URL('../content/en/', import.meta.url));
const INDEX = 'virtual:behave-index';
const LOADERS = 'virtual:behave-chapters';
const CHAPTER = 'virtual:behave-chapter/';
const INDEX_EN = 'virtual:behave-index/en';
const LOADERS_EN = 'virtual:behave-chapters/en';
const CHAPTER_EN = 'virtual:behave-chapter-en/';
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

function overlayFiles(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort().map((f) => dir + f) : [];
}

/** content/en/*.json -> { bölümId: katman }. Klasör yoksa boş (İngilizce Türkçe'ye düşer). */
export function readOverlays(dir: string = EN_DIR): Map<string, ChapterOverlay> {
  const out = new Map<string, ChapterOverlay>();
  for (const f of overlayFiles(dir)) out.set(normalizeId(f.slice(dir.length, -5)), JSON.parse(readFileSync(f, 'utf8')) as ChapterOverlay);
  return out;
}

const mod = (v: unknown) => `export default ${JSON.stringify(v)};\n`;

export function contentPlugin(file: string = FILE, enDir: string = EN_DIR): Plugin {
  let cache: SplitContent | null = null;
  let overlays: Map<string, ChapterOverlay> | null = null;
  const data = (): SplitContent => (cache ??= splitContent(JSON.parse(readFileSync(file, 'utf8'))));
  const en = (): Map<string, ChapterOverlay> => (overlays ??= readOverlays(enDir));
  const ids = [INDEX, LOADERS, INDEX_EN, LOADERS_EN];
  const isChapter = (n: string) => n.startsWith(CHAPTER) || n.startsWith(CHAPTER_EN);
  return {
    name: 'behave-content',
    resolveId(id) {
      if (ids.includes(id) || isChapter(id)) return '\0' + id;
      return null;
    },
    load(id) {
      if (!id.startsWith('\0')) return null;
      const name = id.slice(1);
      if (!ids.includes(name) && !isChapter(name)) return null;
      this.addWatchFile(file);
      const d = data();
      if (name === INDEX) return mod({ book: d.book, chapters: d.meta });
      if (name === INDEX_EN) {
        for (const f of overlayFiles(enDir)) this.addWatchFile(f);
        return mod({ book: englishBook(d.book), chapters: d.meta.map((m) => englishMeta(m, en().get(String(m.id)))) });
      }
      if (name === LOADERS || name === LOADERS_EN) {
        const pre = name === LOADERS ? CHAPTER : CHAPTER_EN;
        const rows = [...d.details.keys()].map((k) => `  ${JSON.stringify(k)}: () => import(${JSON.stringify(pre + k)}),`);
        return `export default {\n${rows.join('\n')}\n};\n`;
      }
      const isEn = name.startsWith(CHAPTER_EN);
      const cid = name.slice((isEn ? CHAPTER_EN : CHAPTER).length);
      const detail = d.details.get(cid);
      if (!detail) this.error(`Bölüm bulunamadı: ${name}`);
      return mod(isEn ? mergeDetail(detail, en().get(cid)) : detail);
    },
    handleHotUpdate({ file: f, server }) {
      if (f !== file && !f.startsWith(enDir)) return;
      cache = null; overlays = null;
      for (const m of server.moduleGraph.idToModuleMap.values()) {
        if (m.id?.startsWith('\0virtual:behave-')) server.moduleGraph.invalidateModule(m);
      }
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
