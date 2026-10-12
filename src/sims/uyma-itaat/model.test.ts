import { mulberry32 } from '../rng';
import { describe, expect, it } from 'vitest';
import {
  ASCH, ASCH_DEFAULT, MIL_DEFAULT, aschCurve, aschProb, aschTrial, describeAsch, describeMilgram, milExpected,
  simulateAsch, simulateMilgram, stillGoing, strain, LEVELS, phi,
} from './model';

describe('Asch', () => {
  it('tek başına (çoğunluk yok) hata ~%1; oybirlikli 7 kişide ~üçte bir', () => {
    expect(aschProb({ ...ASCH_DEFAULT, n: 0 })).toBeCloseTo(0.01, 3);
    expect(aschProb(ASCH_DEFAULT)).toBeGreaterThan(0.31);
    expect(aschProb(ASCH_DEFAULT)).toBeLessThan(0.35);
  });
  it('eğri 3 kişide belirginleşir, ~6 kişide doyar', () => {
    const c = aschCurve(ASCH_DEFAULT);
    expect(c[0]).toBeLessThan(c[1]);
    expect(c[1]).toBeLessThan(c[2]);
    expect(c[2] - c[0]).toBeGreaterThan(0.1);
    expect(c[5]).toBeGreaterThan(0.95 * c[14]);
    expect(c[14] - c[5]).toBeLessThan(0.02);
    expect(c[6] - c[5]).toBeLessThan(c[2] - c[1]);
  });
  it('müttefik, gizli cevap ve kolay çizgi uymayı düşürür', () => {
    const base = aschProb(ASCH_DEFAULT);
    expect(aschProb({ ...ASCH_DEFAULT, ally: true })).toBeLessThan(base * 0.4);
    expect(aschProb({ ...ASCH_DEFAULT, open: false })).toBeLessThan(base * 0.5);
    expect(aschProb({ ...ASCH_DEFAULT, easy: 1 })).toBeLessThan(base);
    expect(aschProb({ ...ASCH_DEFAULT, easy: 0 })).toBeGreaterThan(base);
  });
  it('kohort tohumlu ve deterministik; oran modele yakın', () => {
    const a = simulateAsch(ASCH_DEFAULT, 5), b = simulateAsch(ASCH_DEFAULT, 5);
    expect(a).toEqual(b);
    expect(a.counts.reduce((s, x) => s + x, 0)).toBe(ASCH.subjects);
    const big = simulateAsch(ASCH_DEFAULT, 1, 4000);
    expect(Math.abs(big.rate - big.p)).toBeLessThan(0.02);
    expect(big.rate).toBeGreaterThan(0.29);
    expect(big.rate).toBeLessThan(0.37);
  });
  it('deneme: müttefik doğruyu söyler, ortaklar aynı yanlışı', () => {
    const t = aschTrial({ ...ASCH_DEFAULT, n: 5, ally: true }, mulberry32(3));
    expect(t.speakers).toHaveLength(6);
    expect(t.speakers.filter((s) => s.ally)).toHaveLength(1);
    expect(t.speakers.find((s) => s.ally)!.pick).toBe(t.correct);
    expect(new Set(t.speakers.filter((s) => !s.ally).map((s) => s.pick))).toEqual(new Set([t.wrong]));
    expect(t.wrong).not.toBe(t.correct);
  });
  it('açıklama üretir', () => {
    expect(describeAsch(ASCH_DEFAULT, simulateAsch(ASCH_DEFAULT, 1))).toMatch(/yanlışa uyuluyor/);
  });
});

describe('Milgram', () => {
  it('zorlanma basamakla artar ve son basamakta 0', () => {
    for (let k = 2; k <= LEVELS; k++) expect(strain(k)).toBeGreaterThanOrEqual(strain(k - 1));
    expect(strain(LEVELS)).toBeCloseTo(0, 6);
    expect(phi(0.3853)).toBeCloseTo(0.65, 3);
  });
  it('temel koşul ~%65', () => {
    expect(milExpected(MIL_DEFAULT)).toBeCloseTo(0.65, 2);
    const big = simulateMilgram(MIL_DEFAULT, 2, 6000);
    expect(big.full).toBeGreaterThan(0.62);
    expect(big.full).toBeLessThan(0.68);
    const r = simulateMilgram(MIL_DEFAULT, 11);
    expect(r.full).toBeGreaterThan(0.55);
    expect(r.full).toBeLessThan(0.75);
  });
  it('uzak otorite, sıradan büro, yakın öğrenci, akran direnişi itaati düşürür; sorumluluk dağılımı artırır', () => {
    const e = milExpected;
    expect(e({ ...MIL_DEFAULT, authority: 0 })).toBeLessThan(0.4);
    expect(e({ ...MIL_DEFAULT, prestige: 0 })).toBeLessThan(0.65);
    expect(e({ ...MIL_DEFAULT, learner: 1 })).toBeLessThan(e(MIL_DEFAULT));
    expect(e({ ...MIL_DEFAULT, learner: 2 })).toBeLessThan(e({ ...MIL_DEFAULT, learner: 1 }));
    expect(e({ ...MIL_DEFAULT, peer: true })).toBeLessThan(0.3);
    expect(e({ ...MIL_DEFAULT, diffused: true })).toBeGreaterThan(0.8);
  });
  it('bırakma noktaları: dağılım toplamı tutar, sıralı, sıçrama basamaklarında kümelenir', () => {
    const r = simulateMilgram({ ...MIL_DEFAULT, learner: 2 }, 4, 3000);
    expect(r.hist.reduce((s, x) => s + x, 0)).toBe(3000);
    expect(stillGoing(r, 0)).toBe(1);
    expect(stillGoing(r, 10)).toBeGreaterThanOrEqual(stillGoing(r, 20));
    expect(r.hist[9]).toBeGreaterThan(r.hist[8]);
  });
  it('deterministik ve açıklama üretir', () => {
    expect(simulateMilgram(MIL_DEFAULT, 9)).toEqual(simulateMilgram(MIL_DEFAULT, 9));
    expect(describeMilgram(MIL_DEFAULT, simulateMilgram(MIL_DEFAULT, 9))).toMatch(/450 V/);
  });
});
