// "Biz ve Onlar" modeli (DOM yok): üç ayrı mekanizma.
//  1) Tajfel matrisi: seçim, birleşik kazanç / iç grup kazancı / fark / adalet çekimlerinin softmax karışımı.
//  2) Kurzban: "kim ne dedi" karışmaları, işaretlerin koalisyon bilgisine göre ağırlıklanması.
//  3) Sıcaklık-yetkinlik (Fiske): konumdan duygu ve davranış eğilimi; Durante: eşitsizlik ve karışık stereotip.
// Kitaptan gelen yönler testlerde kalibrasyon noktasıdır; büyüklükler modelin varsayımıdır.
import { mulberry32 } from './rng';
export { mulberry32 };

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

// ======================================================================= 1) Tajfel
export interface Matrix { id: string; kind: 'A' | 'B'; own: number[]; other: number[] }
const rev = (a: number[]) => a.slice().reverse();
/**
 * İki ana matris türü. A: iç grubun kazancı ve toplam kazanç bir uçta, fark öbür uçta.
 * B: iç grubun kazancı ve fark bir uçta, toplam kazanç öbür uçta. İkincileri ters çevrilmiş (konum yanlılığı olmasın).
 */
export const MATRICES: Matrix[] = [
  { id: 'm1', kind: 'A', own: [7, 9, 11, 13, 15, 17, 19], other: [1, 5, 9, 13, 17, 21, 25] },
  { id: 'm2', kind: 'B', own: [7, 8, 9, 10, 11, 12, 13], other: [19, 17, 15, 13, 11, 9, 7] },
  { id: 'm3', kind: 'A', own: rev([5, 7, 9, 11, 13, 15, 17]), other: rev([1, 4, 7, 10, 13, 16, 19]) },
  { id: 'm4', kind: 'B', own: rev([5, 6, 7, 8, 9, 10, 11]), other: rev([17, 15, 13, 11, 9, 7, 5]) },
];
export const COLS = 7;

export interface ColInfo { own: number; other: number; joint: number; diff: number }
export function col(m: Matrix, c: number): ColInfo {
  const own = m.own[c], other = m.other[c];
  return { own, other, joint: own + other, diff: own - other };
}
const argmax = (m: Matrix, f: (i: ColInfo) => number) => {
  let best = 0;
  for (let c = 1; c < COLS; c++) if (f(col(m, c)) > f(col(m, best))) best = c;
  return best;
};
/** Üç stratejinin (en büyük toplam, en büyük iç grup kazancı, en büyük fark) ve adil sütunun yeri. */
export function strategyCols(m: Matrix) {
  let fair = 0;
  for (let c = 1; c < COLS; c++) if (Math.abs(col(m, c).diff) < Math.abs(col(m, fair).diff)) fair = c;
  return { mjp: argmax(m, (i) => i.joint), mip: argmax(m, (i) => i.own), md: argmax(m, (i) => i.diff), fair };
}
export interface Pick { favors: boolean; fair: boolean; sacrifices: boolean }
/** Bir seçimin sınıfı: iç grup lehine mi, eşit mi, iç grubun mutlak kazancından vazgeçti mi (yalnızca A türü). */
export function classify(m: Matrix, c: number): Pick {
  const i = col(m, c), s = strategyCols(m);
  return { favors: i.diff > 0, fair: i.diff === 0, sacrifices: m.kind === 'A' && c !== s.mip };
}

export interface TajfelInputs {
  /** Etikete bağlılık 0..1 */
  ident: number;
  /** Adalet duyarlılığı 0..1 */
  fair: number;
  /** true: ikinci alıcı da iç grup (kontrol koşulu; etiket ayrımı yok) */
  control: boolean;
  n: number;
}
export const TAJFEL_DEFAULT: TajfelInputs = { ident: 0.6, fair: 0.3, control: false, n: 80 };

interface Person { wJ: number; wI: number; wD: number; wF: number }
/** Bir sanal katılımcının ağırlıkları: birleşik kazanç, iç grup kazancı, fark ve adalet. */
function person(u: TajfelInputs, r: () => number): Person {
  const id = clamp(u.ident + 0.22 * gauss(r)), fa = clamp(u.fair + 0.22 * gauss(r));
  return { wJ: 0.03 + 0.03 * r(), wI: 0.05 + 0.03 * r(), wD: (u.control ? 0.08 : 0.75) * id * (0.7 + 0.6 * r()), wF: 0.5 * fa };
}
const TEMP = 0.6;
export function choiceProbs(m: Matrix, p: Person): number[] {
  const us = Array.from({ length: COLS }, (_, c) => {
    const i = col(m, c);
    return p.wJ * i.joint + p.wI * i.own + p.wD * i.diff - p.wF * Math.abs(i.diff);
  });
  const mx = Math.max(...us);
  const ex = us.map((v) => Math.exp((v - mx) / TEMP));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map((v) => v / s);
}

export interface TajfelResult {
  /** hist[matris][sütun]: o sütunu seçenlerin oranı */
  hist: number[][];
  favorShare: number;
  fairShare: number;
  /** A türü matrislerde iç grup lehine farkı seçip iç grubun mutlak kazancından vazgeçenlerin oranı */
  sacrificeShare: number;
  /** Ortalama (iç grup - dış grup) puan farkı, tüm matrislerde */
  meanDiff: number;
}
export function simulateTajfel(u: TajfelInputs, seed: number): TajfelResult {
  const r = mulberry32(seed * 104729 + 17);
  const hist = MATRICES.map(() => new Array<number>(COLS).fill(0));
  let fav = 0, fair = 0, sac = 0, sacN = 0, diff = 0, n = 0;
  for (let k = 0; k < u.n; k++) {
    const p = person(u, r);
    MATRICES.forEach((m, mi) => {
      const pr = choiceProbs(m, p);
      let x = r(), c = 0;
      while (c < COLS - 1 && x > pr[c]) { x -= pr[c]; c++; }
      hist[mi][c]++;
      const k2 = classify(m, c);
      if (k2.favors) fav++;
      if (k2.fair) fair++;
      if (m.kind === 'A') { sacN++; if (k2.sacrifices && k2.favors) sac++; }
      diff += col(m, c).diff; n++;
    });
  }
  return {
    hist: hist.map((h) => h.map((v) => v / u.n)),
    favorShare: fav / n, fairShare: fair / n, sacrificeShare: sac / sacN, meanDiff: diff / n,
  };
}

/** Kullanıcının seçimlerinden kısa profil. */
export function userProfile(picks: Array<number | null>): { kind: 'none' | 'diff' | 'gain' | 'fair' | 'mixed'; text: string } {
  const done = picks.map((c, i) => (c === null ? null : { c, m: MATRICES[i] })).filter((x): x is { c: number; m: Matrix } => !!x);
  if (!done.length) return { kind: 'none', text: '' };
  const half = Math.ceil(done.length / 2);
  const md = done.filter((x) => { const k = classify(x.m, x.c); return k.favors && k.sacrifices; }).length;
  const fair = done.filter((x) => classify(x.m, x.c).fair).length;
  const gain = done.filter((x) => { const s = strategyCols(x.m); return x.c === s.mip || x.c === s.mjp; }).length;
  if (md > 0 && md >= half) return { kind: 'diff', text: 'iç grubun mutlak kazancından vazgeçip farkı büyüttü' };
  if (fair >= half) return { kind: 'fair', text: 'çoğunlukla eşit dağıttı' };
  if (gain >= half) return { kind: 'gain', text: 'kazancı büyütmeye baktı, farkı değil' };
  return { kind: 'mixed', text: 'karma bir örüntü izledi' };
}

// ======================================================================= 2) Kurzban
export interface Target { race: 0 | 1; shirt: 0 | 1 }
/** 8 kişi: 2 ırk x 2 gömlek x 2 kişi. */
export const TARGETS: Target[] = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ race: (i & 1) as 0 | 1, shirt: ((i >> 1) & 1) as 0 | 1 }));

export interface KurzbanInputs {
  shirts: boolean;
  /** Gömlek rengi ne kadar göze çarpıyor 0..1 */
  shirtVis: number;
  /** Gömlek rengi kimin kiminle birlikte olduğunu ne kadar belli ediyor 0..1 */
  coalition: number;
  /** Irk işareti (Siyah / Beyaz) ne kadar belirgin 0..1 */
  raceSal: number;
}
export const KURZBAN_DEFAULT: KurzbanInputs = { shirts: false, shirtVis: 0.9, coalition: 0.8, raceSal: 0.7 };
const BETA = 1.6;

/** İşaret ağırlıkları: ırk ağırlığı, gömlek koalisyon bilgisi verdikçe düşer; hepsi koşulludur. */
export function cueWeights(u: KurzbanInputs): { race: number; shirt: number } {
  const c = u.shirts ? u.coalition * u.shirtVis : 0;
  return { race: u.raceSal * (1 - 0.85 * c), shirt: c };
}
/** i. kişinin cümlesi yanlış atfedilirse her bir diğer kişiye düşme olasılığı. */
export function confusion(u: KurzbanInputs, i: number): number[] {
  const w = cueWeights(u);
  const ex = TARGETS.map((t, j) => (j === i ? 0 : Math.exp(BETA * (w.race * +(t.race === TARGETS[i].race) + w.shirt * +(t.shirt === TARGETS[i].shirt)))));
  const s = ex.reduce((a, b) => a + b, 0);
  return ex.map((v) => v / s);
}
export interface KurzbanShares {
  /** aynı ırk + aynı gömlek, yalnız ırk, yalnız gömlek, ikisi de farklı */
  both: number; raceOnly: number; shirtOnly: number; neither: number;
  sameRace: number; sameShirt: number;
}
/** Rastgele atıfta beklenen paylar: 7 aday içinde 1 hem ırk hem gömlek, 2 yalnız ırk, 2 yalnız gömlek, 2 hiçbiri. */
export const CHANCE = { both: 1 / 7, pair: 2 / 7, same: 3 / 7 };
function tally(counts: number[]): KurzbanShares {
  const s = counts.reduce((a, b) => a + b, 0) || 1;
  const [both, raceOnly, shirtOnly, neither] = counts.map((v) => v / s);
  return { both, raceOnly, shirtOnly, neither, sameRace: both + raceOnly, sameShirt: both + shirtOnly };
}
const cat = (i: number, j: number) =>
  TARGETS[i].race === TARGETS[j].race ? (TARGETS[i].shirt === TARGETS[j].shirt ? 0 : 1) : TARGETS[i].shirt === TARGETS[j].shirt ? 2 : 3;
/** Beklenen paylar (sonsuz katılımcı). */
export function expectedShares(u: KurzbanInputs): KurzbanShares {
  const c = [0, 0, 0, 0];
  for (let i = 0; i < 8; i++) confusion(u, i).forEach((p, j) => { if (j !== i) c[cat(i, j)] += p; });
  return tally(c);
}
export const ERR_RATE = 0.35;
/** Sanal katılımcılar: her biri 8 cümleyi hatırlamaya çalışır; hatalı atıflar sayılır. */
export function simulateMemory(u: KurzbanInputs, seed: number, people = 40): KurzbanShares & { errors: number } {
  const r = mulberry32(seed * 7907 + 3);
  const counts = [0, 0, 0, 0];
  for (let k = 0; k < people; k++) {
    for (let i = 0; i < 8; i++) {
      if (r() > ERR_RATE) continue;
      let x = r();
      const pr = confusion(u, i);
      let j = 0;
      while (j < 7) {
        if (j !== i) { if (x <= pr[j]) break; x -= pr[j]; }
        j++;
      }
      if (j === i) j = (i + 1) % 8;
      counts[cat(i, j)]++;
    }
  }
  return { ...tally(counts), errors: counts.reduce((a, b) => a + b, 0) };
}

// ======================================================================= 3) Fiske / Durante
export interface Pos { w: number; c: number }
export type Emotion = 'gurur' | 'kiskanclik' | 'acima' | 'tiksinme';
export const EMOTIONS: Emotion[] = ['gurur', 'kiskanclik', 'acima', 'tiksinme'];
export const EMO_NAME: Record<Emotion, string> = { gurur: 'Gurur', kiskanclik: 'Kıskançlık', acima: 'Acıma', tiksinme: 'Tiksinme' };
/** Çift doğrusal üyelik: toplamı 1; köşede o duygu, ortada karışık. */
export function emotions(p: Pos): Record<Emotion, number> {
  return { gurur: p.w * p.c, kiskanclik: (1 - p.w) * p.c, acima: p.w * (1 - p.c), tiksinme: (1 - p.w) * (1 - p.c) };
}
export function dominant(p: Pos): Emotion {
  const e = emotions(p);
  return EMOTIONS.reduce((a, b) => (e[b] > e[a] ? b : a));
}
export interface Behaviors { yardim: number; iliski: number; dislama: number; saldiri: number }
/** Duygudan davranış eğilimi (modelin varsayımı): yardım ve saldırı aktif, ilişki kurma ve dışlama pasif. */
export function behaviors(p: Pos): Behaviors {
  const e = emotions(p);
  return {
    yardim: clamp(0.9 * e.acima + 0.6 * e.gurur + 0.1 * e.kiskanclik),
    iliski: clamp(0.9 * e.gurur + 0.5 * e.kiskanclik + 0.2 * e.acima),
    dislama: clamp(0.9 * e.tiksinme + 0.3 * e.acima + 0.2 * e.kiskanclik),
    saldiri: clamp(0.8 * e.tiksinme + 0.7 * e.kiskanclik),
  };
}
/** Karışık köşede (sıcak-yetkinsiz ya da soğuk-yetkin) mi? */
export const isMixed = (p: Pos) => p.w > 0.5 !== p.c > 0.5;

export const GINI_MIN = 0.25, GINI_MAX = 0.6, SOC_N = 40;
/**
 * Bir toplumun grupları: düşük eşitsizlikte sıcaklık ve yetkinlik birlikte gider (hale);
 * eşitsizlik arttıkça telafi eden karışık algı artar ("yetkin ama soğuk", "sıcak ama yetkinsiz").
 */
export function society(gini: number, seed: number): Pos[] {
  const r = mulberry32(seed * 3571 + 11);
  const lam = 0.85 * clamp((gini - GINI_MIN) / (GINI_MAX - GINI_MIN));
  return Array.from({ length: SOC_N }, () => {
    const c0 = 0.08 + 0.84 * r(), v = 0.08 + 0.84 * r(), z = 0.1 * gauss(r);
    const w0 = 0.35 * c0 + 0.65 * v;
    return { c: c0, w: clamp((1 - lam) * w0 + lam * (1 - c0) + z, 0.03, 0.97) };
  });
}
export const mixedShare = (ps: Pos[]) => ps.filter(isMixed).length / ps.length;
export function corr(ps: Pos[]): number {
  const n = ps.length, mw = ps.reduce((a, p) => a + p.w, 0) / n, mc = ps.reduce((a, p) => a + p.c, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const p of ps) { sxy += (p.w - mw) * (p.c - mc); sxx += (p.w - mw) ** 2; syy += (p.c - mc) ** 2; }
  return sxy / Math.sqrt(sxx * syy || 1);
}

const pc = (v: number) => Math.round(v * 100);
export function describeTajfel(u: TajfelInputs, r: TajfelResult): string {
  if (u.control) return `İki alıcı da iç grupta: ayrım etiketi yok. İç grup lehine seçim %${pc(r.favorShare)}, eşit dağıtım %${pc(r.fairShare)}.`;
  return `Sanal katılımcıların %${pc(r.favorShare)}'i iç grup lehine seçti; A türü matrislerde %${pc(r.sacrificeShare)}'i iç grubun mutlak kazancından vazgeçip farkı seçti.`;
}
export function describeKurzban(u: KurzbanInputs, s: KurzbanShares): string {
  return u.shirts
    ? `Hatalı atıfların %${pc(s.sameShirt)}'i aynı formaya, %${pc(s.sameRace)}'i aynı ırka gitti (şans %43). Forma koalisyon ipucuysa ırka göre kümelenme azalır.`
    : `Forma yokken hatalı atıfların %${pc(s.sameRace)}'i aynı ırktan kişiye gitti (şans %43): ırk kodlanıyor.`;
}
export function describePos(name: string, p: Pos): string {
  const d = dominant(p), e = emotions(p), b = behaviors(p);
  const top = (['yardim', 'iliski', 'dislama', 'saldiri'] as const).reduce((x, y) => (b[y] > b[x] ? y : x));
  const T = { yardim: 'yardım (aktif)', iliski: 'ilişki kurma (pasif)', dislama: 'dışlama (pasif)', saldiri: 'saldırı (aktif)' };
  return `${name}: baskın duygu ${EMO_NAME[d].toLowerCase()} (%${pc(e[d])}); en güçlü eğilim ${T[top]}.`;
}
