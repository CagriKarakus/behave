// Saniyeler ila dakikalar önce: (1) hızlı amigdala yolu ile yavaş frontal fren, (2) norm ihlallerinin yayılması.
// Saf model: DOM yok. Zamanlar ms. "Kitap" etiketli değerler chapters.json'daki bulgulardan gelir; diğer tüm
// sabitler (gecikmeler, zaman sabitleri, taban oranlar) modelin varsayımıdır ve ilişkilerin yönünü gösterir.
import { mulberry32 } from '../rng';

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));

// ===================================================================== 1) Hızlı yol ve düşünce
export type Stim = 'fear' | 'calm' | 'sign' | 'faceB' | 'faceW';
/** Tehdit çağrışımı: korkulu göz akları (Whalen), nötr yüz, soyut uyarı işareti. Değerler modelin varsayımı. */
export const STIM: Record<Stim, { name: string; threat: number }> = {
  fear: { name: 'Korkulu göz', threat: 0.85 },
  calm: { name: 'Nötr yüz', threat: 0.2 },
  sign: { name: 'Uyarı işareti', threat: 0.6 },
  // Yüz kategorileri çalışmaların kendi terimleriyle (Beyaz katılımcılar için Siyah/Beyaz yüz). Siyah yüz için eşik
  // threatOf() içinde öğrenilmiş çağrışım ve tanıdıklıkla belirlenir.
  faceB: { name: 'Siyah yüz', threat: 0.2 },
  faceW: { name: 'Beyaz yüz', threat: 0.2 },
};
/** Öğrenilmiş çağrışımın en fazla eklediği tehdit (varsayım). */
export const ASSOC_MAX = 0.5;

export interface FastInputs {
  /** Gösterim süresi, ms (30 - 2000). */
  dur: number;
  /** Uyaranın ardından maske (örtü deseni) gösterilir mi. */
  masked: boolean;
  stim: Stim;
  /** Bilişsel yük 0-1 (aklında sayı tutmak gibi). */
  load: number;
  /** Frontal güç 0-1. */
  frontal: number;
  /** Beyaz katılımcının kültürel olarak öğrenilmiş (örtük) çağrışımı 0-1; yalnızca Siyah yüzde etkili. */
  assoc: number;
  /** Başka gruptan yüzlere tanıdıklık 0-1: çağrışımın etkisini azaltır. */
  fam: number;
}
export const FAST_DEFAULT: FastInputs = { dur: 30, masked: true, stim: 'fear', load: 0, frontal: 0.8, assoc: 0.5, fam: 0 };
export const threatOf = (u: FastInputs): number =>
  u.stim === 'faceB' ? STIM.faceB.threat + ASSOC_MAX * u.assoc * (1 - u.fam) : STIM[u.stim].threat;

export const T_END = 1600;
/** Maskenin ekranda kaldığı süre (görsel). */
export const MASK_MS = 100;
// Kitap: amigdala yanıtı ~100 ms'de görülür; yüz 100 ms'den kısa gösterildiğinde bile amigdala etkinleşir,
// bilinçli algıya yetecek kadar uzun gösterilince ACC ve dlPFC devreye girip amigdalayı baskılar.
const LAT_A = 50;      // amigdala girdi gecikmesi (varsayım)
const TAU_RISE = 35;   // amigdala yükselme zaman sabiti (varsayım)
const TAU_DECAY = 260; // kendiliğinden sönme (varsayım)
const ICONIC = 100;    // maskesiz uyaranın görsel izi (varsayım)
const AW_T = 100;      // bilinçli algı eşiği (kitaptaki ~100 ms'ye dayanır) ve geçiş genişliği
const AW_W = 22;
const LAT_F = 150;     // frontal gecikme: amigdala alarmından sonra (varsayım)
const TAU_F = 110;
const GAIN = 0.9;      // frontal frenin girdiyi kısma gücü (varsayım)
const LOAD_COST = 0.6; // bilişsel yükün frontal gücü azaltma payı (varsayım)

export interface FastResult {
  amy: Float32Array;
  fro: Float32Array;
  /** Fren olmasaydı amigdala (karşılaştırma eğrisi). */
  free: Float32Array;
  awareness: number;
  peakA: number;
  peakF: number;
  /** Amigdala / frontal yarı yükseliş zamanı (ms); yükselmediyse -1. */
  tA50: number;
  tF50: number;
  /** Frenin amigdala tepkisini (0-1600 ms alanı) ne kadar azalttığı. */
  brake: number;
  cap: number;
}

export const awarenessOf = (u: FastInputs): number => {
  const dEff = u.masked ? u.dur : u.dur + ICONIC;
  return 1 / (1 + Math.exp(-(dEff - AW_T) / AW_W));
};

function run(u: FastInputs, withBrake: boolean): { A: Float32Array; F: Float32Array } {
  const dEff = u.masked ? u.dur : u.dur + ICONIC;
  const aw = awarenessOf(u);
  const threat = threatOf(u);
  const cap = clamp(u.frontal * (1 - LOAD_COST * u.load));
  const A = new Float32Array(T_END), F = new Float32Array(T_END);
  let a = 0, f = 0;
  for (let t = 0; t < T_END; t++) {
    const s = t >= LAT_A && t < LAT_A + dEff ? threat : 0;
    const target = s * (1 - GAIN * f);
    const tau = target > a ? TAU_RISE : TAU_DECAY / (1 + 2 * f);
    a += (target - a) / tau;
    const alarm = t >= LAT_F ? A[t - LAT_F] : 0;
    const ft = withBrake ? cap * aw * Math.min(1, alarm / 0.35) : 0;
    f += (ft - f) / TAU_F;
    A[t] = a; F[t] = f;
  }
  return { A, F };
}

const area = (x: Float32Array): number => { let s = 0; for (const v of x) s += v; return s; };
const tHalf = (x: Float32Array, peak: number): number => {
  if (peak < 0.02) return -1;
  for (let t = 0; t < x.length; t++) if (x[t] >= peak / 2) return t;
  return -1;
};

export function simulateFast(u: FastInputs): FastResult {
  const { A, F } = run(u, true);
  const free = run(u, false).A;
  const peakA = Math.max(...A), peakF = Math.max(...F);
  const aFree = area(free);
  return {
    amy: A, fro: F, free,
    awareness: awarenessOf(u),
    peakA, peakF,
    tA50: tHalf(A, peakA), tF50: tHalf(F, peakF),
    brake: aFree > 0.5 ? clamp(1 - area(A) / aFree) : 0,
    cap: clamp(u.frontal * (1 - LOAD_COST * u.load)),
  };
}

export function describeFast(u: FastInputs, r: FastResult): string {
  const seen = r.awareness >= 0.5;
  const amy = Math.round(r.peakA * 100);
  const brake = Math.round(r.brake * 100);
  if (r.peakA < 0.3) return `Uyaran (${STIM[u.stim].name.toLowerCase()}) az tehdit taşıyor: amigdala tepkisi küçük (%${amy}), frenlenecek bir şey yok.`;
  if (!seen) return `Uyaran fark edilmedi (algı %${Math.round(r.awareness * 100)}), ama amigdala yine de %${amy} düzeyine çıktı. Frontal fren devreye girmedi.`;
  if (r.brake < 0.25) return `Uyaran fark edildi, ama süre kısa ya da frontal güç düşük: amigdala %${amy}'e çıktı, fren tepkiyi yalnızca %${brake} azalttı.`;
  const load = u.load > 0.5 ? ' Yük frenin gücünü azaltıyor.' : '';
  return `Uyaran fark edildi. Amigdala ~${r.tA50} ms'de yükseldi, frontal korteks ~${r.tF50} ms'de devreye girip tepkiyi %${brake} azalttı.${load}`;
}

// ===================================================================== 2) Norm ihlallerinin yayılması (Keizer)
export type Kind = 'flyer' | 'shortcut' | 'steal';
export type Cue = 'graffiti' | 'bikes' | 'litter';
export const KINDS: Kind[] = ['flyer', 'shortcut', 'steal'];
export const CUES: Cue[] = ['graffiti', 'bikes', 'litter'];
/** Keizer'de her ihlal işareti belirli bir davranışla eşleştirildi (yöntem metni). */
export const MATCH: Record<Kind, Cue> = { flyer: 'graffiti', shortcut: 'bikes', steal: 'litter' };
/** Taban oranlar (ihlal işareti yokken): modelin varsayımı. */
export const BASE: Record<Kind, number> = { flyer: 0.3, shortcut: 0.25, steal: 0.12 };
/** Eşleşmeyen ipucunun etkisi, eşleşenin payı olarak (varsayım; Keizer her çifti ayrı deneyde sınadı). */
export const CROSS = 0.35;
/** Yere bırakılan ilanın ortamda kaç yaya boyunca görünür kaldığı (varsayım). */
export const DROP_LIFE = 8;
/** "Çöp" ipucu bu kadar parça çöple tam güce ulaşır. */
export const LITTER_FULL = 3;
export const MAX_P = 0.95;
export const OVERSIGHT_CUT = 0.6;

export interface StreetCfg {
  graffiti: boolean;
  litter: boolean;
  bikes: boolean;
  /** Görünür denetim 0-1 (varsayım: ihlalleri azaltır). */
  oversight: number;
  /** Etki gücü 0-1: 1 = özgün bulgu (eşleşen ipucu ~2 kat); replikasyon daha küçük etki buldu. */
  strength: number;
  /** Ajanların bıraktığı ilanlar ortamı bozar (zincirleme). */
  chain: boolean;
}
export const STREET_DEFAULT: StreetCfg = { graffiti: false, litter: false, bikes: false, oversight: 0, strength: 1, chain: true };
export const CLEAN: Pick<StreetCfg, 'graffiti' | 'litter' | 'bikes'> = { graffiti: false, litter: false, bikes: false };

export interface Drop { age: number; pos: number }
export interface StreetState {
  cfg: StreetCfg;
  rnd: () => number;
  drops: Drop[];
  n: Record<Kind, number>;
  v: Record<Kind, number>;
  made: number;
}

export function newStreet(cfg: StreetCfg, seed: number): StreetState {
  return { cfg, rnd: mulberry32(seed), drops: [], n: { flyer: 0, shortcut: 0, steal: 0 }, v: { flyer: 0, shortcut: 0, steal: 0 }, made: 0 };
}

export function cueLevels(cfg: StreetCfg, drops: readonly Drop[]): Record<Cue, number> {
  const pieces = (cfg.litter ? LITTER_FULL : 0) + (cfg.chain ? drops.length : 0);
  return { graffiti: cfg.graffiti ? 1 : 0, bikes: cfg.bikes ? 1 : 0, litter: clamp(pieces / LITTER_FULL) };
}

export function violationProb(kind: Kind, cues: Record<Cue, number>, cfg: StreetCfg): number {
  let other = 0;
  for (const c of CUES) if (c !== MATCH[kind]) other += cues[c];
  const mult = 1 + cfg.strength * (cues[MATCH[kind]] + CROSS * other);
  return Math.min(MAX_P, BASE[kind] * mult) * (1 - OVERSIGHT_CUT * cfg.oversight);
}

/** Genel düzensizlik düzeyi 0-1 (grafik için). */
export const disorderOf = (cfg: StreetCfg, drops: readonly Drop[]): number => {
  const c = cueLevels(cfg, drops);
  return (c.graffiti + c.bikes + c.litter) / 3;
};

/** Bir yaya bir istasyonda karar verir (tek rastgele sayı tüketir). */
export function decide(s: StreetState, kind: Kind): boolean {
  if (kind === 'flyer') {
    for (const d of s.drops) d.age++;
    while (s.drops.length && s.drops[0].age >= DROP_LIFE) s.drops.shift();
  }
  const p = violationProb(kind, cueLevels(s.cfg, s.drops), s.cfg);
  const yes = s.rnd() < p;
  s.n[kind]++;
  if (yes) {
    s.v[kind]++;
    if (kind === 'flyer' && s.cfg.chain) s.drops.push({ age: 0, pos: (++s.made * 0.618034) % 1 });
  }
  return yes;
}

export function pass(s: StreetState): Record<Kind, boolean> {
  return { flyer: decide(s, 'flyer'), shortcut: decide(s, 'shortcut'), steal: decide(s, 'steal') };
}

export type Rates = Record<Kind, number>;
export interface Comparison { orderly: Rates; current: Rates; ratio: Rates }

function rates(cfg: StreetCfg, n: number, seed: number): Rates {
  const s = newStreet(cfg, seed);
  for (let i = 0; i < n; i++) pass(s);
  return { flyer: s.v.flyer / n, shortcut: s.v.shortcut / n, steal: s.v.steal / n };
}

/** Aynı rastgele sayı dizisiyle (ortak rastgelelik) düzenli ve mevcut ortamı karşılaştırır. */
export function compare(cfg: StreetCfg, n = 600, seed = 1): Comparison {
  const orderly = rates({ ...cfg, ...CLEAN, chain: false }, n, seed);
  const current = rates(cfg, n, seed);
  const ratio = { flyer: 1, shortcut: 1, steal: 1 };
  for (const k of KINDS) ratio[k] = orderly[k] > 0 ? current[k] / orderly[k] : 1;
  return { orderly, current, ratio };
}

const pc = (v: number): number => Math.round(v * 100);
export const times = (r: number): string => `×${r.toFixed(1).replace('.', ',')}`;

export function describeStreet(cfg: StreetCfg, c: Comparison): string {
  if (!(cfg.graffiti || cfg.litter || cfg.bikes)) {
    return `Düzenli sokak: ilan atan %${pc(c.current.flyer)}, yasak aralıktan geçen %${pc(c.current.shortcut)}, zarfı alan %${pc(c.current.steal)}.`;
  }
  const top = KINDS.reduce((a, k) => (c.ratio[k] > c.ratio[a] ? k : a), 'flyer' as Kind);
  const name = { flyer: 'ilan atma', shortcut: 'yasak aralıktan geçme', steal: 'zarfı alma' }[top];
  return `Görünür ihlal varken ${name} %${pc(c.orderly[top])}'den %${pc(c.current[top])}'e çıkıyor (${times(c.ratio[top])}).`;
}
