import type { ChapterMeta } from '../content/types';
import { decimalSep } from '../i18n/locale';
import { t } from '../i18n/t';
import type { MsgKey } from '../i18n/messages';

export interface TimelineStop {
  seconds: number;
  label: string;          // "Bir saniye önce" gibi
  chapters: ChapterMeta[];
  pos: number;            // 0..1, log ölçekte konum
  lane: number;           // 0..2: yan yana düşen noktaları dikeyde birkaç px kaydırmak için
}
export interface ThematicGroup { id: string; title: string; blurb: string; chapters: ChapterMeta[] }
export interface Tick { id: string; s: number; label: string }
export interface Timeline { stops: TimelineStop[]; groups: ThematicGroup[]; ticks: Tick[]; minLog: number; maxLog: number }

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
const fmtNum = (n: number) => (n >= 10 ? Math.round(n) : Math.round(n * 10) / 10).toString().replace('.', decimalSep());

/** Saniyeyi okunur süreye (geçerli dilde, yaklaşık) çevirir. */
export function formatDuration(s: number): string {
  if (s < 60) return `${fmtNum(s)} ${t('unit.s')}`;
  if (s < 3600) return `${fmtNum(s / 60)} ${t('unit.min')}`;
  if (s < 86400) return `${fmtNum(s / 3600)} ${t('unit.h')}`;
  if (s < 60 * 86400) return `${fmtNum(s / 86400)} ${t('unit.d')}`;
  if (s < YEAR) return `${fmtNum(s / (30.44 * 86400))} ${t('unit.mo')}`;
  if (s < 1000 * YEAR) return `${fmtNum(s / YEAR)} ${t('unit.yr')}`;
  if (s < 1e6 * YEAR) return `${fmtNum(s / (1000 * YEAR))} ${t('unit.kyr')}`;
  return `${fmtNum(s / (1e6 * YEAR))} ${t('unit.myr')}`;
}

interface GroupDef { id: string; test: (c: ChapterMeta) => boolean }

// Ölçeği olmayan bölümler tematik gruplara ayrılır. Sıra önemlidir; ilk eşleşen kazanır.
const GROUP_DEFS: GroupDef[] = [
  { id: 'cerceve', test: (c) => c.kind === 'intro' || (c.kind === 'chapter' && c.number === 1) },
  { id: 'toplum', test: (c) => c.kind === 'chapter' && c.number != null && c.number >= 11 },
  { id: 'sonsoz', test: (c) => c.kind === 'epilogue' },
  { id: 'ekler', test: (c) => c.kind === 'appendix' },
];
const groupText = (id: string): { title: string; blurb: string } => ({ title: t(`group.${id}.title` as MsgKey), blurb: t(`group.${id}.blurb` as MsgKey) });

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
  const ticks = axisTicks().filter((k) => { const l = Math.log10(k.s); return l >= minLog - TICK_SLACK && l <= maxLog + TICK_SLACK; });
  for (const k of ticks) { const l = Math.log10(k.s); minLog = Math.min(minLog, l); maxLog = Math.max(maxLog, l); }
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
    if (list.length) groups.push({ id: def.id, ...groupText(def.id), chapters: list });
  }
  const other = rest.filter((c) => !used.has(c.id));
  if (other.length) groups.push({ id: 'diger', ...groupText('diger'), chapters: other });
  return { stops, groups, ticks, minLog, maxLog };
}

/** Eksen üzerindeki işaretler (log ölçek). Etiketler geçerli dilde üretilir. */
const TICK_DEFS: { id: string; s: number; n: number; unit: MsgKey }[] = [
  { id: 'ms', s: 0.001, n: 1, unit: 'unit.ms' }, { id: 's', s: 1, n: 1, unit: 'unit.s' }, { id: 'min', s: 60, n: 1, unit: 'unit.min' },
  { id: 'h', s: 3600, n: 1, unit: 'unit.h' }, { id: 'd', s: 86400, n: 1, unit: 'unit.d' }, { id: 'mo', s: 30.44 * 86400, n: 1, unit: 'unit.mo' },
  { id: 'yr', s: YEAR, n: 1, unit: 'unit.yr' }, { id: '100yr', s: 100 * YEAR, n: 100, unit: 'unit.yr' }, { id: 'myr', s: 1e6 * YEAR, n: 1, unit: 'unit.myr' },
];
export const axisTicks = (): Tick[] => TICK_DEFS.map((d) => ({ id: d.id, s: d.s, label: `${d.n} ${t(d.unit)}` }));
