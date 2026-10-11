// Simülasyon görünümleri için ortak yardımcılar: temizlenebilir dinleyici/döngü kapsamı,
// benzersiz önek üretici ve SVG yardımcısı.

export const SVGNS = 'http://www.w3.org/2000/svg';

let counter = 0;
/** Sayfada birden çok kez bağlanan görünümler için benzersiz önek (id çakışmasını önler). */
export const uid = (prefix: string): string => `${prefix}${++counter}`;

export function svg(tag: string, attrs: Record<string, string | number> = {}, parent?: Element): SVGElement {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e as SVGElement;
}

export function svgText(parent: Element, attrs: Record<string, string | number>, s: string): SVGElement {
  const t = svg('text', attrs, parent);
  t.textContent = s;
  return t;
}

/** Kapsamdaki her şey dispose() ile bırakılır: dinleyiciler, rAF döngüsü, gözlemciler. */
export class Scope {
  private offs: Array<() => void> = [];
  private rafId = 0;
  private disposed = false;

  on<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (ev: HTMLElementEventMap[K]) => void): void;
  on(target: EventTarget, type: string, fn: (ev: Event) => void): void;
  on(target: EventTarget, type: string, fn: (ev: never) => void): void {
    target.addEventListener(type, fn as EventListener);
    this.offs.push(() => target.removeEventListener(type, fn as EventListener));
  }

  /** Her karede fn(now) çağırır; dispose edilince biter. */
  loop(fn: (now: number) => void): void {
    const tick = (now: number) => {
      if (this.disposed) return;
      fn(now);
      if (!this.disposed) this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  onDispose(fn: () => void): void { this.offs.push(fn); }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    for (const off of this.offs) off();
    this.offs = [];
  }
}

export function ref<T extends Element = HTMLElement>(root: ParentNode, name: string): T {
  const el = root.querySelector<T>(`[data-ref="${name}"]`);
  if (!el) throw new Error(`Simülasyon öğesi bulunamadı: ${name}`);
  return el;
}

/** Sabit alt çubuk (mobil), simülasyon ekran dışındayken gizlensin. */
export function hideBarWhenAway(root: HTMLElement, bar: HTMLElement, scope: Scope): void {
  if (typeof IntersectionObserver === 'undefined') return;
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) bar.toggleAttribute('data-away', !en.isIntersecting);
  });
  io.observe(root);
  scope.onDispose(() => io.disconnect());
}

export const pct = (v: number): number => Math.round(v * 100);
