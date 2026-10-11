// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount as bso } from './bir-saniye-once/view';
import { mount as endo } from './endokrin-eksen/view';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

describe.each([['bir-saniye-once', bso], ['endokrin-eksen', endo]] as const)('%s görünümü', (_n, mount) => {
  it('bağlanır, id çakışmaz, unmount rAF ve DOM\'u temizler', () => {
    let nextId = 1;
    const pending = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
    const tick = (t: number) => { const cur = Array.from(pending.entries()); pending.clear(); for (const [, cb] of cur) cb(t); };
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
    tick(performance.now() + 100);
    expect(pending.size).toBe(0);
  });
});

describe.each([['bir-saniye-once', bso], ['endokrin-eksen', endo]] as const)('%s yaşam döngüsü', (_n, mount) => {
  it('unmount dinleyicileri ve IntersectionObserver\'ı bırakır; ekran dışında döngü durur', () => {
    const observers: Array<{ cb: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn();
      constructor(public cb: IntersectionObserverCallback) { observers.push(this); }
      observe() {}
    });
    let nextId = 1;
    const pending = new Map<number, FrameRequestCallback>();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
    const added: string[] = [], removed: string[] = [];
    const add = vi.spyOn(EventTarget.prototype, 'addEventListener').mockImplementation(function (this: EventTarget, t: string) { added.push(t); });
    const rem = vi.spyOn(EventTarget.prototype, 'removeEventListener').mockImplementation(function (this: EventTarget, t: string) { removed.push(t); });
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    expect(observers).toHaveLength(1);
    expect(pending.size).toBe(1);
    // Ekran dışına çıkınca rAF iptal, geri gelince yeniden başlar.
    observers[0].cb([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(0);
    observers[0].cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(1);
    un();
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(pending.size).toBe(0);
    // Her eklenen dinleyici türü için bir kaldırma var.
    const count = (a: string[]) => a.reduce<Record<string, number>>((m, t) => ((m[t] = (m[t] ?? 0) + 1), m), {});
    expect(count(removed)).toEqual(count(added));
    add.mockRestore(); rem.mockRestore();
  });
});
