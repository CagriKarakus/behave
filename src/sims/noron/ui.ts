// Nöron simülasyonunun ortak arayüz yardımcıları (yalnızca bu klasörde kullanılır).
import { svg, svgText, type Scope } from '../kit';

export interface Meter { label: string; value: string; frac: number; color: string }

/** Bir sekmenin (panel) görünüm sözleşmesi. draw() yalnızca durum değiştiyse ya da zaman akıyorsa çizer; çizdiyse true döner. */
export interface Panel {
  say(): string;
  meters(): Meter[];
  draw(now: number): boolean;
  /** Sekme açılınca ya da ekran dışından dönünce zaman sayaçlarını sıfırlar. */
  resume(): void;
}

export interface Ctx {
  scope: Scope;
  id: string;
  /** Kullanıcı eylemi: çıktı çubuğu güncellenir, ekran okuyucuya duyurulur. */
  touch(): void;
}

export interface SliderHandle { inp: HTMLInputElement; wrap: HTMLElement; set: (v: number) => void }

export function makeSlider(ctx: Ctx, parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, val: number,
  cb: (v: number) => void, fmt: (v: number) => string, color: string, step = 1): SliderHandle {
  const sid = `${ctx.id}-sl-${key}`;
  const w = document.createElement('div');
  w.className = 'sl';
  w.style.setProperty('--c', color);
  w.innerHTML = `<div class="sl-top"><label class="sl-name" for="${sid}">${name}</label><span class="sl-val"></span></div>` +
    `<input type="range" id="${sid}" min="${min}" max="${max}" step="${step}" value="${val}"><p class="sl-hint">${hint}</p>`;
  parent.appendChild(w);
  const inp = w.querySelector('input') as HTMLInputElement;
  const out = w.querySelector('.sl-val') as HTMLElement;
  const upd = () => { out.textContent = fmt(+inp.value); inp.setAttribute('aria-valuetext', out.textContent); };
  ctx.scope.on(inp, 'input', () => { upd(); cb(+inp.value); ctx.touch(); });
  upd();
  return { inp, wrap: w, set: (v) => { inp.value = String(v); upd(); } };
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

/** Basılı/basılı değil düğmesi. */
export function toggleBtn(ctx: Ctx, parent: Element, label: string, on: (pressed: boolean) => void, cls = 'btn'): { b: HTMLButtonElement; set: (v: boolean) => void } {
  const b = el(parent, 'button', cls, label);
  b.type = 'button'; b.setAttribute('aria-pressed', 'false');
  ctx.scope.on(b, 'click', () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); on(v); ctx.touch(); });
  return { b, set: (v) => b.setAttribute('aria-pressed', String(v)) };
}

export function linePath(pts: Array<[number, number]>): string {
  let d = '';
  for (let i = 0; i < pts.length; i++) d += `${i ? 'L' : 'M'}${pts[i][0].toFixed(1)} ${pts[i][1].toFixed(1)}`;
  return d;
}

/** Yatay çizgi ve sol etiket (ızgara). */
export function gridY(parent: Element, x0: number, x1: number, y: number, label: string, cls = 'grid'): void {
  svg('line', { class: cls, x1: x0, x2: x1, y1: y, y2: y }, parent);
  svgText(parent, { x: x0 - 4, y: y + 3.5, 'text-anchor': 'end' }, label);
}

export const line = (parent: Element, cls: string): SVGElement => svg('path', { class: cls, d: '' }, parent);

export const relatedBox = (): string =>
  '<aside class="book" aria-label="İlgili bölümler"><h3 class="sim-h">İlgili bölümler</h3><ul class="book-list">' +
  '<li><a href="#/bolum/ch02?sim=bir-saniye-once">Bölüm 2: Bir Saniye Önce</a>. Dopamin ve serotonin sistemleri bu sinaptik iletimin üzerinde çalışır; serotonin azaltılınca dürtüsellik artıyor (' +
  '<a href="#/bolum/ch02?deney=ch02-e12">Wood ve ark.</a>, replikasyon: karışık).</li>' +
  '<li><a href="#/bolum/ch05?sim=noroplastisite">Bölüm 5: Günler ila Aylar Önce</a>. NMDA reseptörü, tekrarlayan glutamat sinyaliyle eşik davranışı gösterir (<a href="#/bolum/ch05?deney=ch05-e1">LTP, sağlam</a>); ' +
  'LTD gereksiz sinyali silip önemliyi belirginleştirir. Antidepresan etkisi için yeni nöron gerekli mi (<a href="#/bolum/ch05?deney=ch05-e11">karışık</a>) açık soru.</li>' +
  '</ul><p class="note">Ek 1 için ayrı deney kaydı yok; sayılar özet ve kavramlardan, gerisi modelin varsayımından gelir.</p></aside>';
