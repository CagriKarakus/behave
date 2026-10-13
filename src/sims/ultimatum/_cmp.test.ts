// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { mount as nv } from './view';
import { mount as ov } from './_old-view';
function run(mount: (c: HTMLElement) => () => void): string[] {
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  const h = document.createElement('div'); document.body.append(h);
  mount(h);
  const out: string[] = [];
  const snap = () => out.push(h.innerHTML.replace(/\s+/g, ' ').replace(/id="[^"]*"/g, '').replace(/url\(#[^)]*\)/g, ''));
  snap();
  const next = h.querySelector<HTMLButtonElement>('[data-t="next"]')!;
  for (let i = 0; i < 6; i++) { next.click(); snap(); }
  h.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
  for (const n of Array.from(h.querySelectorAll('g.node[role="button"]'))) { n.dispatchEvent(new Event('click')); snap(); h.querySelector<HTMLButtonElement>('[data-ref="dTog"]')?.click(); snap(); }
  for (const c of Array.from(h.querySelectorAll<HTMLButtonElement>('.chip'))) { c.click(); snap(); }
  h.querySelector<HTMLButtonElement>('[data-ref="sess"]')!.click(); snap();
  for (let i = 0; i < 8; i++) { h.querySelector<HTMLButtonElement>(i % 3 ? '[data-ref="accept"]' : '[data-ref="reject"]')!.click(); snap(); h.querySelector<HTMLButtonElement>('[data-ref="next"]')!.click(); }
  snap();
  return out;
}
it('same', () => {
  const a = run(nv), b = run(ov);
  expect(a.length).toBe(b.length);
  const diffs: string[] = [];
  a.forEach((x, i) => {
    if (x === b[i]) return;
    let k = 0; while (x[k] === b[i][k]) k++;
    diffs.push(`${i}\nNEW ${x.slice(Math.max(0, k - 80), k + 160)}\nOLD ${b[i].slice(Math.max(0, k - 80), k + 160)}`);
  });
  expect(diffs.slice(0, 2)).toEqual([]);
});
