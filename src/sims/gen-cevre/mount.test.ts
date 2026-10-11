// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './view';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

function raf() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
  const tick = (t = performance.now() + 50) => { const cur = Array.from(pending.entries()); pending.clear(); for (const [, cb] of cur) cb(t); };
  return { pending, tick };
}
const click = (e: Element) => e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const slide = (e: HTMLInputElement, v: number) => { e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); };

describe('gen-cevre görünümü', () => {
  it('bağlanır, id çakışmaz, unmount rAF ve DOM\'u temizler', () => {
    const { pending, tick } = raf();
    const a = document.createElement('div'), b = document.createElement('div');
    document.body.append(a, b);
    const ua = mount(a), ub = mount(b);
    const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pending.size).toBe(2);
    ua();
    expect(a.innerHTML).toBe('');
    expect(pending.size).toBe(1);
    tick();
    expect(pending.size).toBe(1);
    ub();
    expect(b.innerHTML).toBe('');
    expect(pending.size).toBe(0);
  });

  it('ekran dışında döngü durur, dinleyiciler bırakılır', () => {
    const observers: Array<{ cb: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn();
      constructor(public cb: IntersectionObserverCallback) { observers.push(this); }
      observe() {}
    });
    const { pending } = raf();
    const added: string[] = [], removed: string[] = [];
    vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (this: EventTarget, t: string) { added.push(t); });
    vi.spyOn(EventTarget.prototype, 'removeEventListener').mockImplementation(function (this: EventTarget, t: string) { removed.push(t); });
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    expect(observers).toHaveLength(1);
    expect(pending.size).toBe(1);
    observers[0].cb([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(0);
    observers[0].cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(1);
    un();
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(pending.size).toBe(0);
    const count = (a: string[]) => a.reduce<Record<string, number>>((m, t) => ((m[t] = (m[t] ?? 0) + 1), m), {});
    expect(count(removed)).toEqual(count(added));
  });

  it('üç sekme, tur ve kaydırıcılar çalışır', () => {
    const { tick } = raf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>('.tab'));
    expect(tabs).toHaveLength(3);
    const visible = () => Array.from(host.querySelectorAll<HTMLElement>('.pane')).filter((p) => !p.hidden).map((p) => p.dataset.pane);
    expect(visible()).toEqual(['table']);
    tick();
    const say0 = host.querySelector('[data-ref="say"]')!.textContent;
    expect(say0).toContain('Tek ortamda'); // tur 1. adım: tek ortam

    // Tablo: ortam sayısını artır -> açıklama ve h² eğrisi değişir
    const nSlider = host.querySelector<HTMLInputElement>('input[id$="-sl-n"]')!;
    slide(nSlider, 6); tick();
    expect(host.querySelectorAll('.pane[data-pane="table"] input[data-g]')).toHaveLength(18);
    expect(host.querySelector('[data-ref="say"]')!.textContent).not.toBe(say0);

    // Tur ilerler: son adımda GWAS sekmesi
    const next = host.querySelector<HTMLButtonElement>('[data-t="next"]')!;
    for (let i = 0; i < 3; i++) click(next);
    tick();
    expect(visible()).toEqual(['mao']);
    expect(host.querySelector('.pane[data-pane="mao"]')!.textContent).toContain('Replikasyon durumu: karışık');
    click(next); tick();
    expect(visible()).toEqual(['gwas']);
    expect(host.querySelector('[data-ref="say"]')!.textContent).toContain('Tek bir gen');
    click(next); tick();
    expect(host.querySelector('[data-ref="say"]')!.textContent).toContain('çan eğrisi');
    expect(host.querySelectorAll('[data-ref="hist"] rect').length).toBeGreaterThan(10);

    // MAO sekmesi: oran 1 olunca açıklama etkileşim yok der
    click(tabs[1]); tick();
    const ratio = host.querySelector<HTMLInputElement>('input[id$="-sl-ratio"]')!;
    slide(ratio, 10); tick();
    expect(host.querySelector('[data-ref="say"]')!.textContent).toContain('Etkileşim yok');

    // Kitapta bağlantıları
    const links = Array.from(host.querySelectorAll<HTMLAnchorElement>('.book a')).map((a) => a.getAttribute('href'));
    expect(links).toContain('#/bolum/ch08?deney=ch08-e9');
    expect(links).toContain('#/bolum/ch08?deney=ch08-e4');
    expect(links).toContain('#/bolum/ch08?deney=ch08-e10');
    un();
  });
});
