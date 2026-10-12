// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import oldDraft from '../content/__fixtures__/old-draft.json';
import newSchema from '../content/__fixtures__/new-schema.json';
import { normalizeContent } from '../content/normalize';
import { sourceFromContent } from '../content';
import { renderHome, NOTICE_KEY } from './home';
import { renderChapter } from './chapter';
import { renderExperiments } from './experiment';

const els: HTMLElement[] = [];
const mk = () => { const e = document.createElement('div'); document.body.appendChild(e); els.push(e); return e; };
afterEach(() => { vi.restoreAllMocks(); els.splice(0).forEach((e) => e.remove()); });

describe('sayfalar (eski taslak ve yeni şema)', () => {
  for (const [name, data] of [['eski', oldDraft], ['yeni', newSchema]] as const) {
    it(`${name}: ana sayfa ve her bölüm çökmeden çizilir`, async () => {
      const c = normalizeContent(data);
      const src = sourceFromContent(c);
      const home = mk();
      const off = renderHome(home, src.index);
      expect(home.querySelectorAll('.ch-card').length).toBe(c.chapters.length);
      off.dispose();
      for (const ch of c.chapters) {
        const el = mk();
        const pg = renderChapter(el, src, ch.id);
        expect(el.querySelector('h1')?.textContent).toBe(ch.titleTr);
        await pg.ready;
        pg.dispose();
        expect(el.innerHTML).toBe('');
      }
      const ex = mk();
      const pe = renderExperiments(ex, src);
      await pe.ready;
      pe.dispose();
    });
  }

  it('HTML kaçışlanır ve bilinmeyen bağlantı düz metin kalır', async () => {
    const c = sourceFromContent(normalizeContent(newSchema));
    const el = mk();
    await renderChapter(el, c, 'intro').ready;
    expect(el.querySelector('.summary b')).toBeNull();
    const el2 = mk();
    await renderChapter(el2, c, 'ch02').ready;
    expect(el2.querySelector('.links a[href="#/bolum/ch99"]')).toBeNull();
  });

  it('deneyler: keyStudies yerine gösterilir, doi linki, javascript: url yok, rozet metni var', async () => {
    const c = sourceFromContent(normalizeContent(newSchema));
    const el = mk();
    await renderChapter(el, c, 'ch02').ready;
    expect(el.querySelectorAll('.exp')).toHaveLength(2);
    expect(el.textContent).not.toContain('Eski çalışma');
    expect(el.querySelector('a[href="https://doi.org/10.1000/xyz"]')).not.toBeNull();
    expect(el.querySelector('a[href^="javascript"]')).toBeNull();
    expect(el.querySelector('.repl-karışık')?.textContent).toContain('karışık');
    expect(el.querySelector('.exp-caveats')?.textContent).toContain('Küçük örneklem');
  });

  it('deneyler yoksa keyStudies\'e döner', async () => {
    const c = sourceFromContent(normalizeContent({ chapters: [{ id: 'ch05', keyStudies: [{ name: 'Çalışma A', finding: 'x' }] }] }));
    const el = mk();
    await renderChapter(el, c, 'ch05').ready;
    expect(el.querySelector('.studies')?.textContent).toContain('Çalışma A');
  });

  it('?deney= ile kart açılır; bulunamazsa ready false döner', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const c = sourceFromContent(normalizeContent(newSchema));
    const el = mk();
    expect(await renderChapter(el, c, 'ch02', 'ch02-e2').ready).toBe(true);
    expect(el.querySelector('#exp-ch02-e2 details')?.hasAttribute('open')).toBe(true);
    expect(el.querySelector('#exp-ch02-e1 details')?.hasAttribute('open')).toBe(false);
    expect(await renderChapter(mk(), c, 'ch02', 'yok').ready).toBe(false);
  });

  it('aynı sayfada başka deneye geçilir (focusExperiment), sim yeniden kurulmaz', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    const c = sourceFromContent(normalizeContent(newSchema));
    const el = mk();
    const pg = renderChapter(el, c, 'ch02', 'ch02-e1');
    await pg.ready;
    const sim = el.querySelector('.sim');
    expect(sim).not.toBeNull();
    expect(await pg.focusExperiment!('ch02-e2')).toBe(true);
    expect(el.querySelector('.exp-target')?.id).toBe('exp-ch02-e2');
    expect(el.querySelector('.sim')).toBe(sim);
    expect(await pg.focusExperiment!('yok')).toBe(false);
    pg.dispose();
  });

  it('içerik yüklenemezse hata mesajı gösterilir, sayfa çökmez', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const src = sourceFromContent(normalizeContent(newSchema));
    const el = mk();
    const pg = renderChapter(el, { ...src, detail: () => Promise.reject(new Error('ağ')) }, 'ch03');
    await pg.ready;
    expect(el.querySelector('[role=alert]')?.textContent).toContain('yüklenemedi');
    pg.dispose();
  });

  it('sayfa, simülasyon yüklenmeden değişirse simülasyon bağlanmaz', async () => {
    const c = sourceFromContent(normalizeContent(newSchema));
    const el = mk();
    const pg = renderChapter(el, c, 'ch02');
    pg.dispose();
    await pg.ready;
    expect(document.querySelectorAll('.sim').length).toBe(0);
  });

  it('deney listesi: bölüm, durum ve metin süzgeci', async () => {
    const c = sourceFromContent(normalizeContent(newSchema));
    const el = mk();
    await renderExperiments(el, c).ready;
    const visible = () => Array.from(el.querySelectorAll<HTMLElement>('.exp-wrap')).filter((w) => !w.hidden).length;
    expect(visible()).toBe(2);
    const st = el.querySelector<HTMLSelectElement>('[data-f=st]')!;
    st.value = 'karışık'; st.dispatchEvent(new Event('change'));
    expect(visible()).toBe(1);
    st.value = ''; st.dispatchEvent(new Event('change'));
    const q = el.querySelector<HTMLInputElement>('[data-f=q]')!;
    q.value = 'İKİNCİ BULGU'; q.dispatchEvent(new Event('input'));
    expect(visible()).toBe(1);
    expect(el.querySelector('.exp-wrap:not([hidden]) .exp-chlink')?.getAttribute('href')).toBe('#/bolum/ch02?deney=ch02-e2');
    // Türkçe i/ı tuzağı: İngilizce ad büyük/küçük harften bağımsız bulunur; "belirtilmemiş" süzülebilir.
    q.value = 'implicit'; q.dispatchEvent(new Event('input'));
    expect(visible()).toBe(0);
    q.value = ''; q.dispatchEvent(new Event('input'));
    st.value = 'belirtilmemiş'; st.dispatchEvent(new Event('change'));
    expect(visible()).toBe(1);
  });

  it('arama katlaması: Implicit/ıMPLİCİT/aksan eşitlenir', async () => {
    const { fold } = await import('./experiment');
    expect(fold('Implicit Association Test')).toContain(fold('IMPLİCİT'));
    expect(fold('Implicit')).toBe(fold('ımplicit'));
    expect(fold('Çalışma')).toBe('calisma');
  });

  it('DOI tam URL olsa da bağlantı tek doi.org öneki taşır', async () => {
    const c = normalizeContent({ chapters: [{ id: 'ch05', experiments: [{ name: 'E', sources: [{ citation: 'X', doi: 'https://doi.org/10.1037/abc' }] }] }] });
    const el = mk();
    await renderChapter(el, sourceFromContent(c), 'ch05').ready;
    expect(el.querySelector('.exp-sources a')?.getAttribute('href')).toBe('https://doi.org/10.1037/abc');
    expect(el.querySelector('.doi')?.textContent).toBe('doi:10.1037/abc');
  });
});

describe('uyarı / feragat metinleri', () => {
  const src = () => sourceFromContent(normalizeContent(newSchema));
  beforeEach(() => { try { localStorage.removeItem(NOTICE_KEY); } catch { /* yok */ } });

  it('ana sayfada "Okumadan önce" notu, Deneyler bağlantısı ve süzgeç bağlantısı var', () => {
    const el = mk();
    renderHome(el, src().index);
    const n = el.querySelector('aside[role=note]')!;
    expect(n.querySelector('h2')?.textContent).toBe('Okumadan önce');
    expect(n.getAttribute('aria-labelledby')).toBe('notice-h');
    const hrefs = Array.from(n.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('#/deneyler');
    expect(hrefs).toContain('#/deneyler?odak=durum');
  });

  it('kapatma tercihi localStorage\'a yazılır; sonraki çizimde kutu yok', () => {
    const el = mk();
    renderHome(el, src().index).dispose();
    const el2 = mk();
    renderHome(el2, src().index);
    el2.querySelector<HTMLButtonElement>('[data-notice-close]')!.click();
    expect(el2.querySelector('[data-notice]')).toBeNull();
    expect(localStorage.getItem(NOTICE_KEY)).toBe('1');
    const el3 = mk();
    renderHome(el3, src().index);
    expect(el3.querySelector('[data-notice]')).toBeNull();
  });

  it('localStorage hata verirse kutu yine görünür ve kapatma çökmez', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('x'); });
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('x'); });
    const el = mk();
    renderHome(el, src().index);
    expect(el.querySelector('[data-notice]')).not.toBeNull();
    el.querySelector<HTMLButtonElement>('[data-notice-close]')!.click();
    expect(el.querySelector('[data-notice]')).toBeNull();
    get.mockRestore(); set.mockRestore();
  });

  it('deneyler sayfasında 2026 notu; odak=durum süzgeci odaklar', async () => {
    const el = mk();
    document.body.appendChild(el);
    await renderExperiments(el, src(), 'durum').ready;
    expect(el.querySelector('.repl-note')?.textContent).toContain('2026 itibarıyla');
    expect(document.activeElement).toBe(el.querySelector('[data-f=st]'));
  });
});
