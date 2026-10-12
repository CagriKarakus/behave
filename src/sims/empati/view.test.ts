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

describe('empati görünümü', () => {
  it('bağlanır, id çakışmaz, turu sonuna kadar gezer, unmount döngüyü ve DOM\'u temizler', () => {
    const { pending, tick } = stubRaf();
    const a = document.createElement('div'), b = document.createElement('div');
    document.body.append(a, b);
    const ua = mount(a), ub = mount(b);
    const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pending.size).toBe(2);
    // Tur: ileri tuşuyla her adımda sekme/çıktı değişir, hata yok
    const next = a.querySelector<HTMLButtonElement>('[data-t="next"]')!;
    const says = new Set<string>();
    for (let i = 0; i < 6; i++) {
      says.add(a.querySelector('[data-ref="say"]')!.textContent ?? '');
      expect(a.querySelector('[data-ref="say"]')!.textContent!.length).toBeGreaterThan(20);
      next.click();
    }
    expect(says.size).toBeGreaterThanOrEqual(4);
    expect(a.querySelector('.tour')!.classList.contains('is-closed')).toBe(true);
    ua();
    expect(a.innerHTML).toBe('');
    expect(pending.size).toBe(1);
    tick(performance.now() + 50);
    ub();
    expect(pending.size).toBe(0);
  });

  it('Oynat zamanı ilerletir ve duran döngüde DOM değişmez', () => {
    const { tick } = stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const play = host.querySelector<HTMLButtonElement>('[data-ref="e-play"]')!;
    const head = host.querySelector('[data-ref="e-head"]')!;
    const end = head.getAttribute('x1');
    play.click();
    expect(play.textContent).toBe('Durdur');
    expect(head.getAttribute('x1')).not.toBe(end);
    const t0 = performance.now();
    tick(t0); tick(t0 + 1000);
    const mid = head.getAttribute('x1');
    expect(Number(mid)).toBeGreaterThan(30);
    // ilk karede negatif zaman farkı sorun çıkarmaz
    tick(t0 - 5000);
    for (let i = 1; i <= 10; i++) tick(t0 + i * 1000);
    expect(play.textContent).toBe('Oynat');
    expect(head.getAttribute('x1')).toBe(end);
    let mutations = 0;
    const mo = new MutationObserver((l) => { mutations += l.length; });
    mo.observe(host, { subtree: true, attributes: true, childList: true, characterData: true });
    tick(t0 + 20000); tick(t0 + 21000);
    return Promise.resolve().then(() => { expect(mutations).toBe(0); mo.disconnect(); un(); });
  });

  it('sekmeler ve kaydırıcılar çalışır: her sekmede çıktı çubuğu güncellenir', () => {
    stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs).toHaveLength(3);
    const label0 = () => host.querySelector('[data-ref="l0"]')!.textContent;
    const seen: string[] = [];
    for (const t of tabs) { t.click(); seen.push(label0() ?? ''); }
    expect(new Set(seen).size).toBe(3);
    // Sekme 1: benlik odaklı kaydırıcıyı artırınca yardım düşer
    tabs[0].click();
    const v2 = () => host.querySelector('[data-ref="v2"]')!.textContent;
    const slider = host.querySelector<HTMLInputElement>('[data-ref="p-e"] input[id$="-s-self"]')!;
    slider.value = '0.1'; slider.dispatchEvent(new Event('input'));
    const lo = Number(v2()!.replace('%', ''));
    slider.value = '0.95'; slider.dispatchEvent(new Event('input'));
    const hi = Number(v2()!.replace('%', ''));
    expect(lo).toBeGreaterThan(hi);
    un();
  });
});
