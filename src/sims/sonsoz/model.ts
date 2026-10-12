// Sonsöz simülasyonu: saf model (DOM yok).
// Sekme 1: aynı ortalamaya sahip iki popülasyonda eşiği aşan pay (dağılımın kuyrukları).
// Sekme 2: "biz" sayılanların ayarlarla (ortak hedef, etiket, temas, tehdit, zaman) yeniden çizilmesi.
// Kitapta sayısal veri yok; bütün büyüklükler modelin varsayımıdır, yalnızca yönler kitaptandır.
import { normal, type Rng } from '../rng';

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));

/* ======================= 1) Ortalama mı, dağılım mı? ======================= */
export const LO = 0;
export const HI = 100;

/** Standart normal üst kuyruk olasılığı (Numerical Recipes erfc; göreli hata ~1e-7). */
function erfc(x: number): number {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 +
    t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
export const upperTail = (z: number): number => 0.5 * erfc(z / Math.SQRT2);

export type Shape = 'bell' | 'twin';
export interface Pop { mean: number; sd: number; shape: Shape }
export interface OrtInputs { mean: number; sdA: number; sdB: number; shapeB: Shape; thr: number; ctx: number }
export const ORT_DEFAULT: OrtInputs = { mean: 50, sdA: 6, sdB: 16, shapeB: 'bell', thr: 75, ctx: 0 };

/** İki tepeli popülasyonda her alt kümenin kendi içindeki yayılımı (toplam sapmanın oranı). */
const TWIN_W = 0.45;
interface Comp { w: number; m: number; s: number }
export function components(p: Pop): Comp[] {
  if (p.shape === 'bell') return [{ w: 1, m: p.mean, s: p.sd }];
  const off = p.sd * Math.sqrt(1 - TWIN_W * TWIN_W), s = p.sd * TWIN_W;
  return [{ w: 0.5, m: p.mean - off, s }, { w: 0.5, m: p.mean + off, s }];
}
/** Eşiğin üstündeki pay. */
export const survival = (p: Pop, x: number): number => components(p).reduce((a, c) => a + c.w * upperTail((x - c.m) / c.s), 0);
export const density = (p: Pop, x: number): number =>
  components(p).reduce((a, c) => a + (c.w / (c.s * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - c.m) / c.s) ** 2), 0);

export const popsOf = (i: OrtInputs): { A: Pop; B: Pop } => ({
  A: { mean: i.mean + i.ctx, sd: i.sdA, shape: 'bell' },
  B: { mean: i.mean + i.ctx, sd: i.sdB, shape: i.shapeB },
});

export interface OrtResult { a: number; b: number; ratio: number; fromB: number; matchShift: number }
export function evaluate(i: OrtInputs): OrtResult {
  const { A, B } = popsOf(i);
  const a = survival(A, i.thr), b = survival(B, i.thr);
  // A'nın B ile aynı payı yakalaması için ortalamasının kaç puan artması gerekir (ikili arama).
  let lo = -100, hi = 200;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (survival({ ...A, mean: A.mean + mid }, i.thr) < b) lo = mid; else hi = mid;
  }
  return { a, b, ratio: a > 0 ? b / a : Infinity, fromB: a + b > 0 ? b / (a + b) : 0.5, matchShift: (lo + hi) / 2 };
}

/** Bir popülasyonun rastlantı temeli: aynı kişiler kaydırıcılarla birlikte yer değiştirir (z ve alt küme seçimi sabit). */
export interface Base { z: number[]; u: number[] }
export function baseDraw(n: number, rnd: Rng): Base {
  const z: number[] = [], u: number[] = [];
  for (let k = 0; k < n; k++) { z.push(normal(rnd)); u.push(rnd()); }
  return { z, u };
}
export function place(p: Pop, b: Base): number[] {
  const cs = components(p);
  return b.z.map((z, k) => { const c = cs.length === 1 || b.u[k] < 0.5 ? cs[0] : cs[1]; return clamp(c.m + c.s * z, LO, HI); });
}
export function histogram(xs: number[], bins: number): number[] {
  const h = new Array<number>(bins).fill(0);
  for (const x of xs) h[Math.min(bins - 1, Math.floor(((x - LO) / (HI - LO)) * bins))]++;
  return h;
}

/** Küçük payları okunur yazar: "<%0,01", "%0,3", "%12". */
export function share(v: number): string {
  if (v < 0.0001) return '<%0,01';
  if (v < 0.01) return `%${(v * 100).toFixed(2).replace('.', ',')}`;
  if (v < 0.1) return `%${(v * 100).toFixed(1).replace('.', ',')}`;
  return `%${Math.round(v * 100)}`;
}

export function describeOrt(i: OrtInputs, r: OrtResult): string {
  if (r.b < 0.0001 && r.a < 0.0001) return 'Ortalama aynı; ama eşik iki popülasyonun da çok uzağında, kimse aşmıyor. Eşiği indir ya da bağlamı kaydır.';
  const big = r.fromB >= 0.5 ? 'B' : 'A', f = Math.max(r.fromB, 1 - r.fromB);
  const tail = f > 0.995 ? `eşiği aşanların neredeyse hepsi ${big}'den` : `eşiği aşanların %${Math.round(f * 100)}'i ${big}'den`;
  const need = r.matchShift > 1 ? ` A'nın B'ye yetişmesi için ortalamasının ${Math.round(r.matchShift)} puan artması gerekir.` : '';
  return `Ortalama aynı (${Math.round(i.mean + i.ctx)}) ama eşiği aşan A'da ${share(r.a)}, B'de ${share(r.b)}: ${tail}.${need}`;
}

/* ======================= 2) Biz/Onlar kaydırıcısı ======================= */
export interface Person { id: number; x: number; y: number; g: 0 | 1; c: 0 | 1; bias: number }
export const N_PEOPLE = 24;
export const VIEW_W = 360;
export const VIEW_H = 232;

/** 2 grup x 2 çapraz etiket (her hücrede 6 kişi). Konumlar tohumludur ve sabittir. */
export function makePeople(rnd: Rng): Person[] {
  const people: Person[] = [];
  const per = N_PEOPLE / 2;
  for (const g of [0, 1] as const) {
    const cs: Array<0 | 1> = [];
    for (let k = 0; k < per; k++) cs.push(k % 2 === 0 ? 0 : 1);
    for (let k = per - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [cs[k], cs[j]] = [cs[j], cs[k]]; }
    for (let k = 0; k < per; k++) {
      const col = k % 3, row = Math.floor(k / 3);
      people.push({
        id: g * per + k, g, c: cs[k],
        x: (g === 0 ? 70 : 290) + (col - 1) * 42 + (rnd() - 0.5) * 14,
        y: 46 + row * 47 + (rnd() - 0.5) * 12,
        bias: clamp(normal(rnd) * 0.04, -0.08, 0.08),
      });
    }
  }
  return people;
}

export interface BizInputs { goal: number; label: number; contact: number; threat: number; time: number }
export const BIZ_DEFAULT: BizInputs = { goal: 0, label: 0, contact: 0, threat: 0.2, time: 0.8 };

/** Etkilerin zamanla oturması: ortak hedef, etiket ve temas hemen değil, süreçte işler. */
export const settle = (time: number): number => 1 - Math.exp(-3 * time);

/** Merkezdeki kişinin başka birine yakınlığı (0-1). */
export function closeness(i: BizInputs, sameG: boolean, sameC: boolean, bias = 0): number {
  const T = settle(i.time), calm = 1 - 0.5 * i.threat;
  const Le = i.label * T * calm, Ge = i.goal * T * calm;
  const Ce = i.contact * T * calm * (0.5 + 0.5 * i.goal);
  const wG = 0.9 * (1 - 0.8 * Le) * (1 + 0.6 * i.threat), wC = 0.8 * Le;
  const out = sameG ? 0 : 1;
  const raw = 0.1 + wG * +sameG + wC * +sameC + 0.45 * Ge + 0.6 * Ce * out - 0.15 * i.threat * out + bias;
  return clamp(raw);
}

export type Tier = 'biz' | 'ara' | 'onlar';
export const BIZ_AT = 0.5;
export const ARA_AT = 0.3;
export const tierOf = (s: number): Tier => (s >= BIZ_AT ? 'biz' : s >= ARA_AT ? 'ara' : 'onlar');

export interface BizView {
  scores: number[];                 // ego için NaN
  tiers: Array<Tier | 'ego'>;
  nBiz: number; nAra: number;
  bizOld: number; bizNew: number;   // eski grup içinden / dışından "biz" sayılanlar
  meanIn: number; meanOut: number;  // eski grup içi / dışı ortalama yakınlık
  nIn: number; nOut: number;
}
export function bizView(people: Person[], ego: number, i: BizInputs): BizView {
  const e = people[ego];
  const scores: number[] = [], tiers: Array<Tier | 'ego'> = [];
  let nBiz = 0, nAra = 0, bizOld = 0, bizNew = 0, sIn = 0, sOut = 0, nIn = 0, nOut = 0;
  for (const p of people) {
    if (p.id === ego) { scores.push(NaN); tiers.push('ego'); continue; }
    const inside = p.g === e.g;
    const s = closeness(i, inside, p.c === e.c, p.bias), t = tierOf(s);
    scores.push(s); tiers.push(t);
    if (inside) { nIn++; sIn += s; } else { nOut++; sOut += s; }
    if (t === 'biz') { nBiz++; if (inside) bizOld++; else bizNew++; } else if (t === 'ara') nAra++;
  }
  return { scores, tiers, nBiz, nAra, bizOld, bizNew, meanIn: sIn / nIn, meanOut: sOut / nOut, nIn, nOut };
}

/** Zaman çizelgesi: geçen süreye göre eski grup içinden / dışından "biz" sayılan kişi sayısı. */
export function timeline(people: Person[], ego: number, i: BizInputs, steps = 24): Array<{ t: number; old: number; neu: number }> {
  return Array.from({ length: steps + 1 }, (_, k) => {
    const t = k / steps, v = bizView(people, ego, { ...i, time: t });
    return { t, old: v.bizOld, neu: v.bizNew };
  });
}

export function describeBiz(v: BizView): string {
  const head = `Seçili kişi için ${v.nBiz} / ${N_PEOPLE - 1} kişi "biz"${v.nAra ? `, ${v.nAra} kişi arada` : ''}.`;
  if (v.bizNew === 0 && v.bizOld === v.nIn) return `${head} Sınır eski gruptan geçiyor: kendi grubu "biz", öbürü "onlar".`;
  if (v.bizNew > 0 && v.bizOld < v.nIn) return `${head} Sınır yeniden çizildi: eski dış gruptan ${v.bizNew} kişi biz sayıldı, eski grubundan ${v.nIn - v.bizOld} kişi artık "biz" değil.`;
  if (v.bizNew > 0) return `${head} Sınır genişledi: eski dış gruptan ${v.bizNew} kişi de "biz" sayıldı.`;
  return `${head} Eski grubundan ${v.nIn - v.bizOld} kişi "biz"in dışına çıktı.`;
}
