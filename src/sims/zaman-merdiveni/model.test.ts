import { describe, expect, it } from 'vitest';
import { BEHAVIORS, EXAMPLES, LINKS, RUNGS } from './data';
import { clampDepth, compare, describeCat, describeLadder, edges, ladderStats, linksOf, perceive, segIndex, segments, sweep, type CatParams } from './model';

const P: CatParams = { lo: 0, hi: 100, n: 4, delta: 6, offset: 0, strength: 0.5 };
const fmt = (v: number): string => v.toFixed(1).replace('.', ',');

describe('Merdiven verisi', () => {
  it('dokuz basamak, her bölüm ch02-ch10, zaman sırası yukarıdan aşağıya', () => {
    expect(RUNGS.map((r) => r.ch)).toEqual(['ch02', 'ch03', 'ch04', 'ch05', 'ch06', 'ch07', 'ch08', 'ch09', 'ch10']);
  });
  it('üç davranışın her biri dokuz karta sahip', () => {
    expect(BEHAVIORS).toHaveLength(3);
    for (const b of BEHAVIORS) {
      expect(b.cards).toHaveLength(RUNGS.length);
      for (const c of b.cards) { expect(c.title.length).toBeGreaterThan(3); expect(c.text.length).toBeLessThan(260); }
    }
  });
  it('bağlar derin basamaktan yakın basamağa gider', () => {
    for (const l of LINKS) { expect(l.from).toBeGreaterThan(l.to); expect(l.from).toBeLessThan(RUNGS.length); }
  });
  it('stres hormonu → amigdala bağı (saatler-günler → bir saniye önce) var', () => {
    expect(LINKS.some((l) => l.from === 2 && l.to === 0)).toBe(true);
  });
});

describe('Merdiven modeli', () => {
  it('tüm merdivende hiçbir bağ kopmaz', () => {
    const s = ladderStats(9);
    expect(s.cut).toBe(0);
    expect(s.seen).toBe(LINKS.length);
    expect(s.hidden).toBe(0);
  });
  it('yalnızca bir saniyeye bakınca hiçbir bağ görünmez', () => {
    const s = ladderStats(1);
    expect(s.seen).toBe(0);
    expect(s.cut).toBe(LINKS.length);
    expect(s.hidden).toBe(8);
  });
  it('daha geriye bakmak görünen bağları azaltmaz', () => {
    let prev = -1;
    for (let d = 1; d <= 9; d++) { const s = ladderStats(d); expect(s.seen).toBeGreaterThanOrEqual(prev); expect(s.seen + s.cut).toBe(s.total); prev = s.seen; }
  });
  it('derinlik sınırlanır', () => {
    expect(clampDepth(0)).toBe(1);
    expect(clampDepth(99)).toBe(9);
  });
  it('linksOf giren ve çıkan bağları verir', () => {
    expect(linksOf(0).out).toHaveLength(0);
    expect(linksOf(0).into.length).toBeGreaterThan(2);
    expect(linksOf(8).into).toHaveLength(0);
  });
  it('açıklama durumu anlatır', () => {
    expect(describeLadder('Birine vurmak', 1, null)).toContain('yalnızca bir saniye öncesine');
    expect(describeLadder('Birine vurmak', 9, null)).toContain('tüm merdiven');
    expect(describeLadder('Birine vurmak', 9, 2)).toContain('Saatler-günler');
    expect(describeLadder('Birine vurmak', 3, 6)).toContain('dışarıda');
  });
});

describe('Kategori sınırı modeli', () => {
  it('kategorileme gücü 0 iken algı gerçeğe eşittir', () => {
    const c = compare({ ...P, strength: 0 });
    expect(c.bias).toBeCloseTo(0, 10);
    expect(c.ratio).toBeCloseTo(1, 10);
  });
  it('kutular eşit genişlikte ve sınır çiftin ortasındadır', () => {
    expect(widthOfEdges()).toEqual([25, 50, 75]);
    expect(segments(P)).toEqual([[0, 25], [25, 50], [50, 75], [75, 100]]);
  });
  it('aynı kutudaki çift gerçeğin (1 - güç) katı kadar uzak görünür', () => {
    const c = compare({ ...P, offset: 10 });
    expect(c.straddles).toBe(false);
    expect(c.perceived).toBeCloseTo((1 - P.strength) * P.delta, 10);
  });
  it('sınırın iki yanındaki çift gerçekten uzak görünür', () => {
    const c = compare(P);
    expect(c.straddles).toBe(true);
    expect(c.perceived).toBeCloseTo(15.5, 10);
    expect(c.ratio).toBeGreaterThan(2);
  });
  it('aynı gerçek fark: sınırda algılanan fark kutu içindekinden çok büyüktür', () => {
    const across = compare(P).perceived;
    const within = compare({ ...P, offset: 10 }).perceived;
    expect(across / within).toBeGreaterThan(4);
  });
  it('güç arttıkça sınırdaki sapma artar, kutu içindeki sapma negatif kalır', () => {
    let prevA = -Infinity, prevW = Infinity;
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      const a = compare({ ...P, strength: s }).bias, w = compare({ ...P, strength: s, offset: 10 }).bias;
      expect(a).toBeGreaterThanOrEqual(prevA);
      expect(w).toBeLessThanOrEqual(prevW);
      prevA = a; prevW = w;
    }
  });
  it('güç 1 iken kutu içindeki her değer aynı görünür', () => {
    expect(compare({ ...P, strength: 1, offset: 10 }).perceived).toBeCloseTo(0, 10);
    expect(perceive({ ...P, strength: 1 }, 30)).toBeCloseTo(37.5, 10);
  });
  it('sınırdaki değer üst kutuya sayılır', () => {
    expect(segIndex([25, 50, 75], 50)).toBe(2);
    expect(segIndex([25, 50, 75], 49.9)).toBe(1);
  });
  it('sweep: yalnızca sınır çiftin arasındayken tepe yapar', () => {
    const s = sweep(P, 61);
    const peak = Math.max(...s.map((x) => x.perceived));
    const base = (1 - P.strength) * P.delta;
    const inPeak = s.filter((x) => x.perceived > base + 1e-9);
    expect(peak).toBeCloseTo(15.5, 6);
    expect(inPeak.length).toBeGreaterThan(0);
    for (const x of inPeak) expect(Math.abs(x.offset)).toBeLessThan(P.delta / 2 + 1e-9);
  });
  it('örnekler tutarlı: sınır konumu ve varsayılan fark geçerli', () => {
    for (const e of EXAMPLES) {
      const p: CatParams = { lo: e.lo, hi: e.hi, n: e.boxes, delta: e.delta, offset: 0, strength: 0.5 };
      expect(compare(p).straddles).toBe(true);
      expect(edges(p).length).toBe(e.boxes - 1);
      expect(e.maxDelta).toBeGreaterThan(e.delta);
    }
  });
  it('açıklama durumu söyler', () => {
    expect(describeCat(P, 'puan', fmt)).toContain('sınır ikisinin arasında');
    expect(describeCat({ ...P, offset: 10 }, 'puan', fmt)).toContain('aynı kutuda');
    expect(describeCat({ ...P, strength: 0 }, 'puan', fmt)).toContain('Kategori yok');
  });
});

function widthOfEdges(): number[] { return edges(P); }
