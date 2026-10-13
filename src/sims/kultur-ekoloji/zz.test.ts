// @vitest-environment jsdom
import { it } from 'vitest';
import { mount } from '/home/user/behave/src/sims/kultur-ekoloji/view';
it('p', () => {
  const h = document.createElement('div'); document.body.append(h);
  let t0 = performance.now(); mount(h); console.log('mount', performance.now() - t0);
  for (const b of Array.from(h.querySelectorAll<HTMLElement>('button')).slice(0, 40)) { t0 = performance.now(); b.click(); const d = performance.now() - t0; if (d > 50) console.log(b.textContent, d); }
}, 60000);
