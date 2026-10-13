// Genden proteine: saf model çekirdeği (DOM yok).
// 1) Gerçek genetik kod + mutasyonlar, 2) gen düzenlenmesi ve alternatif ekleme, 3) protein konformasyonu (dört durumlu Markov zinciri),
// 4) küçük ek: alel frekansı (Wright-Fisher). Kitaptan: kodon tablosu (61 amino asit kodonu, 3 dur), kodon fazlalığı, nokta/silme/ekleme etkileri.
// Fonksiyon puanları, eşikler, hız sabitleri modelin varsayımıdır (nitel).
import type { Rng } from '../rng';
import { L } from './text';

/* ================= 1. Genetik kod ================= */
const ORDER = 'TCAG';
// Standart genetik kod; dizin = 16*i + 4*j + k (ORDER sırasıyla). '*' = dur.
const CODE_STR = 'FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG';
export const CODON: Record<string, string> = {};
for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) CODON[ORDER[i] + ORDER[j] + ORDER[k]] = CODE_STR[16 * i + 4 * j + k];

export type AaClass = 'hid' | 'pol' | 'pos' | 'neg' | 'ozel';
/** Amino asit sınıfının görünen adı (çalışma anında, dile göre). */
export const className = (c: AaClass): string => L().classes[c];
export const AA: Record<string, { three: string; cls: AaClass }> = {
  A: { three: 'Ala', cls: 'hid' }, R: { three: 'Arg', cls: 'pos' }, N: { three: 'Asn', cls: 'pol' }, D: { three: 'Asp', cls: 'neg' },
  C: { three: 'Cys', cls: 'pol' }, Q: { three: 'Gln', cls: 'pol' }, E: { three: 'Glu', cls: 'neg' }, G: { three: 'Gly', cls: 'ozel' },
  H: { three: 'His', cls: 'pos' }, I: { three: 'Ile', cls: 'hid' }, L: { three: 'Leu', cls: 'hid' }, K: { three: 'Lys', cls: 'pos' },
  M: { three: 'Met', cls: 'hid' }, F: { three: 'Phe', cls: 'hid' }, P: { three: 'Pro', cls: 'ozel' }, S: { three: 'Ser', cls: 'pol' },
  T: { three: 'Thr', cls: 'pol' }, W: { three: 'Trp', cls: 'hid' }, Y: { three: 'Tyr', cls: 'pol' }, V: { three: 'Val', cls: 'hid' },
};

/** Örnek gen (kodlayan iplik): Met-Ala-Leu-Lys-Gly-Trp-His-Glu-Phe-Pro + dur. Tasarlanmış kısa bir dizidir, gerçek bir gen değildir. */
export const REF_DNA = 'ATGGCTCTGAAAGGCTGGCACGAGTTCCCTTAA';
/** Aktif bölge: amino asit dizinleri (0 tabanlı) 4-6 = Gly-Trp-His. Modelin varsayımı. */
export const CRIT: [number, number] = [4, 6];
const inCrit = (i: number): boolean => i >= CRIT[0] && i <= CRIT[1];

export interface Translation { start: number; aas: string; stopped: boolean }
/** İlk ATG'den başlar, dur kodonuna ya da dizi sonuna kadar okur. */
export function translate(dna: string): Translation {
  const start = dna.indexOf('ATG');
  if (start < 0) return { start: -1, aas: '', stopped: false };
  let aas = '', stopped = false;
  for (let i = start; i + 3 <= dna.length; i += 3) {
    const a = CODON[dna.slice(i, i + 3)];
    if (a === '*') { stopped = true; break; }
    aas += a;
  }
  return { start, aas, stopped };
}

export const toMrna = (dna: string): string => dna.replace(/T/g, 'U');

export interface Mut { kind: 'none' | 'point' | 'del' | 'ins'; pos: number; base: string; n: 1 | 3 }
export const NO_MUT: Mut = { kind: 'none', pos: 0, base: 'A', n: 1 };

export function applyMut(dna: string, m: Mut): string {
  if (m.kind === 'point') return dna.slice(0, m.pos) + m.base + dna.slice(m.pos + 1);
  if (m.kind === 'del') return dna.slice(0, m.pos) + dna.slice(m.pos + m.n);
  if (m.kind === 'ins') return dna.slice(0, m.pos) + m.base.repeat(m.n) + dna.slice(m.pos);
  return dna;
}

export type Kind = 'degisim-yok' | 'sessiz' | 'yanlis' | 'anlamsiz' | 'kayma' | 'cerceve-ici' | 'baslangic' | 'uzama';
/** Mutasyon türünün görünen adı (çalışma anında, dile göre). */
export const kindName = (k: Kind): string => L().kinds[k];

/** Amino asit değişiminin ağırlığı (0-1): aynı sınıf hafif, sınıf değişimi ağır, artı-eksi yük dönmesi en ağır. Varsayım. */
export function severity(a: string, b: string): number {
  const ca = AA[a].cls, cb = AA[b].cls;
  if (ca === cb) return 0.2;
  return (ca === 'pos' && cb === 'neg') || (ca === 'neg' && cb === 'pos') ? 0.9 : 0.7;
}

export interface Analysis {
  dna: string; kind: Kind; f: number;
  ref: Translation; mut: Translation;
  /** Normal zincire göre farklı konumlar (dizin). */
  diff: number[];
  firstDiff: number;
}

export function analyze(ref: string, m: Mut): Analysis {
  const dna = applyMut(ref, m);
  const t0 = translate(ref), t1 = translate(dna);
  const L0 = t0.aas.length;
  const diff: number[] = [];
  for (let i = 0; i < Math.max(L0, t1.aas.length); i++) if (t0.aas[i] !== t1.aas[i]) diff.push(i);
  const firstDiff = diff.length ? diff[0] : -1;
  const out = (kind: Kind, f: number): Analysis => ({ dna, kind, f: Math.max(0, Math.min(1, f)), ref: t0, mut: t1, diff, firstDiff });
  if (dna === ref) return out('degisim-yok', 1);
  if (t1.start < 0) return out('baslangic', 0);
  if (t1.aas === t0.aas && t1.stopped === t0.stopped) return out('sessiz', 1);
  if (t1.start !== t0.start) return out('baslangic', 0.05);
  if (m.kind !== 'point' && m.n !== 3) return out('kayma', (firstDiff / L0) ** 2 * 0.5);
  const delta = m.kind === 'del' ? -m.n / 3 : m.kind === 'ins' ? m.n / 3 : 0;
  if (t1.stopped && t1.aas.length < L0 + delta) return out('anlamsiz', (t1.aas.length / L0) ** 2);
  if (m.kind === 'point') {
    if (t1.aas.length !== L0 || !t1.stopped) return out('uzama', 0.6);
    return out('yanlis', 1 - severity(t0.aas[firstDiff], t1.aas[firstDiff]) * (inCrit(firstDiff) ? 1 : 0.35));
  }
  return out('cerceve-ici', inCrit(Math.floor((m.pos - t0.start) / 3)) ? 0.3 : 0.75);
}

export interface Outcomes { sessiz: number; yanlis: number; anlamsiz: number; diger: number }
/** Bir konumdaki üç olası nokta değişiminin sonuçları. */
export function outcomesAt(ref: string, pos: number): Outcomes {
  const r: Outcomes = { sessiz: 0, yanlis: 0, anlamsiz: 0, diger: 0 };
  for (const b of 'ACGT') {
    if (b === ref[pos]) continue;
    const k = analyze(ref, { kind: 'point', pos, base: b, n: 1 }).kind;
    if (k === 'sessiz') r.sessiz++; else if (k === 'yanlis') r.yanlis++; else if (k === 'anlamsiz') r.anlamsiz++; else r.diger++;
  }
  return r;
}

/** Tüm olası nokta değişimlerinin dağılımı (kodon fazlalığının sonucu). */
export function allPointOutcomes(ref: string): Outcomes & { toplam: number } {
  const t = { sessiz: 0, yanlis: 0, anlamsiz: 0, diger: 0, toplam: 0 };
  for (let p = 0; p < ref.length; p++) {
    const o = outcomesAt(ref, p);
    t.sessiz += o.sessiz; t.yanlis += o.yanlis; t.anlamsiz += o.anlamsiz; t.diger += o.diger;
  }
  t.toplam = t.sessiz + t.yanlis + t.anlamsiz + t.diger;
  return t;
}

/** Ekranda gösterilecek kodon kutuları. Başlangıçtan önceki baz(lar) ve dur sonrası kutular okunmaz. */
export interface Card { dna: string; aa: string; read: boolean }
export function cards(dna: string): Card[] {
  const t = translate(dna);
  const out: Card[] = [];
  const s = t.start < 0 ? dna.length : t.start;
  if (s > 0) out.push({ dna: dna.slice(0, s), aa: '', read: false });
  let stopped = false;
  for (let i = s; i < dna.length; i += 3) {
    const c = dna.slice(i, i + 3);
    const a = c.length === 3 ? CODON[c] : '';
    out.push({ dna: c, aa: stopped ? '' : a, read: !stopped && c.length === 3 });
    if (a === '*') stopped = true;
  }
  return out;
}

/* ================= 2. Gen düzenlenmesi ================= */
const hill = (x: number, k: number, n: number): number => x ** n / (k ** n + x ** n);

export interface RegIn { signal: number; tf: number; methyl: boolean }
export interface RegOut { tfActive: number; bound: number; expr: number; state: 'açık' | 'kısmen' | 'kapalı' }
/** Sinyal (0-1) transkripsiyon faktörünü etkinleştirir (eşik 0,4, keskin: n=3); metilasyon promotöre bağlanmayı %95 engeller. Varsayım. */
export function expression(i: RegIn): RegOut {
  const tfActive = i.tf * hill(i.signal, 0.4, 3);
  const bound = tfActive * (i.methyl ? 0.05 : 1);
  const expr = 0.02 + 0.98 * bound;
  return { tfActive, bound, expr, state: expr >= 0.5 ? 'açık' : expr < 0.15 ? 'kapalı' : 'kısmen' };
}

/** role: iç anahtar; görünen ad L().roles[role]. */
export interface Exon { id: string; len: number; role: 'start' | 'bind' | 'work' | 'end'; optional: boolean }
export const EXONS: Exon[] = [
  { id: 'E1', len: 40, role: 'start', optional: false },
  { id: 'E2', len: 60, role: 'bind', optional: true },
  { id: 'E3', len: 80, role: 'work', optional: true },
  { id: 'E4', len: 30, role: 'end', optional: false },
];
/** E2 ve E3'ün alınıp alınmadığına göre ürünün uzunluğu ve ne yapabildiği (varsayım). */
export function splice(useE2: boolean, useE3: boolean): { exons: string[]; len: number; does: string } {
  const ex = EXONS.filter((e) => !e.optional || (e.id === 'E2' ? useE2 : useE3));
  const d = L().does;
  const does = useE2 && useE3 ? d.both : useE2 ? d.bindOnly : useE3 ? d.workOnly : d.neither;
  return { exons: ex.map((e) => e.id), len: ex.reduce((s, e) => s + e.len, 0), does };
}

/* ================= 3. Konformasyon (4 durumlu Markov zinciri) ================= */
export type Lig = 'none' | 'good' | 'like';
export interface ConfP { lig: Lig; conc: number; temp: number; ph: number }
export const CONF_DEFAULT: ConfP = { lig: 'good', conc: 3, temp: 37, ph: 7.4 };
/** Durumlar: 0 açık-boş, 1 kapalı-boş, 2 bağlı-açık, 3 bağlı-kapalı (aktif). */
export const ST = { EO: 0, EC: 1, SO: 2, SC: 3 } as const;

/** shape: şeklin bozulmadan kalma payı (sıcaklık ve asitlik), m: hız çarpanı (37 derece ve pH 7,4'te ~1). */
export function envFactor(temp: number, ph: number): { shape: number; m: number } {
  const shape = (1 / (1 + Math.exp((temp - 50) / 2))) * Math.exp(-(((ph - 7.4) / 2.2) ** 2));
  return { shape, m: shape * 2 ** ((temp - 37) / 10) };
}

/** q[i][j]: i durumundan j durumuna hız (1/sn). Yanlış molekül zayıf bağlanır, çabuk ayrılır ve şekli kapatmaz. */
export function rates(p: ConfP): number[][] {
  const { m } = envFactor(p.temp, p.ph);
  const good = p.lig === 'good';
  const L = p.lig === 'none' ? 0 : p.conc;
  const aff = good ? 1 : 0.1;
  const q = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
  q[0][1] = 0.1 * m; q[1][0] = 1;
  q[0][2] = 1.2 * aff * L;
  q[2][0] = good ? 0.6 : 3;
  q[2][3] = (good ? 2.5 : 0.3) * m; q[3][2] = 0.4;
  q[3][0] = 1.5 * m;
  return q;
}

/** Kararlı durum olasılıkları (Gauss yok etme). */
export function steady(p: ConfP): number[] {
  const q = rates(p);
  const A = Array.from({ length: 4 }, (_, i) => Array.from({ length: 4 }, (_, j) => (i === 3 ? 1 : j === i ? -q[j].reduce((s, v) => s + v, 0) : q[j][i])));
  const b = [0, 0, 0, 1];
  for (let c = 0; c < 4; c++) {
    let piv = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]]; [b[c], b[piv]] = [b[piv], b[c]];
    if (Math.abs(A[c][c]) < 1e-12) continue;
    for (let r = 0; r < 4; r++) {
      if (r === c) continue;
      const k = A[r][c] / A[c][c];
      for (let j = c; j < 4; j++) A[r][j] -= k * A[c][j];
      b[r] -= k * b[c];
    }
  }
  return b.map((v, i) => Math.max(0, Math.abs(A[i][i]) < 1e-12 ? 0 : v / A[i][i]));
}

export interface ConfOut { closed: number; active: number; rate: number; shape: number }
/** closed: kapalı şekil payı, active: bağlı-kapalı pay (reseptörde "aktif"), rate: saniyedeki tur (enzimde işlev hızı). */
export function confOut(p: ConfP): ConfOut {
  const s = steady(p);
  return { closed: s[1] + s[3], active: s[3], rate: rates(p)[3][0] * s[3], shape: envFactor(p.temp, p.ph).shape };
}

/** Tek molekülün rastlantısal adımı; turn: bu adımda bir tur (ürün salımı) tamamlandı. */
export function stepConf(state: number, dt: number, p: ConfP, rnd: Rng): { state: number; turn: boolean } {
  const q = rates(p);
  let s = state, turn = false, left = dt;
  while (left > 1e-9) {
    const h = Math.min(left, 0.05);
    left -= h;
    const tot = q[s].reduce((a, v) => a + v, 0);
    if (tot > 0 && rnd() < 1 - Math.exp(-tot * h)) {
      let u = rnd() * tot, j = 0;
      for (let k = 0; k < 4; k++) { if (q[s][k] <= 0) continue; j = k; u -= q[s][k]; if (u <= 0) break; }
      if (s === 3 && j === 0) turn = true;
      s = j;
    }
  }
  return { state: s, turn };
}

/* ================= 4. Alel frekansı (Wright-Fisher) ================= */
export type SelMode = 'notr' | 'yararli' | 'zararli' | 'denge';
/** Genotip uygunlukları [AA, Aa, aa]; A yeni varyant. Denge: heterozigot avantajı. */
export function fitness(mode: SelMode, s: number): [number, number, number] {
  if (mode === 'yararli') return [1 + s, 1 + s / 2, 1];
  if (mode === 'zararli') return [1 - s, 1 - s / 2, 1];
  if (mode === 'denge') return [1 - s, 1, 1 - s];
  return [1, 1, 1];
}
/** Seçilimden sonra beklenen frekans. */
export function selectP(p: number, w: [number, number, number]): number {
  const q = 1 - p;
  const wbar = p * p * w[0] + 2 * p * q * w[1] + q * q * w[2];
  return (p * p * w[0] + p * q * w[1]) / wbar;
}
/** Bir koşu: her nesil seçilim + 2N alel örnekleme (sürüklenme). Sabitlenen ya da elenen varyant sonuna kadar öyle kalır. */
export function runWF(p0: number, N: number, gens: number, w: [number, number, number], rnd: Rng): number[] {
  const out = [p0];
  let p = p0;
  for (let g = 0; g < gens; g++) {
    const pe = selectP(p, w);
    let k = 0;
    for (let i = 0; i < 2 * N; i++) if (rnd() < pe) k++;
    p = k / (2 * N);
    out.push(p);
  }
  return out;
}
