import type { ChapterMeta } from '../content/types';

export interface TimelineStop {
  seconds: number;
  label: string;          // "Bir saniye önce" gibi
  chapters: ChapterMeta[];
  pos: number;            // 0..1, log ölçekte konum
  lane: number;           // 0..2: yan yana düşen noktaları dikeyde birkaç px kaydırmak için
}
export interface ThematicGroup { id: string; title: string; blurb: string; chapters: ChapterMeta[] }
export interface Timeline { stops: TimelineStop[]; groups: ThematicGroup[]; ticks: { s: number; label: string }[]; minLog: number; maxLog: number }

/** log10(saniye) -> 0..1; eksenin dışında kalanlar uca oturur. */
export function logPosition(seconds: number, minLog: number, maxLog: number): number {
  const l = Math.log10(Math.max(seconds, 1e-12));
  if (maxLog <= minLog) return 0;
  return Math.min(1, Math.max(0, (l - minLog) / (maxLog - minLog)));
}

const YEAR = 365.25 * 86400;
const TICK_SLACK = 0.05;
/** Komşu durakların konumu bu farktan yakınsa (eksenin 0..1'inde) noktalar dikeyde kaydırılır. */
const CLOSE = 0.03;
const fmtNum = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toString().replace('.', ',');

/** Saniyeyi okunur Türkçe süreye çevirir (yaklaşık). */
export function formatDuration(s: number): string {
  if (s < 60) return `${fmtNum(s)} sn`;
  if (s < 3600) return `${fmtNum(s / 60)} dk`;
  if (s < 86400) return `${fmtNum(s / 3600)} sa`;
  if (s < 60 * 86400) return `${fmtNum(s / 86400)} gün`;
  if (s < YEAR) return `${fmtNum(s / (30.44 * 86400))} ay`;
  if (s < 1000 * YEAR) return `${fmtNum(s / YEAR)} yıl`;
  if (s < 1e6 * YEAR) return `${fmtNum(s / (1000 * YEAR))} bin yıl`;
  return `${fmtNum(s / (1e6 * YEAR))} milyon yıl`;
}

interface GroupDef { id: string; title: string; blurb: string; test: (c: ChapterMeta) => boolean }

// Ölçeği olmayan bölümler tematik gruplara ayrılır. Sıra önemlidir; ilk eşleşen kazanır.
const GROUP_DEFS: GroupDef[] = [
  { id: 'cerceve', title: 'Giriş ve çerçeve', blurb: 'Zaman ölçeği fikrini kuran açılış bölümleri.',
    test: (c) => c.kind === 'intro' || (c.kind === 'chapter' && c.number === 1) },
  { id: 'toplum', title: 'Toplum, ahlak ve sorumluluk', blurb: 'Zaman merdiveninin bulgularının insan topluluklarına ve topluma uygulandığı bölümler.',
    test: (c) => c.kind === 'chapter' && c.number != null && c.number >= 11 },
  { id: 'sonsoz', title: 'Sonsöz', blurb: 'Kitabın kapanışı.', test: (c) => c.kind === 'epilogue' },
  { id: 'ekler', title: 'Ekler', blurb: 'Nörobilim, endokrinoloji ve beyin hasarı için kısa başvuru bölümleri.', test: (c) => c.kind === 'appendix' },
];

export function buildTimeline(chapters: ChapterMeta[]): Timeline {
  const scaled = chapters.filter((c) => c.timescaleSeconds != null);
  const bySec = new Map<number, ChapterMeta[]>();
  for (const c of scaled) {
    const k = c.timescaleSeconds as number;
    bySec.set(k, [...(bySec.get(k) ?? []), c]);
  }
  const secs = [...bySec.keys()].sort((a, b) => a - b);
  // Eksen en küçük ve en büyük durağı kapsar; 1 sn'den kısa ölçekler de sıkışmadan yer alır.
  let minLog = secs.length ? Math.min(0, Math.log10(secs[0])) : 0;
  let maxLog = secs.length ? Math.max(1, Math.log10(secs[secs.length - 1])) : 1;
  // Verinin ucuna çok yakın (±0,05 log) işaretler ("1 milyon yıl") eksene girer ve ekseni kendine kadar uzatır.
  const ticks = AXIS_TICKS.filter((t) => { const l = Math.log10(t.s); return l >= minLog - TICK_SLACK && l <= maxLog + TICK_SLACK; });
  for (const t of ticks) { const l = Math.log10(t.s); minLog = Math.min(minLog, l); maxLog = Math.max(maxLog, l); }
  let prev = -1, lane = 0;
  const stops: TimelineStop[] = secs.map((seconds) => {
    const list = (bySec.get(seconds) as ChapterMeta[]).slice().sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const pos = logPosition(seconds, minLog, maxLog);
    lane = prev >= 0 && pos - prev < CLOSE ? (lane + 1) % 3 : 0;
    prev = pos;
    return { seconds, label: list.find((c) => c.timescale)?.timescale ?? formatDuration(seconds), chapters: list, pos, lane };
  });

  const rest = chapters.filter((c) => c.timescaleSeconds == null);
  const groups: ThematicGroup[] = [];
  const used = new Set<string>();
  for (const def of GROUP_DEFS) {
    const list = rest.filter((c) => !used.has(c.id) && def.test(c));
    list.forEach((c) => used.add(c.id));
    if (list.length) groups.push({ id: def.id, title: def.title, blurb: def.blurb, chapters: list });
  }
  const other = rest.filter((c) => !used.has(c.id));
  if (other.length) groups.push({ id: 'diger', title: 'Diğer bölümler', blurb: 'Zaman ölçeği belirtilmemiş bölümler.', chapters: other });
  return { stops, groups, ticks, minLog, maxLog };
}

/** Eksen üzerindeki işaretler (log ölçek). */
export const AXIS_TICKS: { s: number; label: string }[] = [
  { s: 0.001, label: '1 ms' }, { s: 1, label: '1 sn' }, { s: 60, label: '1 dk' }, { s: 3600, label: '1 sa' }, { s: 86400, label: '1 gün' },
  { s: 30.44 * 86400, label: '1 ay' }, { s: YEAR, label: '1 yıl' }, { s: 100 * YEAR, label: '100 yıl' },
  { s: 1e6 * YEAR, label: '1 milyon yıl' },
];
