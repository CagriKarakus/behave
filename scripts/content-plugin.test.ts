import { describe, expect, it } from 'vitest';
import current from '../content/chapters.json';
import { META_KEYS, splitContent } from './content-plugin.ts';
import { normalizeContent, normalizeDetail, normalizeIndex } from '../src/content/normalize.ts';

describe('içerik bölme (chapters.json tek kaynak)', () => {
  const s = splitContent(current);
  it('özet yalnızca üst veri taşır; ayrıntı alanları özete sızmaz', () => {
    for (const m of s.meta) {
      for (const k of Object.keys(m)) expect(META_KEYS as readonly string[]).toContain(k);
    }
    const json = JSON.stringify(s.meta);
    expect(json).not.toContain('keyConcepts');
    expect(json).not.toContain('experiments');
    expect(json.length).toBeLessThan(15_000);
  });
  it('özet + ayrıntı, bölünmemiş normalizasyonla aynı sonucu verir', () => {
    const full = normalizeContent(current);
    const idx = normalizeIndex({ book: s.book, chapters: s.meta });
    expect(idx.book).toEqual(full.book);
    for (const [i, m] of idx.chapters.entries()) {
      expect({ ...m, ...normalizeDetail(s.details.get(m.id), m.id) }).toEqual(full.chapters[i]);
    }
    expect(idx.chapters).toHaveLength(full.chapters.length);
  });
  it('eski kimlikler (ch2) normalleştirilir, yinelenenler atılır', () => {
    const r = splitContent({ chapters: [{ id: 'ch2', summary: 'a' }, { id: 'ch02', summary: 'b' }, null] });
    expect([...r.details.keys()]).toEqual(['ch02']);
    expect(r.details.get('ch02')?.summary).toBe('a');
  });
});
