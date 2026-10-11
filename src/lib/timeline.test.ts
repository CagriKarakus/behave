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
