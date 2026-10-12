// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './view';
import { meta } from './meta';
import { simsFor } from '../registry';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

const q = <T extends Element = HTMLElement>(root: ParentNode, ref: string) => root.querySelector<T>(`[data-ref="${ref}"]`)!;
const click = (el: Element) => el.dispatchEvent(new MouseEvent('click', { bubbles: true }));

describe('hormon-baglam kaydı', () => {
  it('ch04 içinde kayıtlı', () => {
    expect(meta.chapter).toBe('ch04');
    expect(simsFor('ch04').map((s) => s.id)).toContain('hormon-baglam');
  });
});

describe('hormon-baglam görünümü', () => {
  it('bağlanır, id çakışmaz, unmount DOM\'u temizler', () => {
    const a = document.createElement('div'), b = document.createElement('div');
    document.body.append(a, b);
    const ua = mount(a), ub = mount(b);
    const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    ua();
    expect(a.innerHTML).toBe('');
    ub();
    expect(b.innerHTML).toBe('');
  });

  it('sekmeler değişir; her sekme metin ve gösterge üretir; replikasyon kutusu görünür', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const tabs = host.querySelectorAll<HTMLButtonElement>('.tab');
    expect(tabs).toHaveLength(3);
    expect(q(host, 'say').textContent).toMatch(/Meydan okuma|meydan okuması/);
    click(tabs[1]);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('.warn-h')!.textContent).toContain('tartışmalı');
    expect(host.querySelector<HTMLElement>('.pane[data-pane="o"]')!.hidden).toBe(false);
    expect(q(host, 'say').textContent).toMatch(/Oksitosin/);
    click(tabs[2]);
    expect(q(host, 'say').textContent).toMatch(/performans/);
    expect(host.querySelectorAll('.meters .m').length).toBeGreaterThanOrEqual(3);
    un();
  });

  it('kaydırıcı ve çipler modeli günceller; tur 6 adım ve sekme değiştirir', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const dose = host.querySelector<HTMLInputElement>('input[id$="-dose"]')!;
    dose.value = '0';
    dose.dispatchEvent(new Event('input', { bubbles: true }));
    const low = q(host, 'say').textContent;
    dose.value = '100';
    dose.dispatchEvent(new Event('input', { bubbles: true }));
    expect(q(host, 'say').textContent).not.toBe(low);
    const next = host.querySelector<HTMLButtonElement>('[data-t="next"]')!;
    expect(host.querySelector('[data-t="n"]')!.textContent).toBe('1 / 6');
    for (let i = 0; i < 4; i++) click(next);
    expect(host.querySelector<HTMLElement>('.pane[data-pane="o"]')!.hidden).toBe(false);
    click(next);
    expect(host.querySelector<HTMLElement>('.pane[data-pane="s"]')!.hidden).toBe(false);
    un();
  });
});
