// Nöroplastisite görünümü için küçük arayüz yardımcıları: kaydırıcı, biçimleyiciler, sayaçlar.
import { decimalSep } from '../../i18n/locale';
import { num } from '../../i18n/fmt';
import type { Scope } from '../kit';
import { L } from './text';
import { slider, type SliderHandle as SharedSliderHandle } from '../ui';

export interface SliderHandle extends SharedSliderHandle {
  setDisabled: (d: boolean) => void;
}

export interface SliderOpts {
  name: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  fmt: (v: number) => string;
  color?: string;
}

/** Ortak kaydırıcıya, pasifleştirme eklenmiş sürüm (pratik oynatılırken zaman kaydırıcısı kilitlenir). */
export function makeSlider(scope: Scope, parent: HTMLElement, sid: string, o: SliderOpts, cb: (v: number) => void): SliderHandle {
  const h = slider(scope, parent, { id: sid, name: o.name, hint: o.hint, min: o.min, max: o.max, step: o.step, value: o.value, fmt: o.fmt, color: o.color, onInput: cb });
  return { ...h, setDisabled: (d) => { h.inp.disabled = d; h.wrap.classList.toggle('is-off', d); } };
}

/* ---------- Biçimleyiciler ---------- */
export const fmtHz = (f: number): string => L().fmt.hz(String(f).replace('.', decimalSep()));
export function fmtSec(s: number): string {
  if (s < 60) return L().fmt.sec(s);
  const m = s / 60;
  return L().fmt.min(Number.isInteger(m) ? String(m) : num(m, 1));
}
const loc = (s: string): string => s.replace('.', decimalSep());
export function fmtMin(m: number): string {
  const f = L().fmt;
  if (m <= 0) return f.now;
  if (m < 60) return f.afterMin(m);
  if (m < 1440) return f.afterHr(loc((m / 60).toFixed(1).replace('.0', '')));
  return f.afterDay(loc((m / 1440).toFixed(1).replace('.0', '')));
}
export function fmtDays(d: number): string {
  const f = L().fmt;
  if (d < 14) return f.days(d);
  if (d < 84) return f.daysWeeks(d, Math.round(d / 7));
  if (d < 365) return f.daysMonths(d, Math.round(d / 30));
  return f.daysYears(d, num(d / 365, 1));
}
export const signed = (v: number): string => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
export const pctOf = (v: number): number => Math.round(v * 100);

/* ---------- Kaydırıcı konumu <-> değer (logaritmik) ---------- */
export const logVal = (pos: number, lo: number, hi: number): number => lo * (hi / lo) ** (pos / 100);
export const logPos = (v: number, lo: number, hi: number): number => Math.round((100 * Math.log(v / lo)) / Math.log(hi / lo));

export function niceFreq(x: number): number {
  if (x < 10) return Math.max(0.5, Math.round(x * 2) / 2);
  if (x < 30) return Math.round(x);
  return Math.min(100, Math.round(x / 5) * 5);
}
export function niceSec(x: number): number {
  if (x < 10) return Math.max(1, Math.round(x));
  if (x < 100) return Math.round(x / 5) * 5;
  return Math.min(900, Math.round(x / 30) * 30);
}
export function niceDays(x: number): number {
  if (x < 30) return Math.max(1, Math.round(x));
  if (x < 120) return Math.round(x / 2) * 2;
  return Math.min(1200, Math.round(x / 10) * 10);
}

/* ---------- Anlık sayaç çubuğu ---------- */
export interface MeterSpec { label: string; text: string; frac: number; color: string; mark?: number }

export class Meters {
  private rows: Array<{ l: HTMLElement; v: HTMLElement; b: HTMLElement; t: HTMLElement }> = [];
  constructor(host: HTMLElement) {
    host.innerHTML = [0, 1, 2].map(() =>
      '<div class="mt"><div class="m-top"><span></span><b></b></div><div class="track"><b></b></div></div>').join('');
    host.querySelectorAll<HTMLElement>('.mt').forEach((m) => {
      this.rows.push({
        l: m.querySelector('.m-top span') as HTMLElement,
        v: m.querySelector('.m-top b') as HTMLElement,
        b: m.querySelector('.track b') as HTMLElement,
        t: m.querySelector('.track') as HTMLElement,
      });
    });
  }
  set(specs: MeterSpec[]): void {
    specs.forEach((s, i) => {
      const r = this.rows[i];
      if (!r) return;
      if (r.l.textContent !== s.label) r.l.textContent = s.label;
      if (r.v.textContent !== s.text) r.v.textContent = s.text;
      r.b.style.width = `${Math.max(0, Math.min(1, s.frac)) * 100}%`;
      r.b.style.setProperty('--c', s.color);
      if (s.mark === undefined) r.t.style.removeProperty('--mark');
      else r.t.style.setProperty('--mark', `${s.mark * 100}%`);
      r.t.classList.toggle('has-mark', s.mark !== undefined);
    });
  }
}
