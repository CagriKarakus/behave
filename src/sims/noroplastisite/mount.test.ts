// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './view';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

function stubRaf() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
  const tick = (t: number) => { const cur = Array.from(pending.entries()); pending.clear(); for (const [, cb] of cur) cb(t); };
  return { pending, tick };
}

describe('nöroplastisite görünümü', () => {
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

  it('üç sekme ve tur çalışır; her karede hata vermez', () => {
    const { tick } = stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    let t = performance.now();
    const run = (n: number) => { for (let i = 0; i < n; i++) { t += 100; tick(t); } };
    run(5);
    const tabs = host.querySelectorAll<HTMLButtonElement>('.tab');
    expect(tabs).toHaveLength(3);
    for (const b of tabs) { b.click(); run(10); expect(host.querySelector('.pane:not([hidden])')).not.toBeNull(); }
    // Turu baştan sona dolaş
    const next = host.querySelector<HTMLButtonElement>('[data-t="next"]')!;
    for (let i = 0; i < 6; i++) { next.click(); run(10); }
    expect(host.querySelector('.tour')!.classList.contains('is-closed')).toBe(true);
    // Kaydırıcılar
    for (const r of host.querySelectorAll<HTMLInputElement>('input[type="range"]')) {
      r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true }));
      run(2);
      r.value = r.min; r.dispatchEvent(new Event('input', { bubbles: true }));
      run(2);
    }
    expect(host.querySelector('[data-ref="say"]')!.textContent!.length).toBeGreaterThan(10);
    un();
    expect(host.innerHTML).toBe('');
  });

  it('ekran dışında döngü durur, unmount gözlemciyi bırakır', () => {
    const observers: Array<{ cb: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn();
      constructor(public cb: IntersectionObserverCallback) { observers.push(this); }
      observe() {}
    });
    const { pending } = stubRaf();
    const added: string[] = [], removed: string[] = [];
    vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (this: EventTarget, t: string) { added.push(t); });
    vi.spyOn(EventTarget.prototype, 'removeEventListener').mockImplementation(function (this: EventTarget, t: string) { removed.push(t); });
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
    const count = (a: string[]) => a.reduce<Record<string, number>>((m, t) => ((m[t] = (m[t] ?? 0) + 1), m), {});
    expect(count(removed)).toEqual(count(added));
  });
});
