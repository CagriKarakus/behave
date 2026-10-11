// Nöroplastisite modeli: UI'dan bağımsız, DOM yok. Nitel model: sayılar ölçüm değildir,
// ilişkilerin yönünü ve büyüklük sırasını gösterir. Kitaptan gelen bulgular yorumlarda belirtilmiştir.

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/* =====================================================================
   1) SİNAPS: glutamat -> AMPA/NMDA -> Mg2+ bloğu -> Ca2+ -> LTP / LTD
   ===================================================================== */

export interface SynInputs {
  /** Presinaptik uyarım frekansı (Hz). */
  freq: number;
  /** Uyarımın süresi (sn). */
  dur: number;
  /** Postsinaptik nöronun eşzamanlı ateşlenmesi, 0..1 (Hebb eşleşmesi). */
  post: number;
}

export const SYN = {
  vRest: -70,   // mV, dinlenim potansiyeli
  vSum: 25,     // mV, AMPA uyarılarının toplanmasıyla frekansa bağlı depolarizasyon (en çok)
  fHalf: 25,    // Hz, toplanmanın doyum ölçeği
  vPost: 60,    // mV, postsinaptik ateşlemenin ek depolarizasyonu (en çok)
  mg: 1,        // mM, hücre dışı magnezyum
  thD: 0.06,    // LTD eşiği (göreli Ca2+ birimi)
  thP: 0.5,     // LTP eşiği
  pMax: 1.2,    // en çok LTP artışı (başlangıca oranla)
  dMax: 0.55,   // en çok LTD azalışı
  gP: 0.019,    // LTP: uyarı başına doyum hızı
  kP: 3,        // LTP doyum sabiti
  gD: 0.0015,   // LTD: uyarı başına hız
  tauEarly: 120, // dk, erken (kalıcılaşmamış) LTP/LTD'nin sönme zamanı
} as const;

export type Zone = 'yok' | 'ltd' | 'ltp';

/** Postsinaptik zarın depolarizasyonu (mV). */
export function depolarization(freq: number, post: number): number {
  return SYN.vRest + SYN.vSum * (1 - Math.exp(-freq / SYN.fHalf)) + SYN.vPost * clamp(post, 0, 1);
}

/** NMDA kanalındaki Mg2+ tıkacının kalkma oranı (Jahr-Stevens biçimi), 0..1. */
export function mgUnblock(v: number): number {
  return 1 / (1 + (SYN.mg / 3.57) * Math.exp(-0.062 * v));
}

/** Ca2+ girişinin göreli düzeyi: saniyedeki uyarı sayısı x kanalın açık kalma oranı. */
export function calcium(freq: number, post: number): number {
  return freq * mgUnblock(depolarization(freq, post));
}

/** Ca2+ düzeyinin görsel konumu (logaritmik), 0..1. */
export function caPos(c: number): number {
  return clamp(Math.log10(Math.max(c, 1e-6) / 0.005) / Math.log10(4000), 0, 1);
}

export function zoneOf(c: number): Zone {
  return c >= SYN.thP ? 'ltp' : c >= SYN.thD ? 'ltd' : 'yok';
}

/** `frac` (0..1) uyarım tamamlandığında oluşan göreli değişim (+ LTP, − LTD). */
export function synDelta(inp: SynInputs, frac = 1): number {
  const c = calcium(inp.freq, inp.post);
  const n = inp.freq * inp.dur * clamp(frac, 0, 1);
  if (c >= SYN.thP) {
    const s = (c - SYN.thP) / (c - SYN.thP + SYN.kP);
    return SYN.pMax * (1 - Math.exp(-n * SYN.gP * s));
  }
  if (c >= SYN.thD) {
    const s = (c - SYN.thD) / (SYN.thP - SYN.thD);
    return -SYN.dMax * (1 - Math.exp(-n * SYN.gD * s));
  }
  return 0;
}

/** Değişimin kalıcılaşan (geç evre: protein sentezi, yeni AMPA yerleşimi) payı, 0..1. */
export function lateShare(delta: number): number {
  return delta >= 0 ? clamp((delta - 0.3) / 0.4, 0, 1) : clamp((-delta - 0.15) / 0.25, 0, 1);
}

/** Uyarım bittikten `minutes` dk sonra sinaps gücü (başlangıç = 1). */
export function synWeight(delta: number, minutes: number): number {
  const phi = lateShare(delta);
  return 1 + delta * (phi + (1 - phi) * Math.exp(-minutes / SYN.tauEarly));
}

export interface SynResult { c: number; zone: Zone; unblock: number; pulses: number; delta: number; late: number }

export function synapse(inp: SynInputs): SynResult {
  const c = calcium(inp.freq, inp.post);
  const delta = synDelta(inp);
  return {
    c, zone: zoneOf(c), unblock: mgUnblock(depolarization(inp.freq, inp.post)),
    pulses: Math.round(inp.freq * inp.dur), delta, late: lateShare(delta),
  };
}

/** Zaman kaydırıcısı (0..100) -> uyarımdan sonraki dakika (0 .. ~7 gün, logaritmik). */
export function minutesOfSlider(v: number): number {
  return v <= 0 ? 0 : Math.round(10 ** (clamp(v, 0, 100) / 100 * 4.0));
}

/* =====================================================================
   2) PRATİK VE KORTİKAL HARİTA
   ===================================================================== */

export interface PracticeInputs {
  /** Günlük toplam pratik (dk). */
  minutes: number;
  /** Bunun hayal ederek yapılan oranı, 0..1. */
  mental: number;
  /** Kaç gün pratik yapılıyor (sonra bırakılıyor). */
  days: number;
}

export const PRAC = {
  mu: 0.5,      // zihinsel pratiğin fiziksele göre etkisi (kitap: etki var; replikasyon notu: genellikle daha küçük)
  fMax: 0.25,   // hızlı (Hebb tipi) bileşenin en büyük payı
  e50: 60,      // dk, hızlı bileşenin yarı doyum dozu
  tauUp: 1.5,   // gün, hızlı bileşenin kuruluş zamanı
  tauDown: 0.4, // gün, pratik kesilince hızlı bileşenin sönme zamanı (bir günden kısa)
  kS: 0.035,    // yavaş (yapısal) bileşenin oluşum hızı
  sMax: 0.5,
  tauS: 160,    // gün, yavaş bileşenin sönme zamanı
  dt: 0.25,     // gün
} as const;

export function effort(inp: PracticeInputs): number {
  return inp.minutes * ((1 - inp.mental) + PRAC.mu * inp.mental);
}

export interface PracticeSeries {
  dt: number;
  /** Örnek başına toplam harita alanı (başlangıç = 1). */
  area: number[];
  fast: number[];
  slow: number[];
  horizon: number;
}

export function practiceHorizon(days: number): number {
  return days + Math.max(90, days);
}

export function simulatePractice(inp: PracticeInputs): PracticeSeries {
  const horizon = practiceHorizon(inp.days);
  const n = Math.round(horizon / PRAC.dt);
  const e = effort(inp);
  const fss = PRAC.fMax * e / (e + PRAC.e50);
  let f = 0, s = 0;
  const area = [1], fast = [0], slow = [0];
  for (let i = 1; i <= n; i++) {
    const t = (i - 1) * PRAC.dt;
    if (t < inp.days) f += (fss - f) * (1 - Math.exp(-PRAC.dt / PRAC.tauUp));
    else f *= Math.exp(-PRAC.dt / PRAC.tauDown);
    s += PRAC.kS * f * (1 - s / PRAC.sMax) * PRAC.dt;
    s *= Math.exp(-PRAC.dt / PRAC.tauS);
    fast.push(f); slow.push(s); area.push(1 + f + s);
  }
  return { dt: PRAC.dt, area, fast, slow, horizon };
}

export function practiceAt(ser: PracticeSeries, day: number): { area: number; fast: number; slow: number } {
  const i = clamp(Math.round(day / ser.dt), 0, ser.area.length - 1);
  return { area: ser.area[i], fast: ser.fast[i], slow: ser.slow[i] };
}

/* =====================================================================
   3) STRES VE YAPI
   ===================================================================== */

export type StressKind = 'kronik' | 'tek' | 'kosu';

export interface StressInputs {
  kind: StressKind;
  /** Stres süresi (gün); 'tek' için yok sayılır (1 gün). */
  days: number;
  /** Stres bittikten sonra geçen süre (gün). */
  recover: number;
}

export const STR = {
  hMin: 0.68,     // hipokampus dendrit uzunluğunun alt sınırı (başlangıca oranla)
  tauHDown: 14,   // gün
  tauHUp: 21,     // gün: stres bitince toparlanma
  runMax: 1.12,   // gönüllü koşuda hipokampus dendrit üst sınırı
  tauRun: 20,
  aGain: 0.4,     // amigdala dendrit büyümesinin en çok payı
  tauL: 2,        // gün: glukokortikoid -> BDNF benzeri gizli programın kuruluşu
  tauLDecay: 45,  // gün
  tauAUp: 8,      // gün
  tauADown: 150,  // gün: amigdala geri dönüşü çok yavaş
  spineSlope: 1.3, // diken kaybı = 1.3 x dendrit kaybı (nitel)
  dt: 0.5,
} as const;

export interface StressSeries {
  dt: number;
  hip: number[];    // hipokampus dendrit uzunluğu (başlangıç = 1)
  spine: number[];  // hipokampus diken yoğunluğu (başlangıç = 1)
  amy: number[];    // BLA dendrit uzunluğu (başlangıç = 1)
  total: number;    // gün
  stressEnd: number; // gün
}

export const stressEnd = (inp: StressInputs): number => (inp.kind === 'tek' ? 1 : Math.max(0, inp.days));

export function simulateStress(inp: StressInputs): StressSeries {
  const se = stressEnd(inp);
  const total = se + Math.max(0, inp.recover);
  const n = Math.max(1, Math.round(total / STR.dt));
  const dt = STR.dt;
  let h = 1, l = 0, a = 1;
  const hip = [1], spine = [1], amy = [1];
  for (let i = 1; i <= n; i++) {
    const on = (i - 1) * dt < se;
    if (inp.kind === 'kosu') {
      // gönüllü koşu: hipokampus dendritleri büyür, amigdala devreye girmez
      const target = on ? STR.runMax : 1;
      h += (target - h) * (1 - Math.exp(-dt / (on ? STR.tauRun : STR.tauHUp)));
    } else if (on) {
      h += (STR.hMin - h) * (1 - Math.exp(-dt / STR.tauHDown));
      l += (1 - l) * (1 - Math.exp(-dt / STR.tauL));
    } else {
      h += (1 - h) * (1 - Math.exp(-dt / STR.tauHUp));
      l *= Math.exp(-dt / STR.tauLDecay);
    }
    const target = 1 + STR.aGain * Math.sqrt(l);
    a += (target - a) * (1 - Math.exp(-dt / (target > a ? STR.tauAUp : STR.tauADown)));
    hip.push(h);
    spine.push(clamp(1 - STR.spineSlope * (1 - h), 0.3, 1.2));
    amy.push(a);
  }
  return { dt, hip, spine, amy, total, stressEnd: se };
}

export function stressAt(ser: StressSeries, day: number): { hip: number; spine: number; amy: number } {
  const i = clamp(Math.round(day / ser.dt), 0, ser.hip.length - 1);
  return { hip: ser.hip[i], spine: ser.spine[i], amy: ser.amy[i] };
}
