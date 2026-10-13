// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
const flush = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 15)); };
const dump = (root: HTMLElement): string => {
  const out: string[] = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n: Node | null = w.currentNode;
  while (n) {
    if (n.nodeType === 3) out.push('T:' + n.textContent);
    else { const e = n as Element; out.push('E:' + e.tagName + [...e.attributes].filter((a) => a.name !== 'id' && !a.name.startsWith('aria-controls') && !a.name.startsWith('aria-labelledby') && a.name !== 'for' && a.name !== 'clip-path').map((a) => `${a.name}=${a.value.replace(/sb-?\d+/g, 'ID')}`).join('|')); }
    n = w.nextNode();
  }
  return out.join('\n');
};
async function run(mount: (c: HTMLElement) => () => void): Promise<string[]> {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal('requestAnimationFrame', () => 1);
  const host = document.createElement('div'); document.body.appendChild(host);
  const off = mount(host); await flush();
  const res = [dump(host)];
  const btns = [...host.querySelectorAll<HTMLButtonElement>('button, [role=tab]')];
  for (const b of btns) { if (!host.contains(b)) continue; b.click(); await flush(); res.push(dump(host)); }
  const btns2 = [...host.querySelectorAll<HTMLButtonElement>('button, [role=tab]')];
  for (const b of btns2) { if (!host.contains(b)) continue; b.click(); await flush(); res.push(dump(host)); }
  off(); host.remove();
  return res;
}
describe('cmp', () => {
  it('same', async () => {
    const o = await run((await import('./view')).mount);
    const n = await run((await import('../savas-baris/view')).mount);
    expect(n.length).toBe(o.length);
    for (let i = 0; i < o.length; i++) expect(n[i], 'step ' + i).toBe(o[i]);
  }, 400000);
});
