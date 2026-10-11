import { describe, expect, it, vi } from 'vitest';
import oldDraft from './__fixtures__/old-draft.json';
import newSchema from './__fixtures__/new-schema.json';
import current from '../../content/chapters.json';
import { SIMS } from '../sims/registry';
import { chapterLabel, cleanDoi, normalizeContent, normalizeId, normalizeIndex } from './normalize';

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
  it('şu anki content/chapters.json: 22 bölüm, benzersiz kimlik, geçerli alanlar', () => {
    const c = normalizeContent(current);
    expect(c.chapters).toHaveLength(22);
    const ids = c.chapters.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ch of c.chapters) {
      expect(ch.titleTr, ch.id).not.toBe('');
      expect(ch.summary, ch.id).not.toBe('');
      expect(ch.confidence, ch.id).not.toBeNull();
    }
    expect(normalizeIndex(current).chapters.map((x) => x.id)).toEqual(ids);
  });
  it('simülasyon kayıt anahtarları içerikte var (kimlik değişirse sim sessizce kaybolmasın)', () => {
    const ids = new Set(normalizeContent(current).chapters.map((x) => x.id));
    for (const key of Object.keys(SIMS)) expect(ids.has(key), key).toBe(true);
  });
  it('bölümler arası bağlantılar çözülür ve deney kimlikleri benzersizdir', () => {
    const c = normalizeContent(current);
    const ids = new Set(c.chapters.map((x) => x.id));
    for (const ch of c.chapters) for (const l of ch.links) expect(ids.has(l.to), `${ch.id} -> ${l.to}`).toBe(true);
    const expIds = c.chapters.flatMap((ch) => ch.experiments.map((e) => e.id));
    expect(new Set(expIds).size).toBe(expIds.length);
    for (const ch of c.chapters) for (const e of ch.experiments) for (const src of e.sources) {
      if (src.doi) expect(src.doi, e.id).toMatch(/^10\./);
    }
  });
  it('DOI: tam URL ve doi: öneki temizlenir', () => {
    expect(cleanDoi('https://doi.org/10.1037/abc')).toBe('10.1037/abc');
    expect(cleanDoi('http://dx.doi.org/10.1/x')).toBe('10.1/x');
    expect(cleanDoi('DOI: 10.1/x')).toBe('10.1/x');
    expect(cleanDoi('10.1/x')).toBe('10.1/x');
    expect(cleanDoi('  ')).toBeNull();
    expect(cleanDoi(null)).toBeNull();
  });
  it('dize sayılar, büyük harfli durum ve çakışan deney kimlikleri', () => {
    const c = normalizeContent({ chapters: [{ id: 'ch12', number: '12', timescaleSeconds: '60', experiments: [
      { id: 'a', name: 'A', year: '1998', replication: { status: ' Sağlam ' } },
      { id: 'a', name: 'B' }, { name: 'C' }, { id: 'ch12-e3', name: 'D' }] }] }).chapters[0];
    expect(c.number).toBe(12);
    expect(c.timescaleSeconds).toBe(60);
    expect(c.experiments[0].year).toBe(1998);
    expect(c.experiments[0].replication?.status).toBe('sağlam');
    const ids = c.experiments.map((e) => e.id);
    expect(ids).toEqual(['a', 'a-2', 'ch12-e3', 'ch12-e3-2']);
  });
  it('bozuk girdi çökmez', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
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
