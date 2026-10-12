import type {
  Experiment, ExperimentSource, Replication, ReplicationStatus,
  Chapter, ChapterDetail, ChapterKind, ChapterLink, ChapterMeta, Confidence, Content, ContentIndex, KeyConcept, KeyStudy, SimulationIdea,
} from './types.ts';
import { t } from '../i18n/t.ts';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strList = (v: unknown): string[] => arr(v).map(str).filter((s) => s.trim() !== '');

/** "ch2" -> "ch02" (eski taslak). Diğer kimlikler olduğu gibi (küçük harfle) kalır. */
export function normalizeId(id: unknown): string {
  const s = str(id).trim().toLowerCase();
  const m = /^ch0*(\d+)$/.exec(s);
  if (m) return 'ch' + m[1].padStart(2, '0');
  const a = /^app0*(\d+)$/.exec(s);
  if (a) return 'app' + a[1];
  return s;
}

function inferKind(id: string): ChapterKind {
  if (id === 'intro') return 'intro';
  if (id === 'epilogue') return 'epilogue';
  if (id.startsWith('app')) return 'appendix';
  return 'chapter';
}

const KINDS: ChapterKind[] = ['intro', 'chapter', 'epilogue', 'appendix'];
const CONF: Confidence[] = ['yüksek', 'orta', 'düşük'];

function concepts(v: unknown): KeyConcept[] {
  return arr(v).flatMap((c): KeyConcept[] => {
    if (typeof c === 'string') return c.trim() ? [{ term: c, explanation: '' }] : [];
    if (!isObj(c)) return [];
    const term = str(c.term);
    return term ? [{ term, explanation: str(c.explanation) }] : [];
  });
}
function studies(v: unknown): KeyStudy[] {
  return arr(v).flatMap((c): KeyStudy[] => {
    if (typeof c === 'string') return c.trim() ? [{ name: c, finding: '' }] : [];
    if (!isObj(c)) return [];
    const name = str(c.name);
    return name ? [{ name, finding: str(c.finding) }] : [];
  });
}
const REPL: ReplicationStatus[] = ['sağlam', 'karışık', 'tartışmalı', 'bilinmiyor'];
/** Sayı ya da sayıya çevrilebilen dize ("12", " 60 "); aksi halde null. */
const numOrNull = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};
/** "https://doi.org/10.1/x", "doi:10.1/x" ya da düz "10.1/x" -> "10.1/x". */
export function cleanDoi(v: unknown): string | null {
  const s = strOrNull(v);
  if (!s) return null;
  return s.trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, '').trim() || null;
}
/** Geliştirme sırasında atılan kayıtları görünür kılar; üretimde sessiz. */
const warn = (msg: string): void => { if (import.meta.env?.DEV) console.warn('[içerik] ' + msg); };
function experiments(v: unknown, chapterId: string): Experiment[] {
  const used = new Set<string>();
  return arr(v).flatMap((c, i): Experiment[] => {
    if (!isObj(c)) return [];
    const name = str(c.name);
    if (!name) { warn(`${chapterId}: adı olmayan deney atıldı (#${i + 1})`); return []; }
    const sources = arr(c.sources).flatMap((s): ExperimentSource[] => {
      if (typeof s === 'string') return s.trim() ? [{ citation: s, journal: null, year: null, doi: null, url: null }] : [];
      if (!isObj(s)) return [];
      return [{ citation: str(s.citation), journal: strOrNull(s.journal), year: numOrNull(s.year), doi: cleanDoi(s.doi), url: strOrNull(s.url) }];
    });
    let replication: Replication | null = null;
    if (isObj(c.replication)) {
      const raw = str(c.replication.status).trim().toLocaleLowerCase('tr') as ReplicationStatus;
      const st = REPL.includes(raw) ? raw : 'bilinmiyor';
      replication = { status: st, note: str(c.replication.note), refs: strList(c.replication.refs) };
    }
    // Kimlik çakışırsa -2, -3 ... eklenir (sayfada tekrarlanan id olmasın).
    const base = str(c.id).trim() || `${chapterId}-e${i + 1}`;
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    return [{
      id, name, researchers: str(c.researchers), year: numOrNull(c.year),
      question: str(c.question), method: str(c.method), finding: str(c.finding), roleInChapter: str(c.roleInChapter),
      sources, caveats: strOrNull(c.caveats), replication, simulatable: c.simulatable === true,
    }];
  });
}
function ideas(v: unknown): SimulationIdea[] {
  return arr(v).flatMap((c): SimulationIdea[] => {
    if (!isObj(c)) return [];
    const title = str(c.title);
    return title ? [{ title, shows: str(c.shows), inputs: strList(c.inputs), outputs: strList(c.outputs) }] : [];
  });
}
function links(v: unknown): ChapterLink[] {
  return arr(v).flatMap((c): ChapterLink[] => {
    if (!isObj(c)) return [];
    const to = normalizeId(c.to);
    return to ? [{ to, why: str(c.why) }] : [];
  });
}

export function normalizeMeta(raw: unknown): ChapterMeta | null {
  if (!isObj(raw)) return null;
  const id = normalizeId(raw.id);
  if (!id) return null;
  const kind = KINDS.includes(raw.kind as ChapterKind) ? (raw.kind as ChapterKind) : inferKind(id);
  const secs = numOrNull(raw.timescaleSeconds);
  return {
    id,
    kind,
    number: numOrNull(raw.number),
    titleEn: str(raw.titleEn),
    titleTr: str(raw.titleTr) || str(raw.titleEn) || id,
    timescale: strOrNull(raw.timescale),
    timescaleSeconds: secs != null && secs > 0 ? secs : null,
    confidence: CONF.includes(raw.confidence as Confidence) ? (raw.confidence as Confidence) : null,
  };
}

/** Bölüm ayrıntısı; ham değer yoksa ya da bozuksa boş ayrıntı. */
export function normalizeDetail(raw: unknown, chapterId: string): ChapterDetail {
  const r = isObj(raw) ? raw : {};
  return {
    summary: str(r.summary),
    keyConcepts: concepts(r.keyConcepts),
    keyStudies: studies(r.keyStudies),
    experiments: experiments(r.experiments, chapterId),
    simulationIdeas: ideas(r.simulationIdeas),
    links: links(r.links),
    verifyNotes: strList(r.verifyNotes),
  };
}

export function normalizeChapter(raw: unknown): Chapter | null {
  const meta = normalizeMeta(raw);
  return meta ? { ...meta, ...normalizeDetail(raw, meta.id) } : null;
}

function normalizeBook(root: Obj): Content['book'] {
  const b = isObj(root.book) ? root.book : {};
  return {
    titleEn: str(b.titleEn) || 'Behave',
    titleTr: str(b.titleTr) || 'Davranış',
    author: str(b.author) || 'Robert M. Sapolsky',
    year: numOrNull(b.year),
  };
}

/** Yinelenen kimlikli ya da kimliksiz kayıtları atar (ilki kazanır). */
function dedupe<T extends { id: string }>(items: Array<T | null>): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const c of items) {
    if (!c) { warn('kimliği olmayan ya da geçersiz bölüm atıldı'); continue; }
    if (seen.has(c.id)) { warn(`yinelenen bölüm kimliği atıldı: ${c.id}`); continue; }
    seen.add(c.id); out.push(c);
  }
  return out;
}

/** Yalnızca üst veri (ana sayfa/gezinti). Ayrıntı alanları yok sayılır. */
export function normalizeIndex(raw: unknown): ContentIndex {
  const root = isObj(raw) ? raw : {};
  return { book: normalizeBook(root), chapters: dedupe(arr(root.chapters).map(normalizeMeta)) };
}

/** Eski taslak, yeni sürüm ya da kısmen bozuk veri: çökmeden Content üretir. */
export function normalizeContent(raw: unknown): Content {
  const root = isObj(raw) ? raw : {};
  return { book: normalizeBook(root), chapters: dedupe(arr(root.chapters).map(normalizeChapter)) };
}

export const chapterLabel = (c: Pick<Chapter, 'kind' | 'number'>): string => {
  switch (c.kind) {
    case 'intro': return t('label.intro');
    case 'epilogue': return t('label.epilogue');
    case 'appendix': return c.number != null ? t('label.appendixN', { n: c.number }) : t('label.appendix');
    default: return c.number != null ? t('label.chapterN', { n: c.number }) : t('label.chapter');
  }
};

export const CONF_DOTS = { 'yüksek': '●●●', 'orta': '●●○', 'düşük': '●○○' } as const;
