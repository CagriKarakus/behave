// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import oldDraft from '../content/__fixtures__/old-draft.json';
import newSchema from '../content/__fixtures__/new-schema.json';
import { normalizeContent } from '../content/normalize';
import { renderHome } from './home';
import { renderChapter } from './chapter';
import { renderExperiments } from './experiment';

const els: HTMLElement[] = [];
const mk = () => { const e = document.createElement('div'); document.body.appendChild(e); els.push(e); return e; };
afterEach(() => { vi.restoreAllMocks(); els.splice(0).forEach((e) => e.remove()); });

describe('sayfalar (eski taslak ve yeni şema)', () => {
  for (const [name, data] of [['eski', oldDraft], ['yeni', newSchema]] as const) {
    it(`${name}: ana sayfa ve her bölüm çökmeden çizilir`, () => {
      const c = normalizeContent(data);
      const home = mk();
      const off = renderHome(home, c);
      expect(home.querySelectorAll('.ch-card').length).toBe(c.chapters.length);
      off();
      for (const ch of c.chapters) {
        const el = mk();
        const un = renderChapter(el, c, ch.id);
        expect(el.querySelector('h1')?.textContent).toBe(ch.titleTr);
        un();
        expect(el.innerHTML).toBe('');
      }
      const ex = mk();
      renderExperiments(ex, c)();
    });
  }

  it('HTML kaçışlanır ve bilinmeyen bağlantı düz metin kalır', () => {
    const c = normalizeContent(newSchema);
    const el = mk();
    renderChapter(el, c, 'intro');
    expect(el.querySelector('.summary b')).toBeNull();
    const el2 = mk();
    renderChapter(el2, c, 'ch02');
    expect(el2.querySelector('.links a[href="#/bolum/ch99"]')).toBeNull();
  });

  it('deneyler: keyStudies yerine gösterilir, doi linki, javascript: url yok, rozet metni var', () => {
    const c = normalizeContent(newSchema);
    const el = mk();
    renderChapter(el, c, 'ch02');
    expect(el.querySelectorAll('.exp')).toHaveLength(2);
    expect(el.textContent).not.toContain('Eski çalışma');
    expect(el.querySelector('a[href="https://doi.org/10.1000/xyz"]')).not.toBeNull();
    expect(el.querySelector('a[href^="javascript"]')).toBeNull();
    expect(el.querySelector('.repl-karışık')?.textContent).toContain('karışık');
    expect(el.querySelector('.exp-caveats')?.textContent).toContain('Küçük örneklem');
  });

  it('deneyler yoksa keyStudies\'e döner', () => {
    const c = normalizeContent({ chapters: [{ id: 'ch05', keyStudies: [{ name: 'Çalışma A', finding: 'x' }] }] });
    const el = mk();
    renderChapter(el, c, 'ch05');
    expect(el.querySelector('.studies')?.textContent).toContain('Çalışma A');
  });

  it('?deney= ile kart açılır', () => {
    Element.prototype.scrollIntoView = vi.fn();
    const c = normalizeContent(newSchema);
    const el = mk();
    renderChapter(el, c, 'ch02', 'ch02-e2');
    expect(el.querySelector('#exp-ch02-e2 details')?.hasAttribute('open')).toBe(true);
    expect(el.querySelector('#exp-ch02-e1 details')?.hasAttribute('open')).toBe(false);
  });

  it('deney listesi: bölüm, durum ve metin süzgeci', () => {
    const c = normalizeContent(newSchema);
    const el = mk();
    renderExperiments(el, c);
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
  });
});
