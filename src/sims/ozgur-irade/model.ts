// Sorumluluk ve özgür irade (ch16): saf model çekirdeği, DOM yok.
// 1) Libet: hazırlık potansiyeli (RP), niyet anı (W), veto penceresi + Schurger'in rastgele birikim modeli
// 2) Çok etkenli tahmin: etkenler eklendikçe öngörü gücü artar (kitaptaki altı etkenle ~%50'yi biraz aşar) ama kesinliğin altında kalır
// 3) Ceza ve tatmin (de Quervain, Buckholtz) ve "suçlama" ile "tehlikelilik" ayrımı

import { mulberry32 } from '../rng';

export const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x));

/** Box-Muller standart normal. */
export function gauss(rnd: () => number): number {
  let u = 0;
  while (u === 0) u = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}

/* ===================================================================
   1 · Libet ve Schurger
   =================================================================== */

/**
 * Kitaptan: RP, bildirilen niyet anından yaklaşık yarım saniye (500 ms) önce başlar (ch16-e2).
 * Modelin varsayımı: W'nin referans değeri (-200 ms), saatin tur süresi (2,5 sn) ve veto için "geri dönüşsüz" son aralık (100 ms).
 */
export const LIBET = { lead: 500, wRef: -200, clockMs: 2500, noReturn: 100, wMin: -1000 } as const;
/** RP'nin başladığı an (ms, harekete göre). */
export const RP_ONSET = LIBET.wRef - LIBET.lead;

/** Saat noktasının açısı (derece, 12 yönü = 0, saat yönü). */
export const clockAngle = (ms: number): number => ((((ms % LIBET.clockMs) + LIBET.clockMs) % LIBET.clockMs) / LIBET.clockMs) * 360;

/** Hareket anındaki ve işaretlenen noktanın açısından W (ms, <= 0). Aralık dışıysa null. */
export function wFromAngles(pressDeg: number, markDeg: number): number | null {
  const lag = ((((pressDeg - markDeg) % 360) + 360) % 360 / 360) * LIBET.clockMs;
  return lag > -LIBET.wMin ? null : -Math.round(lag);
}
/** W'ye karşılık gelen işaret açısı. */
export const markAngle = (pressDeg: number, w: number): number => (((pressDeg + (w / LIBET.clockMs) * 360) % 360) + 360) % 360;

/** Libet tarzı RP: onset'ten harekete kadar yavaş başlayıp hızlanan yükseliş (0..1). */
export function rpLibet(t: number, onset = RP_ONSET): number {
  if (t < onset) return 0;
  if (t >= 0) return 1;
  return Math.pow((t - onset) / -onset, 2);
}

/** RP'nin bildirilen niyetten ne kadar önce başladığı (ms). */
export const rpGap = (w: number, onset = RP_ONSET): number => w - onset;

/**
 * Saat/dikkat kayması: bildirim gerçek niyetten `shift` ms geç ise gerçek niyet daha erkendir,
 * RP ile niyet arasındaki gerçek aralık o kadar kısalır. Artefakt payı = kaymanın ölçülen aralığa oranı.
 */
export const trueGap = (gap: number, shift: number): number => Math.max(0, gap - shift);
export const artefactShare = (gap: number, shift: number): number => (gap <= 0 ? 1 : clamp(shift / gap));

/** Veto penceresi: niyet (W) ile geri dönüşsüz son aralık arasındaki süre (ms). */
export const vetoWindow = (w: number, noReturn: number): number => Math.max(0, -w - noReturn);

/* ---- Schurger ve ark. (2012): rastgele birikim ---- */
export interface SchParams { drive: number; leak: number; noise: number; thr: number }
/** Modelin varsayımı: birimsiz; eşik 1. Sürüklenme eşiğin altında tutulur, geçişleri gürültü getirir. */
export const SCH: SchParams = { drive: 0.6, leak: 1, noise: 0.3, thr: 1 };
export const SCH_EPOCH_MS = 1000;
const SCH_STEP_MS = 10;

export interface SchRun {
  /** Zaman ekseni (ms, -1000..0). */
  t: number[];
  /** Eşik geçişlerine hizalanmış ortalama (0 = taban, 1 = eşik). */
  locked: number[];
  /** Hizalanmamış (rastgele anlara bağlı) ortalama: düz kalır. */
  unlocked: number[];
  /** İlk üç denemenin eşik öncesi izi. */
  examples: number[][];
  /** Ortalama bekleme (sn) ve geçiş yapan deneme sayısı. */
  meanWait: number;
  n: number;
  /** Hizalı ortalamanın taban üstü %10'u aştığı an (ms); yoksa 0. */
  onset: number;
}

export function runSchurger(p: SchParams, seed: number, trials = 150): SchRun {
  const rnd = mulberry32(seed);
  const dt = SCH_STEP_MS / 1000, sq = Math.sqrt(dt);
  const len = SCH_EPOCH_MS / SCH_STEP_MS;
  const base = p.drive / p.leak, span = Math.max(1e-6, p.thr - base);
  const lockedSum = new Array<number>(len + 1).fill(0), unlockedSum = new Array<number>(len + 1).fill(0);
  const examples: number[][] = [];
  let n = 0, waitSum = 0;
  for (let i = 0; i < trials; i++) {
    let x = base;
    const tr: number[] = [];
    // Ön ısınma: eşik denetimi yok (3 sn). Hizalanmamış pencere bu sürenin sonundan alınır.
    for (let k = 0; k < 300; k++) { x += (p.drive - p.leak * x) * dt + p.noise * sq * gauss(rnd); tr.push(x); }
    const free = tr.slice(-(len + 1));
    let hit = false, steps = 0;
    while (steps < 4000) {
      x += (p.drive - p.leak * x) * dt + p.noise * sq * gauss(rnd); tr.push(x); steps++;
      if (x >= p.thr) { hit = true; break; }
    }
    if (!hit) continue;
    n++; waitSum += steps * dt;
    const tail = tr.slice(-(len + 1));
    for (let j = 0; j <= len; j++) { lockedSum[j] += tail[j]; unlockedSum[j] += free[j]; }
    if (examples.length < 3) examples.push(tail.map((v) => (v - base) / span));
  }
  const t = Array.from({ length: len + 1 }, (_, j) => -SCH_EPOCH_MS + j * SCH_STEP_MS);
  const norm = (s: number) => (n ? (s / n - base) / span : 0);
  const locked = lockedSum.map(norm), unlocked = unlockedSum.map(norm);
  const k = locked.findIndex((v) => v >= 0.1);
  return { t, locked, unlocked, examples, meanWait: n ? waitSum / n : 0, n, onset: k < 0 ? 0 : t[k] };
}

/* ===================================================================
   2 · Çok etkenli tahmin
   =================================================================== */

export interface Factor { id: string; name: string; hint: string; share: number; prev: number }
/**
 * Kitaptan (ch16-e5, kaba hesap; kitapta "say", "maybe" ile verilir): yalnızca gen ~%10; ebeveyn kaybıyla ~%25; yoksulluk
 * ve yalnız yaşamla ~%40; sonra sırayla glukokortikoid düzeyi ("biraz daha"), bireyci/toplulukçu kültür ("biraz daha") ve
 * adet döngüsü ("biraz daha, belki şimdiye %50'nin üstü") eklenir. Kitap, yeterince etken eklenince öngörünün kırık kemik
 * örneğindeki gibi %100'e yaklaşacağını da söyler (farklı miktarda değil, farklı türde nedensellik); bu simülasyon yalnızca
 * kitabın saydığı altı etkeni modeller. `share`, o etkenin (birbirinden bağımsız varsayılan) açıkladığı değişkenlik payıdır:
 * ilk üçün toplamı %10/%25/%40 basamaklarına, son üç pay (her biri %4) altıncıda %50'yi aşacak biçimde (%52) seçildi; tek tek
 * değerler ve yaygınlıklar modelin varsayımıdır.
 */
export const FACTORS: readonly Factor[] = [
  { id: 'gen', name: 'Gen varyantı', hint: 'serotonin taşıyıcı geni', share: 0.1, prev: 0.3 },
  { id: 'kayip', name: 'Çocuklukta kayıp ya da istismar', hint: 'ebeveyn kaybı, kötü muamele', share: 0.15, prev: 0.25 },
  { id: 'yoksul', name: 'Yoksulluk ve yalnız yaşam', hint: 'uzun süreli yoksunluk, destek yokluğu', share: 0.15, prev: 0.3 },
  { id: 'kortizol', name: 'Kortizol düzeyi', hint: 'glukokortikoid, süregiden stres', share: 0.04, prev: 0.5 },
  { id: 'kultur', name: 'Kültür', hint: 'bireyci ya da toplulukçu', share: 0.04, prev: 0.5 },
  { id: 'adet', name: 'Adet döngüsü', hint: 'depresyondaki kadında belirtileri şiddetlendirir', share: 0.04, prev: 0.2 },
];
export const BASE_RATE = 0.2;
const Z_BASE = 0.8416212; // normal dağılımda üst %20 eşiği (modelin varsayımı: davranış toplumun ~%20'sinde görülür)

export const defaultShares = (gene = FACTORS[0].share): number[] => FACTORS.map((f, i) => (i === 0 ? gene : f.share));
export const explained = (known: readonly boolean[], shares: readonly number[] = defaultShares()): number =>
  shares.reduce((a, s, i) => a + (known[i] ? s : 0), 0);
/** Etkenler sırayla eklendikçe birikimli öngörü (0 etken dahil, 7 değer). */
export function cumulative(shares: readonly number[] = defaultShares()): number[] {
  const out = [0];
  shares.forEach((s) => out.push(out[out.length - 1] + s));
  return out;
}

export interface Person { score: number; y: 0 | 1 }
/** Aynı tohum, bilinen etkenlerden bağımsız aynı kişileri ve sonuçları üretir; yalnızca puan (bilgi) değişir. */
export function sample(known: readonly boolean[], shares: readonly number[], seed: number, n: number): Person[] {
  const rnd = mulberry32(seed);
  const noiseSd = Math.sqrt(Math.max(0, 1 - shares.reduce((a, b) => a + b, 0)));
  const out: Person[] = [];
  for (let i = 0; i < n; i++) {
    let latent = 0, score = 0;
    FACTORS.forEach((f, j) => {
      const b = Math.sqrt(shares[j] / (f.prev * (1 - f.prev)));
      const c = b * ((rnd() < f.prev ? 1 : 0) - f.prev);
      latent += c;
      if (known[j]) score += c;
    });
    latent += noiseSd * gauss(rnd);
    out.push({ score, y: latent > Z_BASE ? 1 : 0 });
  }
  return out.sort((a, b) => a.score - b.score);
}

/** Puana göre beş eşit gruba böler; 0 = en düşük risk, 4 = en yüksek. Her grupta gerçekleşen oran. */
export function quintiles(people: readonly Person[]): { hit: number; size: number; rate: number }[] {
  const n = people.length, out = [];
  for (let g = 0; g < 5; g++) {
    const part = people.slice(Math.floor((g * n) / 5), Math.floor(((g + 1) * n) / 5));
    const hit = part.reduce((a, p) => a + p.y, 0);
    out.push({ hit, size: part.length, rate: part.length ? hit / part.length : 0 });
  }
  return out;
}

export interface Evaluation { r2: number; unknown: number; groups: number[]; top: number; bottom: number }
/** Büyük, sabit tohumlu örneklemden kararlı rakamlar. */
export function evaluate(known: readonly boolean[], shares: readonly number[] = defaultShares(), seed = 5, n = 4000): Evaluation {
  const r2 = explained(known, shares);
  const q = quintiles(sample(known, shares, seed, n)).map((g) => g.rate);
  return { r2, unknown: 1 - r2, groups: q, top: q[4], bottom: q[0] };
}

/* ===================================================================
   3 · Ceza ve tatmin
   =================================================================== */

/* ---- de Quervain (ch16-e7): bedelsiz cezalandırmada ödül (kaudat) etkinliği, bedelli ödeme isteğini öngörür ---- */
export interface Player { caudate: number; eps: number }
export function makePlayers(seed: number, n = 40): Player[] {
  const rnd = mulberry32(seed);
  return Array.from({ length: n }, () => ({ caudate: clamp(1 + 0.3 * gauss(rnd), 0.1, 2), eps: gauss(rnd) }));
}
/** Modelin varsayımı: ödeme isteği = adaletsizlik x (norm payı + ödül ağırlığı x kaudat + bireysel fark). Birim: puan. */
export const NORM_PAY = 0.5;
export const wtp = (p: Player, unfair: number, wRew: number): number => Math.max(0, unfair * (NORM_PAY + wRew * p.caudate + 1.2 * p.eps));
export const punishes = (p: Player, unfair: number, wRew: number, cost: number): boolean => wtp(p, unfair, wRew) > cost + 0.2;

export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

export interface Punish { count: number; total: number; paid: number; r: number }
export function punishStats(players: readonly Player[], unfair: number, wRew: number, cost: number): Punish {
  const count = players.filter((p) => punishes(p, unfair, wRew, cost)).length;
  return {
    count, total: players.length, paid: count * cost,
    r: pearson(players.map((p) => p.caudate), players.map((p) => wtp(p, unfair, wRew))),
  };
}

/* ---- Buckholtz (ch16-e6): sorumluluk kararı (dlPFC) ile ceza miktarı kararı (duygusal bölgeler) ---- */
export interface Case { id: string; short: string; text: string; harm: number; bio: number; danger: number; treat: number }
/** Vakalar modelin kurgusudur (kitapta bu adla yok); sayılar modelin varsayımıdır. */
export const CASES: readonly Case[] = [
  { id: 'tumor', short: 'Frontal tümör', text: 'Sakin biri, frontal korteksteki bir tümör büyürken öfke patlamasıyla birine ağır zarar verdi. Tümör ameliyatla alınabiliyor.', harm: 0.6, bio: 0.9, danger: 0.7, treat: 0.85 },
  { id: 'istismar', short: 'Ağır istismar', text: 'Çocukluğunda ağır istismar gören, yoksulluk içinde yaşayan bir yetişkin tekrar tekrar şiddet uyguladı. Nedenler çok etkenli, kısmen tedavi edilebilir.', harm: 0.7, bio: 0.6, danger: 0.6, treat: 0.45 },
  { id: 'ergen', short: 'Ergen, tek an', text: 'On altı yaşında biri, saniyeler içindeki bir dürtüyle birini yaraladı. Frontal korteksi henüz olgunlaşmamıştı.', harm: 0.6, bio: 0.5, danger: 0.3, treat: 0.7 },
  { id: 'bilinmez', short: 'Neden bulunamadı', text: 'Planlı bir suç işleyen kişide bugünün bilgisiyle biyolojik ya da yaşamsal bir etken saptanamadı.', harm: 0.7, bio: 0.1, danger: 0.5, treat: 0.2 },
];

/** Soğuk (bilişsel dlPFC) sorumluluk kararı biyolojik açıklamayla düşer; sıcak (vmPFC, amigdala, insula) ceza dürtüsü zarara bağlıdır, bilgiyle çok az düşer (varsayım). */
export function judgments(c: Case, bio: number): { cold: number; hot: number } {
  return { cold: clamp(1 - 0.85 * bio), hot: clamp(c.harm * (1 - 0.2 * bio)) };
}

export type Resp = 'ceza' | 'karantina' | 'onarim';
export const RESPS: readonly { k: Resp; name: string; tag: string }[] = [
  { k: 'ceza', name: 'Ceza', tag: 'hapis, hak ettiğini bulsun' },
  { k: 'karantina', name: 'Karantina ve gözetim', tag: 'yoldan çek, uzak tut' },
  { k: 'onarim', name: 'Onarım', tag: 'nedeni tedavi et' },
];
/** Modelin varsayımı: önlemin etkisi katsayıları (kitapta sayı yok). */
export function outcome(c: Case, bio: number, resp: Resp): { safety: number; cause: number; satisf: number } {
  const hot = judgments(c, bio).hot;
  const residual = resp === 'ceza' ? 0.85 : resp === 'karantina' ? 0.5 : 1 - 0.8 * c.treat;
  return {
    safety: clamp(1 - c.danger * residual),
    cause: resp === 'onarim' ? 0.8 * c.treat : 0,
    satisf: resp === 'ceza' ? hot : resp === 'karantina' ? 0.25 * hot : 0,
  };
}

/** Tehlikelilik odaklı öneri; suçlama puanına bakmaz. */
export function recommend(danger: number, treat: number): 'izleme' | 'onarim' | 'karantina' {
  return danger < 0.25 ? 'izleme' : treat >= 0.5 ? 'onarim' : 'karantina';
}

export type Quad = 'tamir' | 'intikam' | 'ikisi' | 'hicbiri';
/** Suçlama ve tehlikelilik puanlarından (0..100) çeyrek. */
export function quadrant(blame: number, danger: number): Quad {
  const b = blame >= 50, d = danger >= 50;
  return b && d ? 'ikisi' : d ? 'tamir' : b ? 'intikam' : 'hicbiri';
}
