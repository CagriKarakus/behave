// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './view';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

const q = (host: HTMLElement, ref: string) => host.querySelector<HTMLElement>(`[data-ref="${ref}"]`)!;

describe('biz-onlar görünümü', () => {
  it('bağlanır, id çakışmaz, unmount DOM\'u temizler', () => {
    const a = document.createElement('div'), b = document.createElement('div');
    document.body.append(a, b);
    const ua = mount(a), ub = mount(b);
    const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    ua(); expect(a.innerHTML).toBe('');
    ub(); expect(b.innerHTML).toBe('');
  });

  it('etiket, matris seçimi, sekmeler ve tur çalışır', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const cells = host.querySelectorAll<HTMLButtonElement>('.cell');
    expect(cells).toHaveLength(7);
    host.querySelectorAll<HTMLButtonElement>('[data-ref="t-methods"] .chip')[1].click();
    expect(cells[0].disabled).toBe(true);
    q(host, 't-draw').click();
    expect(cells[0].disabled).toBe(false);
    expect(q(host, 't-label').textContent).toMatch(/Etiketin:/);
    cells[0].click();
    expect(q(host, 'm-hist').hidden).toBe(false);
    expect(q(host, 'm-fb').textContent).toMatch(/Seçim:/);
    const tabs = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs).toHaveLength(3);
    tabs[1].click();
    expect(q(host, 'p-tajfel').hidden).toBe(true);
    expect(q(host, 'say').textContent).toMatch(/atıf/);
    host.querySelector<HTMLElement>('.pp:nth-of-type(3)')?.dispatchEvent(new Event('click'));
    tabs[2].click();
    expect(q(host, 'p-fiske').hidden).toBe(false);
    for (let i = 0; i < 6; i++) host.querySelector<HTMLButtonElement>('[data-t="next"]')!.click();
    expect(host.querySelector('.tour')!.classList.contains('is-closed')).toBe(true);
    un();
    expect(host.innerHTML).toBe('');
  });

  it('klavyeyle grup taşıma duygu ve çubuğu günceller', () => {
    const host = document.createElement('div');
    document.body.append(host);
    mount(host);
    host.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2].click();
    const tok = host.querySelectorAll<SVGElement>('.tok')[3];
    const before = q(host, 'say').textContent;
    tok.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(q(host, 'say').textContent).not.toBe(before);
    expect(q(host, 'say').textContent).toMatch(/Evsizler/);
  });
});
