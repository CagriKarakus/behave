// Savaş ve barış: saf model çekirdeği (DOM yok). Üç bölüm:
//  1) Siperlerde "yaşa ve yaşat": 8 sektör x 2 birlik, günlük tekrarlı karşılaşma (ajan tabanlı).
//  2) Temas ve itibar: gruplar arası temas (ajan), orman ortak malı ve ceza, hatıra fotoğrafı satışı.
//  3) Garbage Dump babun sürüsü: salgın sonrası kültür ve yeni gelen erkekler.
// Kitaptan gelen yönler/sayılar BOOK içinde; geri kalan sayılar modelin varsayımıdır.
import { mulberry32 } from '../rng';

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
const gauss = (r: () => number): number => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const mean = (xs: ArrayLike<number>): number => { let s = 0; for (let i = 0; i < xs.length; i++) s += xs[i]; return xs.length ? s / xs.length : 0; };
const pc = (x: number): string => `%${Math.round(x * 100)}`;

/** Kitaptan (content/chapters.json, ch17) alınan sayılar. */
export const BOOK = {
  twoShots: 2,             // ihlale en yaygın yanıt: iki karşılık mermisi (ch17-e12)
  villages: 49,            // Etiyopya orman kullanıcı grubu (ch17-e4)
  customers: 113000,       // hatıra fotoğrafı alıcıları (ch17-e5)
  noContact: 0.91,         // programdan sonra iletişimi sürdürmeyen Filistinli/İsrailli genç payı (ch17-e3)
  sexRatio: 2,             // salgın sonrası dişi:erkek (ch17-e11)
  newcomerMonths: 6,       // yeni gelenin kültüre uyumu (ch17-e11)
  typicalApproachDays: 60, // tipik sürüde yerleşik dişilerin yaklaşması: iki aydan uzun (ch17-e11)
} as const;

/* ===================================================================== */
/* 1 · Siperler                                                          */
/* ===================================================================== */

export const TR = { S: 8, days: 182, h0: 0.55, lull: 0.18, win: 5 } as const;
export type Rule = 'iki' | 'tam';
export interface TrenchParams { tenure: number; ritual: number; accident: number; command: number; rule: Rule }
export const TRENCH_DEFAULT: TrenchParams = { tenure: 12, ritual: 0.6, accident: 0.015, command: 0.1, rule: 'iki' };

/** Günlük eylem: 0 sessiz (ya da zararsız ritüel atış), 1 sınırlı karşılık (iki mermi), 2 gerçek ateş, 3 baskın emri. */
export type Act = 0 | 1 | 2 | 3;

export interface TrenchRun {
  p: TrenchParams;
  /** [gün][yan * S + sektör]; yan 0 = A hattı, 1 = B hattı. */
  acts: Uint8Array[];
  /** Güven (rakibin karşılıklı kısıtlamaya uyduğuna inanç), 0-1. */
  know: Float32Array[];
  /** O gün birliği değişen ajanlar. */
  rotated: Uint8Array[];
  /** [gün][sektör]: son TR.win günde gerçek ateş yoksa 1. */
  truce: Uint8Array[];
}

export function simulateTrench(p: TrenchParams, seed: number, days: number = TR.days): TrenchRun {
  const S = TR.S, N = 2 * S;
  const rnd = mulberry32(seed * 7919 + 13);
  const tdays = Math.max(1, Math.round(p.tenure * 7));
  const know = new Float64Array(N), age = new Int32Array(N), owes = new Uint8Array(N);
  for (let i = 0; i < N; i++) age[i] = Math.floor(rnd() * tdays);
  const run: TrenchRun = { p, acts: [], know: [], rotated: [], truce: [] };
  const lastFire = new Int32Array(S).fill(-99);
  for (let d = 0; d < days; d++) {
    const rot = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      age[i]++;
      if (age[i] > tdays || rnd() < 0.006 * p.command) { know[i] = 0; age[i] = 0; owes[i] = 0; rot[i] = 1; }
    }
    const a = new Uint8Array(N);
    for (let s = 0; s < S; s++) {
      const lull = rnd() < TR.lull;
      const raid = rnd() < 0.05 * p.command ? (rnd() < 0.5 ? 0 : 1) : -1;
      for (let side = 0; side < 2; side++) {
        const i = side * S + s;
        if (raid === side) a[i] = 3;
        else if (owes[i]) { a[i] = p.rule === 'iki' ? 1 : 2; owes[i] = 0; }
        else {
          let fire = !lull && rnd() < TR.h0 * (1 - know[i]) ** 2;
          if (rnd() < p.accident) fire = true;
          a[i] = fire ? 2 : 0;
        }
      }
    }
    for (let s = 0; s < S; s++) {
      for (let side = 0; side < 2; side++) {
        const i = side * S + s, ao = a[(1 - side) * S + s];
        const mis = (1 - p.ritual) * (ao === 1 ? 0.5 : ao === 0 ? 0.06 : 0);
        if (ao >= 2 || rnd() < mis) {
          know[i] *= ao === 3 ? 0.2 : 0.7;
          if (rnd() >= (p.rule === 'iki' ? 0.1 : 0.55)) owes[i] = 1;
        } else if (a[i] < 2) know[i] += (0.05 + 0.15 * p.ritual) * (0.6 + 0.8 * know[(1 - side) * S + s]) * (1 - know[i]);
      }
      if (a[s] >= 2 || a[S + s] >= 2) lastFire[s] = d;
    }
    run.acts.push(a);
    run.know.push(Float32Array.from(know));
    run.rotated.push(rot);
    run.truce.push(Uint8Array.from({ length: S }, (_, s) => (d >= TR.win - 1 && d - lastFire[s] >= TR.win ? 1 : 0)));
  }
  return run;
}

export const fireCount = (run: TrenchRun, d: number): number => { let n = 0; for (const x of run.acts[d]) if (x >= 2) n++; return n; };
export const truceCount = (run: TrenchRun, d: number): number => run.truce[d].reduce((a, b) => a + b, 0);
export const truceShare = (run: TrenchRun, from = 0, to = run.acts.length): number => {
  let s = 0, n = 0;
  for (let d = from; d < to; d++) { s += truceCount(run, d); n += TR.S; }
  return n ? s / n : 0;
};
/** Son 7 günde (d dahil) gerçek ateş eden birlik-günü sayısı. */
export const weekFire = (run: TrenchRun, d: number): number => { let n = 0; for (let k = Math.max(0, d - 6); k <= d; k++) n += fireCount(run, k); return n; };
/** İlk gün: sektörlerin en az yarısı ateşkeste. */
export const firstTruceDay = (run: TrenchRun): number | null => { for (let d = 0; d < run.acts.length; d++) if (truceCount(run, d) >= TR.S / 2) return d; return null; };
/** Ateşkesten sonra bir sektörde art arda 4 gün gerçek ateş (intikam döngüsü): ilk gün. */
export function firstFeudDay(run: TrenchRun): number | null {
  const t = firstTruceDay(run);
  if (t === null) return null;
  let best: number | null = null;
  for (let s = 0; s < TR.S; s++) {
    let streak = 0;
    for (let d = t; d < run.acts.length; d++) {
      streak = run.acts[d][s] >= 2 || run.acts[d][TR.S + s] >= 2 ? streak + 1 : 0;
      if (streak >= 4) { if (best === null || d < best) best = d; break; }
    }
  }
  return best;
}
export const meanKnow = (run: TrenchRun, d: number): number => mean(run.know[d]);

/** Aynı ayarda çok tohumun ortalama ateşkes oranı (gün 28 sonrası). */
export function ensembleTruce(p: TrenchParams, seeds = 6, from = 28): number {
  let s = 0;
  for (let k = 1; k <= seeds; k++) s += truceShare(simulateTrench(p, 100 + k), from);
  return s / seeds;
}

export function describeTrench(run: TrenchRun, d: number): string {
  const t = truceCount(run, d), wf = weekFire(run, d), first = firstTruceDay(run);
  const day = `${d + 1}. gün`;
  if (first === null || first > d) return `${day}: ateşkes henüz kurulmadı (${t}/${TR.S} sektör); son hafta ${wf} gerçek atış var.`;
  return `${day}: ateşkesteki sektör ${t}/${TR.S}, son hafta ${wf} gerçek atış; ilk ateşkes ${first + 1}. günde.`;
}

/* ===================================================================== */
/* 2a · Temas                                                            */
/* ===================================================================== */

export const CT = { n: 12, rounds: 40, program: 20, eta: 0.03 } as const;
export interface ContactParams { status: number; goal: number; support: number; strength: number; follow: number }
export const CONTACT_DEFAULT: ContactParams = { status: 1, goal: 1, support: 1, strength: 1, follow: 1 };
/** pairs[t][i]: t. turda A grubundaki i'nin B'deki eşi; temas yoksa -1. */
export interface ContactRun { p: ContactParams; mean: number[]; agents: Float32Array[]; pairs: Int8Array[] }

export function simulateContact(p: ContactParams, seed: number): ContactRun {
  const rnd = mulberry32(seed * 104729 + 7);
  const n = CT.n, N = 2 * n;
  const pr = Float64Array.from({ length: N }, () => 0.45 + 0.35 * rnd());
  const base = Float64Array.from(pr);
  const stays = Uint8Array.from({ length: N }, () => (rnd() < p.follow ? 1 : 0));
  const q = (p.status + p.goal + p.support) / 3, e0 = 2 * q - 1;
  const agents = [Float32Array.from(pr)], means = [mean(pr)], pairs = [new Int8Array(n).fill(-1)];
  for (let t = 1; t <= CT.rounds; t++) {
    const perm = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const next = Float64Array.from(pr);
    const touched = new Uint8Array(N), pair = new Int8Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const a = i, b = n + perm[i];
      if (t > CT.program && !(stays[a] && stays[b])) continue;
      touched[a] = touched[b] = 1;
      pair[i] = perm[i];
      for (const [x, y] of [[a, b], [b, a]]) {
        const e = clamp(e0 - 0.3 * (pr[y] - 0.5), -1, 1);
        next[x] = e > 0 ? pr[x] - CT.eta * p.strength * e * pr[x] : pr[x] + 0.6 * CT.eta * p.strength * -e * (1 - pr[x]);
      }
    }
    // Teması olmayan ajanlar çevrenin ağırlığıyla başlangıç tutumuna doğru kayar.
    if (t > CT.program) for (let i = 0; i < N; i++) if (!touched[i]) next[i] = pr[i] + 0.04 * (base[i] - pr[i]);
    pr.set(next);
    agents.push(Float32Array.from(pr));
    means.push(mean(pr));
    pairs.push(pair);
  }
  return { p, mean: means, agents, pairs };
}

export const conditionsMet = (p: ContactParams): number => [p.status, p.goal, p.support].filter((x) => x >= 0.5).length;

export function describeContact(run: ContactRun, t: number): string {
  const m = run.mean[t], m0 = run.mean[0];
  const phase = t <= CT.program ? 'program sürüyor' : run.p.follow < 0.5 ? 'program bitti, çoğu temas kesildi' : 'temas sürüyor';
  const dir = m < m0 - 0.02 ? `önyargı ${pc(m0)}'den ${pc(m)}'e düştü` : m > m0 + 0.02 ? `önyargı ${pc(m0)}'den ${pc(m)}'e çıktı` : `önyargı yerinde (${pc(m)})`;
  return `${t}. tur, 3 koşuldan ${conditionsMet(run.p)}'ü sağlanıyor, ${phase}: ${dir}.`;
}

/* ===================================================================== */
/* 2b · Orman toplulukları (Rustagi)                                     */
/* ===================================================================== */

export const FO = { n: 24, years: 40, r: 0.35, kappa: 0.55, start: 0.9, villages: BOOK.villages } as const;
export interface VillageParams { free: number; willing: number; cost: number }
export const VILLAGE_DEFAULT: VillageParams = { free: 0.2, willing: 0.6, cost: 0.4 };
export interface VillageRun { stock: number[]; patrollers: number; coverage: number; harvest: number; end: number }

export function simulateVillage(p: VillageParams, seed: number): VillageRun {
  const rnd = mulberry32(seed * 6151 + 3);
  const nFree = Math.round(p.free * FO.n), nCC = FO.n - nFree;
  let m = 0;
  for (let i = 0; i < nCC; i++) if (clamp(p.willing + (rnd() - 0.5) * 0.5) > p.cost) m++;
  const coverage = 1 - Math.exp(-m / 8);
  const eFree = 1 - 0.8 * coverage;
  let eCC = 0.35, F: number = FO.start, xbar = 0;
  const stock = [F];
  for (let y = 0; y < FO.years; y++) {
    xbar = (nFree * eFree + nCC * eCC) / FO.n;
    F = clamp(F + FO.r * F * (1 - F) - FO.kappa * xbar * F);
    stock.push(F);
    eCC = clamp(xbar - 0.05, 0.2, 1);
  }
  return { stock, patrollers: m, coverage, harvest: xbar, end: F };
}

export interface ForestPoint { willing: number; end: number; coverage: number }
/** 49 köy: ortalama cezalandırma isteği ve bedavacı payı köyden köye değişir. */
export function simulateVillages(cost: number, seed: number): ForestPoint[] {
  const rnd = mulberry32(seed * 31 + 5);
  return Array.from({ length: FO.villages }, (_, k) => {
    const willing = 0.1 + 0.8 * rnd(), free = 0.1 + 0.25 * rnd();
    const r = simulateVillage({ free, willing, cost }, seed * 100 + k);
    return { willing, end: r.end, coverage: r.coverage };
  });
}
export function correlation(xs: number[], ys: number[]): number {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}

export function describeVillage(r: VillageRun, p: VillageParams): string {
  const health = r.end > 0.55 ? 'orman sağlıklı' : r.end > 0.25 ? 'orman zayıflıyor' : 'orman çöküyor';
  return `Bedavacı payı ${pc(p.free)}, devriyeci ${r.patrollers} kişi (kapsama ${pc(r.coverage)}): ${FO.years} yıl sonra ${health} (stok ${pc(r.end)}).`;
}

/* ===================================================================== */
/* 2c · Hatıra fotoğrafı (Gneezy)                                        */
/* ===================================================================== */

export type Cond = 'sabit' | 'pwyw' | 'sabitHayir' | 'pwywHayir';
export const CONDS: Cond[] = ['sabit', 'pwyw', 'sabitHayir', 'pwywHayir'];
export const PY = { price: 10, cost: 1.2, n: 800, amp: 2 } as const;
export interface PayParams { share: number; glow: number; norm: number }
export const PAY_DEFAULT: PayParams = { share: 0.5, glow: 0.4, norm: 0.5 };
export const COND_NAME: Record<Cond, string> = { sabit: 'Sabit fiyat', pwyw: 'İstediğin kadar öde', sabitHayir: 'Sabit fiyat + hayır payı', pwywHayir: 'Öde + hayır payı' };
export interface CondOut { cond: Cond; buyers: number; sales: number; avgPaid: number; profit: number; donation: number }

export function simulatePay(p: PayParams, seed: number): Record<Cond, CondOut> {
  const rnd = mulberry32(seed * 977 + 41);
  const cust = Array.from({ length: PY.n }, () => ({ v: 3 * Math.exp(0.9 * gauss(rnd)), g: p.glow * rnd(), k: p.norm * Math.exp(0.5 * gauss(rnd)) }));
  const out = {} as Record<Cond, CondOut>;
  for (const cond of CONDS) {
    const c = cond === 'sabit' || cond === 'pwyw' ? 0 : p.share;
    let buyers = 0, paid = 0;
    for (const u of cust) {
      if (cond === 'sabit' || cond === 'sabitHayir') {
        if (u.v - PY.price * (1 - u.g * c) >= 0) { buyers++; paid += PY.price; }
        continue;
      }
      const k = u.k * (1 + PY.amp * c), eff = 1 - u.g * c;
      const pay = clamp(PY.price - (PY.price * eff) / (2 * k), 0, PY.price);
      const cost = eff * pay + (k * (PY.price - pay) ** 2) / PY.price;
      if (u.v - cost >= 0) { buyers++; paid += pay; }
    }
    const per = 100 / PY.n;
    out[cond] = {
      cond, buyers, sales: buyers * per, avgPaid: buyers ? paid / buyers : 0,
      profit: (paid * (1 - c) - PY.cost * buyers) * per, donation: paid * c * per,
    };
  }
  return out;
}

/* ===================================================================== */
/* 3 · Babunlar                                                          */
/* ===================================================================== */

export const BB = { days: 540, outbreak: 90, firstArrival: 150, last: 480, females: 24, dump: 12, calm: 12, aggDump: 0.98, aggCalm: 0.3, bg: 0.5, newcomerAgg: 0.75 } as const;
export interface BabParams { kill: number; gap: number; months: number }
export const BABOON_DEFAULT: BabParams = { kill: 1, gap: 75, months: 6 };

/** Dişi gerginliği: erkek saldırganlığı arttıkça artar (modelin varsayımı). */
export const femaleStress = (agg: number): number => 0.1 + 0.9 * Math.pow(clamp(agg), 1.5);
/** Yerleşik dişilerin yeni gelene yaklaşması için beklenen gün: gerginlikle üstel artar (varsayım; kitaptaki "günler-haftalar" ile "iki aydan uzun" arasına kalibre). */
export const approachDays = (stress: number): number => Math.min(240, 1.87 * Math.exp(6.58 * stress));

export interface Resident { sex: 'F' | 'M'; kind: 'dump' | 'calm' | 'fem'; diesDay: number | null; agg: number }
export interface Newcomer { arrive: number; contact: number | null; a: number[] }
export interface BabRun {
  p: BabParams;
  residents: Resident[];
  newcomers: Newcomer[];
  /** Gün başına: erkeklerin (yerleşik + yeni) ortalama saldırganlığı, dişi gerginliği, yeni gelenlerin ortalaması (yoksa NaN), yaşayan dişi ve erkek sayısı. */
  maleAgg: number[]; stress: number[]; newAgg: number[]; females: number[]; males: number[]; resMales: number[];
}

export function simulateBaboons(p: BabParams, seed: number): BabRun {
  const rnd = mulberry32(seed * 4421 + 9);
  const eta = Math.log(10) / (p.months * 30);
  const pick = (n: number, k: number): Set<number> => {
    const idx = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return new Set(idx.slice(0, k));
  };
  const killD = pick(BB.dump, Math.round(clamp(p.kill) * BB.dump)), killC = pick(BB.calm, Math.round(BB.calm * BB.bg)), killF = pick(BB.females, Math.round(BB.females * BB.bg));
  const residents: Resident[] = [];
  for (let i = 0; i < BB.females; i++) residents.push({ sex: 'F', kind: 'fem', diesDay: killF.has(i) ? BB.outbreak : null, agg: 0 });
  for (let i = 0; i < BB.dump; i++) residents.push({ sex: 'M', kind: 'dump', diesDay: killD.has(i) ? BB.outbreak : null, agg: clamp(BB.aggDump + 0.04 * gauss(rnd), 0.7, 1) });
  for (let i = 0; i < BB.calm; i++) residents.push({ sex: 'M', kind: 'calm', diesDay: killC.has(i) ? BB.outbreak : null, agg: clamp(BB.aggCalm + 0.06 * gauss(rnd), 0.1, 0.5) });
  const newcomers: Newcomer[] = [];
  for (let d = BB.firstArrival; d <= BB.last; d += p.gap) newcomers.push({ arrive: d, contact: null, a: [] });
  const out: BabRun = { p, residents, newcomers, maleAgg: [], stress: [], newAgg: [], females: [], males: [], resMales: [] };
  const cur = newcomers.map(() => BB.newcomerAgg);
  for (let d = 0; d < BB.days; d++) {
    const alive = (r: Resident): boolean => r.diesDay === null || d < r.diesDay;
    const rm = residents.filter((r) => r.sex === 'M' && alive(r));
    const live = newcomers.flatMap((n, i) => (d >= n.arrive ? [cur[i]] : []));
    const agg = mean([...rm.map((r) => r.agg), ...live]);
    const s = femaleStress(agg);
    out.maleAgg.push(agg);
    out.stress.push(s);
    out.females.push(residents.filter((r) => r.sex === 'F' && alive(r)).length);
    out.males.push(rm.length + live.length);
    out.resMales.push(rm.length);
    newcomers.forEach((n, i) => {
      if (d < n.arrive) { n.a.push(NaN); return; }
      if (n.contact === null && rnd() < 1 / approachDays(s)) n.contact = d;
      if (n.contact !== null) cur[i] += eta * (agg - cur[i]);
      n.a.push(cur[i]);
    });
    out.newAgg.push(live.length ? mean(live) : NaN);
  }
  return out;
}

export function describeBaboons(run: BabRun, d: number): string {
  const ay = `${Math.floor(d / 30) + 1}. ay`;
  const approach = Math.round(approachDays(run.stress[d]));
  const arrived = run.newcomers.filter((n) => n.arrive <= d).length;
  if (d < BB.outbreak) return `${ay}: çöplükçü erkekler sağ; erkek saldırganlığı ${pc(run.maleAgg[d])}, dişi gerginliği ${pc(run.stress[d])}. Dişiler yeni bir erkeğe ortalama ${approach} günde yaklaşır.`;
  const f = run.females[d], m = run.resMales[d];
  const nw = arrived ? ` ${arrived} yeni erkek geldi, ortalama saldırganlıkları ${pc(run.newAgg[d])}.` : ' Henüz yeni erkek gelmedi.';
  return `${ay}: dişi:erkek ${(m ? f / m : 0).toFixed(1).replace('.', ',')}:1, erkek saldırganlığı ${pc(run.maleAgg[d])}, dişi gerginliği ${pc(run.stress[d])}; dişiler yeni gelene ortalama ${approach} günde yaklaşır.${nw}`;
}

const f1 = (x: number): string => x.toFixed(1).replace('.', ',');
export function describePay(o: Record<Cond, CondOut>, c: Cond): string {
  const r = o[c];
  return `${COND_NAME[c]}: 100 ziyaretçiden ${f1(r.sales)}'i alır, alıcı ortalama ${f1(r.avgPaid)} öder (sabit fiyat ${PY.price}); kâr ${f1(r.profit)}, hayra giden ${f1(r.donation)}.`;
}
