import { describe, expect, it } from 'vitest';
import {
  GENEROSITY, INFO, KINS, MIXES, NICE, PAY, STRATS, clamp, criticalR, describeEvolution, describeKin, describeMatch,
  expectedKin, expectedPlay, finitePopulation, hamilton, leader, matchStats, mulberry32, normalize, payoff, payoffMatrix,
  playMatch, pCoop, replicateKin, replicator, roundRobin, simulateKin, type StratId,
} from './model';

const ix = (id: StratId) => STRATS.indexOf(id);
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

describe('Tutsak ikilemi temelleri', () => {
  it('getiriler geçerli bir tutsak ikilemi kurar (Axelrod: 5/3/1/0)', () => {
    expect(PAY).toEqual({ T: 5, R: 3, P: 1, S: 0 });
    expect(PAY.T).toBeGreaterThan(PAY.R); expect(PAY.R).toBeGreaterThan(PAY.P); expect(PAY.P).toBeGreaterThan(PAY.S);
    expect(2 * PAY.R).toBeGreaterThan(PAY.T + PAY.S);
    expect(payoff(1, 1)).toBe(3); expect(payoff(0, 1)).toBe(5); expect(payoff(0, 0)).toBe(1); expect(payoff(1, 0)).toBe(0);
  });

  it('tohumlu RNG deterministiktir', () => {
    const a = mulberry32(7), b = mulberry32(7), c = mulberry32(8);
    const sa = [a(), a(), a()], sb = [b(), b(), b()];
    expect(sa).toEqual(sb);
    expect(c()).not.toBe(sa[0]);
    expect(playMatch('tft', 'gtft', 40, 0.1, mulberry32(3))).toEqual(playMatch('tft', 'gtft', 40, 0.1, mulberry32(3)));
  });

  it('strateji kuralları', () => {
    const v = (o: Partial<{ first: boolean; me: 0 | 1; opp: 0 | 1; sMe: 0 | 1; sOpp: 0 | 1 }>) => ({ first: false, me: 1 as const, opp: 1 as const, sMe: 1 as const, sOpp: 1 as const, ...o });
    expect(pCoop('tft', v({ first: true, opp: 0 }))).toBe(1);
    expect(pCoop('tft', v({ opp: 0 }))).toBe(0);
    expect(pCoop('tft', v({ opp: 1 }))).toBe(1);
    expect(pCoop('gtft', v({ opp: 0 }))).toBeCloseTo(GENEROSITY);
    expect(GENEROSITY).toBeCloseTo(Math.min(1 - (PAY.T - PAY.R) / (PAY.R - PAY.S), (PAY.R - PAY.P) / (PAY.T - PAY.P)));
    // Pavlov: CC -> C, DC -> D (kazandı, kal), CD -> D (kaybetti, değiş), DD -> C (kaybetti, değiş)
    expect(pCoop('pavlov', v({ me: 1, opp: 1 }))).toBe(1);
    expect(pCoop('pavlov', v({ me: 0, opp: 1 }))).toBe(0);
    expect(pCoop('pavlov', v({ me: 1, opp: 0 }))).toBe(0);
    expect(pCoop('pavlov', v({ me: 0, opp: 0 }))).toBe(1);
    // Pişman TfT: kötü durumdaysa işbirliği; rakip kötü durumdaysa misilleme
    expect(pCoop('ctft', v({ sMe: 0, opp: 0 }))).toBe(1);
    expect(pCoop('ctft', v({ sOpp: 0, opp: 0 }))).toBe(0);
    expect(pCoop('ctft', v({ sOpp: 1, opp: 0 }))).toBe(1);
    expect(pCoop('allc', v({}))).toBe(1); expect(pCoop('alld', v({}))).toBe(0); expect(pCoop('random', v({}))).toBe(0.5);
  });

  it('hatasız eşleşmeler: TfT, ihanetçiye yalnızca ilk turda kandırılır', () => {
    const m = playMatch('tft', 'alld', 20, 0, mulberry32(1));
    expect(m.ma[0]).toBe(1); expect(m.ma.slice(1).every((x) => x === 0)).toBe(true);
    expect(m.scoreA).toBe(19 * PAY.P); expect(m.scoreB).toBe(PAY.T + 19 * PAY.P);
    const same = playMatch('tft', 'tft', 20, 0, mulberry32(1));
    expect(same.scoreA).toBe(20 * PAY.R);
    expect(matchStats(same).errors).toBe(0);
  });
});

describe('Beklenen getiri (Markov) ile simülasyon tutarlı', () => {
  it('ortalama tek eşleşme beklenene yakın; hatasız zincir de aynı', () => {
    for (const [a, b, e] of [['tft', 'gtft', 0.1], ['pavlov', 'ctft', 0.05], ['random', 'tft', 0]] as const) {
      const exp = expectedPlay(a, b, 60, e);
      const sims = Array.from({ length: 400 }, (_, k) => playMatch(a, b, 60, e, mulberry32(k + 1)));
      expect(Math.abs(mean(sims.map((m) => m.scoreA / 60)) - exp.a)).toBeLessThan(0.12);
      expect(Math.abs(mean(sims.map((m) => m.scoreB / 60)) - exp.b)).toBeLessThan(0.12);
    }
    expect(expectedPlay('tft', 'tft', 30, 0).a).toBeCloseTo(3);
    expect(expectedPlay('alld', 'allc', 30, 0).a).toBeCloseTo(5);
  });
});

describe('Kalibrasyon: Axelrod turnuvası (ch10-e6)', () => {
  const M0 = payoffMatrix(200, 0);

  it('TfT hiçbir rakibi tek tek yenmez ama toplamda en iyiler arasındadır', () => {
    const t = ix('tft');
    for (let j = 0; j < STRATS.length; j++) expect(M0[t][j]).toBeLessThanOrEqual(M0[j][t] + 1e-9);
    const rr = roundRobin(M0);
    for (const id of ['allc', 'alld', 'random', 'pavlov', 'gtft'] as StratId[]) expect(rr[t]).toBeGreaterThan(rr[ix(id)]);
    expect(rr[t]).toBeGreaterThanOrEqual(Math.max(...rr) - 1e-9);
  });

  it('hatasız evrimde ihanet söner, karşılık verenler yayılır', () => {
    const ev = replicator(M0, MIXES[0].x, 80);
    const end = ev[80];
    expect(end[ix('alld')]).toBeLessThan(0.01);
    expect(NICE.reduce((s, id) => s + end[ix(id)], 0)).toBeGreaterThan(0.7);
    // ihanet önce yükselebilir (saf iyileri sömürür), sonra düşer
    expect(Math.max(...ev.map((x) => x[ix('alld')]))).toBeGreaterThan(ev[80][ix('alld')]);
  });

  it('gelecek gölgesi kısaysa ihanet kazanır', () => {
    const M1 = payoffMatrix(1, 0);
    expect(leader(replicator(M1, MIXES[0].x, 120)[120])).toBe('alld');
  });

  it('sinyal hatasında TfT çifti tutsak kalır; pişman, affedici ve Pavlov çiftleri daha iyi', () => {
    const e = 0.05;
    const self = (id: StratId) => expectedPlay(id, id, 200, e).a;
    expect(self('tft')).toBeLessThan(self('gtft'));
    expect(self('tft')).toBeLessThan(self('ctft'));
    expect(self('tft')).toBeLessThan(self('pavlov'));
    expect(self('tft')).toBeLessThan(PAY.R - 0.25);
    expect(self('ctft')).toBeGreaterThan(PAY.R - 0.2);
  });

  it('sinyal hatasında evrim: pişman ve affedici TfT, saf TfT\'yi geçer', () => {
    const Me = payoffMatrix(200, 0.05);
    const end = replicator(Me, MIXES[0].x, 80)[80];
    expect(end[ix('tft')]).toBeLessThan(end[ix('ctft')]);
    expect(end[ix('tft')]).toBeLessThan(end[ix('gtft')]);
    expect(end[ix('ctft')] + end[ix('gtft')]).toBeGreaterThan(0.8);
    expect(end[ix('alld')]).toBeLessThan(0.01);
  });

  it('tek hata TfT çiftini intikam döngüsüne kilitler; pişman TfT iki turda toparlar (tur adımı için sabit tohum)', () => {
    const t = matchStats(playMatch('tft', 'tft', 40, 0.04, mulberry32(16)));
    expect(t.errors).toBe(1);
    expect(t.firstError).toBeLessThanOrEqual(5);
    expect(t.recoveredAt).toBe(0);
    expect(t.brokenRounds).toBeGreaterThan(30);
    const c = matchStats(playMatch('ctft', 'ctft', 40, 0.04, mulberry32(16)));
    expect(c.firstError).toBe(t.firstError);
    expect(c.recoveredAt).toBeGreaterThan(0);
    expect(c.brokenRounds).toBeLessThanOrEqual(3);
  });
});

describe('Evrimsel dinamik ve açıklamalar', () => {
  const Me = payoffMatrix(100, 0.02);
  it('kopyalayıcı: paylar toplamı 1, sonlu nüfus aynı tohumla aynı', () => {
    const ev = replicator(Me, MIXES[1].x, 30);
    for (const x of ev) expect(x.reduce((s, v) => s + v, 0)).toBeCloseTo(1);
    const a = finitePopulation(Me, MIXES[0].x, 40, 400, mulberry32(5)), b = finitePopulation(Me, MIXES[0].x, 40, 400, mulberry32(5));
    expect(a).toEqual(b);
    expect(a[40].reduce((s, v) => s + v, 0)).toBeCloseTo(1);
    const c = finitePopulation(Me, MIXES[0].x, 40, 400, mulberry32(6));
    expect(c).not.toEqual(a);
  });
  it('hazır karışımlar ve yardımcılar', () => {
    for (const m of MIXES) { expect(m.x).toHaveLength(STRATS.length); expect(m.x.reduce((s, v) => s + v, 0)).toBeGreaterThan(99); }
    expect(normalize([2, 2])).toEqual([0.5, 0.5]);
    expect(normalize([0, 0])).toEqual([0.5, 0.5]);
    expect(clamp(5, 0, 1)).toBe(1);
    for (const id of STRATS) expect(INFO[id].id).toBe(id);
  });
  it('açıklamalar', () => {
    const m = playMatch('tft', 'tft', 40, 0.04, mulberry32(16));
    expect(describeMatch(m)).toContain('işbirliği bir daha oturmadı');
    expect(describeMatch(playMatch('tft', 'tft', 10, 0, mulberry32(1)))).toContain('Hata yok');
    const c = playMatch('ctft', 'ctft', 40, 0.04, mulberry32(16));
    expect(describeMatch(c)).toContain('geri döndü');
    const x0 = MIXES[0].x.map((v) => v / 100);
    const end = replicator(payoffMatrix(200, 0), x0, 60)[60];
    expect(describeEvolution(x0, end, 60)).toContain('karşılık veren');
  });
});

describe('Akraba seçilimi: Hamilton kuralı (r·B > C)', () => {
  const base = { p0: 0.1, size: 400, gens: 120 };
  it('akrabalık katsayıları ve eşik', () => {
    const r = (id: string) => KINS.find((k) => k.id === id)!.r;
    expect(r('kardes')).toBe(0.5); expect(r('yarim')).toBe(0.25); expect(r('kuzen')).toBe(0.125); expect(r('yabanci')).toBe(0);
    expect(hamilton(0.5, 0.8, 0.3)).toBeCloseTo(0.1);
    expect(hamilton(0.125, 0.8, 0.3)).toBeLessThan(0);
    expect(criticalR(0.8, 0.2)).toBeCloseTo(0.25);
    expect(criticalR(0, 0.2)).toBe(Infinity);
  });
  it('rB > C iken gen yayılır, rB < C iken söner (kardeş yayılır, kuzen yayılmaz)', () => {
    const win = replicateKin({ ...base, r: 0.5, B: 0.8, C: 0.3 }, 3, 6);
    expect(mean(win.map((x) => x.freq[base.gens]))).toBeGreaterThan(0.9);
    const lose = replicateKin({ ...base, r: 0.125, B: 0.8, C: 0.3 }, 3, 6);
    expect(mean(lose.map((x) => x.freq[base.gens]))).toBeLessThan(0.05);
    const stranger = replicateKin({ ...base, r: 0, B: 0.8, C: 0.05 }, 3, 6);
    expect(mean(stranger.map((x) => x.freq[base.gens]))).toBeLessThan(0.1);
  });
  it('simülasyon beklenen eğriye yakın; eşikte (rB = C) sürüklenme belirleyicidir', () => {
    const P = { ...base, r: 0.5, B: 0.5, C: 0.15, gens: 40 };
    const sims = replicateKin(P, 11, 8);
    const exp = expectedKin(P);
    expect(Math.abs(mean(sims.map((s) => s.freq[40])) - exp[40])).toBeLessThan(0.1);
    expect(exp[40]).toBeGreaterThan(exp[0]);
    const flat = expectedKin({ ...base, r: 0.25, B: 0.8, C: 0.2 });
    expect(flat[120]).toBeCloseTo(flat[0], 6);
  });
  it('aynı tohum aynı sonuç; açıklama', () => {
    const P = { ...base, r: 0.5, B: 0.8, C: 0.3 };
    expect(simulateKin(P, mulberry32(4))).toEqual(simulateKin(P, mulberry32(4)));
    expect(simulateKin(P, mulberry32(4)).freq).toHaveLength(base.gens + 1);
    expect(describeKin(KINS[0], 0.8, 0.3, 0.97, 0.1)).toContain('yayılır');
    expect(describeKin(KINS[4], 0.8, 0.3, 0.0, 0.1)).toContain('yayılmaz');
  });
});
