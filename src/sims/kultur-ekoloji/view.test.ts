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

describe('kultur-ekoloji görünümü', () => {
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
    expect(pending.size).toBe(1);
    ub();
    expect(b.innerHTML).toBe('');
    expect(pending.size).toBe(0);
  });

  it('sekmeler, turlar ve kontroller hata vermeden çalışır', () => {
    const { tick } = stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const tabs = Array.from(host.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(tabs).toHaveLength(3);
    expect(host.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1);
    for (const t of tabs) { t.click(); tick(1000); }
    expect(host.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1);
    const next = host.querySelector<HTMLElement>('[data-t="next"]')!;
    for (let k = 0; k < 7; k++) { next.click(); tick(2000 + k * 200); }
    host.querySelectorAll<HTMLButtonElement>('button[data-s], button[data-e], button[data-c], button[data-p], button[data-tool], [data-ref="step"], [data-ref="fast"], [data-ref="restart"], [data-ref="allaut"], [data-ref="noborder"]').forEach((b) => b.click());
    for (const i of Array.from(host.querySelectorAll<HTMLInputElement>('input[type="range"]'))) {
      i.value = String(Number(i.max)); i.dispatchEvent(new Event('input', { bubbles: true }));
    }
    tick(5000);
    expect(host.querySelector('[data-ref="say"]')!.textContent).not.toBe('');
    // Kitapta kutusu: tartışmalı replikasyon durumları belirtilir.
    expect(host.querySelector('.book')!.textContent).toContain('tartışmalı');
    expect(host.querySelectorAll('.book a[href^="#/bolum/ch09?deney=ch09-e"]').length).toBeGreaterThanOrEqual(8);
    un();
  });

  it('ekran dışına çıkınca döngü durur, geri gelince devam eder', () => {
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
