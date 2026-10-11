// Nöroplastisite görünümü için küçük arayüz yardımcıları: kaydırıcı, biçimleyiciler, sayaçlar.
import type { Scope } from '../kit';

export interface SliderHandle {
  inp: HTMLInputElement;
  /** Kaydırıcı konumunu (ve isteğe bağlı metni) ayarlar; geri çağrıyı tetiklemez. */
  set: (v: number, text?: string) => void;
  setDisabled: (d: boolean) => void;
  wrap: HTMLElement;
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

export function makeSlider(scope: Scope, parent: HTMLElement, sid: string, o: SliderOpts, cb: (v: number) => void): SliderHandle {
  const w = document.createElement('div');
  w.innerHTML =
    `<div class="sl-top"><label class="sl-name" for="${sid}">${o.name}</label><span class="sl-val"></span></div>` +
    `<input type="range" id="${sid}" min="${o.min}" max="${o.max}" step="${o.step}" value="${o.value}">` +
    `<p class="sl-hint">${o.hint}</p>`;
  if (o.color) w.style.setProperty('--c', o.color);
  parent.appendChild(w);
  const inp = w.querySelector('input') as HTMLInputElement;
  const out = w.querySelector('.sl-val') as HTMLElement;
  const show = (text: string) => { out.textContent = text; inp.setAttribute('aria-valuetext', text); };
  scope.on(inp, 'input', () => { show(o.fmt(+inp.value)); cb(+inp.value); });
  show(o.fmt(o.value));
  return {
    inp, wrap: w,
    set: (v, text) => { inp.value = String(v); show(text ?? o.fmt(+inp.value)); },
    setDisabled: (d) => { inp.disabled = d; w.classList.toggle('is-off', d); },
  };
}

/* ---------- Biçimleyiciler ---------- */
export const fmtHz = (f: number): string => `${String(f).replace('.', ',')} Hz`;
export function fmtSec(s: number): string {
  if (s < 60) return `${s} sn`;
  const m = s / 60;
  return `${Number.isInteger(m) ? m : m.toFixed(1).replace('.', ',')} dk`;
}
export function fmtMin(m: number): string {
  if (m <= 0) return 'hemen sonra';
  if (m < 60) return `${m} dk sonra`;
  if (m < 1440) return `${(m / 60).toFixed(1).replace('.0', '').replace('.', ',')} sa sonra`;
  return `${(m / 1440).toFixed(1).replace('.0', '').replace('.', ',')} gün sonra`;
}
export function fmtDays(d: number): string {
  if (d < 14) return `${d} gün`;
  if (d < 84) return `${d} gün (${Math.round(d / 7)} hf)`;
  if (d < 365) return `${d} gün (≈${Math.round(d / 30)} ay)`;
  return `${d} gün (≈${(d / 365).toFixed(1).replace('.', ',')} yıl)`;
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
