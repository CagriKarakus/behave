import { describe, expect, it } from 'vitest';
import oldDraft from '../content/__fixtures__/old-draft.json';
import newSchema from '../content/__fixtures__/new-schema.json';
import { normalizeContent } from '../content/normalize';
import { buildTimeline, formatDuration, logPosition } from './timeline';

describe('timeline', () => {
  it('log konum 0..1', () => {
    expect(logPosition(1, 0, 10)).toBe(0);
    expect(logPosition(1e5, 0, 10)).toBeCloseTo(0.5);
    expect(logPosition(1e12, 0, 10)).toBe(1);
    expect(logPosition(0.1, 0, 10)).toBe(0);
  });
  it('süre biçimi', () => {
    expect(formatDuration(1)).toBe('1 sn');
    expect(formatDuration(60)).toBe('1 dk');
    expect(formatDuration(86400)).toBe('1 gün');
    expect(formatDuration(3e14)).toContain('milyon yıl');
  });
  it('eksen uçları: "1 milyon yıl" işareti ekseni genişletir, ms ölçeği sıkışmaz, yakın noktalar kayar', () => {
    const mk = (id: string, secs: number) => ({ id, kind: 'chapter' as const, number: 1, titleEn: '', titleTr: id, timescale: null, timescaleSeconds: secs, confidence: null });
    const t = buildTimeline([mk('a', 1), mk('b', 3e13)]);
    expect(t.ticks.at(-1)?.label).toBe('1 milyon yıl');
    expect(t.stops[1].pos).toBeLessThan(1); // 951 bin yıl, 1 milyon yıl işaretiyle çakışmaz
    const ms = buildTimeline([mk('a', 0.001), mk('b', 10)]);
    expect(ms.stops[0].pos).toBe(0);
    expect(ms.stops[1].pos).toBeGreaterThan(0.3);
    expect(ms.ticks[0].label).toBe('1 ms');
    const close = buildTimeline([mk('a', 1e9), mk('b', 1.2e9), mk('c', 1.4e9), mk('d', 1e13)]);
    expect(close.stops.slice(0, 3).map((s) => s.lane)).toEqual([0, 1, 2]);
  });
  it('yeni şema: duraklar sıralı, ölçeksizler gruplanır', () => {
    const t = buildTimeline(normalizeContent(newSchema).chapters);
    expect(t.stops.map((s) => s.seconds)).toEqual([1, 60]);
    expect(t.groups.map((g) => g.id)).toEqual(['cerceve', 'toplum', 'ekler']);
  });
  it('eski taslak: aynı ölçekli bölümler tek durakta, hiçbir bölüm kaybolmaz', () => {
    const c = normalizeContent(oldDraft);
    const t = buildTimeline(c.chapters);
    const n = t.stops.reduce((a, s) => a + s.chapters.length, 0) + t.groups.reduce((a, g) => a + g.chapters.length, 0);
    expect(n).toBe(c.chapters.length);
    expect(t.stops.some((s) => s.chapters.length > 1)).toBe(true);
  });
});
