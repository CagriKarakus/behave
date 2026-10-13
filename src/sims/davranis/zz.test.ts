// @vitest-environment jsdom
import { it } from 'vitest';
import { setLocale } from '../../i18n/locale';
import { setSimEn } from '../../i18n/sim-text';
import en from './text.en';
import { mount } from './view';
it('time', async () => {
  Element.prototype.scrollIntoView = () => {};
  setSimEn('davranis', en); setLocale('en');
  const host = document.createElement('div'); document.body.appendChild(host);
  mount(host); await new Promise((r) => setTimeout(r, 30));
  const btns = [...host.querySelectorAll<HTMLButtonElement>('button, [role=tab]')].slice(0, 60);
  const out: string[] = [];
  for (const [i, b] of btns.entries()) { const t = performance.now(); b.click(); await new Promise((r) => setTimeout(r, 30)); out.push(`${i} ${(b.textContent ?? '').slice(0,20)} ${(performance.now() - t).toFixed(0)}`); }
  throw new Error(out.join('\n'));
}, 60000);
