// Saf model (DOM yok): saldırganlık haritası, bağlam kapısı ve yer değiştirme saldırganlığı.
// Kitaptan gelenler: türlerin ayrımı (ch01), bağlama duyarlı ortak devre (King ve ark., ch01-e3), yer değiştirme
// saldırganlığının stresi düşürmesi (ch01-e1). Konumlar, ağırlıklar ve sayılar modelin varsayımıdır.
import { mulberry32, normal, type Rng } from '../rng';

const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));

/* =============================== 1) Saldırganlık haritası =============================== */
/** a: reaktif 0 ... proaktif 1; b: sıcakkanlı 0 ... soğukkanlı 1; c: dürtüsel 0 ... planlı 1. */
export interface Axes { a: number; b: number; c: number }
export type AxisKey = keyof Axes;
export const AXIS_INFO: Array<{ key: AxisKey; lo: string; hi: string; name: string }> = [
  { key: 'a', lo: 'Reaktif', hi: 'Proaktif', name: 'Tetikleniş' },
  { key: 'b', lo: 'Sıcakkanlı', hi: 'Soğukkanlı', name: 'Duygu' },
  { key: 'c', lo: 'Dürtüsel', hi: 'Planlı', name: 'Planlama' },
];

export interface Scenario {
  key: string;
  name: string;
  desc: string;
  axes: Axes;
  /** Statü rekabeti içeriği (0-1): testosteronun güçlendirici olduğu bağlam. */
  stat: number;
  /** Stres yükü (0-1): glukokortikoid sistemi. */
  stress: number;
  /** [bölüm, ne için] çiftleri. */
  where: Array<[string, string]>;
}

export const SCENARIOS: Scenario[] = [
  { key: 'savunma', name: 'Savunma', desc: 'Tehdit altında anında verilen karşılık.', axes: { a: 0.08, b: 0.1, c: 0.12 }, stat: 0.1, stress: 0.8,
    where: [['ch02', 'amigdala ve tehdit devresi'], ['ch03', 'hızlı ama düşük doğruluklu amigdala yolu']] },
  { key: 'avcilik', name: 'Avcılık', desc: 'Sakin, hedefe yönelik; öfke ya da korku yok.', axes: { a: 0.92, b: 0.9, c: 0.6 }, stat: 0, stress: 0.1,
    where: [['ch02', 'korku ve saldırganlık her zaman birbirine bağlı değil']] },
  { key: 'statu', name: 'Statü kavgası', desc: 'Rütbe için girişilen, öfkeyle karışık ama kasıtlı çatışma.', axes: { a: 0.6, b: 0.2, c: 0.5 }, stat: 0.95, stress: 0.45,
    where: [['ch04', 'testosteron statü mücadelesinde güçlendirici'], ['ch12', 'statü hiyerarşisi']] },
  { key: 'yer', name: 'Yer değiştirme', desc: 'Stresli canlı, kendinden zayıf ulaşılabilir hedefe saldırır.', axes: { a: 0.3, b: 0.22, c: 0.22 }, stat: 0.4, stress: 0.95,
    where: [['ch04', 'stres ve yer değiştirme saldırganlığı'], ['ch12', 'hiyerarşide aşağıya akan stres']] },
  { key: 'planli', name: 'Planlı soğukkanlı', desc: 'Önceden tasarlanmış, duygusuz ve araçsal şiddet.', axes: { a: 0.95, b: 0.95, c: 0.96 }, stat: 0.2, stress: 0.12,
    where: [['ch02', 'prefrontal korteks ve dopamin'], ['ch17', 'mesafe ve öldürme engeli']] },
  { key: 'spor', name: 'Spor', desc: 'Kurallı, kasıtlı ama duygu da yüklü karşılaşma.', axes: { a: 0.72, b: 0.4, c: 0.78 }, stat: 0.6, stress: 0.3,
    where: [['ch04', 'zorluk hipotezi ve testosteron']] },
  { key: 'kurgu', name: 'Kurgu', desc: 'Film ya da oyunda şiddet; gerçek bir mağdur yok.', axes: { a: 0.55, b: 0.5, c: 0.85 }, stat: 0, stress: 0.05,
    where: [['ch01', 'bağlam kapısı (sanal oda deneyi)']] },
];

export interface Systems { amy: number; pfc: number; dop: number; test: number; gc: number }
export const SYSTEM_INFO: Array<{ key: keyof Systems; name: string; ch: string; color: string }> = [
  { key: 'amy', name: 'Amigdala, tehdit devresi', ch: 'ch02', color: '--amy' },
  { key: 'pfc', name: 'Frontal korteks, frenleme ve planlama', ch: 'ch02', color: '--pfc' },
  { key: 'dop', name: 'Dopamin, ödül beklentisi', ch: 'ch02', color: '--dop' },
  { key: 'test', name: 'Testosteron, statü bağlamı', ch: 'ch04', color: '--pit' },
  { key: 'gc', name: 'Glukokortikoid, stres', ch: 'ch04', color: '--gld' },
];

/** Eksen konumundan sistem yükü: yönler kitaptandır, ağırlıklar modelin varsayımıdır. */
export function systems(ax: Axes, sc: Pick<Scenario, 'stat' | 'stress'>): Systems {
  return {
    amy: clamp(0.5 * (1 - ax.a) + 0.3 * (1 - ax.b) + 0.2 * (1 - ax.c)),
    pfc: clamp(0.65 * ax.c + 0.35 * ax.b),
    dop: clamp(0.6 * ax.a + 0.4 * ax.c),
    test: clamp(sc.stat),
    gc: clamp(sc.stress),
  };
}

/** Üç eksenin "sıcak uçta" ne kadar aynı yerde toplandığı: 1 = tam uyumlu, 0 = en dağınık. */
export function coherence(ax: Axes): number {
  const h = [1 - ax.a, 1 - ax.b, 1 - ax.c];
  const m = (h[0] + h[1] + h[2]) / 3;
  const sd = Math.sqrt(h.reduce((s, v) => s + (v - m) ** 2, 0) / 3);
  return clamp(1 - sd / 0.4714);
}

/** Eksendeki uç adı; orta bölge "orta". */
export function pole(info: (typeof AXIS_INFO)[number], v: number): string {
  return v < 0.35 ? info.lo.toLowerCase() : v > 0.65 ? info.hi.toLowerCase() : 'orta';
}
export const profile = (ax: Axes): string => AXIS_INFO.map((i) => pole(i, ax[i.key])).join(', ');

/** Eksenler aynı yönü göstermiyorsa hangi çiftin ayrıştığını söyler; uyumluysa boş döner. */
export function blur(ax: Axes): string {
  const hot: string[] = [], cold: string[] = [];
  for (const i of AXIS_INFO) {
    const h = 1 - ax[i.key];
    if (h > 0.65) hot.push(i.lo.toLowerCase()); else if (h < 0.35) cold.push(i.hi.toLowerCase());
  }
  return hot.length && cold.length ? `${hot.join(' ve ')} ama ${cold.join(' ve ')}` : '';
}

export const dist = (p: Axes, q: Axes): number => Math.hypot(p.a - q.a, p.b - q.b, p.c - q.c);
/** i. türe en yakın başka tür. */
export function nearest(pos: Axes[], i: number): number {
  let best = -1, bd = Infinity;
  pos.forEach((p, j) => { if (j !== i) { const d = dist(pos[i], p); if (d < bd) { bd = d; best = j; } } });
  return best;
}

/* =============================== 2) Bağlam kapısı =============================== */
export interface Context { need: number; threat: number; consent: number; auth: number }
export type ActionKey = 'kes' | 'tetik' | 'sar' | 'bandaj';
interface W { need: number; threat: number; consent: number; auth: number; bias: number }
export interface Action {
  key: ActionKey; name: string; motor: string;
  w: W; good: string; mid: string; bad: string;
  /** Motor kalıbın göreli yükü: bağlamdan bağımsız. */
  motorLoad: number;
  presets: Array<{ name: string; c: Context }>;
}

export const ACTIONS: Action[] = [
  { key: 'kes', name: 'Bıçakla kesmek', motor: 'Bıçak tutan el, kesme hareketi', motorLoad: 0.7,
    w: { need: 2.2, threat: 1.2, consent: 1.6, auth: 1.0, bias: -2.6 },
    good: 'Ameliyat: şifa', mid: 'Belirsiz: acil müdahale mi, saldırı mı?', bad: 'Saldırı: yaralama',
    presets: [{ name: 'Cerrah', c: { need: 0.9, threat: 0, consent: 1, auth: 1 } }, { name: 'Saldırgan', c: { need: 0, threat: 0, consent: 0, auth: 0 } }, { name: 'Yoldan geçen, acil durum', c: { need: 1, threat: 0, consent: 0, auth: 0 } }] },
  { key: 'tetik', name: 'Tetiği çekmek', motor: 'Silah tutan el, parmağı bükme', motorLoad: 0.5,
    w: { need: -1.2, threat: 2.6, consent: 0.3, auth: 1.6, bias: -2.8 },
    good: 'Görev ya da meşru savunma', mid: 'Tartışmalı: orantılılık ve yetki belirsiz', bad: 'Cinayet',
    presets: [{ name: 'Asker, düşmana karşı', c: { need: 0, threat: 0.9, consent: 0, auth: 1 } }, { name: 'Katil', c: { need: 0, threat: 0, consent: 0, auth: 0 } }, { name: 'Sivil, kendini savunan', c: { need: 0, threat: 1, consent: 0, auth: 0 } }] },
  { key: 'sar', name: 'Sarılmak', motor: 'İki kol karşıdakini saran hareket', motorLoad: 0.4,
    w: { need: 1.4, threat: -1.5, consent: 2.8, auth: 0.2, bias: -1.8 },
    good: 'Teselli', mid: 'Belirsiz: istek ya da rıza net değil', bad: 'İstenmeyen temas',
    presets: [{ name: 'Yas tutan arkadaş', c: { need: 0.8, threat: 0, consent: 1, auth: 0.3 } }, { name: 'Yabancı, istemiyor', c: { need: 0.2, threat: 0, consent: 0, auth: 0 } }] },
  { key: 'bandaj', name: 'Bandaj sarmak', motor: 'Sarma hareketi, el gövdeye uzanır', motorLoad: 0.45,
    w: { need: 3.0, threat: -0.8, consent: 0.8, auth: 0.3, bias: -2.0 },
    good: 'Yardım', mid: 'Belirsiz: yardım gerekli mi?', bad: 'Yersiz müdahale',
    presets: [{ name: 'Yaralı insan', c: { need: 0.95, threat: 0, consent: 0.8, auth: 0.9 } }, { name: 'Düşman uzaylı', c: { need: 0, threat: 0.95, consent: 0, auth: 0.9 } }] },
];
export const action = (k: ActionKey): Action => ACTIONS.find((a) => a.key === k)!;

/** Bağlamsal uygunluk (0-1): motor kalıptan bağımsız, bağlamın ağırlıklı toplamının lojistiği. */
export function fit(k: ActionKey, c: Context): number {
  const { w } = action(k);
  const z = w.need * c.need + w.threat * c.threat + w.consent * c.consent + w.auth * c.auth + w.bias;
  return 1 / (1 + Math.exp(-z));
}
export type Verdict = 'good' | 'mid' | 'bad';
export const verdict = (f: number): Verdict => (f >= 0.65 ? 'good' : f <= 0.35 ? 'bad' : 'mid');
export const meaning = (k: ActionKey, f: number): string => action(k)[verdict(f)];
/** Bağlamsal karar devresinin (prefrontal korteks) göreli etkinliği: uygunlukla birlikte yükselir (modelin varsayımı). */
export const circuit = (f: number): number => 0.15 + 0.85 * f;

/** Sanal oda deneyindeki iki hedef (King ve ark.). */
export const ROOM_TARGETS: Array<{ name: string; c: Context }> = [
  { name: 'Yaralı insan', c: { need: 0.95, threat: 0, consent: 0.8, auth: 0.9 } },
  { name: 'Düşman uzaylı', c: { need: 0, threat: 0.95, consent: 0, auth: 0.9 } },
];
export const ROOM_ACTIONS: ActionKey[] = ['bandaj', 'tetik'];

/* =============================== 3) Yer değiştirme saldırganlığı =============================== */
export const BASE = 0.05;
export const DECAY = 0.9;

export interface TroopParams { freq: number; hit: number; displace: number; relief: number }
export const TROOP_DEFAULT: TroopParams = { freq: 2, hit: 0.08, displace: 0.6, relief: 0.4 };
export interface Ev { from: number; to: number; kind: 'defeat' | 'displace' }
export interface Troop {
  n: number; rnd: Rng; gc: number[]; step: number;
  dispSum: number; dispN: number; heldSum: number; heldN: number;
  /** Rütbe başına zaman ortalaması için toplamlar. */
  rankSum: number[];
  /** Her adımda kümülatif ortalamalar (NaN: henüz veri yok). */
  seriesD: number[]; seriesH: number[];
}
export function newTroop(seed: number, n = 8): Troop {
  return { n, rnd: mulberry32(seed), gc: new Array(n).fill(BASE), step: 0, dispSum: 0, dispN: 0, heldSum: 0, heldN: 0, rankSum: new Array(n).fill(0), seriesD: [], seriesH: [] };
}

/** Bir adım: p.freq kadar yenilgi; yenilen yer değiştirebilir, hedef de zincirle devam edebilir. */
export function stepTroop(t: Troop, p: TroopParams): Ev[] {
  const ev: Ev[] = [];
  const hit = (j: number, h: number, first: boolean, winner: number): void => {
    if (first) ev.push({ from: winner, to: j, kind: 'defeat' });
    t.gc[j] = Math.min(1, t.gc[j] + h);
    if (j >= t.n - 1) return; // en alttakinin saldıracağı kimse yok; karşılaştırmaya girmez
    if (t.rnd() < p.displace) {
      let tot = 0;
      for (let k = j + 1; k < t.n; k++) tot += k - j;
      let r = t.rnd() * tot, target = t.n - 1;
      for (let k = j + 1; k < t.n; k++) { r -= k - j; if (r <= 0) { target = k; break; } }
      t.gc[j] = BASE + (t.gc[j] - BASE) * (1 - p.relief);
      t.dispSum += t.gc[j]; t.dispN++;
      ev.push({ from: j, to: target, kind: 'displace' });
      hit(target, h * 0.6, false, j);
    } else { t.heldSum += t.gc[j]; t.heldN++; }
  };
  for (let f = 0; f < p.freq; f++) {
    const i = Math.floor(t.rnd() * t.n);
    let j = Math.floor(t.rnd() * (t.n - 1));
    if (j >= i) j++;
    hit(Math.max(i, j), p.hit, true, Math.min(i, j));
  }
  for (let k = 0; k < t.n; k++) { t.gc[k] = BASE + (t.gc[k] - BASE) * DECAY; t.rankSum[k] += t.gc[k]; }
  t.step++;
  t.seriesD.push(t.dispN ? t.dispSum / t.dispN : NaN);
  t.seriesH.push(t.heldN ? t.heldSum / t.heldN : NaN);
  if (t.seriesD.length > 400) { t.seriesD.shift(); t.seriesH.shift(); }
  return ev;
}
export const meanD = (t: Troop): number => (t.dispN ? t.dispSum / t.dispN : NaN);
export const meanH = (t: Troop): number => (t.heldN ? t.heldSum / t.heldN : NaN);
export const rankMean = (t: Troop, k: number): number => (t.step ? t.rankSum[k] / t.step : BASE);

/** Şoklanan sıçan: yanında küçük bir sıçan varsa ısırabilir (olasılık = yer değiştirme eğilimi). */
export interface RatResult { absent: number; present: number }
export function ratExperiment(seed: number, shock: number, displace: number, relief: number, n = 200): RatResult {
  const rnd = mulberry32(seed);
  let a = 0, b = 0;
  for (let i = 0; i < n; i++) {
    const base = clamp(BASE + shock + 0.05 * normal(rnd));
    a += base;
    b += rnd() < displace ? BASE + (base - BASE) * (1 - relief) : base;
  }
  return { absent: a / n, present: b / n };
}
