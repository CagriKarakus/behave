import { describe, expect, it } from 'vitest';
import {
  ACES, DEFAULT_ACE, DEFAULT_MARSH, MAX_WAIT, actProb, fairness, histogram, lateLife, levelShares, makeCohort, mechanisms, pHigh, pRef,
  shift, stageDist, summarize, waits, type AceInput, type MarshInput, type Outcome,
} from './model';

const cohort = makeCohort(7, 4000);
const sum = (inp: MarshInput) => summarize(waits(cohort, inp));
const OUTS: Outcome[] = ['dep', 'imp', 'str'];

describe('marshmallow (ch07-e5)', () => {
  it('taban durumda yaklaşık üçte biri 15 dakikayı tamamlar, ortalama ~11 dk', () => {
    const s = sum(DEFAULT_MARSH);
    expect(s.completed).toBeGreaterThan(0.28);
    expect(s.completed).toBeLessThan(0.39);
    expect(s.meanMin).toBeGreaterThan(10);
    expect(s.meanMin).toBeLessThan(12);
    expect(s.ateEarly).toBeGreaterThan(0.005);
    expect(s.ateEarly).toBeLessThan(0.12);
  });
  it('soğuk düşünme ve gözleri kapatma uzatır, sıcak düşünme kısaltır', () => {
    const base = sum(DEFAULT_MARSH).meanMin;
    expect(sum({ ...DEFAULT_MARSH, strategy: 'cold' }).meanMin).toBeGreaterThan(sum({ ...DEFAULT_MARSH, strategy: 'eyes' }).meanMin);
    expect(sum({ ...DEFAULT_MARSH, strategy: 'eyes' }).meanMin).toBeGreaterThan(base);
    expect(sum({ ...DEFAULT_MARSH, strategy: 'hot' }).meanMin).toBeLessThan(base);
  });
  it('güvensiz deneyci beklemeyi kısaltır; yaş uzatır', () => {
    expect(sum({ ...DEFAULT_MARSH, trust: false }).meanMin).toBeLessThan(sum(DEFAULT_MARSH).meanMin - 1);
    expect(sum({ ...DEFAULT_MARSH, age: 3 }).meanMin).toBeLessThan(sum({ ...DEFAULT_MARSH, age: 6 }).meanMin);
  });
  it('bekleme 0..15 dk ile sınırlı; histogram toplamı n', () => {
    const w = waits(cohort, DEFAULT_MARSH);
    expect(Math.max(...w)).toBeLessThanOrEqual(MAX_WAIT);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(0);
    expect(histogram(w).reduce((a, b) => a + b, 0)).toBe(w.length);
  });
  it('aynı tohum aynı grup', () => {
    expect(makeCohort(3, 10)).toEqual(makeCohort(3, 10));
    expect(makeCohort(3, 10)).not.toEqual(makeCohort(4, 10));
  });
  it('Watts 2018 deseni: ham ilişki belirgin, aile geçmişi kontrol edilince büyük ölçüde kaybolur', () => {
    const l = lateLife(cohort, waits(cohort, DEFAULT_MARSH));
    expect(l.rawR).toBeGreaterThan(0.2);
    expect(Math.abs(l.ctrlR)).toBeLessThan(l.rawR / 2);
    expect(l.ctrlR).toBeGreaterThan(0);
  });
});

describe('çocukluk adversitesi (ch07 kavramları)', () => {
  const at = (p: Partial<AceInput>): AceInput => ({ ...DEFAULT_ACE, ...p });
  it('referans durumda kayma 0, yüksek eğilim payı referansa eşit', () => {
    for (const o of OUTS) { expect(shift(o, DEFAULT_ACE)).toBeCloseTo(0, 9); expect(pHigh(o, DEFAULT_ACE)).toBeCloseTo(pRef, 9); }
  });
  it('doz-yanıt: deneyim sayısı arttıkça risk tek yönlü artar, ama hiçbir zaman kesin değildir', () => {
    for (const o of OUTS) {
      let prev = -1;
      for (let n = 0; n <= ACES.length; n++) {
        const p = pHigh(o, at({ n }));
        expect(p).toBeGreaterThan(prev);
        prev = p;
      }
      expect(prev).toBeLessThan(0.95);
      expect(pHigh(o, at({ n: 10 }))).toBeGreaterThan(pHigh(o, at({ n: 10, intensity: 0.6 })));
    }
  });
  it('koruyucu etkenler eğriyi düzleştirir', () => {
    for (const o of OUTS) {
      const slope = (a: Partial<AceInput>) => pHigh(o, at({ ...a, n: 8 })) - pHigh(o, at({ ...a, n: 0 }));
      expect(slope({ attach: 1, adult: 1, ses: 0.8 })).toBeLessThan(slope({}));
      expect(pHigh(o, at({ n: 6, attach: 1 }))).toBeLessThan(pHigh(o, at({ n: 6 })));
      expect(pHigh(o, at({ n: 6, adult: 1 }))).toBeLessThan(pHigh(o, at({ n: 6 })));
    }
  });
  it('düşük SES dürtü kontrolü ve stres tepkisini adversite olmadan da artırır (Farah/Boyce)', () => {
    expect(pHigh('imp', at({ ses: 0 }))).toBeGreaterThan(pHigh('imp', at({ ses: 0.5 })));
    expect(pHigh('str', at({ ses: 0 }))).toBeGreaterThan(pHigh('str', at({ ses: 1 })));
    expect(mechanisms(at({ ses: 0 })).frontal).toBeLessThan(mechanisms(at({ ses: 1 })).frontal);
  });
  it('anne ilgisi (güvenli bağlanma) glukokortikoid tepkisini en çok stres sonucunda azaltır (Meaney)', () => {
    const d = (o: Outcome) => pHigh(o, at({ attach: 0 })) - pHigh(o, at({ attach: 1 }));
    expect(d('str')).toBeGreaterThan(d('dep'));
    expect(mechanisms(at({ attach: 1 })).gc).toBeLessThan(mechanisms(at({ attach: 0 })).gc);
  });
  it('Romanya: kurumda kalış uzadıkça kötüleşir; amigdala yalnız kurumla büyür', () => {
    const p = (m: number) => pHigh('dep', at({ instMonths: m }));
    expect(p(6)).toBeGreaterThan(p(0));
    expect(p(30)).toBeGreaterThan(p(6));
    expect(mechanisms(at({ instMonths: 30 })).amy).toBeGreaterThan(mechanisms(at({ n: 6 })).amy);
  });
});

describe('Kohlberg (ch07-e4) ve Blake (ch07-e3)', () => {
  it('dağılım toplamı 1', () => {
    for (const a of [5, 9, 16, 40]) expect(stageDist(a).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 9);
  });
  it('küçük çocuklar çoğunlukla gelenek öncesi, ergen ve yetişkinler çoğunlukla geleneksel', () => {
    expect(levelShares(stageDist(6))[0]).toBeGreaterThan(0.6);
    expect(levelShares(stageDist(8))[0]).toBeGreaterThan(0.5);
    for (const a of [16, 25, 40]) expect(levelShares(stageDist(a))[1]).toBeGreaterThan(0.6);
  });
  it('5-6. aşamada tutarlı neredeyse kimse yok', () => {
    for (const a of [20, 30, 50, 70]) expect(levelShares(stageDist(a))[2]).toBeLessThan(0.07);
  });
  it('akıl yürütme düzeyi eylemi zayıf öngörür: aşama etkisi bağlam baskısından çok küçük', () => {
    const stageEffect = actProb(6, 0.3) - actProb(1, 0.3);
    const ctxEffect = actProb(3, 0.1) - actProb(3, 0.9);
    expect(stageEffect).toBeGreaterThan(0);
    expect(stageEffect).toBeLessThan(0.2);
    expect(ctxEffect).toBeGreaterThan(stageEffect * 2);
  });
  it('Blake: kendi aleyhine tepki erken ve her toplumda; başkası aleyhine olan geç ve yalnız bazılarında', () => {
    expect(fairness(7, 'none').self).toBeGreaterThan(fairness(4, 'none').self);
    expect(fairness(7, 'none').other).toBeLessThan(0.1);
    expect(fairness(7, 'late').other).toBeLessThan(0.15);
    expect(fairness(13, 'late').other).toBeGreaterThan(0.4);
    expect(fairness(13, 'none').other).toBeLessThan(0.1);
  });
});
