import type {
  Experiment, ExperimentSource, Replication, ReplicationStatus,
  Chapter, ChapterKind, ChapterLink, Confidence, Content, KeyConcept, KeyStudy, SimulationIdea,
} from './types';

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
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
function experiments(v: unknown, chapterId: string): Experiment[] {
  return arr(v).flatMap((c, i): Experiment[] => {
    if (!isObj(c)) return [];
    const name = str(c.name);
    if (!name) return [];
    const sources = arr(c.sources).flatMap((s): ExperimentSource[] => {
      if (typeof s === 'string') return s.trim() ? [{ citation: s, journal: null, year: null, doi: null, url: null }] : [];
      if (!isObj(s)) return [];
      return [{ citation: str(s.citation), journal: strOrNull(s.journal), year: numOrNull(s.year), doi: strOrNull(s.doi), url: strOrNull(s.url) }];
    });
    let replication: Replication | null = null;
    if (isObj(c.replication)) {
      const st = REPL.includes(c.replication.status as ReplicationStatus) ? (c.replication.status as ReplicationStatus) : 'bilinmiyor';
      replication = { status: st, note: str(c.replication.note), refs: strList(c.replication.refs) };
    }
    return [{
      id: str(c.id) || `${chapterId}-e${i + 1}`, name, researchers: str(c.researchers), year: numOrNull(c.year),
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

export function normalizeChapter(raw: unknown): Chapter | null {
  if (!isObj(raw)) return null;
  const id = normalizeId(raw.id);
  if (!id) return null;
  const kind = KINDS.includes(raw.kind as ChapterKind) ? (raw.kind as ChapterKind) : inferKind(id);
  const secs = typeof raw.timescaleSeconds === 'number' && Number.isFinite(raw.timescaleSeconds) && raw.timescaleSeconds > 0
    ? raw.timescaleSeconds : null;
  return {
    id,
    kind,
    number: typeof raw.number === 'number' && Number.isFinite(raw.number) ? raw.number : null,
    titleEn: str(raw.titleEn),
    titleTr: str(raw.titleTr) || str(raw.titleEn) || id,
    timescale: strOrNull(raw.timescale),
    timescaleSeconds: secs,
    summary: str(raw.summary),
    keyConcepts: concepts(raw.keyConcepts),
    keyStudies: studies(raw.keyStudies),
    experiments: experiments(raw.experiments, id),
    simulationIdeas: ideas(raw.simulationIdeas),
    links: links(raw.links),
    confidence: CONF.includes(raw.confidence as Confidence) ? (raw.confidence as Confidence) : null,
    verifyNotes: strList(raw.verifyNotes),
  };
}

/** Eski taslak, yeni sürüm ya da kısmen bozuk veri: çökmeden Content üretir. */
export function normalizeContent(raw: unknown): Content {
  const root = isObj(raw) ? raw : {};
  const b = isObj(root.book) ? root.book : {};
  const seen = new Set<string>();
  const chapters: Chapter[] = [];
  for (const c of arr(root.chapters)) {
    const ch = normalizeChapter(c);
    if (ch && !seen.has(ch.id)) { seen.add(ch.id); chapters.push(ch); }
  }
  return {
    book: {
      titleEn: str(b.titleEn) || 'Behave',
      titleTr: str(b.titleTr) || 'Davranış',
      author: str(b.author) || 'Robert M. Sapolsky',
      year: typeof b.year === 'number' ? b.year : null,
    },
    chapters,
  };
}

export const chapterLabel = (c: Pick<Chapter, 'kind' | 'number'>): string => {
  switch (c.kind) {
    case 'intro': return 'Giriş';
    case 'epilogue': return 'Sonsöz';
    case 'appendix': return c.number != null ? `Ek ${c.number}` : 'Ek';
    default: return c.number != null ? `Bölüm ${c.number}` : 'Bölüm';
  }
};
