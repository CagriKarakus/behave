// İngilizce içerik katmanının Türkçe asıl kaynakla yapısal ve bilimsel bütünlüğü.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import chapters from '../../content/chapters.json';
import glossary from '../../content/glossary.json';
import { englishBook, englishMeta, mergeDetail, type ChapterOverlay } from './overlay';
import { normalizeContent, normalizeDetail } from './normalize';
// @ts-expect-error .mjs doğrulayıcı (tip bildirimi yok)
import { validate } from '../../scripts/validate-overlay.mjs';
import { readOverlays, splitContent } from '../../scripts/content-plugin';

const overlays = readOverlays();
const split = splitContent(chapters);
const ids = [...split.details.keys()];

describe('İngilizce katman', () => {
  it('her bölümün katmanı var', () => {
    expect([...overlays.keys()].sort()).toEqual([...ids].sort());
  });
  it.each(ids)('%s: doğrulayıcıdan hatasız geçer (yapı, uzunluk, Türkçe harf, yasaklı varyant)', (id: string) => {
    const r = validate(id) as { errs: string[] };
    expect(r.errs).toEqual([]);
  });
  it('birleştirilmiş içerikte bilimsel veri (yıl, DOI, URL, citation, durum, kimlik) Türkçe kaynakla aynı kalır', () => {
    const tr = normalizeContent(chapters);
    for (const ch of tr.chapters) {
      const en = normalizeDetail(mergeDetail(split.details.get(ch.id) as never, overlays.get(ch.id) as ChapterOverlay), ch.id);
      expect(en.experiments.map((e) => e.id)).toEqual(ch.experiments.map((e) => e.id));
      ch.experiments.forEach((e, i) => {
        const x = en.experiments[i];
        expect(x.year, e.id).toBe(e.year);
        expect(x.sources, e.id).toEqual(e.sources);
        expect(x.replication?.status, e.id).toBe(e.replication?.status);
        expect(x.simulatable, e.id).toBe(e.simulatable);
        expect(x.replication?.refs.length, e.id).toBe(e.replication?.refs.length);
        expect(x.name, `${e.id} adı çevrilmiş olmalı`).not.toBe(e.name);
      });
      expect(en.links.map((l) => l.to)).toEqual(ch.links.map((l) => l.to));
      expect(en.keyConcepts).toHaveLength(ch.keyConcepts.length);
      expect(en.simulationIdeas).toHaveLength(ch.simulationIdeas.length);
    }
  });
  it('İngilizce üst veri: başlıklar İngilizce, zaman ölçeği katmandan, sayılar aynı', () => {
    const book = englishBook(split.book) as { titleTr: string };
    expect(book.titleTr).toBe('Behave: The Biology of Humans at Our Best and Worst');
    for (const m of split.meta) {
      const e = englishMeta(m, overlays.get(String(m.id))) as Record<string, unknown>;
      expect(e.titleTr).toBe(m.titleEn);
      expect(e.titleEn).toBe('');
      expect(e.timescaleSeconds).toBe(m.timescaleSeconds);
      if (m.timescale) expect(e.timescale).not.toBe(m.timescale);
    }
    expect(JSON.stringify(split.meta.map((m) => englishMeta(m, overlays.get(String(m.id))))).length).toBeLessThan(15_000);
  });
  it('sözlük: İngilizce metinde yasaklı varyant yok; girdiler tam', () => {
    const terms = (glossary as { terms: Array<{ tr: string; en: string; avoid: string[] }> }).terms;
    expect(terms.length).toBeGreaterThan(100);
    for (const t of terms) { expect(t.tr).toBeTruthy(); expect(t.en).toBeTruthy(); }
    const all = [...overlays.values()].map((o) => JSON.stringify(o)).join('\n').toLowerCase();
    for (const t of terms) for (const a of t.avoid) expect(all.includes(a.toLowerCase()), `yasaklı: ${a} (kullan: ${t.en})`).toBe(false);
  });
  it('_uncertain dışında katman dosyalarında sızıntı yok: "undefined", "[object", TODO', () => {
    for (const [id, o] of overlays) {
      const { _uncertain, ...rest } = o as ChapterOverlay & { _uncertain?: string[] };
      void _uncertain;
      const s = JSON.stringify(rest);
      expect(/undefined|\[object|TODO|FIXME/.test(s), id).toBe(false);
    }
  });
  it('glossary.json geçerli JSON', () => {
    expect(() => JSON.parse(readFileSync(new URL('../../content/glossary.json', import.meta.url), 'utf8'))).not.toThrow();
  });
});
