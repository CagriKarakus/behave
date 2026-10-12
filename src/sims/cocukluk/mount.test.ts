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
const q = <T extends Element = HTMLElement>(root: ParentNode, s: string) => root.querySelector<T>(s)!;

describe('cocukluk görünümü', () => {
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

  it('tur, sekmeler ve girdiler çıktı çubuğunu günceller; marshmallow animasyonu biter', () => {
    const { tick } = raf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const say = () => q(host, '[data-ref="say"]').textContent!;
    tick();
    expect(say()).toContain('15 dakikayı tamamlıyor');
    expect(say()).toContain('karışık');
    // Strateji "soğuk": tamamlayan payı artar
    const before = q(host, '[data-ref="mv0"]').textContent!;
    click(host.querySelector('.chip[data-k="cold"]')!);
    tick();
    expect(parseInt(q(host, '[data-ref="mv0"]').textContent!.replace('%', ''))).toBeGreaterThan(parseInt(before.replace('%', '')));
    // Animasyon: başlat, zamanı ilerlet, bitir
    click(q(host, '[data-ref="go"]'));
    let t = performance.now();
    for (let i = 0; i < 400; i++) { t += 100; tick(t); }
    expect(q(host, '[data-ref="go"]').textContent).toBe('Yeniden oyna');
    // Tur: 4. adım ACE sekmesine geçer
    const next = q(host, '[data-t="next"]');
    for (let i = 0; i < 3; i++) click(next);
    tick();
    expect(q(host, '.tab[data-pane="ace"]').getAttribute('aria-selected')).toBe('true');
    expect(say()).toContain('5 olumsuz deneyim');
    // Koruyucu etkenler adım 5
    click(next);
    tick();
    expect(q(host, '[data-ref="mv2"]').textContent).toBeTruthy();
    // Son adım: ahlaki gelişim
    click(next); tick();
    expect(q(host, '.tab[data-pane="moral"]').getAttribute('aria-selected')).toBe('true');
    expect(say()).toContain('30 yaş');
    // Yaş kaydırıcısı
    const ageSlider = q<HTMLInputElement>(host, '.pane[data-pane="moral"] input[type="range"]');
    slide(ageSlider, 7);
    tick();
    expect(say()).toContain('7 yaş');
    // Eleştiri çipleri
    click(host.querySelector('.pane[data-pane="moral"] .chip[data-k="culture"]')!);
    expect(host.querySelector('.pane[data-pane="moral"] .critbody svg')).toBeTruthy();
    // Onay kutuları
    click(q(host, '.tab[data-pane="ace"]'));
    const cb = host.querySelectorAll<HTMLInputElement>('.pane[data-pane="ace"] .ck input')[0];
    cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
    tick();
    expect(say()).toContain('olumsuz deneyim');
    un();
    expect(host.innerHTML).toBe('');
  });

  it('eleştiri sekmeleri arasında geçiş dinleyici biriktirmez', () => {
    raf();
    let live = 0;
    const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
    vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (this: EventTarget, ...a: Parameters<typeof add>) { live++; return add.apply(this, a); });
    vi.spyOn(EventTarget.prototype, 'removeEventListener').mockImplementation(function (this: EventTarget, ...a: Parameters<typeof rem>) { live--; return rem.apply(this, a); });
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const keys = ['culture', 'gender', 'action'];
    const cycle = () => { for (const k of keys) click(host.querySelector(`.pane[data-pane="moral"] .chip[data-k="${k}"]`)!); };
    cycle();
    const base = live;
    for (let i = 0; i < 10; i++) cycle();
    expect(live).toBe(base);
    un();
    expect(live).toBe(0);
  });
});
