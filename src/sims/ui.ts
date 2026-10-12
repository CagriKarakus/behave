// Simülasyonlar için ortak arayüz yardımcıları: kaydırıcı, çip sırası, "Kitapta" kutusu ve replikasyon rozeti.
// Bunlar yalnızca DOM kurar; durum ve çizim her simülasyonun kendi görünümünde kalır.
import type { Scope } from './kit';

/** Çıktı çubuğundaki bir gösterge. */
export interface Meter { label: string; value: string; frac: number; color: string }

/** Sekmeli görünümlerde bir panelin sözleşmesi. draw() yalnızca durum değiştiyse çizer ve çizdiyse true döner. */
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

/* ---------- Kaydırıcı ---------- */
export interface SliderHandle {
  inp: HTMLInputElement;
  wrap: HTMLElement;
  /** Konumu (ve isteğe bağlı değer metnini) ayarlar; `onInput` tetiklenmez. */
  set: (v: number, text?: string) => void;
}

export interface SliderOpts {
  /** Giriş öğesinin kimliği (çakışmasız olmalı). */
  id: string;
  name: string;
  hint?: string;
  min: number;
  max: number;
  step?: number;
  /** Verilirse başlangıç konumu ve metni ayarlanır. */
  value?: number;
  fmt: (v: number) => string;
  /** `--c` rengi (kaydırıcı vurgusu). */
  color?: string;
  /** Kapsayıcıya eklenecek sınıf. */
  cls?: string;
  onInput: (v: number) => void;
}

/** Etiketli, değer metni ve ipucu olan standart kaydırıcı; dinleyici verilen kapsama bağlanır. */
export function slider(scope: Scope, parent: HTMLElement, o: SliderOpts): SliderHandle {
  const w = document.createElement('div');
  if (o.cls) w.className = o.cls;
  if (o.color) w.style.setProperty('--c', o.color);
  w.innerHTML = `<div class="sl-top"><label class="sl-name" for="${o.id}">${o.name}</label><span class="sl-val"></span></div>` +
    `<input type="range" id="${o.id}" min="${o.min}" max="${o.max}" step="${o.step ?? 1}">` + (o.hint ? `<p class="sl-hint">${o.hint}</p>` : '');
  parent.appendChild(w);
  const inp = w.querySelector('input') as HTMLInputElement;
  const out = w.querySelector('.sl-val') as HTMLElement;
  const show = (text: string): void => { out.textContent = text; inp.setAttribute('aria-valuetext', text); };
  const set = (v: number, text?: string): void => { inp.value = String(v); show(text ?? o.fmt(+inp.value)); };
  scope.on(inp, 'input', () => { const v = +inp.value; show(o.fmt(v)); o.onInput(v); });
  if (o.value !== undefined) set(o.value);
  return { inp, wrap: w, set };
}

/* ---------- Çipler ---------- */
/** Çip sırası; dönen fonksiyon basılı çipi ayarlar. `label` verilirse grup etiketlenir. */
export function chips(parent: HTMLElement, scope: Scope, items: Array<{ key: string; label: string }>, on: (key: string) => void, label?: string): (key: string | null) => void {
  if (label) { parent.setAttribute('role', 'group'); parent.setAttribute('aria-label', label); }
  const btns: HTMLButtonElement[] = [];
  for (const it of items) {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = it.label; b.dataset.k = it.key; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => on(it.key));
    parent.appendChild(b); btns.push(b);
  }
  return (key) => { for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.k === key)); };
}

/* ---------- Sekmeli panellerde (Ctx) kısayollar: her eylemden sonra çıktı çubuğu güncellenir ---------- */
/** `slider` + `ctx.touch()`; çocukluk ve gen-çevre panellerinin kullandığı imza. */
export function makeSlider(ctx: Ctx, parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, val: number,
  cb: (v: number) => void, fmt: (v: number) => string, color: string, step = 1): SliderHandle {
  return slider(ctx.scope, parent, { id: `${ctx.id}-sl-${key}`, name, hint, min, max, step, value: val, fmt, color, onInput: (v) => { cb(v); ctx.touch(); } });
}

/** `chips` + `ctx.touch()`. */
export function chipRow(parent: HTMLElement, ctx: Ctx, items: Array<{ key: string; label: string }>, on: (key: string) => void, label?: string): (key: string | null) => void {
  return chips(parent, ctx.scope, items, (k) => { on(k); ctx.touch(); }, label);
}

/* ---------- Kitapta kutusu ve replikasyon rozeti ---------- */
export type RepStatus = 'sağlam' | 'karışık' | 'tartışmalı' | 'bilinmiyor';

/** Replikasyon rozeti: durum her zaman metinle de verilir (renge bağlı değil). */
export const repBadge = (status: RepStatus): string => `<span class="rep">Replikasyon: ${status}</span>`;

export interface BookItem {
  /** `content/chapters.json` deney kimliği (ör. "ch07-e4"); bölüm bu kimlikten çıkarılır. */
  id: string;
  /** Bağlantı metni. */
  text: string;
  /** İsteğe bağlı replikasyon durumu rozeti. */
  rep?: RepStatus;
  /** Bağlantıdan sonra gelen kısa açıklama (HTML). */
  note?: string;
}

/** Standart "Kitapta" kutusu: her deney için bölüm sayfasındaki karta bağlantı. */
export function bookBox(items: BookItem[], extra = ''): string {
  const li = (i: BookItem): string =>
    `<li><a href="#/bolum/${i.id.split('-')[0]}?deney=${i.id}">${i.text}</a>${i.rep ? ' ' + repBadge(i.rep) : ''}${i.note ? ` <span class="book-note">${i.note}</span>` : ''}</li>`;
  return `<aside class="book" aria-label="Kitapta"><h3 class="sim-h">Kitapta</h3><ul>${items.map(li).join('')}</ul>${extra}</aside>`;
}

/* ---------- Biçimleyiciler ve küçük yardımcılar ---------- */
export const pc = (v: number): string => `%${Math.round(v * 100)}`;
export const pc1 = (v: number): string => `%${(v * 100).toFixed(v < 0.01 ? 2 : 1).replace('.', ',')}`;
export const f1 = (v: number): string => v.toFixed(1).replace('.', ',');
export const f2 = (v: number): string => v.toFixed(2).replace('.', ',');

export function el<K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}
