// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './view';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

function raf() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
  const tick = (t: number) => { const cur = Array.from(pending.values()); pending.clear(); for (const cb of cur) cb(t); };
  return { pending, tick };
}

describe('İşbirliğinin evrimi görünümü', () => {
  it('bağlanır, id çakışmaz, sekmeler ve tur çalışır, unmount temizler', () => {
    const { pending, tick } = raf();
    const a = document.createElement('div'), b = document.createElement('div');
    document.body.append(a, b);
    const ua = mount(a), ub = mount(b);
    const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pending.size).toBe(2);

    // Tur: ilk adım A'nın TfT, B'nin hep ihanet olduğu eşleşme; ileri adım sinyal hatası ekler.
    const next = a.querySelector<HTMLButtonElement>('[data-t="next"]')!;
    next.click();
    expect(a.querySelector('[data-t="n"]')!.textContent).toBe('2 / 6');
    expect(a.querySelector<HTMLInputElement>('input[id$="sl-noise"]')!.value).toBe('4');

    // Animasyon ilerler: yığılmış alan çizilir.
    for (let k = 1; k <= 40; k++) tick(performance.now() + k * 100);
    expect(a.querySelectorAll('[data-ref="mSvg"] rect').length).toBeGreaterThan(20);
    expect(a.querySelectorAll('.band').length).toBe(7);
    expect(a.querySelector('[data-ref="say"]')!.textContent!.length).toBeGreaterThan(10);

    // Akraba sekmesi
    a.querySelector<HTMLButtonElement>('#' + a.querySelector('[data-pane="kin"]')!.id)!.click();
    expect(a.querySelector<HTMLElement>('[data-pane="kin"].pane')!.hidden).toBe(false);
    a.querySelector<HTMLButtonElement>('[data-k="kuzen"]')!.click();
    expect(a.querySelector('[data-k="kuzen"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(a.querySelector('[data-k="kuzen"]')!.className).toContain('v-no');
    expect(a.querySelectorAll('.kl').length).toBe(6);

    ua();
    expect(a.innerHTML).toBe('');
    expect(pending.size).toBe(1);
    tick(performance.now() + 100);
    expect(pending.size).toBe(1);
    ub();
    expect(pending.size).toBe(0);
  });

  it('ekran dışında döngü durur; unmount dinleyicileri bırakır', () => {
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
    expect(pending.size).toBe(1);
    observers[0].cb([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(0);
    observers[0].cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(1);
    un();
    expect(observers[0].disconnect).toHaveBeenCalled();
    const count = (x: string[]) => x.reduce<Record<string, number>>((m, t) => ((m[t] = (m[t] ?? 0) + 1), m), {});
    expect(count(removed)).toEqual(count(added));
  });
});
