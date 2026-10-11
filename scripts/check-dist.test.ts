import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SENT = 'The amygdala responds to a fearful face within a few hundred milliseconds, long before the person can say what they saw.';
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
function setup(distJs: string) {
  const root = mkdtempSync(join(tmpdir(), 'chk-'));
  dirs.push(root);
  mkdirSync(join(root, 'dist/assets'), { recursive: true });
  mkdirSync(join(root, 'book/chapters'), { recursive: true });
  writeFileSync(join(root, 'dist/assets/a.js'), distJs);
  writeFileSync(join(root, 'book/chapters/ch02.txt'), `Short one. ${SENT} Another short bit.`);
  return root;
}
const run = (root: string, extra: string[] = []) =>
  spawnSync('node', ['scripts/check-dist.mjs', '--dist', join(root, 'dist'), '--book', join(root, extra[0] ?? 'book'), '--seed', '3'], { encoding: 'utf8' });

describe('scripts/check-dist.mjs', () => {
  it('temiz dist geçer', () => {
    expect(run(setup('console.log("merhaba")')).status).toBe(0);
  });
  it('kitap cümlesi (kaçışlı JS dizesi olarak bile) dist içinde bulunursa başarısız olur', () => {
    const r = run(setup(`var x=${JSON.stringify(SENT.replace(/ /g, '  '))};`));
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('KİTAP METNİ');
  });
  it('.book yoksa atlar', () => {
    const r = run(setup('x'), ['yok']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('atlandı');
  });
  it('dist içinde PDF varsa başarısız olur', () => {
    const root = setup('x');
    writeFileSync(join(root, 'dist/kitap.pdf'), '%PDF');
    expect(run(root).status).toBe(1);
  });
  it('gerçek dist temizdir (build edilmişse)', () => {
    try { execFileSync('node', ['scripts/check-dist.mjs'], { stdio: 'pipe' }); } catch (e) {
      const err = e as { status?: number };
      expect(err.status).not.toBe(1);
    }
  });
});
