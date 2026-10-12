// Çocukluk ve rahim (Bölüm 7): üç nitel model. DOM yok; tohumlu RNG.
// Kitaptan (chapters.json ch07) gelen noktalar "KİTAP:", diğer sayılar "VARSAYIM:" ile işaretlidir.
import { mulberry32 } from '../rng';

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
/** Standart normal dağılım fonksiyonu (Abramowitz-Stegun). */
export function Phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}
export const pdf = (x: number, mu = 0): number => 0.3989423 * Math.exp(-((x - mu) ** 2) / 2);

/* ======================= 1) Marshmallow ======================= */
/** KİTAP: bekleme üst sınırı 15 dakika. */
export const MAX_WAIT = 900;
export type Strategy = 'look' | 'eyes' | 'cold' | 'hot';
/** Yön KİTAP (dikkat dağıtma ve "soğuk" düşünme uzatır, lezzeti düşünmek kısaltır); saniye büyüklükleri VARSAYIM. */
export const STRATEGIES: Record<Strategy, { label: string; shift: number }> = {
  look: { label: 'Ödüle bakmak', shift: 0 },
  eyes: { label: 'Gözleri kapatmak', shift: 150 },
  cold: { label: '"Soğuk" düşünmek (bulut)', shift: 230 },
  hot: { label: '"Sıcak" düşünmek (lezzet)', shift: -170 },
};
export interface MarshInput { age: number; strategy: Strategy; trust: boolean }
/** VARSAYIM: taban ortalama 5 yaş, ödül görünür, deneyciye güven var; kitaptaki grup özetine (üçte bir, ~11 dk) göre ayarlı. */
const M5 = 728, SD = 400, AGE_SLOPE = 100, DISTRUST = -220;
export const DEFAULT_MARSH: MarshInput = { age: 5, strategy: 'look', trust: true };

/** Çocuğun beklemeye yatkınlığının (gizli) ortalaması, saniye; kırpılmamış. */
export function meanLatent(inp: MarshInput): number {
  return M5 + AGE_SLOPE * (inp.age - 5) + STRATEGIES[inp.strategy].shift + (inp.trust ? 0 : DISTRUST);
}

/** Her sanal çocuk sabit özelliklerle gelir (girdiler değişince aynı çocuklar farklı davranır). */
export interface Child { z: number; fam: number; noise: number }
/** VARSAYIM: aile geçmişi (fam) hem bekleme yatkınlığına hem sonraki sonuca etki eder. */
export const LAMBDA = 0.5, KAPPA = 0.5, DELTA = 0.07, NOISE_SD = 0.85;

function gauss(rnd: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
}
export function makeCohort(seed: number, n: number): Child[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const fam = gauss(rnd), e = gauss(rnd), noise = gauss(rnd);
    return { z: LAMBDA * fam + Math.sqrt(1 - LAMBDA * LAMBDA) * e, fam, noise };
  });
}
export const waitOf = (c: Child, inp: MarshInput): number => clamp(meanLatent(inp) + SD * c.z, 0, MAX_WAIT);
export const waits = (cohort: Child[], inp: MarshInput): number[] => cohort.map((c) => waitOf(c, inp));

export interface MarshSummary { n: number; completed: number; meanMin: number; ateEarly: number }
export function summarize(w: number[]): MarshSummary {
  const n = w.length || 1;
  return {
    n: w.length,
    completed: w.filter((x) => x >= MAX_WAIT).length / n,
    meanMin: w.reduce((a, b) => a + b, 0) / n / 60,
    ateEarly: w.filter((x) => x < 60).length / n,
  };
}
/** 10 dilim (1,5 dk) + son dilim: 15 dakikayı tamamlayanlar. */
export function histogram(w: number[]): number[] {
  const h = new Array<number>(11).fill(0);
  for (const x of w) h[x >= MAX_WAIT ? 10 : Math.min(9, Math.floor(x / 90))]++;
  return h;
}
/** Sonraki yaşam bileşik sonucu (öz denetim/başarı göstergesi). VARSAYIM: yalnızca özellik (z) ve aile etkili. */
export const lateOutcome = (c: Child): number => DELTA * c.z + KAPPA * c.fam + NOISE_SD * c.noise;

function corr(x: number[], y: number[]): number {
  const n = x.length, mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
}
/** f üzerinden doğrusal artıkları alır (ortalama sıfır). */
export function residualize(v: number[], f: number[]): number[] {
  const n = v.length, mf = f.reduce((a, b) => a + b, 0) / n, mv = v.reduce((a, b) => a + b, 0) / n;
  let sfv = 0, sff = 0;
  for (let i = 0; i < n; i++) { sfv += (f[i] - mf) * (v[i] - mv); sff += (f[i] - mf) ** 2; }
  const b = sff ? sfv / sff : 0;
  return v.map((x, i) => x - mv - b * (f[i] - mf));
}
export interface Late { x: number[]; y: number[]; rawR: number; ctrlR: number; cx: number[]; cy: number[] }
/** Bekleme süresi (dk) ile sonraki sonuç: ham ilişki ve aile geçmişi kontrol edilmiş ilişki. */
export function lateLife(cohort: Child[], w: number[]): Late {
  const x = w.map((s) => s / 60), y = cohort.map(lateOutcome), f = cohort.map((c) => c.fam);
  const cx = residualize(x, f), cy = residualize(y, f);
  return { x, y, rawR: corr(x, y), ctrlR: corr(cx, cy), cx, cy };
}

/* ======================= 2) Çocukluk adversitesi ======================= */
export const ACES = [
  'Duygusal istismar (sürekli aşağılama, tehdit)',
  'Fiziksel istismar',
  'Cinsel istismar',
  'Duygusal ihmal (sevilmeme, desteksizlik hissi)',
  'Fiziksel ihmal (bakımsızlık, yetersiz beslenme)',
  'Evde şiddete tanıklık',
  'Ailede madde bağımlılığı',
  'Ailede ruhsal hastalık',
  'Ebeveyn kaybı ya da ayrılığı',
  'Ailede biri hapse girmiş',
] as const;

export type Outcome = 'dep' | 'imp' | 'str';
/** k: yükün etkisi; wSes: SES'in doğrudan etkisi; wAtt: güvenli bağlanmanın doğrudan etkisi. Hepsi VARSAYIM (yön KİTAP). */
export const OUTCOMES: Record<Outcome, { label: string; short: string; k: number; wSes: number; wAtt: number }> = {
  dep: { label: 'Depresyon', short: 'Depresyon', k: 0.30, wSes: 0.25, wAtt: 0.1 },
  imp: { label: 'Dürtü kontrolü güçlüğü', short: 'Dürtü kontrolü', k: 0.28, wSes: 0.5, wAtt: 0.1 },
  str: { label: 'Aşırı stres tepkisi', short: 'Stres tepkisi', k: 0.32, wSes: 0.35, wAtt: 0.25 },
};
/** Eşik: referans (adversitesiz) dağılımın üst ~%16'sı "yüksek eğilim" bölgesi sayılır. VARSAYIM. */
export const THRESHOLD = 1;
export interface AceInput {
  n: number;
  /** 0,6-1,4: deneyimlerin sürekliliği/yoğunluğu. */
  intensity: number;
  /** Kurumda bakım, ay (Romanya çalışmasının kurum çocukları). */
  instMonths: number;
  attach: number; adult: number; ses: number;
}
export const DEFAULT_ACE: AceInput = { n: 0, intensity: 1, instMonths: 0, attach: 0, adult: 0, ses: 0.5 };

/** KİTAP: kurumda kalış uzadıkça sonuç kötüleşir (artan, doyan eğri); büyüklük VARSAYIM (üst sınır 4 deneyim eşdeğeri). */
export const instLoad = (months: number): number => 4 * (1 - Math.exp(-Math.max(0, months) / 18));
export const loadOf = (a: AceInput): number => {
  const l = (a.n + instLoad(a.instMonths)) * a.intensity;
  return l / (1 + 0.06 * l);
};
/** Koruyucu etkenler yükün etkisini azaltır (eğriyi düzleştirir). 1 = korumasız. */
export const buffer = (a: AceInput): number => clamp(1 - 0.35 * a.attach - 0.2 * a.adult - 0.3 * (a.ses - 0.5), 0.25, 1.2);

/** Dağılımın kayması (standart sapma biriminde). */
export function shift(o: Outcome, a: AceInput): number {
  const d = OUTCOMES[o];
  return d.k * loadOf(a) * buffer(a) + (0.5 - a.ses) * d.wSes - d.wAtt * a.attach;
}
/** Yüksek eğilim bölgesinde olma olasılığı; asla 0 ya da 1 değil. */
export const pHigh = (o: Outcome, a: AceInput): number => 1 - Phi(THRESHOLD - shift(o, a));
export const pRef = 1 - Phi(THRESHOLD);

export function levelWord(s: number): string {
  return s < 0.15 ? 'Referansa yakın' : s < 0.5 ? 'Hafif artmış' : s < 1 ? 'Belirgin artmış' : 'Yüksek';
}
/** Mekanizma göstergeleri (0-1, nitel): frontal korteks, glukokortikoid tepkisi, amigdala. */
export function mechanisms(a: AceInput): { frontal: number; gc: number; amy: number } {
  const L = loadOf(a) * buffer(a), s = 0.5 - a.ses;
  return {
    frontal: clamp(0.7 - 0.07 * L - 0.3 * s, 0.05, 0.95),
    gc: clamp(0.3 + 0.07 * L + 0.2 * s - 0.25 * a.attach, 0.05, 0.95),
    amy: clamp(0.35 + 0.1 * instLoad(a.instMonths), 0.05, 0.95),
  };
}

/* ======================= 3) Kohlberg ======================= */
export const levelOf = (stage: number): 0 | 1 | 2 => (stage <= 2 ? 0 : stage <= 4 ? 1 : 2);
export const LEVEL_NAMES = ['Gelenek öncesi (ceza/ödül)', 'Geleneksel (ilişki/kural)', 'Gelenek sonrası (ilke/vicdan)'] as const;
/**
 * Yaşa göre aşama dağılımı (6 aşama, toplamı 1).
 * KİTAP: ~8-10 yaşa dek çoğunlukla ilk düzey; ergen/yetişkinlerin çoğu geleneksel düzey; 5-6. aşamada tutarlı neredeyse kimse yok.
 * Biçim ve sayılar VARSAYIM: yaşla artan ortalama aşama, geniş yayılım, üst aşamalara güçlü ceza.
 */
export function stageDist(age: number): number[] {
  const m = 1.2 + 2.6 * (1 - Math.exp(-(age - 4) / 9));
  const pen = [1, 1, 1, 1, 0.35, 0.03];
  const w = pen.map((p, i) => p * Math.exp(-((i + 1 - m) ** 2) / 1.125));
  const t = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / t);
}
export const levelShares = (d: number[]): [number, number, number] => [d[0] + d[1], d[2] + d[3], d[4] + d[5]];

/** Akıl yürütme düzeyi ahlaki eylemi nadiren öngörür (KİTAP, nitel). Eğim küçük, bağlam baskısı büyük: VARSAYIM. */
export const actProb = (stage: number, pressure: number): number => 1 / (1 + Math.exp(-(-0.2 + 0.12 * (stage - 3) - 2 * (pressure - 0.3))));

/** Blake ve ark. (ch07-e3): kendi aleyhine eşitsizliğe tepki 4-6 yaşta her toplumda; başkası aleyhine olana tepki 8-10 yaşta ve yalnız bazı toplumlarda. Eğri biçimi VARSAYIM. */
export function fairness(age: number, society: 'late' | 'none'): { self: number; other: number } {
  const sig = (x: number): number => 1 / (1 + Math.exp(-x));
  return { self: 0.1 + 0.6 * sig((age - 5) * 1.6), other: society === 'late' ? 0.05 + 0.5 * sig((age - 9) * 1.4) : 0.05 };
}
