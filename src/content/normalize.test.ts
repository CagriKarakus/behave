import { describe, expect, it } from 'vitest';
import oldDraft from './__fixtures__/old-draft.json';
import newSchema from './__fixtures__/new-schema.json';
import current from '../../content/chapters.json';
import { normalizeContent, normalizeId, chapterLabel } from './normalize';

describe('normalizeId', () => {
  it('tek haneli id\'leri iki haneye çevirir', () => {
    expect(normalizeId('ch2')).toBe('ch02');
    expect(normalizeId('ch10')).toBe('ch10');
    expect(normalizeId('ch02')).toBe('ch02');
    expect(normalizeId('app2')).toBe('app2');
    expect(normalizeId('Intro')).toBe('intro');
  });
});

describe('normalizeContent', () => {
  it('eski taslak çökmeden okunur; ch2 -> ch02', () => {
    const c = normalizeContent(oldDraft);
    expect(c.chapters).toHaveLength(22);
    expect(c.chapters.map((x) => x.id)).toContain('ch02');
    expect(c.chapters.every((x) => Array.isArray(x.keyStudies) && Array.isArray(x.experiments))).toBe(true);
    expect(c.chapters.find((x) => x.id === 'ch02')?.timescaleSeconds).toBe(1);
  });
  it('yeni şema okunur, experiments normalleşir', () => {
    const c = normalizeContent(newSchema);
    const ch = c.chapters.find((x) => x.id === 'ch02')!;
    expect(ch.experiments).toHaveLength(2);
    expect(ch.experiments[0].replication?.status).toBe('karışık');
    expect(ch.experiments[1].replication).toBeNull();
    expect(ch.links[0].to).toBe('ch99');
  });
  it('şu anki content/chapters.json okunur', () => {
    const c = normalizeContent(current);
    expect(c.chapters.length).toBeGreaterThan(0);
  });
  it('bozuk girdi çökmez', () => {
    expect(normalizeContent(null).chapters).toEqual([]);
    expect(normalizeContent({ chapters: [1, null, { id: 'x' }, { id: 'x' }, { id: 'ch3', keyConcepts: 'a', experiments: [{ name: 'e', replication: { status: 'garip' } }] }] }).chapters.map((c) => c.id)).toEqual(['x', 'ch03']);
    const e = normalizeContent({ chapters: [{ id: 'ch3', experiments: [{ name: 'e', replication: { status: 'garip' } }] }] }).chapters[0].experiments[0];
    expect(e.id).toBe('ch03-e1');
    expect(e.replication?.status).toBe('bilinmiyor');
  });
  it('etiketler', () => {
    expect(chapterLabel({ kind: 'appendix', number: 2 })).toBe('Ek 2');
    expect(chapterLabel({ kind: 'intro', number: null })).toBe('Giriş');
  });
});
