// Empati ve yardım modeli (ch14). Saf TypeScript, DOM yok.
// Sekme 1: duygusal bulaşma (sıkıntı) ile şefkat (sıcaklık) iki ayrı durum değişkeni; yardım, ikisinin
//          ve bir kaçınma eşiğinin sonucudur (Klimecki/Singer ch14-e9, Eisenberg e7, Martin e8).
// Sekme 2: "biz" ağırlığı; sıçanların kurtarma/paylaşma kararı (Bartal e4), farelerde acı bulaşması (Langford e2).
// Sekme 3: zorunlu vergi ve gönüllü bağışta ödül devresi (Harbaugh e12), parayı başkasına harcamak (Dunn e11).
// Tüm katsayılar modelin varsayımıdır; kitaptan gelen, bulguların yönü ve birkaç sayıdır (ör. "zamanın yarısından fazlası").
import { mulberry32 } from '../rng';

export const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));
const sig = (x: number): number => 1 / (1 + Math.exp(-x));
const P = (v: number): number => Math.round(v * 100);

// ============================================================ Sekme 1: bulaşma ve şefkat
export interface EmpathyInputs {
  /** Gözlenen acının şiddeti, 0-1. */
  pain: number;
  /** Dikkatin kendine dönük payı ("bana olsaydı"), 0-1. 1 - selfFocus karşıdakine odaktır. */
  selfFocus: number;
  /** Şefkat eğitimi (sıcaklık ve bakım odağı), 0-1. */
  training: number;
  /** Başlangıçtaki stres düzeyi (glukokortikoid benzeri), 0-1. */
  stress: number;
}
export const EMPATHY_DEFAULT: EmpathyInputs = { pain: 0.55, selfFocus: 0.5, training: 0, stress: 0.3 };
/** Klimecki/Singer koşulları: empati eğitimi (acıyı hissetmeye odak) ve şefkat eğitimi (sıcaklığa odak). */
export const EMPATHY_TRAINING: EmpathyInputs = { pain: 0.8, selfFocus: 0.9, training: 0, stress: 0.3 };
export const COMPASSION_TRAINING: EmpathyInputs = { pain: 0.8, selfFocus: 0.15, training: 0.8, stress: 0.3 };

export const THETA = 0.55; // kişisel sıkıntı eşiği (ortalama)
export const STEPS = 120;
export const DT = 0.5; // saniye (şematik)
export const T_END = STEPS * DT;

export interface Traj { d: number[]; w: number[] }

/** Sıkıntı (d) ve şefkat (w) zaman serisi. sens: bireyin bulaşma duyarlılığı (1 = ortalama). */
export function trajectory(u: EmpathyInputs, sens = 1): Traj {
  const g = sens * (0.35 + 0.65 * u.selfFocus) * (0.7 + 0.6 * u.stress);
  const a = 0.12 * u.pain * g;
  const other = 1 - u.selfFocus;
  let d = 0.2 * u.stress, w = 0;
  const ds = [d], ws = [w];
  for (let i = 0; i < STEPS; i++) {
    const rd = 0.04 + 0.1 * u.training * w; // şefkat, sıkıntıyı düzenleyen güç
    const dd = a * (1 - d) - rd * d;
    const dw = 0.1 * u.pain * other * (1 + 1.5 * u.training) * (1 - 0.5 * d) * (1 - w) - 0.04 * w;
    d = clamp(d + dd * DT); w = clamp(w + dw * DT);
    ds.push(d); ws.push(w);
  }
  return { d: ds, w: ws };
}

/** Kişisel sıkıntı eşiği aşılınca kaçınma olasılığı hızla artar. */
export const avoidProb = (d: number, theta = THETA): number => sig((d - theta) / 0.06);
/** Yardım isteği: paylaşılan duygu bir ölçüde harekete geçirir, şefkat daha çok. */
export const motivation = (d: number, w: number): number => clamp(0.1 + 0.55 * d + 0.65 * w);
export const helpProb = (d: number, w: number, theta = THETA): number => (1 - avoidProb(d, theta)) * motivation(d, w);

export type Kind = 'help' | 'avoid' | 'idle';
export interface Observer { d: number; w: number; kind: Kind; p: number }
export interface EmpathyResult {
  mean: Traj;
  obs: Observer[];
  help: number; avoid: number; idle: number;
  dEnd: number; wEnd: number;
  /** Gözlemcilerde son sıkıntı ile yardım olasılığı arasındaki Pearson korelasyonu. */
  corr: number;
}

export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** n gözlemci; her birinin duyarlılığı ve eşiği biraz farklı. Aynı tohumla aynı çekimler (ortak rastgelelik). */
export function simulateEmpathy(u: EmpathyInputs, seed = 1, n = 40): EmpathyResult {
  const rnd = mulberry32(seed);
  const mean = trajectory(u);
  const obs: Observer[] = [];
  for (let i = 0; i < n; i++) {
    const s = rnd(), th = rnd(), u1 = rnd(), u2 = rnd();
    const tr = trajectory(u, 0.7 + 0.6 * s);
    const d = tr.d[STEPS], w = tr.w[STEPS], theta = THETA + (th - 0.5) * 0.2;
    const kind: Kind = u1 < avoidProb(d, theta) ? 'avoid' : u2 < motivation(d, w) ? 'help' : 'idle';
    obs.push({ d, w, kind, p: helpProb(d, w, theta) });
  }
  const share = (k: Kind) => obs.filter((o) => o.kind === k).length / n;
  return {
    mean, obs, help: share('help'), avoid: share('avoid'), idle: share('idle'),
    dEnd: mean.d[STEPS], wEnd: mean.w[STEPS],
    corr: pearson(obs.map((o) => o.d), obs.map((o) => o.p)),
  };
}

export function describeEmpathy(u: EmpathyInputs, r: EmpathyResult): string {
  const focus = u.selfFocus >= 0.6 ? 'Dikkat çoğunlukla gözlemcinin kendi sıkıntısında' : u.selfFocus <= 0.35 ? 'Dikkat acı çeken kişide' : 'Dikkat kendisi ile acı çeken arasında bölünmüş';
  const tail = r.dEnd >= THETA
    ? `sıkıntı eşiğin üstünde; %${P(r.avoid)} kaçınıyor, yalnızca %${P(r.help)} yardım ediyor.`
    : r.wEnd >= 0.5
      ? `şefkat yükseliyor, sıkıntı eşiğin altında kalıyor; %${P(r.help)} yardım ediyor.`
      : `sıkıntı eşiğin altında ama şefkat zayıf; %${P(r.help)} yardım ediyor.`;
  return `${focus}: ${tail}`;
}

// ============================================================ Sekme 2: kime yardım?
export type Strain = 'light' | 'dark';
export type Target = 'cage' | 'light' | 'dark';
export interface BondInputs {
  /** Gözlemci sıçanı hangi soydan bakıcı büyüttü (doğuşta hep "açık renkli"). */
  rearing: Strain;
  /** Öteki soyla birlikte yaşama süresi, gün (model ölçeği). */
  days: number;
  /** Kurtarmanın bedeli, 0-0,8. */
  cost: number;
  target: Target;
  /** Glukokortikoid salgısı engellendi mi (Martin ve ark.). */
  gcBlock: boolean;
  /** İzlenen farenin acısı: 0 az yalıyor, 1 çok yalıyor. */
  partnerPain: number;
}
export const BOND_DEFAULT: BondInputs = { rearing: 'light', days: 0, cost: 0.3, target: 'cage', gcBlock: false, partnerPain: 0.85 };
export const TAU_DAYS = 4;
export const CHOCOLATE = 0.92; // çikolata kapısını açma olasılığı (referans; modelin varsayımı)
export const TARGETS: Target[] = ['cage', 'light', 'dark'];

/** Gözlemcinin bir soya aşinalığı: büyütüldüğü soy tam, öteki soy birlikte yaşadıkça artar. */
export const familiarity = (b: BondInputs, s: Strain): number => (s === b.rearing ? 1 : 1 - Math.exp(-b.days / TAU_DAYS));
/** Hedefin "bizden" sayılma düzeyi, 0-1. */
export const usness = (b: BondInputs, t: Target): number => (t === 'cage' ? 1 : 0.2 + 0.55 * familiarity(b, t));
export const rescueProb = (u: number, cost: number): number => sig(8 * (u - cost - 0.25));
/** Kurtarılan sıçanla çikolatayı paylaşma olasılığı (kurtarma gerçekleştiyse). */
export const shareProb = (u: number): number => clamp(0.3 + 0.35 * u);
/** Acı bulaşmasının ağırlığı: tanıdıklarda tam, yabancıda çok az; glukokortikoid engellenince yabancıda da var. */
export const contagionWeight = (t: Target, gc: boolean): number => (t === 'cage' ? 1 : gc ? 0.8 : 0.08);
/** İzleyicinin kendi acı yanıtı (0,5 = tek başınayken). */
export const painResponse = (w: number, partner: number): number => clamp(0.5 + 0.6 * w * (partner - 0.5));

export interface BondRow { u: number; rescue: number; share: number; w: number; response: number }
export interface BondResult { rows: Record<Target, BondRow>; sel: BondRow }
export function bondResult(b: BondInputs): BondResult {
  const row = (t: Target): BondRow => {
    const u = usness(b, t), w = contagionWeight(t, b.gcBlock);
    return { u, rescue: rescueProb(u, b.cost), share: shareProb(u), w, response: painResponse(w, b.partnerPain) };
  };
  const rows = { cage: row('cage'), light: row('light'), dark: row('dark') };
  return { rows, sel: rows[b.target] };
}

export const STRAIN_NAME: Record<Strain, string> = { light: 'açık renkli', dark: 'koyu renkli' };
export const TARGET_NAME: Record<Target, string> = { cage: 'kafes arkadaşı', light: 'açık renkli yabancı', dark: 'koyu renkli yabancı' };

export function describeBond(b: BondInputs, r: BondResult): string {
  const head = `Hedef: ${TARGET_NAME[b.target]}. Kurtarma %${P(r.sel.rescue)}, kurtarılırsa çikolata paylaşımı %${P(r.sel.share)}.`;
  const mouse = r.sel.w > 0.5
    ? ' Fare tanıdıksa izlenen acı bulaşıyor.'
    : ' Fare yabancıysa izlenen acı neredeyse bulaşmıyor.';
  return head + mouse;
}

// ============================================================ Sekme 3: bağış ve ödül
export interface GiveInputs {
  /** Başkasının yararına duyarlılık ("saf" altruizm), 0-1. */
  altru: number;
  /** Sıcak ışıltı: vermenin kendi ödülü, 0-1. */
  warm: number;
  /** Vergi ya da bağışın tutarı, paranın payı. */
  amount: number;
}
export const GIVE_DEFAULT: GiveInputs = { altru: 0.5, warm: 0.5, amount: 0.5 };
export interface Giver { recv: number; tax: number; vol: number; gift: number }
export interface GiveResult { givers: Giver[]; recv: number; tax: number; vol: number; r: number; gift: number }

export function simulateGive(u: GiveInputs, seed = 1, n = 40): GiveResult {
  const rnd = mulberry32(seed);
  const givers: Giver[] = [];
  for (let i = 0; i < n; i++) {
    const ra = rnd(), rw = rnd(), rr = rnd(), e1 = rnd(), e2 = rnd();
    const a = clamp(u.altru * (0.4 + 1.2 * ra)), w = clamp(u.warm * (0.4 + 1.2 * rw));
    const recv = 0.35 + 0.4 * rr;
    const tax = clamp(0.1 + 0.8 * a * u.amount + 0.08 * (e1 - 0.5)); // yalnızca başkasının yararı
    const vol = clamp(tax + 0.6 * w * (0.3 + 0.7 * u.amount)); // + vermenin kendi ödülü
    const gift = clamp(0.75 * a + 0.35 * w + 0.15 * (e2 - 0.5));
    givers.push({ recv, tax, vol, gift });
  }
  const mean = (f: (g: Giver) => number) => givers.reduce((s, g) => s + f(g), 0) / n;
  return {
    givers, recv: mean((g) => g.recv), tax: mean((g) => g.tax), vol: mean((g) => g.vol), gift: mean((g) => g.gift),
    r: pearson(givers.map((g) => g.tax), givers.map((g) => g.gift)),
  };
}

export type Replic = 'orig' | 'small';
export const REPLIC_SCALE = 0.4; // ön kayıtlı replikasyonda etkinin küçülmesi (modelin varsayımı; kitapta yalnızca "belirgin biçimde küçük")
/** Gün sonu mutluluk değişimi (şematik birim). Başkasına harcamada sıcak ışıltıdan gelir; miktara bağlı değildir. */
export const happinessChange = (warm: number, onSelf: boolean, rep: Replic): number =>
  onSelf ? 0.03 : (0.25 + 0.75 * warm) * 0.8 * (rep === 'small' ? REPLIC_SCALE : 1);
/** Dışarıdan tahmin edenler: kendine ve daha büyük miktarda daha çok mutluluk. */
export const forecast = (onSelf: boolean, amount: 5 | 20): number => 0.2 * (onSelf ? 1 : 0.55) * (amount === 20 ? 1.5 : 1);

export function describeGive(r: GiveResult): string {
  const gain = r.vol - r.tax;
  const rr = r.r >= 0.5 ? 'güçlü' : r.r > 0.2 ? 'orta' : 'zayıf';
  return `Gönüllü bağışta ödül devresi zorunlu vergiye göre ${gain > 0.02 ? `${P(gain)} puan yüksek` : 'hemen hemen aynı'}; ` +
    `vergi sırasındaki ödül ile cömertlik arasındaki ilişki ${rr} (r = ${r.r.toFixed(2).replace('.', ',')}).`;
}
