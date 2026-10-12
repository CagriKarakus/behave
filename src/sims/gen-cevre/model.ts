// Gen ve çevre: saf model çekirdeği (DOM yok). Üç parça:
//  1) gen × çevre tablosu + sanal popülasyondan kalıtılabilirlik (h²)
//  2) MAO-A × çocuklukta kötü muamele (Caspi tarzı etkileşim, sembolik)
//  3) boy gibi poligenik bir özellik ve GWAS keşif gücü
import { mulberry32 } from '../rng';

/** Standart normal (Box-Muller). */
export function gauss(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/* =====================================================
   1) GEN × ÇEVRE TABLOSU
   ===================================================== */
export const VARIANTS = ['A', 'B', 'C'] as const;
export const MAX_ENV = 6;
/** Aynı gen ve ortamda bireyden bireye kalan rastlantısal değişim (sonuç biriminde SS). */
export const SIGMA = 8;
export const PER_CELL = 150;

const BASE = 50;
const GEN_AMP = 15;
const ENV_STEP = 14;
const GEN_DIR = [-1, 0, 1];
/** Etkileşim: A ortamdan çok, C az etkilenir (eğim çarpanı 1 + k·c: k=1'de A:2, B:1, C:0). */
const INT_DIR = [1, 0, -1];

export interface TableParams { n: number; gen: number; spread: number; inter: number }
export interface Table {
  cells: number[][]; // [varyant][ortam]
  envNames: string[];
  axis: string;
  yLabel: string;
}

export const DEFAULT_PARAMS: TableParams = { n: 4, gen: 0.7, spread: 0.5, inter: 0 };
export const genericEnvNames = (n: number): string[] => Array.from({ length: n }, (_, i) => `Ortam ${i + 1}`);

/** gen/spread/inter: 0..1; n: 1..6. Ortamlar kötüden iyiye, eşit aralıklı; sayı arttıkça aralık genişler. */
export function genCells(p: TableParams): number[][] {
  const n = clamp(Math.round(p.n), 1, MAX_ENV);
  return VARIANTS.map((_, g) =>
    Array.from({ length: n }, (_e, e) => {
      const pos = e - (n - 1) / 2;
      return clamp(BASE + p.gen * GEN_AMP * GEN_DIR[g] + ENV_STEP * p.spread * pos * (1 + p.inter * INT_DIR[g]), 2, 98);
    }),
  );
}

export function tableFromParams(p: TableParams): Table {
  const n = clamp(Math.round(p.n), 1, MAX_ENV);
  return { cells: genCells({ ...p, n }), envNames: genericEnvNames(n), axis: 'Ortam kalitesi (→ daha zengin)', yLabel: 'Sonuç (sembolik ölçek)' };
}

export interface Preset { id: string; name: string; params?: TableParams; table?: Table; note: string }

/**
 * Crabbe ve ark. 1999: sayılar kitaptaki kokain hareketliliği artışlarından ölçeklendi
 * (5.000 cm = 100 birim; Oregon 667, Albany 701, Alberta >5.000). B ve C varyantlarının değerleri sembolik:
 * kitap "birkaç varyantın üç laboratuvarda benzer etki gösterdiğini" söyler.
 */
export const CRABBE_TABLE: Table = {
  cells: [[13, 100, 14], [33, 40, 36], [58, 52, 60]],
  envNames: ['Oregon', 'Alberta', 'Albany'],
  axis: 'Laboratuvar',
  yLabel: 'Kokainle artan hareket (5.000 cm = 100)',
};

/**
 * Turkheimer ve ark. 2003 (kitaptaki değerler): kalıtılabilirlik yoksul ortamda ~%10, zengin ortamda ~%70.
 * Varyantlar IQ geni değil, "düşük / orta / yüksek genetik yatkınlık" sembolüdür; değerler bu iki oranı verecek biçimde seçildi.
 */
export const SES_TABLE: Table = {
  cells: [[36.7, 45.1], [40, 60], [43.3, 74.9]],
  envNames: ['Düşük SES', 'Yüksek SES'],
  axis: 'Ailenin sosyoekonomik düzeyi (→)',
  yLabel: 'Bilişsel puan (sembolik)',
};

export const PRESETS: Preset[] = [
  { id: 'none', name: 'Etkileşim yok', params: { n: 4, gen: 0.7, spread: 0.5, inter: 0 }, note: 'Üç varyant ortamdan aynı oranda etkilenir: çizgiler paralel. Gen farkı her ortamda aynı kalır.' },
  { id: 'cross', name: 'Sıralama değişen etkileşim', params: { n: 4, gen: 0.7, spread: 0.6, inter: 1 }, note: 'Çizgiler kesişir: yoksul ortamda C, zengin ortamda A "en iyi" varyanttır. "Hangisi daha iyi?" sorusunun ortamsız cevabı yoktur.' },
  { id: 'crabbe', name: 'Üç laboratuvar (Crabbe)', table: CRABBE_TABLE, note: 'Kitaptaki üç laboratuvar deneyi: A varyantı kokainle hareketliliği Oregon ve Albany\'de az, Alberta\'da çok artırır (667, 701 ve 5.000\'den fazla cm). B ve C üç yerde benzerdir. B ve C değerleri sembolik.' },
  { id: 'ses', name: 'Yoksul ↔ zengin (Turkheimer)', table: SES_TABLE, note: 'Kitaptaki sonuç: kalıtılabilirlik yoksul ortamda yaklaşık %10, zengin ortamda yaklaşık %70. Replikasyon karışık: ABD örneklerinde görüldü, Batı Avrupa ve Avustralya\'da görülmedi ya da tersine döndü.' },
];

export interface Pop { g: Uint8Array; e: Uint8Array; y: Float64Array; nE: number; perCell: number }

/** Sanal popülasyon: her varyant × ortam hücresinde eşit sayıda birey; ortalama + rastlantısal fark. */
export function simulatePop(cells: number[][], seed: number, perCell = PER_CELL, sigma = SIGMA): Pop {
  const rng = mulberry32(seed);
  const nE = cells[0].length;
  const total = VARIANTS.length * nE * perCell;
  const g = new Uint8Array(total), e = new Uint8Array(total), y = new Float64Array(total);
  let i = 0;
  for (let gi = 0; gi < VARIANTS.length; gi++)
    for (let ei = 0; ei < nE; ei++)
      for (let k = 0; k < perCell; k++, i++) { g[i] = gi; e[i] = ei; y[i] = cells[gi][ei] + sigma * gauss(rng); }
  return { g, e, y, nE, perCell };
}

export interface Decomp {
  m: number; // dahil edilen ortam sayısı (ilk m ortam)
  total: number;
  h2: number; // genotip ana etkisi / toplam
  env: number;
  gxe: number;
  res: number;
  perEnv: number[]; // her ortamın içinde h²
}

/** Dengeli tasarımda varyans ayrıştırması: yalnızca ilk m ortamdaki bireyler. */
export function decompose(pop: Pop, m = pop.nE): Decomp {
  const mm = clamp(Math.round(m), 1, pop.nE);
  const nG = VARIANTS.length;
  const cs = new Float64Array(nG * mm), cn = new Float64Array(nG * mm);
  let sum = 0, n = 0;
  for (let i = 0; i < pop.y.length; i++) {
    if (pop.e[i] >= mm) continue;
    cs[pop.g[i] * mm + pop.e[i]] += pop.y[i]; cn[pop.g[i] * mm + pop.e[i]]++;
    sum += pop.y[i]; n++;
  }
  const grand = sum / n;
  let sst = 0;
  const eSS = new Float64Array(mm), eN = new Float64Array(mm), eS = new Float64Array(mm);
  const gS = new Float64Array(nG), gN = new Float64Array(nG);
  const eGS = new Float64Array(mm * nG), eGN = new Float64Array(mm * nG);
  for (let i = 0; i < pop.y.length; i++) {
    if (pop.e[i] >= mm) continue;
    const d = pop.y[i] - grand; sst += d * d;
    eS[pop.e[i]] += pop.y[i]; eN[pop.e[i]]++; eSS[pop.e[i]] += pop.y[i] * pop.y[i];
    gS[pop.g[i]] += pop.y[i]; gN[pop.g[i]]++;
    eGS[pop.e[i] * nG + pop.g[i]] += pop.y[i]; eGN[pop.e[i] * nG + pop.g[i]]++;
  }
  let ssG = 0, ssE = 0, ssC = 0;
  for (let gi = 0; gi < nG; gi++) ssG += gN[gi] * (gS[gi] / gN[gi] - grand) ** 2;
  for (let ei = 0; ei < mm; ei++) ssE += eN[ei] * (eS[ei] / eN[ei] - grand) ** 2;
  for (let k = 0; k < nG * mm; k++) ssC += cn[k] * (cs[k] / cn[k] - grand) ** 2;
  const ssI = Math.max(0, ssC - ssG - ssE), ssR = Math.max(0, sst - ssC);
  const perEnv: number[] = [];
  for (let ei = 0; ei < mm; ei++) {
    const em = eS[ei] / eN[ei];
    let sstE = eSS[ei] - eN[ei] * em * em, ssGE = 0;
    for (let gi = 0; gi < nG; gi++) ssGE += eGN[ei * nG + gi] * (eGS[ei * nG + gi] / eGN[ei * nG + gi] - em) ** 2;
    sstE = Math.max(sstE, 1e-9);
    perEnv.push(clamp(ssGE / sstE, 0, 1));
  }
  const T = Math.max(sst, 1e-9);
  return { m: mm, total: sst / n, h2: ssG / T, env: ssE / T, gxe: ssI / T, res: ssR / T, perEnv };
}

/** İlk m ortam alınırsa h²: "ortam sayısı arttıkça h² düşer" eğrisi. */
export const h2Curve = (pop: Pop): number[] => Array.from({ length: pop.nE }, (_, i) => decompose(pop, i + 1).h2);

/** İlk m ortamda, varyantların ortalamaya göre sırası kaç komşu ortam çiftinde değişiyor? */
export function rankFlips(cells: number[][], m = cells[0].length): number {
  let flips = 0;
  const order = (e: number) => cells.map((r, g) => [r[e], g]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map((x) => x[1]).join('');
  for (let e = 1; e < Math.min(m, cells[0].length); e++) if (order(e) !== order(e - 1)) flips++;
  return flips;
}

export function describeTable(d: Decomp, curve: number[], flips: number, nEnv: number): string {
  const p = (v: number) => Math.round(v * 100);
  const lo = Math.min(...d.perEnv), hi = Math.max(...d.perEnv);
  if (nEnv === 1) return `Tek ortamda bakılınca h² %${p(d.h2)}: fark neredeyse tümüyle genlere yazılabilir. Ama bu sayı yalnızca bu ortam için geçerli.`;
  if (flips > 0 && d.gxe > 0.08) return `Çizgiler kesişiyor: hangi varyantın "iyi" olduğu ortama göre değişiyor. Ortam içi h² %${p(lo)} ile %${p(hi)} arasında; tek bir "yüzde kaç genetik" yok.`;
  if (hi - lo > 0.3) return `Ortam içi h² %${p(lo)} ile %${p(hi)} arasında değişiyor: gen farkı aynı, ama gen farklarının ne kadar görüneceğini ortam belirliyor.`;
  return `${nEnv} ortam birlikte: h² %${p(d.h2)} (yalnızca ilk ortamda %${p(curve[0])} idi). Gen etkisi aynı kaldı; ortam farkı toplam çeşitliliğe girince genetik pay küçüldü.`;
}

/* =====================================================
   2) MAO-A × ÇOCUKLUKTA KÖTÜ MUAMELE
   ===================================================== */
/** Sembolik temel risk (yüzde değil oran). Kitapta bu sayı yok; yalnızca "yaklaşık üç kat" bulgusu kitaptandır. */
export const MAO_BASE = 0.08;
/** Kötü muamele her iki genotipte de riski artırır (sembolik: ağır düzeyde iki kat). */
export const MAO_BOOST = 1;
export const CASPI_RATIO = 3;

/** Etkileşim yalnızca ağır kötü muamelede devreye girer (Caspi bulgusu: öncesinde varyant tek başına öngörmedi). */
export const maoRamp = (level: number): number => Math.pow(Math.max(0, (clamp(level, 0, 1) - 0.3) / 0.7), 1.5);

/** Yetişkinlikte antisosyal davranış olasılığı (0..1). level: 0 = kötü muamele yok, 1 = ağır. ratio: ağır düzeyde düşük/yüksek aktivite oranı. */
export function maoRisk(lowActivity: boolean, level: number, ratio: number): number {
  const high = MAO_BASE * (1 + MAO_BOOST * clamp(level, 0, 1));
  return clamp(lowActivity ? high * (1 + (ratio - 1) * maoRamp(level)) : high, 0, 0.95);
}

/** İkili fark: (düşük−yüksek | ağır) − (düşük−yüksek | yok). Sıfırsa etkileşim yok. */
export const maoInteraction = (ratio: number): number => (maoRisk(true, 1, ratio) - maoRisk(false, 1, ratio)) - (maoRisk(true, 0, ratio) - maoRisk(false, 0, ratio));

/** Popülasyonda `share` kadarı ağır, kalanı hiç kötü muamele görmediyse genotip tek başına riski. */
export function maoPopulationRisk(lowActivity: boolean, share: number, ratio: number): number {
  return share * maoRisk(lowActivity, 1, ratio) + (1 - share) * maoRisk(lowActivity, 0, ratio);
}

export function describeMao(level: number, ratio: number, share: number): string {
  const pc = (v: number) => Math.round(v * 100);
  const lo = maoRisk(true, level, ratio), hi = maoRisk(false, level, ratio);
  if (ratio <= 1.05) return `Etkileşim yok varsayımı: iki varyantın riski aynı, kötü muamele ikisini de aynı oranda artırıyor. Büyük çalışmaların çoğunun gördüğü buna daha yakın.`;
  if (level < 0.3) return `Kötü muamele yok ya da hafif: iki varyant arasında fark yok (yüz kişide ${pc(lo)} ve ${pc(hi)}). Varyant tek başına bir şey söylemiyor.`;
  const popRatio = maoPopulationRisk(true, share, ratio) / maoPopulationRisk(false, share, ratio);
  return `Kötü muamele düzeyi yüksek: düşük aktiviteli varyantta yüz kişide ${pc(lo)}, yüksekte ${pc(hi)} (≈${(lo / hi).toFixed(1).replace('.', ',')} kat). Herkes birlikte sayılınca fark yalnızca ≈${popRatio.toFixed(2).replace('.', ',')} kat: etki ortama bağlı.`;
}

/* =====================================================
   3) POLİGENİK ÖZELLİK (BOY) VE GWAS
   ===================================================== */
/** Etkili varyant sayıları (kaydırıcı basamakları). */
export const M_STEPS = [1, 3, 10, 30, 100, 300, 1000, 3000, 10000, 30000, 100000, 300000];
/**
 * Etki büyüklüğü dağılımı: log-normal σ. SIGMA_LN ve COMMON_SHARE birlikte iki kitap noktasına uydurulmuştur:
 * 2010 (183.727 kişi): yüzlerce varyant, en güçlü ≈%0,4, hepsi ≈%10; 2022 (5,4 milyon kişi, ch08-e10 replikasyon notu):
 * >12.000 varyant, hepsi birlikte ≈%40-45. (Yalnızca log-normal ile 2010 doğru olunca 2022 ≈%59 çıkıyordu.)
 */
export const SIGMA_LN = 2.05;
/**
 * Referans varyant sayısında (REF_M) bulunabilir sayılan varyantların oranı. Geri kalanı nadir varyantlarda ya da
 * dizilemeyen etkilerde saklıdır: hâlâ kalıtsaldır ama GWAS tek tek bulamaz (kitap da nadir varyantların kaçtığını
 * belirtir; "eksik kalıtılabilirlik"). Varyant sayısı azaldıkça bu kayıp sıfıra iner (bkz. foundFraction).
 */
export const COMMON_SHARE = 0.72;
export const REF_M = 300000;
/** M varyanttan GWAS'ın bulabilecek biçimde görülebilir olanlarının oranı: 1 varyantta 1, REF_M ve üstünde COMMON_SHARE. */
export function foundFraction(M: number): number {
  const t = Math.min(1, Math.log10(Math.max(1, M)) / Math.log10(REF_M));
  return 1 - (1 - COMMON_SHARE) * t;
}
export const GWAS_THRESHOLD = 29.7; // genom çapında anlamlılık (p<5e-8) için ≈ ki-kare eşiği
export const GWAS_N = { y2010: 183727, y2022: 5400000 };
export const HEIGHT_MEAN = 170;
export const HEIGHT_SD = 7;
const TOP_K = 200;
export const N_PEOPLE = 2000;
export const BINS = 30;
export const Z_RANGE = 4.2;

/** Ters standart normal dağılım fonksiyonu (Acklam yaklaşımı). */
export function normInv(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - lo) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

const shareCache = new Map<number, Float64Array>();
/**
 * M varyantın genetik varyanttaki payları (toplam 1, büyükten küçüğe). Etki büyüklükleri log-normal dağılımın
 * kuantillerinden alınır (rastlantısız): aynı M her zaman aynı sonucu verir, uçlar gürültüyle oynamaz.
 */
export function variantShares(M: number): Float64Array {
  const hit = shareCache.get(M);
  if (hit) return hit;
  const w = new Float64Array(M);
  let s = 0;
  for (let i = 0; i < M; i++) { w[i] = Math.exp(SIGMA_LN * normInv(1 - (i + 0.5) / M)); s += w[i]; }
  for (let i = 0; i < M; i++) w[i] /= s;
  shareCache.clear();
  shareCache.set(M, w);
  return w;
}

export interface Discovery { count: number; top: number; sum: number; topCm: number }
/** N kişilik bir GWAS'ın bulabildikleri (fenotip varyansı payı olarak). */
export function discovery(M: number, h2: number, N: number): Discovery {
  const sh = variantShares(M);
  let count = 0, sum = 0;
  for (let i = 0; i < sh.length; i++) {
    const v = sh[i] * h2;
    if (v * N < GWAS_THRESHOLD) break; // sıralı: kalanlar da eşiğin altında
    count++; sum += v;
  }
  const top = sh[0] * h2;
  const fr = foundFraction(M);
  count = count > 0 ? Math.max(1, Math.round(count * fr)) : 0;
  sum *= fr;
  // kopya başına etki (standart sapma birimi): β = sqrt(v / (2 f (1−f))), f=0,5 varsayımı
  return { count, top, sum, topCm: Math.sqrt(top / 0.5) * HEIGHT_SD };
}

export interface GwasSim { gHist: number[]; pHist: number[]; varG: number; varP: number; distinctG: number; h2: number }

/** Popülasyon: en güçlü ≤200 varyant tek tek, kalan kuyruk normal yaklaşıkla (merkezi limit). Çevre bağımsız normal. */
export function simulateGwas(M: number, envShare: number, seed = 1, people = N_PEOPLE): GwasSim {
  const h2 = clamp(1 - envShare, 0, 1);
  const sh = variantShares(M);
  const rng = mulberry32(seed * 7919 + M);
  const K = Math.min(M, TOP_K);
  const beta = new Float64Array(K), freq = new Float64Array(K);
  let used = 0;
  for (let i = 0; i < K; i++) {
    const f = 0.1 + 0.8 * rng();
    freq[i] = f;
    beta[i] = (rng() < 0.5 ? -1 : 1) * Math.sqrt((sh[i] * h2) / (2 * f * (1 - f)));
    used += sh[i] * h2;
  }
  const restSd = Math.sqrt(Math.max(0, h2 - used));
  const envSd = Math.sqrt(Math.max(0, 1 - h2));
  const G = new Float64Array(people), P = new Float64Array(people);
  for (let p = 0; p < people; p++) {
    let gv = 0;
    for (let i = 0; i < K; i++) {
      const f = freq[i];
      gv += beta[i] * ((rng() < f ? 1 : 0) + (rng() < f ? 1 : 0) - 2 * f);
    }
    if (restSd > 0) gv += restSd * gauss(rng);
    G[p] = gv;
    P[p] = gv + envSd * gauss(rng);
  }
  const hist = (a: Float64Array) => {
    const h = new Array<number>(BINS).fill(0);
    for (let p = 0; p < a.length; p++) {
      const b = Math.floor(((a[p] + Z_RANGE) / (2 * Z_RANGE)) * BINS);
      if (b >= 0 && b < BINS) h[b]++;
    }
    return h;
  };
  const variance = (a: Float64Array) => { let m = 0; for (const v of a) m += v; m /= a.length; let s = 0; for (const v of a) s += (v - m) ** 2; return s / a.length; };
  const seen = new Set<string>();
  for (const v of G) seen.add(v.toFixed(6));
  return { gHist: hist(G), pHist: hist(P), varG: variance(G), varP: variance(P), distinctG: seen.size, h2 };
}

export function describeGwas(M: number, envShare: number, d: Discovery): string {
  const pc = (v: number) => (v * 100).toFixed(v < 0.01 ? 2 : 1).replace('.', ',');
  const h2 = 1 - envShare;
  if (h2 <= 0.001) return 'Çevre tüm farkı belirliyor: genler boy farkına katkı vermiyor, çan eğrisi yalnızca çevreden geliyor.';
  if (M === 1) return `Tek bir gen: boy yalnızca birkaç kümeye ayrılıyor (sivri tepeler). Gerçek boy dağılımı böyle değil, çünkü tek bir "boy geni" yok.`;
  if (M < 30) return `${M} varyantla dağılım hâlâ pürüzlü. Her varyantın payı büyük (en güçlüsü varyansın %${pc(d.top)}'i).`;
  return `${M.toLocaleString('tr-TR')} varyantla düzgün bir çan eğrisi çıkıyor. En güçlü tek varyant farkın yalnızca %${pc(d.top)}'ini açıklıyor: gen sayısı arttıkça "boy geni" aramak anlamsızlaşıyor.`;
}
