// Savaş ve barış: görünüm kabuğu ile tembel yüklenen sekme parçaları arasında paylaşılan türler ve küçük yardımcılar.
import type { Scope } from '../kit';
import type { BabParams, Cond, ContactParams, PayParams, TrenchParams, VillageParams } from './model';

export type Tab = 'sip' | 'tem' | 'bab';
export type Card = 'ct' | 'fo' | 'py';
export const pc = (x: number): string => `%${Math.round(x * 100)}`;
export const f1 = (x: number): string => x.toFixed(1).replace('.', ',');
export const sv = (w: number, h: number, inner: string): string => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
export const dotI = (c: string): string => `<i style="background:${c}"></i>`;
export const key = (...a: [string, string][]): string => `<div class="legend">${a.map(([i, t]) => `<span>${i}${t}</span>`).join('')}</div>`;
export const LG = {
  quiet: sv(26, 10, '<path d="M1 5H25" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="1 4" stroke-linecap="round"/>'),
  two: sv(26, 10, '<circle cx="9" cy="5" r="2.6" fill="var(--pfc)"/><circle cx="17" cy="5" r="2.6" fill="var(--pfc)"/>'),
  fire: sv(26, 10, '<path d="M1 5L5 1L9 9L13 1L17 9L21 1L25 5" fill="none" stroke="var(--amy)" stroke-width="1.8" stroke-linejoin="round"/>'),
  raid: sv(26, 10, '<path d="M1 5H23M18 1L24 5L18 9" fill="none" stroke="var(--ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  flag: sv(14, 12, '<circle cx="7" cy="6" r="4.5" fill="var(--pfc)"/>'),
  neu: sv(16, 12, '<rect x="1.5" y="1.5" width="13" height="9" rx="2" fill="none" stroke="var(--dop)" stroke-width="1.6" stroke-dasharray="3 2"/>'),
  line: (c: string, dash = ''): string => sv(26, 10, `<path d="M1 5H25" stroke="${c}" stroke-width="2.4"${dash}/>`),
};

export const pctFmt = (v: number): string => `%${v}`;
export const cls = (el: Element, base: string, show: boolean): void => el.setAttribute('class', show ? base : `${base} hide`);

export interface SliderHandle { inp: HTMLInputElement; set: (v: number) => void }
export interface SliderOpts { name: string; hint: string; min: number; max: number; step: number; val: number; fmt: (v: number) => string; cb: (v: number) => void; color?: string }
export interface Transport { pos: number; playing: boolean; max: number; speed: number; idx: () => number; set: (i: number, play: boolean) => void; sync: () => void }
export interface Meter { label: string; text: string; frac: number; color: string }

export interface State {
  tab: Tab; focus: Card;
  t: TrenchParams; tseed: number;
  c: ContactParams; cseed: number;
  v: VillageParams; vseed: number;
  y: PayParams; cond: Cond;
  b: BabParams; bseed: number;
}

/** Kabuğun sekme parçalarına verdiği ortak araçlar. */
export interface Env {
  scope: Scope;
  id: string;
  /** `data-ref` ile öğe bulur (kök simülasyon kutusu içinde). */
  $: <T extends Element = HTMLElement>(name: string) => T;
  S: State;
  /** Yeniden hesaplama bayrakları. */
  need: { t: boolean; c: boolean; v: boolean; y: boolean; b: boolean; sens: boolean };
  /** Durum değişti: bir sonraki karede yeniden çizilir. */
  touch: () => void;
  setBar: (say: string, ms: Meter[]) => void;
  makeSlider: (parent: HTMLElement, o: SliderOpts) => SliderHandle;
  toggles: <T extends string>(parent: HTMLElement, items: { k: T; name: string }[], get: () => T | null, pick: (k: T) => void) => () => void;
  makeTransport: (parent: HTMLElement, o: { max: number; speed: number; unit: string; seed: () => void }) => Transport;
  tiles: (xs: [string, string][]) => string;
  yGrid: (parent: Element, x0: number, x1: number, y: (v: number) => number, vals: number[], fmt: (v: number) => string) => void;
  poly: (pts: [number, number][]) => string;
  clipRect: (parent: Element, cid: string, h: number) => SVGElement;
}

/** Bir sekme parçasının kabuğa verdiği sözleşme. */
export interface PanelApi { render: () => void; tp: Transport }
