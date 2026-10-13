// İşbirliğinin evrimi: saf model çekirdeği (DOM yok).
//  1) Tekrarlı tutsak ikilemi: strateji mantığı, tek eşleşme (tohumlu), beklenen getiri (tam hesap),
//     evrimsel dinamik (kopyalayıcı denklemi ve sonlu nüfus).
//  2) Akraba seçilimi: Hamilton kuralı (r·B > C) ve özgecil genin sonlu nüfusta yayılması.
import { mulberry32 } from '../rng';
import { num, pct as pctFmt } from '../../i18n/fmt';
import { L } from './text';

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/* ===================== Tutsak ikilemi ===================== */

/** 1 = işbirliği (C), 0 = ihanet (D). */
export type Move = 0 | 1;

/** Klasik getiri değerleri (Axelrod): ihanet cazibesi T, karşılıklı işbirliği R, karşılıklı ihanet P, enayi payı S. */
export const PAY = { T: 5, R: 3, P: 1, S: 0 } as const;
/** Geçerli bir tutsak ikilemi: T > R > P > S ve 2R > T + S. */
export const payoff = (me: Move, opp: Move): number => (me ? (opp ? PAY.R : PAY.S) : opp ? PAY.T : PAY.P);

export type StratId = 'allc' | 'alld' | 'tft' | 'gtft' | 'ctft' | 'pavlov' | 'random';
export const STRATS: StratId[] = ['allc', 'alld', 'tft', 'gtft', 'ctft', 'pavlov', 'random'];

export interface StratInfo { id: StratId; name: string; short: string; rule: string }
/** Metin okuma anında `L()` ile gelir (modül yüklenirken hesaplanmaz). */
const stratInfo = (id: StratId): StratInfo => ({
  id,
  get name() { return L().strat[id].name; },
  get short() { return L().strat[id].short; },
  get rule() { return L().strat[id].rule; },
});
export const INFO: Record<StratId, StratInfo> = {
  allc: stratInfo('allc'), alld: stratInfo('alld'), tft: stratInfo('tft'), gtft: stratInfo('gtft'),
  ctft: stratInfo('ctft'), pavlov: stratInfo('pavlov'), random: stratInfo('random'),
};

/** Affedici TfT'nin affetme olasılığı: min(1 − (T−R)/(R−S), (R−P)/(T−P)) = 1/3. */
export const GENEROSITY = 1 / 3;

/** Bir oyuncunun karar anındaki görüşü. İlk turda `first` doğrudur. */
export interface View { first: boolean; me: Move; opp: Move; sMe: Move; sOpp: Move }

/**
 * Niyetlenilen hamlenin işbirliği olma olasılığı. Durum (standing) yalnızca Pişman TfT için:
 * bir oyuncu, önceki turda rakibi iyi durumdayken ihanet ettiyse "kötü durumdadır" (haksız ihanet).
 */
export function pCoop(id: StratId, v: View): number {
  switch (id) {
    case 'allc': return 1;
    case 'alld': return 0;
    case 'random': return 0.5;
    case 'tft': return v.first ? 1 : v.opp;
    case 'gtft': return v.first || v.opp ? 1 : GENEROSITY;
    case 'ctft': return v.first || !v.sMe ? 1 : v.sOpp ? 1 : 0;
    case 'pavlov': return v.first ? 1 : v.me === v.opp ? 1 : 0;
  }
}

/** Sinyal hatası: niyetlenen hamle olasılıkla ters çıkar ve iki taraf da gerçekleşen hamleyi görür. */
const withNoise = (p: number, e: number): number => p * (1 - e) + (1 - p) * e;
/** Yeni durum: haksız ihanet (rakip iyi durumdayken ihanet) kötü duruma sokar. */
const standing = (m: Move, sOpp: Move): Move => (!m && sOpp ? 0 : 1);

export interface Match {
  a: StratId; b: StratId; rounds: number; noise: number;
  ma: Move[]; mb: Move[];
  /** Niyet gerçekleşen hamleden farklıysa (sinyal hatası) true. */
  ea: boolean[]; eb: boolean[];
  scoreA: number; scoreB: number;
}

/** Tek eşleşmeyi tohumlu RNG ile oynatır. */
export function playMatch(a: StratId, b: StratId, rounds: number, noise: number, rng: () => number): Match {
  const m: Match = { a, b, rounds, noise, ma: [], mb: [], ea: [], eb: [], scoreA: 0, scoreB: 0 };
  let la: Move = 1, lb: Move = 1, sa: Move = 1, sb: Move = 1;
  for (let t = 0; t < rounds; t++) {
    const first = t === 0;
    const ia: Move = rng() < pCoop(a, { first, me: la, opp: lb, sMe: sa, sOpp: sb }) ? 1 : 0;
    const ib: Move = rng() < pCoop(b, { first, me: lb, opp: la, sMe: sb, sOpp: sa }) ? 1 : 0;
    const fa = rng() < noise, fb = rng() < noise;
    const xa: Move = fa ? ((1 - ia) as Move) : ia;
    const xb: Move = fb ? ((1 - ib) as Move) : ib;
    m.ma.push(xa); m.mb.push(xb); m.ea.push(fa); m.eb.push(fb);
    m.scoreA += payoff(xa, xb); m.scoreB += payoff(xb, xa);
    const nsa = standing(xa, sb), nsb = standing(xb, sa);
    la = xa; lb = xb; sa = nsa; sb = nsb;
  }
  return m;
}

export interface MatchStats {
  /** İlk hatanın turu (1'den başlar); hata yoksa 0. */
  firstError: number;
  errors: number;
  /** İlk hatadan sonra iki tur art arda karşılıklı işbirliğine dönülen tur (1'den); dönülmediyse 0. */
  recoveredAt: number;
  /** İlk hatadan sonra karşılıklı işbirliği olmayan tur sayısı. */
  brokenRounds: number;
  mutualCoop: number;
  mutualDefect: number;
  /** Tur başına ortalama getiri. */
  avgA: number; avgB: number;
}

export function matchStats(m: Match): MatchStats {
  const n = m.rounds;
  let firstError = 0, errors = 0, mc = 0, md = 0;
  for (let t = 0; t < n; t++) {
    if (m.ea[t] || m.eb[t]) { errors++; if (!firstError) firstError = t + 1; }
    if (m.ma[t] && m.mb[t]) mc++;
    if (!m.ma[t] && !m.mb[t]) md++;
  }
  let recoveredAt = 0, broken = 0;
  if (firstError) {
    const cc = (t: number) => !!(m.ma[t] && m.mb[t]);
    for (let t = firstError; t < n - 1; t++) if (cc(t) && cc(t + 1)) { recoveredAt = t + 1; break; }
    const end = recoveredAt ? recoveredAt - 1 : n;
    for (let t = firstError - 1; t < end; t++) if (!cc(t)) broken++;
  }
  return { firstError, errors, recoveredAt, brokenRounds: broken, mutualCoop: mc, mutualDefect: md, avgA: m.scoreA / n, avgB: m.scoreB / n };
}

/** Kısa açıklama (canlı çubuk). */
export function describeMatch(m: Match, s: MatchStats = matchStats(m)): string {
  const T = L();
  const tail = T.matchTail(INFO[m.a].short, INFO[m.b].short, m.scoreA, m.scoreB);
  if (m.noise > 0 && !s.errors) return T.matchNoErrorsNoisy(m.rounds, tail);
  if (!s.errors) return T.matchNoErrors(s.mutualCoop, m.rounds, tail);
  if (s.recoveredAt === 0 && s.mutualCoop < m.rounds / 2) return T.matchLost(s.firstError, s.brokenRounds, tail);
  if (s.recoveredAt) return T.matchRecovered(s.firstError, s.recoveredAt - s.firstError, tail);
  return T.matchErrors(s.firstError, s.errors, tail);
}

/**
 * Tur başına beklenen getiri ve işbirliği oranı, hata dahil, tam hesapla (Markov zinciri; örnekleme gürültüsü yok).
 * Durum: (son hamleler, durumlar) = 16 olasılık + "ilk tur".
 */
export function expectedPlay(a: StratId, b: StratId, rounds: number, noise: number): { a: number; b: number; coop: number } {
  const idx = (ma: number, mb: number, sa: number, sb: number) => ma | (mb << 1) | (sa << 2) | (sb << 3);
  let dist = new Float64Array(17); // 16 = ilk tur
  dist[16] = 1;
  let ta = 0, tb = 0, tc = 0;
  for (let t = 0; t < rounds; t++) {
    const next = new Float64Array(17);
    for (let s = 0; s < 17; s++) {
      const w = dist[s];
      if (w === 0) continue;
      let va: View, vb: View;
      if (s === 16) { va = { first: true, me: 1, opp: 1, sMe: 1, sOpp: 1 }; vb = va; }
      else {
        const ma = (s & 1) as Move, mb = ((s >> 1) & 1) as Move, sa = ((s >> 2) & 1) as Move, sb = ((s >> 3) & 1) as Move;
        va = { first: false, me: ma, opp: mb, sMe: sa, sOpp: sb };
        vb = { first: false, me: mb, opp: ma, sMe: sb, sOpp: sa };
      }
      const pa = withNoise(pCoop(a, va), noise), pb = withNoise(pCoop(b, vb), noise);
      const sa = (s === 16 ? 1 : (s >> 2) & 1) as Move, sb = (s === 16 ? 1 : (s >> 3) & 1) as Move;
      for (const xa of [0, 1] as const) for (const xb of [0, 1] as const) {
        const p = w * (xa ? pa : 1 - pa) * (xb ? pb : 1 - pb);
        if (p === 0) continue;
        ta += p * payoff(xa, xb); tb += p * payoff(xb, xa); tc += p * (xa && xb ? 1 : 0);
        next[idx(xa, xb, standing(xa, sb), standing(xb, sa))] += p;
      }
    }
    dist = next;
  }
  return { a: ta / rounds, b: tb / rounds, coop: tc / rounds };
}

export type Matrix = number[][];
/** Strateji i'nin j'ye karşı tur başına beklenen getirisi (7×7). */
export function payoffMatrix(rounds: number, noise: number): Matrix {
  const n = STRATS.length;
  const M: Matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    const r = expectedPlay(STRATS[i], STRATS[j], rounds, noise);
    M[i][j] = r.a; M[j][i] = r.b;
  }
  return M;
}

/** Herkesin herkesle (kendisi dahil) oynadığı Axelrod turnuvasında stratejilerin ortalaması (eşit ağırlık). */
export function roundRobin(M: Matrix): number[] {
  return M.map((row) => row.reduce((s, v) => s + v, 0) / row.length);
}

export const normalize = (x: number[]): number[] => {
  const s = x.reduce((a, b) => a + b, 0);
  return s > 0 ? x.map((v) => v / s) : x.map(() => 1 / x.length);
};

/** Bir kuşakta kopyalayıcı denklemi: pay ∝ pay × getiri. */
export function replicatorStep(M: Matrix, x: number[]): number[] {
  const f = M.map((row) => row.reduce((s, v, j) => s + v * x[j], 0));
  const fbar = f.reduce((s, v, i) => s + v * x[i], 0);
  return fbar > 0 ? x.map((v, i) => (v * f[i]) / fbar) : x;
}

export function replicator(M: Matrix, x0: number[], gens: number): number[][] {
  const out = [normalize(x0)];
  for (let g = 0; g < gens; g++) out.push(replicatorStep(M, out[g]));
  return out;
}

/** Sonlu nüfus (N birey): her kuşakta bir sonraki kuşak, getiriyle orantılı olasılıkla örneklenir. */
export function finitePopulation(M: Matrix, x0: number[], gens: number, size: number, rng: () => number): number[][] {
  const out = [normalize(x0)];
  for (let g = 0; g < gens; g++) {
    const x = out[g];
    const exp = replicatorStep(M, x);
    const cum: number[] = [];
    exp.reduce((s, v, i) => ((cum[i] = s + v), s + v), 0);
    const counts = new Array<number>(x.length).fill(0);
    for (let k = 0; k < size; k++) {
      const u = rng() * cum[cum.length - 1];
      let i = 0;
      while (i < cum.length - 1 && u >= cum[i]) i++;
      counts[i]++;
    }
    out.push(counts.map((c) => c / size));
  }
  return out;
}

/** En yüksek paya sahip strateji (eşitlikte ilk). */
export function leader(x: number[]): StratId {
  let k = 0;
  for (let i = 1; i < x.length; i++) if (x[i] > x[k]) k = i;
  return STRATS[k];
}

/** Karşılık veren (iyi huylu) stratejiler. */
export const NICE: StratId[] = ['tft', 'gtft', 'ctft', 'pavlov'];

/** Evrimsel dinamiğin kısa açıklaması. */
export function describeEvolution(x0: number[], xEnd: number[], gens: number): string {
  const T = L();
  const lead = leader(xEnd);
  const top = pctFmt(xEnd[STRATS.indexOf(lead)]);
  const alive = STRATS.filter((_, i) => xEnd[i] >= 0.02);
  const cs = NICE.reduce((s, id) => s + xEnd[STRATS.indexOf(id)], 0);
  const d0 = x0[STRATS.indexOf('alld')], d1 = xEnd[STRATS.indexOf('alld')];
  if (alive.length === 1) return T.evoSingle(gens, INFO[lead].short);
  if (d1 > 0.5) return T.evoDefectors(gens, pctFmt(d1));
  if (cs > 0.6) return T.evoReciprocators(gens, pctFmt(cs), INFO[lead].short, top, d1 < d0);
  return T.evoLeader(gens, INFO[lead].short, top, alive.length);
}

/** Hazır başlangıç karışımları (STRATS sırasıyla; yüzde). */
export const MIXES: { name: string; x: number[] }[] = [
  { get name() { return L().mixNames[0]; }, x: [14, 14, 15, 14, 14, 15, 14] },
  { get name() { return L().mixNames[1]; }, x: [4, 70, 6, 6, 6, 6, 2] },
  { get name() { return L().mixNames[2]; }, x: [0, 2, 94, 2, 0, 2, 0] },
  { get name() { return L().mixNames[3]; }, x: [97, 3, 0, 0, 0, 0, 0] },
];

/* ===================== Akraba seçilimi ===================== */

export interface Kin { id: string; name: string; r: number; frac: string; dogPct?: number }
/** Soy bağı katsayıları r: standart popülasyon genetiği değerleri.
 *  dogPct: kitaptaki köpek/yabancı ahlaki ikilem anketinde köpeği seçenlerin yüzdesi (ch10-e10). */
const kin = (id: keyof ReturnType<typeof L>['kinNames'], r: number, frac: string, dogPct?: number): Kin => ({
  id, get name() { return L().kinNames[id]; }, r, frac, dogPct,
});
export const KINS: Kin[] = [
  kin('kardes', 1 / 2, '1/2', 1),
  kin('yarim', 1 / 4, '1/4'),
  kin('yegen', 1 / 4, '1/4'),
  kin('buyuk', 1 / 4, '1/4', 2),
  kin('kuzen', 1 / 8, '1/8', 16),
  kin('kuzen2', 1 / 32, '1/32'),
  kin('yabanci', 0, '0', 26),
];

/** Hamilton kuralı: özgecil gen, r·B − C > 0 iken yayılır. */
export const hamilton = (r: number, B: number, C: number): number => r * B - C;

/** Verilen B ve C için yayılabilmek gereken en küçük r (C/B); B = 0 ise sonsuz. */
export const criticalR = (B: number, C: number): number => (B > 0 ? C / B : Infinity);

export interface KinParams { r: number; B: number; C: number; p0: number; size: number; gens: number }

export interface KinRun {
  /** Her kuşakta özgecil genin frekansı (gens + 1 nokta). */
  freq: number[];
  /** Son kuşağın birey dizisi (1 = özgecil gen taşıyor). */
  last: number[];
}

/**
 * Bir nüfusu simüle eder. Her birey, soy bağı r olan bir akrabayla eşleşir: akraba, bireyle aynı genin
 * kopyasını r olasılıkla taşır, yoksa nüfus frekansından bağımsız çekilir. Özgecil gen taşıyan birey
 * akrabasına B fayda sağlar ve kendisi C öder; uyumluluk w = 1 − C·[özgecil] + B·[akraba özgecil].
 * Sonraki kuşak w ile orantılı olasılıkla örneklenir (Wright-Fisher).
 */
export function simulateKin(P: KinParams, rng: () => number): KinRun {
  const { r, B, C, size } = P;
  let g: number[] = [];
  const n0 = Math.round(P.p0 * size);
  for (let i = 0; i < size; i++) g.push(i < n0 ? 1 : 0);
  for (let i = size - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
  const freq = [g.reduce((s, v) => s + v, 0) / size];
  for (let t = 0; t < P.gens; t++) {
    const p = freq[t];
    const cum = new Array<number>(size);
    let s = 0;
    for (let i = 0; i < size; i++) {
      const partner = rng() < r ? g[i] : rng() < p ? 1 : 0;
      s += Math.max(0.0001, 1 - C * g[i] + B * partner);
      cum[i] = s;
    }
    const ng: number[] = [];
    for (let k = 0; k < size; k++) {
      const u = rng() * s;
      let lo = 0, hi = size - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] > u) hi = mid; else lo = mid + 1; }
      ng.push(g[lo]);
    }
    g = ng;
    freq.push(g.reduce((a, v) => a + v, 0) / size);
  }
  return { freq, last: g };
}

/** Beklenen (sonsuz nüfus) frekans izi: Δp = p(1−p)(rB − C)/w̄. Kuramsal kesikli çizgi. */
export function expectedKin(P: Pick<KinParams, 'r' | 'B' | 'C' | 'p0' | 'gens'>): number[] {
  const out = [P.p0];
  for (let t = 0; t < P.gens; t++) {
    const p = out[t];
    const wA = 1 - P.C + P.B * (P.r + (1 - P.r) * p);
    const wS = 1 + P.B * (1 - P.r) * p;
    const wbar = p * wA + (1 - p) * wS;
    out.push(clamp((p * wA) / wbar, 0, 1));
  }
  return out;
}

/** Aynı ayarla, farklı tohumlarla birkaç tekrar. */
export function replicateKin(P: KinParams, seed: number, runs: number): KinRun[] {
  const out: KinRun[] = [];
  for (let k = 0; k < runs; k++) out.push(simulateKin(P, mulberry32(seed * 1009 + k * 7919 + 1)));
  return out;
}

export function describeKin(kin: Kin, B: number, C: number, meanEnd: number, p0: number): string {
  const T = L();
  const lhs = kin.r * B;
  const f = (v: number) => num(v, 2);
  const say = lhs > C + 1e-9 ? T.kinSpreads : lhs < C - 1e-9 ? T.kinFails : T.kinTie;
  return say(kin.name, kin.frac, f(lhs), f(C), pctFmt(p0), pctFmt(meanEnd));
}
