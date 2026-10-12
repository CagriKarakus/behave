// Çocukluk simülasyonunun ortak arayüz yardımcıları (yalnızca bu klasörde kullanılır).
import type { Scope } from '../kit';

export interface Meter { label: string; value: string; frac: number; color: string }

/** Bir sekmenin (panel) görünüm sözleşmesi. draw() yalnızca durum değiştiyse çizer ve çizdiyse true döner. */
export interface Panel {
  say(): string;
  meters(): Meter[];
  draw(now?: number): boolean;
  /** Ekran dışından dönünce zaman sayaçlarını sıfırlar. */
  resume?(): void;
}

export interface Ctx {
  scope: Scope;
  /** Çakışmasız kimlik öneki. */
  id: string;
  /** Kullanıcı eylemi: çıktı çubuğu güncellenir, ekran okuyucuya duyurulur. */
  touch(): void;
}

export interface SliderHandle { inp: HTMLInputElement; set: (v: number) => void }

export function makeSlider(ctx: Ctx, parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, val: number,
  cb: (v: number) => void, fmt: (v: number) => string, color: string, step = 1): SliderHandle {
  const sid = `${ctx.id}-sl-${key}`;
  const w = document.createElement('div');
  w.style.setProperty('--c', color);
  w.innerHTML = `<div class="sl-top"><label class="sl-name" for="${sid}">${name}</label><span class="sl-val"></span></div>` +
    `<input type="range" id="${sid}" min="${min}" max="${max}" step="${step}" value="${val}"><p class="sl-hint">${hint}</p>`;
  parent.appendChild(w);
  const inp = w.querySelector('input') as HTMLInputElement;
  const out = w.querySelector('.sl-val') as HTMLElement;
  const upd = () => { out.textContent = fmt(+inp.value); inp.setAttribute('aria-valuetext', out.textContent); };
  ctx.scope.on(inp, 'input', () => { upd(); cb(+inp.value); ctx.touch(); });
  upd();
  return { inp, set: (v) => { inp.value = String(v); upd(); } };
}

export const pc = (v: number): string => `%${Math.round(v * 100)}`;
export const f1 = (v: number): string => v.toFixed(1).replace('.', ',');
export const f2 = (v: number): string => v.toFixed(2).replace('.', ',');

/** "Kitapta" kutusu: deney kartlarına bağlantılar. */
export function bookBox(items: Array<{ id: string; text: string }>): string {
  return `<aside class="book" aria-label="Kitapta"><h3 class="sim-h">Kitapta</h3><ul>` +
    items.map((i) => `<li><a href="#/bolum/ch07?deney=${i.id}">${i.text}</a></li>`).join('') + `</ul></aside>`;
}

/** Çip sırası; dönen fonksiyon basılı çipi ayarlar. */
export function chipRow(parent: HTMLElement, ctx: Ctx, items: Array<{ key: string; label: string }>, on: (key: string) => void, label: string): (key: string | null) => void {
  parent.setAttribute('role', 'group');
  parent.setAttribute('aria-label', label);
  const btns: HTMLButtonElement[] = [];
  for (const it of items) {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = it.label; b.dataset.k = it.key; b.setAttribute('aria-pressed', 'false');
    ctx.scope.on(b, 'click', () => { on(it.key); ctx.touch(); });
    parent.appendChild(b); btns.push(b);
  }
  return (key) => { for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.k === key)); };
}

export function el<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}

