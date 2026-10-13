// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount as mNew } from '../zaman-merdiveni/view';
import { mount as mOld } from './view';
const run = async (m: (c: HTMLElement) => () => void) => {
  const host = document.createElement('div'); document.body.append(host);
  const out: string[] = [];
  m(host);
  for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 10));
  const strip = (h: string) => h.replace(/zm\d+/g, 'zm');
  out.push(strip(host.innerHTML));
  const btns = [...host.querySelectorAll<HTMLButtonElement>('button')];
  for (const b of btns) { if (!host.contains(b)) continue; b.click(); await new Promise((r) => setTimeout(r, 5)); out.push(strip(host.innerHTML)); }
  host.remove();
  return out;
};
describe('cmp', () => { it('same', async () => { const a = await run(mOld), b = await run(mNew); expect(b.length).toBe(a.length); for (let i = 0; i < a.length; i++) expect(b[i]).toBe(a[i]); }); });
