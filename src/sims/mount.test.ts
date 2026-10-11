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
