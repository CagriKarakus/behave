// Endokrin modelin çekirdeği (nitel). Zaman birimi: dakika.
// Sayılar ölçüm değildir; Ek 2'de anlatılan yapıların yönünü ve göreli hızını gösterir.
// Kaynak: reference/artifacts/endokrin-eksen.html (davranış değişmeden taşındı).

import { L } from './text';

export type AxisKey = 'hpa' | 'hpg' | 'two' | 'glu';
export interface AxisInputs { drive: number; other: number; feedback: number; meal: number; brain: number }
export interface AxisState { s: number[]; e: number }
export interface ReceptorParams { hormone: number; number: number; affinity: number; specificity: number; other: number }
export interface ReceptorResult { occE: number; occO: number; occ: number; response: number; wrongShare: number }

export const clamp = (v: number, a = 0, b = 1): number => Math.max(a, Math.min(b, v));
// Üstel yaklaşım: dt ne olursa olsun kararlı. Çıkış ve iniş hızları farklı olabilir.
export const lag = (x: number, target: number, tauUp: number, tauDown: number, dt: number): number =>
  x + (target - x) * (1 - Math.exp(-dt / (target > x ? tauUp : tauDown)));

// n: basamak sayısı. 'glu': glikoz (düzenleyici) -> pankreas (insülin).
export const AX: Record<AxisKey, { n: number }> = { hpa: { n: 3 }, hpg: { n: 3 }, two: { n: 2 }, glu: { n: 2 } };
export const U0: AxisInputs = { drive: 0, other: 0, feedback: 1, meal: 0, brain: 0 };

export function stepAxis(axis: AxisKey, x: AxisState, u: AxisInputs, dt: number): AxisState {
  const s = x.s;
  let ns: number[], L: number;
  if (axis === 'glu') {
    const [G, I] = s;
    const sg = 1 / (1 + Math.exp(-8 * (G - 0.5)));
    const nI = lag(I, clamp(0.05 + 0.9 * sg + 0.25 * u.brain), 8, 15, dt);
    const nG = clamp(G + ((0.25 + 0.7 * u.meal - G) / 40 - 0.04 * I * G) * dt);
    ns = [nG, nI]; L = nI;
  } else {
    const n = AX[axis].n, fb = u.feedback ? 1 : 0, last = s[n - 1];
    const h = lag(s[0], clamp(0.1 + 0.9 * u.drive - 0.7 * fb * last), 3, 6, dt);
    if (n === 3) {
      const p = lag(s[1], clamp(0.08 + 0.7 * s[0] + 0.5 * u.other - 0.6 * fb * last), 8, 15, dt);
      const g = lag(s[2], clamp(0.1 + 0.9 * s[1]), 20, 50, dt);
      ns = [h, p, g]; L = g;
    } else {
      const p = lag(s[1], clamp(0.08 + 0.8 * s[0] + 0.4 * u.other), 8, 15, dt);
      ns = [h, p]; L = p;
    }
  }
  // Reseptörü olan hedef hücre: hormon düzeyini yavaş izler (saatler)
  return { s: ns, e: lag(x.e, L, 40, 150, dt) };
}

export function settleAxis(axis: AxisKey, u: AxisInputs, minutes = 900): AxisState {
  let x: AxisState = { s: AX[axis].n === 3 ? [0, 0, 0] : [0, 0], e: 0 };
  if (axis === 'glu') x.s = [0.2, 0.1];
  for (let t = 0; t < minutes; t++) x = stepAxis(axis, x, u, 1);
  return x;
}

export function describeAxis(axis: AxisKey, x: AxisState, u: AxisInputs, pulsing: boolean): string {
  const T = L().describe;
  const s = x.s, n = s.length, last = s[n - 1], top = s[0];
  if (axis === 'glu') {
    if (u.meal < 0.1 && s[0] < 0.3) return T.gluRest;
    if (s[0] > 0.45 && s[1] < s[0] - 0.05) return T.gluLag;
    if (s[1] > 0.4) return T.gluInsulin;
    return T.gluBalance;
  }
  if (Math.max(...s) < 0.22) return T.rest;
  if ((pulsing || u.drive > 0.3) && top > last + 0.2) return T.cascade;
  if (u.drive < 0.2 && !pulsing && last > top + 0.1) return T.lingering;
  if (u.feedback && last > 0.3 && top < 0.7 * (0.1 + 0.9 * Math.max(u.drive, pulsing ? 1 : 0))) return T.fbOn;
  if (!u.feedback && last > 0.6) return T.fbOff;
  return T.running;
}

// ---- Reseptör ----
// kd: bağlanma isteği yüksekse küçük (az hormon yeter). c: benzer hormonun reseptöre karışma oranı.
export function receptor(p: ReceptorParams): ReceptorResult {
  const kd = 0.05 + 0.95 * (1 - p.affinity);
  const c = 0.9 * (1 - p.specificity);
  const a = p.hormone / kd, b = (p.other * c) / kd;
  const den = 1 + a + b;
  const occE = a / den, occO = b / den, occ = occE + occO;
  return { occE, occO, occ, response: p.number * occ, wrongShare: occ > 0 ? occO / occ : 0 };
}

// ---- Süre: haberciler ----
export const MS = { s: 1000, min: 60e3, h: 3600e3, day: 86400e3 };
export const neuroAt = (ms: number): number => Math.exp(-ms / 15) * (1 - Math.exp(-ms / 0.5));
export const hormAt = (ms: number): number => (1 - Math.exp(-ms / (2 * MS.min))) * Math.exp(-ms / (1.5 * MS.day));
export const msOfLog = (v: number): number => Math.pow(10, v); // v: 0..8.94 (1 ms .. 10 gün)

// ---- Organizasyonel / aktivasyon ----
export function organ(fetal: number, adult: number): { structure: number; effect: number } {
  const structure = 0.3 + 0.7 * fetal;
  return { structure, effect: clamp(adult * structure) };
}
