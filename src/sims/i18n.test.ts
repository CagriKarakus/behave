// @vitest-environment jsdom
// Her simülasyonun İngilizce karşılığını denetler: parite, Türkçe sızıntısı, bozuk şablon izleri.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setLocale } from '../i18n/locale';
import { setSimEn } from '../i18n/sim-text';

const metas = import.meta.glob<{ meta: { id: string; title: string; blurb: string; en?: { title: string; blurb: string } } }>('./*/meta.ts', { eager: true });
const views = import.meta.glob<{ mount: (c: HTMLElement) => () => void }>('./*/view.ts');
const trTexts = import.meta.glob<{ TR: unknown }>('./*/text.tr.ts');
const enTexts = import.meta.glob<{ default: unknown }>('./*/text.en.ts');

/** Türkçe'ye özgü harfler (ç ö ü yabancı özel adlarda geçebilir, o yüzden dışarıda). */
const TR_ONLY = /[ışğİŞĞ]/;
const BAD = /undefined|NaN|\[object|\{\w+\}/;

type Shape = string;
function shape(a: unknown, b: unknown, path: string, errs: string[]): void {
  if (typeof a === 'string') { if (typeof b !== 'string' || !b.trim()) errs.push(`${path}: boş/yanlış tip`); return; }
  if (typeof a === 'function') { if (typeof b !== 'function' || (b as () => void).length !== (a as () => void).length) errs.push(`${path}: fonksiyon imzası farklı`); return; }
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || b.length !== a.length) { errs.push(`${path}: dizi uzunluğu ${a.length} olmalı`); return; }
    a.forEach((x, i) => shape(x, b[i], `${path}[${i}]`, errs));
    return;
  }
  if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') { errs.push(`${path}: nesne olmalı`); return; }
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    for (const k of ka) if (!(k in (b as object))) errs.push(`${path}.${k}: eksik`);
    for (const k of kb) if (!(k in (a as object))) errs.push(`${path}.${k}: fazla`);
    for (const k of ka) if (k in (b as object)) shape((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, errs);
  }
}
function leaks(v: unknown, path: string, out: string[]): void {
  if (typeof v === 'string') { if (TR_ONLY.test(v)) out.push(`${path}: ${v.slice(0, 60)}`); return; }
  if (Array.isArray(v)) v.forEach((x, i) => leaks(x, `${path}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) leaks(x, `${path}.${k}`, out);
}
const visible = (root: HTMLElement): string => {
  const parts = [root.textContent ?? ''];
  for (const el of root.querySelectorAll('[aria-label],[aria-valuetext],[title],[alt],[placeholder]')) {
    for (const a of ['aria-label', 'aria-valuetext', 'title', 'alt', 'placeholder']) { const v = el.getAttribute(a); if (v) parts.push(v); }
  }
  return parts.join('\n');
};
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 5)); };

afterEach(() => { setLocale('tr'); vi.restoreAllMocks(); });

describe.each(Object.entries(metas).map(([p, m]) => [m.meta.id, p, m.meta] as const))('%s (İngilizce)', (id, path, meta) => {
  const dir = path.replace('meta.ts', '');
  it('meta.en var', () => {
    expect(meta.en?.title, 'meta.en.title').toBeTruthy();
    expect(meta.en?.blurb, 'meta.en.blurb').toBeTruthy();
    expect(TR_ONLY.test(`${meta.en?.title} ${meta.en?.blurb}`)).toBe(false);
  });
  it('text.en, text.tr ile aynı yapıda ve Türkçe harf içermiyor', async () => {
    const tr = (await trTexts[`${dir}text.tr.ts`]?.())?.TR;
    const en = (await enTexts[`${dir}text.en.ts`]?.())?.default;
    expect(tr, 'text.tr.ts / export TR').toBeTruthy();
    expect(en, 'text.en.ts / default export').toBeTruthy();
    const errs: string[] = [];
    shape(tr, en, 'EN', errs);
    expect(errs.slice(0, 8)).toEqual([]);
    const l: string[] = [];
    leaks(en, 'EN', l);
    expect(l.slice(0, 8)).toEqual([]);
  });
  it('İngilizce modda açılır; hiçbir düğme tıklaması Türkçe harf ya da bozuk şablon göstermez', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    const en = (await enTexts[`${dir}text.en.ts`]?.())?.default;
    setSimEn(id, en);
    setLocale('en');
    const { mount } = await views[`${dir}view.ts`]();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const off = mount(host);
    await flush();
    const seen: string[] = [];
    const check = (when: string) => {
      const t = visible(host);
      const m = t.match(TR_ONLY) ? t.match(new RegExp('.{0,30}' + TR_ONLY.source + '.{0,30}')) : null;
      if (m) seen.push(`${when}: Türkçe harf …${m[0]}…`);
      const b = t.match(BAD);
      if (b) seen.push(`${when}: bozuk şablon izi "${b[0]}" …${t.slice(Math.max(0, (b.index ?? 0) - 30), (b.index ?? 0) + 30).replace(/\n/g, ' ')}…`);
    };
    check('açılış');
    const btns = [...host.querySelectorAll<HTMLButtonElement>('button, [role=tab]')].filter((b) => !b.classList.contains('bar-toggle') && !b.disabled).slice(0, 60);
    for (const [i, b] of btns.entries()) {
      if (!host.contains(b)) continue;
      b.click();
      await flush();
      check(`düğme ${i} (${(b.textContent ?? '').slice(0, 24).trim()})`);
    }
    off();
    host.remove();
    expect(seen.slice(0, 6)).toEqual([]);
  });
});
