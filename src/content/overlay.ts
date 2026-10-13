// İngilizce içerik katmanı (overlay). `content/en/<bölümId>.json` yalnızca çevrilen alanları taşır;
// yapı, sayılar, yıllar, DOI/URL, atıf (citation) ve replikasyon durumu Türkçe asıl kaynaktan gelir.
// Böylece iki dil arasında bilimsel veri sapması olamaz. Eksik alan Türkçe'ye düşer.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const has = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** Bir bölümün İngilizce katmanı. Dizi alanları Türkçe asıl kaynakla aynı sırada ve uzunlukta olmalıdır (testle denetlenir). */
export interface ChapterOverlay {
  /** Zaman ölçeği etiketi (ör. "One second before"); `null` Türkçe'deki gibi boş kalır. */
  timescale?: string | null;
  summary?: string;
  keyConcepts?: Array<{ term?: string; explanation?: string }>;
  keyStudies?: Array<{ name?: string; finding?: string }>;
  simulationIdeas?: Array<{ title?: string; shows?: string; inputs?: string[]; outputs?: string[] }>;
  links?: Array<{ why?: string }>;
  verifyNotes?: string[];
  /** Deney kimliği -> çevrilen alanlar. */
  experiments?: Record<string, ExperimentOverlay>;
}
export interface ExperimentOverlay {
  /** Orijinal/standart İngilizce deney adı (sözlükle tutarlı). */
  name?: string;
  researchers?: string;
  question?: string;
  method?: string;
  finding?: string;
  roleInChapter?: string;
  caveats?: string | null;
  replication?: { note?: string; refs?: string[] };
}

/** Dizi öğesini sıra numarasıyla eşleyip yalnızca dolu metin alanlarını üzerine yazar. */
function mergeList(base: unknown, over: unknown, fields: readonly string[], listFields: readonly string[] = []): unknown {
  if (!Array.isArray(base) || !Array.isArray(over)) return base;
  return base.map((b, i) => {
    const o = over[i];
    if (!isObj(b) || !isObj(o)) return b;
    const out: Obj = { ...b };
    for (const f of fields) if (has(o[f])) out[f] = o[f];
    for (const f of listFields) if (Array.isArray(o[f]) && (o[f] as unknown[]).length === (Array.isArray(b[f]) ? (b[f] as unknown[]).length : -1)) out[f] = o[f];
    return out;
  });
}

function mergeExperiment(e: Obj, o: ExperimentOverlay | undefined): Obj {
  if (!o) return e;
  const out: Obj = { ...e };
  for (const f of ['name', 'researchers', 'question', 'method', 'finding', 'roleInChapter'] as const) if (has(o[f])) out[f] = o[f];
  if (has(o.caveats)) out.caveats = o.caveats;
  if (isObj(e.replication) && o.replication) {
    const r: Obj = { ...e.replication };
    if (has(o.replication.note)) r.note = o.replication.note;
    const refs = o.replication.refs;
    if (Array.isArray(refs) && refs.length === (Array.isArray(e.replication.refs) ? e.replication.refs.length : -1)) r.refs = refs;
    out.replication = r;
  }
  return out;
}

/** Türkçe bölüm ayrıntısına (ham, normalleştirilmemiş) İngilizce katmanı uygular. */
export function mergeDetail(base: Obj, over: ChapterOverlay | undefined): Obj {
  if (!over) return base;
  const out: Obj = { ...base };
  if (has(over.summary)) out.summary = over.summary;
  out.keyConcepts = mergeList(base.keyConcepts, over.keyConcepts, ['term', 'explanation']);
  out.keyStudies = mergeList(base.keyStudies, over.keyStudies, ['name', 'finding']);
  out.simulationIdeas = mergeList(base.simulationIdeas, over.simulationIdeas, ['title', 'shows'], ['inputs', 'outputs']);
  out.links = mergeList(base.links, over.links, ['why']);
  if (Array.isArray(over.verifyNotes) && Array.isArray(base.verifyNotes) && over.verifyNotes.length === base.verifyNotes.length) out.verifyNotes = over.verifyNotes;
  if (Array.isArray(base.experiments) && over.experiments) {
    out.experiments = base.experiments.map((e) => (isObj(e) && typeof e.id === 'string' ? mergeExperiment(e, over.experiments?.[e.id]) : e));
  }
  return out;
}

/**
 * Bölüm üst verisinin İngilizce karşılığı. Sayfalar birincil başlık olarak `titleTr` alanını gösterdiğinden,
 * İngilizce dizinde `titleTr` İngilizce başlıkla doldurulur ve ikinci satır (`titleEn`) boş bırakılır.
 */
export function englishMeta(meta: Obj, over: ChapterOverlay | undefined): Obj {
  const title = has(meta.titleEn) ? meta.titleEn : meta.titleTr;
  const m: Obj = { ...meta, titleTr: title, titleEn: '' };
  if (over && 'timescale' in over && (over.timescale === null || has(over.timescale))) m.timescale = over.timescale;
  return m;
}
export function englishBook(book: unknown): Obj {
  const b = isObj(book) ? book : {};
  const title = has(b.titleEn) ? b.titleEn : b.titleTr;
  return { ...b, titleTr: title, titleEn: title };
}
