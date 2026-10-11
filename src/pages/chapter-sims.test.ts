// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import newSchema from '../content/__fixtures__/new-schema.json';
import { normalizeContent } from '../content/normalize';
import { sourceFromContent } from '../content';
import { simsFor } from '../sims/registry';
import { renderHome } from './home';
import { renderChapter } from './chapter';

// Ayrı dosya: aynı dosyadaki diğer testlerin dispose edilmemiş simülasyon döngüleri rAF sayımını bozmasın.
const els: HTMLElement[] = [];
const mk = () => { const e = document.createElement('div'); document.body.appendChild(e); els.push(e); return e; };
afterEach(() => { vi.restoreAllMocks(); els.splice(0).forEach((e) => e.remove()); });

describe('çoklu simülasyon seçici (ch02)', () => {
  const c = sourceFromContent(normalizeContent(newSchema));
  const ids = simsFor('ch02').map((x) => x.id);
  const until = async (fn: () => boolean) => { for (let i = 0; i < 300 && !fn(); i++) await new Promise((r) => setTimeout(r, 10)); };
  const pending = new Set<number>();
  const key = (e: HTMLElement, k: string) => e.querySelector('.sim-tabs [role=tab][aria-selected=true]')!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const mountedIds = (e: HTMLElement) => Array.from(e.querySelectorAll<HTMLElement>('.sim-host')).map((h) => h.dataset.sim);
  const loaded = (e: HTMLElement, id: string) => until(() => e.querySelectorAll('.sim').length === 1 && e.querySelector<HTMLElement>('.sim-host')!.dataset.sim === id);

  beforeEach(() => {
    pending.clear();
    const raf = window.requestAnimationFrame.bind(window);
    const caf = window.cancelAnimationFrame.bind(window);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { const id = raf((t) => { pending.delete(id); cb(t); }); pending.add(id); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => { pending.delete(id); caf(id); });
    history.replaceState(null, '', '#/bolum/ch02');
  });

  it('birden fazla sim varsa tablist çizilir; yalnızca ilki bağlanır', async () => {
    expect(ids.length).toBeGreaterThan(1);
    const el = mk();
    const pg = renderChapter(el, c, 'ch02');
    await pg.ready;
    const tabs = el.querySelectorAll('.sim-tabs [role=tab]');
    expect(tabs).toHaveLength(ids.length);
    expect(el.querySelector('#simpanel[role=tabpanel]')).not.toBeNull();
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');
    expect(tabs[1].querySelector('.sim-tab-blurb')?.textContent).toBeTruthy();
    expect(el.querySelectorAll('.sim')).toHaveLength(1);
    expect(mountedIds(el)).toEqual([ids[0]]);
    expect(pending.size).toBe(1);
    pg.dispose();
    expect(pending.size).toBe(0);
  });

  it('sekme değişince önceki sim DOM\'dan kalkar, rAF döngüsü 1 kalır, URL güncellenir', async () => {
    history.replaceState(null, '', '#/bolum/ch02?deney=ch02-e1');
    const el = mk();
    const pg = renderChapter(el, c, 'ch02');
    await pg.ready;
    const first = el.querySelector('.sim');
    el.querySelectorAll<HTMLElement>('.sim-tabs [role=tab]')[1].click();
    await loaded(el, ids[1]);
    expect(el.querySelectorAll('.sim')).toHaveLength(1);
    expect(el.querySelector('.sim')).not.toBe(first);
    expect(first!.isConnected).toBe(false);
    expect(pending.size).toBe(1);
    expect(el.querySelectorAll('.sim-tabs [role=tab][aria-selected=true]')).toHaveLength(1);
    expect(location.hash).toBe(`#/bolum/ch02?deney=ch02-e1&sim=${ids[1]}`);
    pg.dispose();
    expect(pending.size).toBe(0);
  });

  it('ok tuşları, Home ve End sekmeler arasında gezer (döngüsel)', async () => {
    const el = mk();
    const pg = renderChapter(el, c, 'ch02');
    await pg.ready;
    const tabs = Array.from(el.querySelectorAll<HTMLElement>('.sim-tabs [role=tab]'));
    key(el, 'ArrowRight');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[1]);
    await loaded(el, ids[1]);
    key(el, 'ArrowRight');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    key(el, 'ArrowLeft');
    expect(tabs[tabs.length - 1].getAttribute('aria-selected')).toBe('true');
    key(el, 'Home');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    key(el, 'End');
    expect(tabs[tabs.length - 1].getAttribute('aria-selected')).toBe('true');
    await loaded(el, ids[ids.length - 1]);
    expect(pending.size).toBe(1);
    pg.dispose();
  });

  it('hızlı sekme değişiminde geç gelen yükleme bağlanmaz', async () => {
    const el = mk();
    const pg = renderChapter(el, c, 'ch02');
    key(el, 'ArrowRight'); key(el, 'ArrowLeft');
    await pg.ready;
    await loaded(el, ids[0]);
    await new Promise((r) => setTimeout(r, 100));
    expect(el.querySelectorAll('.sim')).toHaveLength(1);
    expect(pending.size).toBe(1);
    pg.dispose();
  });

  it('?sim= ile doğrudan açılır; geçersiz değer ilkine düşer', async () => {
    const el = mk();
    const pg = renderChapter(el, c, 'ch02', undefined, ids[1]);
    await pg.ready;
    expect(el.querySelectorAll('.sim')).toHaveLength(1);
    expect(mountedIds(el)).toEqual([ids[1]]);
    expect(el.querySelectorAll('.sim-tabs [role=tab]')[1].getAttribute('aria-selected')).toBe('true');
    pg.dispose();
    const el2 = mk();
    const pg2 = renderChapter(el2, c, 'ch02', undefined, 'yok');
    await pg2.ready;
    expect(mountedIds(el2)).toEqual([ids[0]]);
    expect(el2.querySelectorAll('.sim-tabs [role=tab]')[0].getAttribute('aria-selected')).toBe('true');
    pg2.dispose();
  });

  it('selectSim (hash değişimi) sekmeyi değiştirir', async () => {
    const el = mk();
    const pg = renderChapter(el, c, 'ch02');
    await pg.ready;
    await pg.selectSim!(ids[1]);
    await loaded(el, ids[1]);
    expect(el.querySelectorAll('.sim-tabs [role=tab]')[1].getAttribute('aria-selected')).toBe('true');
    pg.dispose();
  });

  it('tek simülasyonlu bölümde seçici yoktur, görünüm eskisi gibidir', async () => {
    const el = mk();
    const pg = renderChapter(el, c, 'app2');
    await pg.ready;
    expect(el.querySelector('.sim-tabs')).toBeNull();
    expect(el.querySelector('.sim-title')).not.toBeNull();
    expect(el.querySelectorAll('.sim')).toHaveLength(1);
    expect(pg.selectSim).toBeUndefined();
    pg.dispose();
  });

  it('ana sayfa rozeti: birden fazlaysa sayı, tekse "Simülasyon"', () => {
    const idx = c.index;
    const el = mk();
    renderHome(el, idx);
    const badge = (id: string) => Array.from(el.querySelectorAll('.ch-card')).find((a) => a.getAttribute('href') === `#/bolum/${id}`)?.querySelector('.badge-sim')?.textContent;
    expect(badge('ch02')).toBe(`${ids.length} simülasyon`);
    expect(badge('app2')).toBe('Simülasyon');
  });
});
