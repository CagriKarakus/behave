// Zaman merdiveni modeli (saf, DOM yok).
// 1) Merdiven: ne kadar geriye bakılırsa kaç etken ve kaç bağ görünür, kaçı dışarıda kalır.
// 2) Kategori sınırı yanılgısı: sürekli bir değişken kutulara bölününce kutu içi farklar küçülür,
//    kutular arası farklar büyür (her değer algıda kutusunun merkezine doğru çekilir).
import { LINKS, RUNGS, type Link } from './data';
import { L } from './text';

/* ---------- Merdiven ---------- */
export interface LadderStats {
  /** Görünen basamak sayısı. */
  depth: number;
  hidden: number;
  /** İki ucu da görünen bağlar. */
  seen: number;
  /** En az bir ucu dışarıda kalan bağlar. */
  cut: number;
  total: number;
}

export const clampDepth = (d: number): number => Math.max(1, Math.min(RUNGS.length, Math.round(d)));

export function ladderStats(depth: number): LadderStats {
  const d = clampDepth(depth);
  const seen = LINKS.filter((l) => l.from < d && l.to < d).length;
  return { depth: d, hidden: RUNGS.length - d, seen, cut: LINKS.length - seen, total: LINKS.length };
}

/** Bir basamağa giren ve çıkan bağlar. `from` daha derin basamaktır; ok `from`dan `to`ya gider. */
export function linksOf(i: number): { into: Link[]; out: Link[] } {
  return { into: LINKS.filter((l) => l.to === i), out: LINKS.filter((l) => l.from === i) };
}

export function describeLadder(behavior: string, depth: number, sel: number | null): string {
  const s = ladderStats(depth), T = L().model;
  if (sel !== null && sel < s.depth) {
    const { into, out } = linksOf(sel);
    const first = out.find((l) => l.to < s.depth) ?? into.find((l) => l.from < s.depth);
    const n = into.filter((l) => l.from < s.depth).length + out.filter((l) => l.to < s.depth).length;
    if (!first) return T.selNone(RUNGS[sel].name, n);
    return T.selLink(RUNGS[sel].name, n, RUNGS[first.from].name, RUNGS[first.to].name, first.label);
  }
  if (s.depth === 1) return T.depth1(behavior, s.hidden, s.cut);
  if (s.depth === RUNGS.length) return T.depthAll(behavior, s.depth, s.seen);
  return T.depthMid(behavior, s.depth, s.seen, s.hidden, s.cut);
}

/* ---------- Kategori sınırı ---------- */
export interface CatParams {
  lo: number;
  hi: number;
  /** Kutu sayısı (eşit genişlikli). */
  n: number;
  /** Çift arasındaki gerçek fark. */
  delta: number;
  /** Bir kutu sınırının çiftin orta noktasına göre konumu (birim); kutu genişliğinin yarısına kadar. */
  offset: number;
  /** Kategorileme gücü, 0 (sürekli algı) ile 1 (kutu içi her şey aynı) arası. */
  strength: number;
}

export const midOf = (p: Pick<CatParams, 'lo' | 'hi'>): number => (p.lo + p.hi) / 2;
export const widthOf = (p: Pick<CatParams, 'lo' | 'hi' | 'n'>): number => (p.hi - p.lo) / p.n;

/** Kutu sınırları (alt ve üst uç hariç), artan sırada. */
export function edges(p: Pick<CatParams, 'lo' | 'hi' | 'n' | 'offset'>): number[] {
  const w = widthOf(p), b0 = midOf(p) + p.offset;
  const out: number[] = [];
  for (let k = -p.n; k <= p.n; k++) {
    const e = b0 + k * w;
    if (e > p.lo + 1e-9 && e < p.hi - 1e-9) out.push(e);
  }
  return out;
}

export function segments(p: Pick<CatParams, 'lo' | 'hi' | 'n' | 'offset'>): Array<[number, number]> {
  const es = edges(p);
  const pts = [p.lo, ...es, p.hi];
  return pts.slice(0, -1).map((a, i) => [a, pts[i + 1]] as [number, number]);
}

/** x'in düştüğü kutunun indeksi (sınırdaki değer üst kutuya sayılır). */
export function segIndex(es: number[], x: number): number {
  let i = 0;
  while (i < es.length && x >= es[i]) i++;
  return i;
}

/** Algılanan konum: değer kutusunun merkezine doğru `strength` oranında çekilir. */
export function perceive(p: CatParams, x: number): number {
  const segs = segments(p);
  const [a, b] = segs[segIndex(edges(p), x)];
  return x - p.strength * (x - (a + b) / 2);
}

export interface Comparison {
  a: number;
  b: number;
  pa: number;
  pb: number;
  truth: number;
  perceived: number;
  /** Algılanan - gerçek (birim). */
  bias: number;
  /** Algılanan / gerçek. */
  ratio: number;
  straddles: boolean;
}

export function compare(p: CatParams): Comparison {
  const mid = midOf(p), a = mid - p.delta / 2, b = mid + p.delta / 2;
  const es = edges(p);
  const pa = perceive(p, a), pb = perceive(p, b);
  const perceived = pb - pa;
  return { a, b, pa, pb, truth: p.delta, perceived, bias: perceived - p.delta, ratio: p.delta > 0 ? perceived / p.delta : 1, straddles: segIndex(es, a) !== segIndex(es, b) };
}

/** Sınır konumu kaydırılırken algılanan fark (grafik için). */
export function sweep(p: CatParams, steps = 61): Array<{ offset: number; perceived: number }> {
  const half = widthOf(p) / 2;
  return Array.from({ length: steps }, (_, i) => {
    const offset = -half + (2 * half * i) / (steps - 1);
    return { offset, perceived: compare({ ...p, offset }).perceived };
  });
}

/** Birim sözcüğü: iç anahtar ('%', 'puan', 'cm') geçerli dildeki sözcüğe çevrilir. */
export const unitWord = (unit: string): string => L().units[unit] ?? unit;

export function describeCat(p: CatParams, unit: string, fmt: (v: number) => string): string {
  const c = compare(p), T = L().model, u = unitWord(unit);
  const truth = `${fmt(c.truth)} ${u}`, perceived = `${fmt(c.perceived)} ${u}`;
  if (p.strength === 0) return T.catNone(truth);
  return c.straddles ? T.catStraddle(truth, perceived, fmt(c.ratio)) : T.catSame(truth, perceived, Math.round(c.ratio * 100));
}
