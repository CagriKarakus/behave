// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './view';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

function stubRaf() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
  const tick = (t: number) => { const cur = Array.from(pending.values()); pending.clear(); for (const cb of cur) cb(t); };
  return { pending, tick };
}

describe('uyma-itaat görünümü', () => {
  it('bağlanır, id çakışmaz, unmount rAF ve DOM\'u temizler', () => {
    const { pending, tick } = stubRaf();
    const a = document.createElement('div'), b = document.createElement('div');
    document.body.append(a, b);
    const ua = mount(a), ub = mount(b);
    const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pending.size).toBe(2);
    ua();
    expect(a.innerHTML).toBe('');
    expect(pending.size).toBe(1);
    tick(performance.now() + 50);
    ub();
    expect(b.innerHTML).toBe('');
    expect(pending.size).toBe(0);
  });

  it('sekmeler, tur ve deneme animasyonu çalışır', () => {
    const { tick } = stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const tabs = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(host.querySelector<HTMLElement>('[data-ref="p-mil"]')!.hidden).toBe(true);
    tabs[1].click();
    expect(host.querySelector<HTMLElement>('[data-ref="p-asch"]')!.hidden).toBe(true);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    // Turu sonuna kadar gez: hata atmamalı.
    for (let i = 0; i < 6; i++) host.querySelector<HTMLButtonElement>('[data-t="next"]')!.click();
    tabs[0].click();
    host.querySelector<HTMLButtonElement>('[data-ref="a-play"]')!.click();
    tick(performance.now() + 20000);
    expect(host.querySelector('[data-ref="a-stage"] .status')!.textContent).toMatch(/Denek/);
    host.querySelector<HTMLButtonElement>('[data-ref="m-play"]')!.click();
    for (let i = 0; i < 40; i++) tick(performance.now() + 500 * (i + 1));
    expect(host.querySelectorAll('.ag').length).toBe(100);
    un();
    expect(host.innerHTML).toBe('');
  });

  it('unmount dinleyicileri ve IntersectionObserver\'ı bırakır; ekran dışında döngü durur', () => {
    const observers: Array<{ cb: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn();
      constructor(public cb: IntersectionObserverCallback) { observers.push(this); }
      observe() {}
    });
    const { pending } = stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    expect(pending.size).toBe(1);
    observers[0].cb([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(0);
    observers[0].cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(1);
    un();
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(pending.size).toBe(0);
  });
});
