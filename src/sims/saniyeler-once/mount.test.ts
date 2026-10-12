// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './view';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

function stubRaf() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
  const tick = (t: number) => { const cur = Array.from(pending.values()); pending.clear(); for (const cb of cur) cb(t); };
  return { pending, tick };
}

describe('saniyeler-once görünümü', () => {
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
    tick(performance.now() + 50);
    expect(pending.size).toBe(1);
    ub();
    expect(pending.size).toBe(0);
  });

  it('sekmeler, tur ve girdiler çalışır; negatif zaman farkı sorun çıkarmaz', () => {
    const { tick } = stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const tabNorm = host.querySelector<HTMLButtonElement>('[data-tab="norm"]')!;
    tabNorm.click();
    expect(host.querySelector<HTMLElement>('[data-ref="p-norm"]')!.hidden).toBe(false);
    tick(performance.now() - 500);
    for (let i = 1; i < 60; i++) tick(performance.now() + i * 100);
    expect(host.querySelector('[data-ref="n-tally"]')!.textContent).toMatch(/İlan atma: \d+\/\d+/);
    host.querySelector<HTMLButtonElement>('[data-t="next"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-tab="fast"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-ref="f-play"]')!.click();
    tick(performance.now() + 10);
    expect(host.querySelector('[data-ref="say"]')!.textContent!.length).toBeGreaterThan(10);
    un();
    expect(host.innerHTML).toBe('');
  });
});
