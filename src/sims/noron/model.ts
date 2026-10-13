// Nöron ve sinaps: UI'dan bağımsız model çekirdeği (DOM yok).
// Kitaptan (chapters.json, Ek 1): dinlenme ~-70 mV; eşiğe ulaşınca tam ya da hiç; tek girdi sönüp gider, birçok girdi birlikte
// gerekir; salım -> reseptör -> geri alım / enzim; geri bildirim sinyali kısaltır, ileri beslemeli zamanda, yanal inhibisyon
// uzayda keskinleştirir. Diğer bütün sayılar (eşik, tepe, süreler, genlikler, hız sabitleri) modelin varsayımıdır.
import { num } from '../../i18n/fmt';
import { mulberry32 } from '../rng';

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));

/* =====================================================================
   1 · Toplama ve eşik (sızıntılı bütünle-ve-ateşle nöron)
   ===================================================================== */
export const REST = -70;          // kitap
export const PEAK = 40;           // varsayım
export const AHP = -80;           // varsayım (ateşlemeden sonraki aşırı negatiflik)
export const THR = -55;           // varsayım (kitap sayı vermez)
export const TAU_M = 10;          // ms, membran zaman sabiti (varsayım)
export const TAU_S = 2.5;         // ms, sinaptik akım sönümü (varsayım)
export const REFR = 3;            // ms, mutlak refrakter dönem (varsayım)
export const AMP0 = 4;            // mV, en yakın dendritteki tek girdinin tepe etkisi (varsayım)
export const EXC_MAX = 1.2;       // olay/ms: şiddet %100'de saniyede ~1200 uyarıcı girdi (varsayım)
export const INH_MAX = 0.6;       // olay/ms
/** Altı dendrit: somaya uzaklığa göre zayıflama (varsayım). */
export const DEND = [1, 0.9, 0.9, 0.6, 0.5, 0.5] as const;

const PEAK_F = ((): number => {
  const t = Math.log(TAU_M / TAU_S) * TAU_M * TAU_S / (TAU_M - TAU_S);
  return TAU_S / (TAU_M - TAU_S) * (Math.exp(-t / TAU_M) - Math.exp(-t / TAU_S));
})();
const I0 = AMP0 / PEAK_F;
/** Dendrit d'ye gelen tek girdinin somada yaptığı tepe değişim (mV). */
export const pspMv = (d: number): number => AMP0 * DEND[d];

interface Ev { t: number; d: number; s: 1 | -1 }
export interface Neuron {
  t: number; x: number; I: number; xs: number; Is: number; age: number; sthr: number;
  ev: Ev[]; spikes: number[]; tr: Array<[number, number, number]>; rnd: () => number; nextS: number;
}
export interface Drive { thr: number; exc: number; inh: number }

export function createNeuron(seed = 1): Neuron {
  return { t: 0, x: 0, I: 0, xs: 0, Is: 0, age: -1, sthr: THR, ev: [], spikes: [], tr: [], rnd: mulberry32(seed), nextS: 0 };
}
/** Tek girdi: dendrit d, işaret s (+1 uyarıcı, -1 engelleyici), delay ms sonra. */
export function queue(n: Neuron, d: number, s: 1 | -1, delay = 0): void {
  const e = { t: n.t + delay, d, s };
  let i = n.ev.length;
  while (i > 0 && n.ev[i - 1].t > e.t) i--;
  n.ev.splice(i, 0, e);
}
const addNow = (n: Neuron, d: number, s: 1 | -1): void => {
  const w = s * DEND[d] * I0;
  n.Is += w;
  if (n.age < 0) n.I += w; // refrakter dönemde gelen girdi boşa gider
};

/** Aksiyon potansiyeli şekli (ms cinsinden yaşa göre): girdi ne olursa olsun hep aynı. */
export function spikeV(age: number, thr: number): number {
  if (age < 0.3) return thr + (PEAK - thr) * (age / 0.3);
  if (age < 0.8) return PEAK;
  if (age < 1.8) return PEAK + (AHP - PEAK) * (age - 0.8);
  return AHP;
}
export const vOf = (n: Neuron): number => (n.age >= 0 ? spikeV(n.age, n.sthr) : REST + n.x);

export function step(n: Neuron, dt: number, dr: Drive): void {
  n.t += dt;
  if (dr.exc > 0 && n.rnd() < dr.exc * EXC_MAX * dt) addNow(n, Math.floor(n.rnd() * 6), 1);
  if (dr.inh > 0 && n.rnd() < dr.inh * INH_MAX * dt) addNow(n, Math.floor(n.rnd() * 6), -1);
  while (n.ev.length && n.ev[0].t <= n.t) { const e = n.ev.shift()!; addNow(n, e.d, e.s); }
  const ds = Math.exp(-dt / TAU_S);
  n.I *= ds; n.Is *= ds;
  n.xs += (-n.xs + n.Is) * dt / TAU_M;
  if (n.age >= 0) {
    n.age += dt;
    if (n.age >= REFR) { n.age = -1; n.x = AHP - REST; n.I = 0; }
    return;
  }
  n.x += (-n.x + n.I) * dt / TAU_M;
  if (REST + n.x >= dr.thr) { n.age = 0; n.sthr = dr.thr; n.spikes.push(n.t); }
}

/** ms kadar ilerlet; trace açıksa her 0,25 ms'de örnek al. */
export function advance(n: Neuron, ms: number, dr: Drive, trace = false, dt = 0.1): void {
  const end = n.t + ms - 1e-9;
  while (n.t < end) {
    step(n, dt, dr);
    if (trace && n.t >= n.nextS) {
      n.nextS = n.t + 0.25;
      n.tr.push([n.t, vOf(n), REST + n.xs]);
    }
  }
  if (trace) {
    const cut = n.t - 140;
    let k = 0;
    while (k < n.tr.length && n.tr[k][0] < cut) k++;
    if (k > 0) n.tr.splice(0, k);
  }
}
/** Son win ms içindeki ateşleme hızı (Hz, model zamanı). */
export function recentRate(n: Neuron, win = 100): number {
  const w = Math.min(win, Math.max(n.t, 1));
  let c = 0;
  for (let i = n.spikes.length - 1; i >= 0 && n.spikes[i] > n.t - w; i--) c++;
  return c * 1000 / w;
}
/** Planlanan girdileri sessiz ortamda sına: kaç aksiyon potansiyeli, analog toplamın tepesi (mV) ve gerilimin tepesi. */
export function trial(plan: (n: Neuron) => void, thr = THR, ms = 80): { spikes: number; analogPeak: number; vPeak: number } {
  const n = createNeuron(3);
  plan(n);
  const dr = { thr, exc: 0, inh: 0 };
  let ap = 0, vp = REST;
  while (n.t < ms) { advance(n, 0.5, dr); ap = Math.max(ap, n.xs); vp = Math.max(vp, vOf(n)); }
  return { spikes: n.spikes.length, analogPeak: ap, vPeak: vp };
}
/** Ateşleme hızı (Hz) - sürekli uyarıcı girdi şiddeti (0..1) eğrisi. */
export function fiCurve(thr: number, inh: number, pts = 11, ms = 1000, seed = 11): number[] {
  return Array.from({ length: pts }, (_, i) => {
    const n = createNeuron(seed);
    advance(n, ms, { thr, exc: i / (pts - 1), inh });
    return n.spikes.length * 1000 / ms;
  });
}

/* =====================================================================
   2 · Sinaps: salım, bağlanma, geri alım, enzim
   ===================================================================== */
export type SynType = 'geri' | 'enzim';
export interface SynP { type: SynType; q: number; density: number; ru: number; en: number; blockRu: boolean; blockEn: boolean; rate: number }
export const SYN_DEFAULT: SynP = { type: 'geri', q: 1, density: 1, ru: 1, en: 1, blockRu: false, blockEn: false, rate: 20 };
export const K_DIFF = 0.01;   // /ms, sinaptik aralıktan dağılma
export const KM = 0.5;        // geri alım pompasının doygunluk sabiti (birim)
export const CAP_HI = 0.2;    // /ms, baskın yolun düşük düzeydeki hız sabiti
export const CAP_LO = 0.02;   // /ms, ikincil yol
export const BLOCK = 0.1;     // ilaç yolu %90 kapatır (varsayım)
export const KON = 0.12;      // /ms/birim
export const KOFF = 0.05;     // /ms
export const RESP_THR = 0.05; // yanıt "var" sayılma eşiği

export interface Syn { t: number; C: number; B: number; ru: number; en: number; df: number; released: number; fires: number[]; tr: Array<[number, number, number]>; nextS: number; nextSpike: number }
export const createSyn = (): Syn => ({ t: 0, C: 0, B: 0, ru: 0, en: 0, df: 0, released: 0, fires: [], tr: [], nextS: 0, nextSpike: 0 });
export function pathRates(p: SynP): { kRu: number; kEn: number } {
  const hi = p.type === 'geri';
  return {
    kRu: (hi ? CAP_HI : CAP_LO) * p.ru * (p.blockRu ? BLOCK : 1),
    kEn: (hi ? CAP_LO : CAP_HI) * p.en * (p.blockEn ? BLOCK : 1),
  };
}
export function release(s: Syn, p: SynP): void { s.C += p.q; s.released += p.q; s.fires.push(s.t); if (s.fires.length > 60) s.fires.shift(); }
export function stepSyn(s: Syn, p: SynP, dt: number): void {
  const { kRu, kEn } = pathRates(p);
  const ru = kRu * KM * s.C / (KM + s.C), en = kEn * s.C, df = K_DIFF * s.C;
  s.ru += ru * dt; s.en += en * dt; s.df += df * dt;
  s.C = Math.max(0, s.C - (ru + en + df) * dt);
  s.B += (KON * s.C * (1 - s.B) - KOFF * s.B) * dt;
  s.t += dt;
}
export const respOf = (s: Syn, p: SynP): number => p.density * s.B;
/** Düzenli presinaptik tren (rate Hz, model zamanı) ile ms kadar ilerlet. */
export function advanceSyn(s: Syn, p: SynP, ms: number, trace = false, dt = 0.05): void {
  const end = s.t + ms - 1e-9;
  while (s.t < end) {
    if (p.rate > 0 && s.t >= s.nextSpike) { release(s, p); s.nextSpike = s.t + 1000 / p.rate; }
    stepSyn(s, p, dt);
    if (trace && s.t >= s.nextS) { s.nextS = s.t + 0.5; s.tr.push([s.t, s.C, respOf(s, p)]); }
  }
  if (trace) {
    const cut = s.t - 210;
    let k = 0;
    while (k < s.tr.length && s.tr[k][0] < cut) k++;
    if (k > 0) s.tr.splice(0, k);
  }
}
export interface Single { half: number; peakR: number; dur: number; fRu: number; fEn: number; fDf: number }
/** Tek impulsun sonucu: yarı ömür (ms), yanıt tepesi ve süresi (ms), yolların payı. */
export function singleSpike(p: SynP): Single {
  const s = createSyn();
  release(s, p);
  let half = -1, peakR = 0, t0 = -1, t1 = -1;
  while (s.t < 600) {
    stepSyn(s, p, 0.05);
    if (half < 0 && s.C <= p.q / 2) half = s.t;
    const r = respOf(s, p);
    peakR = Math.max(peakR, r);
    if (r >= RESP_THR) { if (t0 < 0) t0 = s.t; t1 = s.t; }
  }
  const tot = s.ru + s.en + s.df + s.C || 1;
  return { half: half < 0 ? 600 : half, peakR, dur: t0 < 0 ? 0 : t1 - t0, fRu: s.ru / tot, fEn: s.en / tot, fDf: s.df / tot };
}

/* =====================================================================
   3 · Devreler
   ===================================================================== */
export const N_UNITS = 16;
export type SPat = 'basamak' | 'cubuk' | 'gurultu';
/** v: giriş; e: kenarın karanlık tarafındaki birim; hi / lo: düz bölge ölçüm birimleri. */
export interface Pattern { v: number[]; e: number; hi: number; lo: number }
const LO: number = 0.25, HI: number = 0.85;
export function pattern(kind: SPat): Pattern {
  const v = Array.from({ length: N_UNITS }, (_, i) => (kind === 'cubuk' ? (i >= 5 && i <= 10 ? HI : LO) : i >= 8 ? HI : LO));
  if (kind === 'gurultu') { const r = mulberry32(5); for (let i = 0; i < N_UNITS; i++) v[i] = clamp(v[i] + (r() - 0.5) * 0.24); }
  return kind === 'cubuk' ? { v, e: 4, hi: 7, lo: 0 } : { v, e: 7, hi: 13, lo: 2 };
}
/** Yanal inhibisyon: her birim komşularını (menzil içinde, üçgen ağırlıklı) bastırır; ağ sonuca oturur. */
export function lateral(input: number[], g: number, reach: number): number[] {
  const n = input.length;
  const w: number[] = [];
  let tot = 0;
  for (let d = 1; d <= reach; d++) { w[d] = reach + 1 - d; tot += 2 * w[d]; }
  let o = input.slice();
  for (let it = 0; it < 80; it++) {
    const nx = input.map((e, i) => {
      let s = 0;
      for (let d = 1; d <= reach; d++) s += w[d] * (o[Math.max(0, i - d)] + o[Math.min(n - 1, i + d)]);
      return Math.max(0, e - g * s / tot);
    });
    o = o.map((v, i) => 0.5 * v + 0.5 * nx[i]);
  }
  return o;
}
export interface Edge { contrast: number; plateau: number; overshoot: number }
/** Kenar zıtlığı: kenardaki komşu çıkış farkı / düz bölgeler arası çıkış farkı (inhibisyonsuz = 1). */
export function edgeStats(p: Pattern, out: number[]): Edge {
  const plat = out[p.hi] - out[p.lo];
  return {
    contrast: Math.abs(plat) < 1e-6 ? 0 : (out[p.e + 1] - out[p.e]) / plat,
    plateau: out[p.hi] / p.v[p.hi],
    overshoot: Math.max(0, out[p.e + 1] / (out[p.hi] || 1) - 1),
  };
}

export const T_MAX = 240;
export const DT_C = 0.5;
export type TPat = 'kisa' | 'uzun' | 'iki';
export function tInput(kind: TPat): number[] {
  const n = Math.round(T_MAX / DT_C);
  const on = (t: number): boolean => (kind === 'kisa' ? t >= 20 && t < 50 : kind === 'uzun' ? t >= 20 && t < 170 : (t >= 20 && t < 45) || (t >= 100 && t < 125));
  return Array.from({ length: n }, (_, i) => (on(i * DT_C) ? 1 : 0));
}
/** Negatif geri bildirim: çıkış ara nöronu uyarır; ara nöron çıkışı baskılar. */
export function feedback(inp: number[], g: number): number[] {
  let r = 0, h = 0;
  return inp.map((u) => {
    const drive = Math.max(0, u - g * h);
    r += (drive - r) * DT_C / 8;
    h += (r - h) * DT_C / 25;
    return r;
  });
}
/** İleri beslemeli inhibisyon: aynı girdi ara nöronu da uyarır; baskı delay ms gecikmeyle hedefe ulaşır. */
export function feedforward(inp: number[], g: number, delay: number): number[] {
  const k = Math.round(delay / DT_C);
  let e = 0, h = 0;
  return inp.map((u, i) => {
    e += (u - e) * DT_C / 3;
    h += ((i >= k ? inp[i - k] : 0) - h) * DT_C / 3;
    return Math.max(0, e - g * h);
  });
}
export interface TStats { peak: number; dur: number; tail: number }
/** Zirve, çıkışın girdi genliğinin yarısının üstünde kaldığı toplam süre (ms) ve ilk girdi bitmek üzereyken kalan yanıt. */
export function tStats(out: number[], inp: number[]): TStats {
  const peak = Math.max(...out);
  let c = 0;
  for (const v of out) if (v >= 0.5) c++;
  let end = inp.findIndex((u) => u > 0);
  while (end < inp.length && inp[end] > 0) end++;
  return { peak, dur: c * DT_C, tail: out[Math.max(0, end - 1)] };
}

export const f1 = (x: number): string => num(x, 1);
export const f2 = (x: number): string => num(x, 2);
