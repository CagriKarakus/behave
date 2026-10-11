// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, EVENTS, TABS } from './view';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

function raf() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
  const tick = (t: number) => { const cur = Array.from(pending.values()); pending.clear(); for (const cb of cur) cb(t); };
  return { pending, tick };
}
const q = <T extends Element = HTMLElement>(root: ParentNode, name: string) => root.querySelector<T>(`[data-ref="${name}"]`)!;

describe('Ergen beyni görünümü', () => {
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
    tick(performance.now() + 50);
    ub();
    expect(b.innerHTML).toBe('');
    expect(pending.size).toBe(0);
  });

  it('üç sekme: seçim panelleri değiştirir, ok tuşları gezinir', () => {
    raf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs).toHaveLength(TABS.length);
    const panel = (i: number) => q(host, `p${i}`);
    tabs[1].click();
    expect(panel(0).hidden).toBe(true);
    expect(panel(1).hidden).toBe(false);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(panel(2).hidden).toBe(false);
    un();
  });

  it('yaş kaydırıcısı çizelgeyi günceller', () => {
    raf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const age = q<HTMLInputElement>(host, 'age');
    age.value = '15'; age.dispatchEvent(new Event('input', { bubbles: true }));
    expect(q(host, 'say').textContent).toContain('15 yaş');
    expect(q(host, 'say').textContent).toContain('fren henüz tam değil');
    age.value = '27'; age.dispatchEvent(new Event('input', { bubbles: true }));
    expect(q(host, 'say').textContent).toContain('olgun');
    un();
  });

  it('sürüş: akran sayısı ergen riskini artırır, ajan turu tamamlanır, kullanıcı oynayabilir', () => {
    const { tick } = raf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    q<HTMLButtonElement>(host, 'tabs').querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    const pctOf = () => Number(/yaklaşık %(\d+)|→ %(\d+)/.exec(q(host, 'say').textContent!)!.slice(1).find(Boolean));
    const peers = q<HTMLInputElement>(host, 'peers');
    const base = Number(q(host, 'mv0').textContent!.replace('%', ''));
    peers.value = '2'; peers.dispatchEvent(new Event('input', { bubbles: true }));
    expect(Number(q(host, 'mv0').textContent!.replace('%', ''))).toBeGreaterThan(base * 2.5);
    expect(pctOf()).toBeGreaterThan(base);
    // 50 tur hızlı
    q(host, 'agent50').click();
    expect(q(host, 'tally').textContent).toContain('50 tur');
    // Animasyonlu bir ajan turu
    let t = 1000;
    q(host, 'agent1').click();
    for (let i = 0; i < 20; i++) { t += 300; tick(t); }
    expect(q(host, 'tally').textContent).toContain('51 tur');
    // Kullanıcı turu
    q(host, 'modeUser').click();
    q(host, 'uNew').click();
    expect(q<HTMLButtonElement>(host, 'uGo').disabled).toBe(true);
    for (let i = 0; i < 6; i++) { t += 300; tick(t); }
    expect(q<HTMLButtonElement>(host, 'uGo').disabled).toBe(false);
    q(host, 'uGo').click();
    for (let i = 0; i < 12; i++) { t += 300; tick(t); }
    expect(q(host, 'tally').textContent).toContain('Sen: 1 tur');
    un();
  });

  it('haber güncelleme: tartışmalı notu görünür, kötü haber ergen profilinde zayıf güncellenir', () => {
    raf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    host.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2].click();
    expect(q(host, 'p2').textContent).toContain('tartışmalı');
    const est = q<HTMLInputElement>(host, 'est');
    est.value = '20'; est.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('[data-k="bad"]')!.click();
    q(host, 'news').click();
    expect(q(host, 'newsTxt').textContent).toContain('Kötü haber');
    const rows = Array.from(q(host, 'rows').querySelectorAll('li'));
    expect(rows).toHaveLength(4);
    const move = (li: Element) => Number(/\(\+(\d+)\)/.exec(li.textContent!)?.[1] ?? 0);
    expect(move(rows[1])).toBeLessThan(move(rows[3]) / 3); // ergen, yetişkinin üçte birinden az
    q(host, 'upd').click();
    expect(q(host, 'rows').querySelectorAll('li')).toHaveLength(5);
    expect(EVENTS.length).toBeGreaterThan(3);
    un();
  });
});
