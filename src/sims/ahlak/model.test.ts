import { mulberry32 } from '../rng';
import { describe, expect, it } from 'vitest';
import {
  BIG_MARKET, BOOK, FACES, HADZA, MIXES, PG, PROFILES, SCENARIOS, antiFraction, antiShare, avgContribution, bestOffer, bestOf,
  deviation, dictatorOffer, dimsOf, expectedDist, expectedPay, honestDist, justifiedDist, liarDist, makeAgents, normMix,
  pReject, profile, rejectThreshold, sampleByType, sampleReports, scenarioP, simulate, systems, totals, type Society,
} from './model';

const sc = (id: string) => SCENARIOS.find((s) => s.id === id)!;
const p = (id: string, saved = 5) => scenarioP(sc(id), saved);
const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('trolley (ch13-e4)', () => {
  it('anahtar ve döngü kitaptaki %60-70 aralığında', () => {
    expect(p('anahtar')).toBeGreaterThanOrEqual(0.6); expect(p('anahtar')).toBeLessThanOrEqual(0.7);
    expect(p('dongu')).toBeGreaterThanOrEqual(0.6); expect(p('dongu')).toBeLessThanOrEqual(0.7);
  });
  it('elle itme ~%30, kazara itme ~%80', () => {
    expect(p('kopru')).toBeCloseTo(0.3, 2);
    expect(p('kazara')).toBeCloseTo(0.8, 2);
  });
  it('sopa direnci azaltmaz: itmeyle yakın ve anahtardan çok düşük', () => {
    expect(Math.abs(p('sopa') - p('kopru'))).toBeLessThan(0.08);
    expect(p('sopa')).toBeLessThan(p('anahtar') - 0.25);
  });
  it('kişisel güç etkisi: itme anahtardan, kazara itme anahtardan yüksek', () => {
    expect(p('kopru')).toBeLessThan(p('anahtar'));
    expect(p('kazara')).toBeGreaterThan(p('anahtar'));
  });
  it('döngüde tutarlı niyet kuralı yaklaşık %30 bekletir; sezgi bunu görmez', () => {
    const s = systems(dimsOf(sc('dongu')));
    expect(s.pConsistent).toBeGreaterThan(0.25); expect(s.pConsistent).toBeLessThan(0.4);
    expect(Math.abs(s.pConsistent - BOOK.loopLogical)).toBeLessThan(0.1);
    expect(s.pYes - s.pConsistent).toBeGreaterThan(0.25);
    expect(systems(dimsOf(sc('kopru'))).pConsistent).toBeCloseTo(p('kopru'), 6);
  });
  it('kurtarılan sayısı arttıkça evet artar; sıcak alarm değişmez', () => {
    const a = systems({ ...dimsOf(sc('kopru')), saved: 3 }), b = systems({ ...dimsOf(sc('kopru')), saved: 30 });
    expect(b.pYes).toBeGreaterThan(a.pYes);
    expect(b.hot).toBeCloseTo(a.hot, 9);
    expect(b.cold).toBeGreaterThan(a.cold);
  });
  it('boyutlar tek tek: güç x araç etkileşimi var, güç tek başına etkisiz', () => {
    const base = { prox: 0 as const, saved: 5 };
    const noMeans = systems({ ...base, force: 1, intent: 'yan' }).pYes;
    const loop = systems({ ...base, force: 0, intent: 'arac' }).pYes;
    const push = systems({ ...base, force: 1, intent: 'arac' }).pYes;
    expect(noMeans).toBeCloseTo(loop, 6);
    expect(push).toBeLessThan(loop - 0.25);
  });
  it('profil sınıflaması', () => {
    expect(profile({})).toBe('bekliyor');
    const all = (v: boolean) => Object.fromEntries(SCENARIOS.map((s) => [s.id, v]));
    expect(profile(all(true))).toBe('faydaci');
    expect(profile(all(false))).toBe('deontolog');
    expect(profile({ ...all(true), kopru: false })).toBe('degisen');
  });
});

describe('kamu malı ve ceza (ch13-e7)', () => {
  const stats = (soc: Society) => {
    const none = seeds.map((s) => simulate(s, soc, false)), pun = seeds.map((s) => simulate(s, soc, true));
    const last = PG.rounds - 1;
    return {
      cNone: avg(none.map((r) => avgContribution(r.rounds[last]))),
      cPun: avg(pun.map((r) => avgContribution(r.rounds[last]))),
      anti: avg(pun.map((r) => antiFraction(r))),
      antiAbs: avg(pun.map((r) => totals(r).anti)), proAbs: avg(pun.map((r) => totals(r).pro)),
      payNone: avg(none.map((r) => totals(r).pay)), payPun: avg(pun.map((r) => totals(r).pay)),
    };
  };
  const hi = stats(PROFILES.yuksek), lo = stats(PROFILES.dusuk), mid = stats({ capital: 0.5, law: 0.5 });

  it('tohumlu: aynı tohum aynı sonuç, başka tohum başka', () => {
    expect(simulate(3, PROFILES.dusuk, true)).toEqual(simulate(3, PROFILES.dusuk, true));
    expect(simulate(3, PROFILES.dusuk, true).rounds[2].c).not.toEqual(simulate(4, PROFILES.dusuk, true).rounds[2].c);
  });
  it('cezasız oyunda katkılar erir', () => {
    for (const s of seeds) {
      const r = simulate(s, PROFILES.yuksek, false);
      expect(avgContribution(r.rounds[PG.rounds - 1])).toBeLessThan(avgContribution(r.rounds[0]) - 4);
    }
  });
  it('yüksek sosyal sermayede ceza işbirliğini yükseltir, antisosyal ceza neredeyse yok', () => {
    expect(hi.cPun).toBeGreaterThan(hi.cNone + 8);
    expect(hi.anti).toBeLessThan(0.02);
  });
  it('düşük sosyal sermayede antisosyal ceza işbirliğini çökertir', () => {
    expect(lo.anti).toBeGreaterThan(0.4);
    expect(lo.antiAbs).toBeGreaterThan(0.9 * lo.proAbs); // cömertliğe harcanan, bencilliğe harcananla aynı büyüklükte ya da fazla
    expect(lo.cPun).toBeLessThan(hi.cPun - 8);
    expect(lo.payPun).toBeLessThan(lo.payNone - 8);
    expect(hi.payPun).toBeGreaterThan(lo.payPun + 8);
  });
  it('sosyal sermaye düştükçe antisosyal ceza payı artar (tek yönlü), işbirliği düşer', () => {
    expect(mid.anti).toBeGreaterThan(hi.anti + 0.1);
    expect(lo.anti).toBeGreaterThan(mid.anti);
    expect(mid.cPun).toBeLessThan(hi.cPun); expect(lo.cPun).toBeLessThan(mid.cPun);
  });
  it('antisosyal oyuncu oranı iç içe artar', () => {
    expect(antiShare({ capital: 0.85, law: 0.85 })).toBe(0);
    expect(antiShare({ capital: 0.5, law: 0.5 })).toBeGreaterThan(0);
    expect(antiShare({ capital: 0.15, law: 0.15 })).toBeGreaterThan(antiShare({ capital: 0.5, law: 0.5 }));
    const a = makeAgents(5, { capital: 0.5, law: 0.5 }).map((x) => x.anti), b = makeAgents(5, PROFILES.dusuk).map((x) => x.anti);
    a.forEach((v, i) => { if (v) expect(b[i]).toBe(true); });
  });
  it('ödemeler ve ceza sınırları tutarlı', () => {
    const r = simulate(2, PROFILES.dusuk, true);
    for (const rd of r.rounds) {
      for (const pl of rd.pay) expect(pl).toBeGreaterThanOrEqual(-PG.maxPts * PG.cost * 3);
      rd.c.forEach((c) => { expect(c).toBeGreaterThanOrEqual(0); expect(c).toBeLessThanOrEqual(PG.E); });
      const byFrom = new Map<number, number>();
      for (const pu of rd.pun) byFrom.set(pu.from, (byFrom.get(pu.from) ?? 0) + pu.pts);
      for (const v of byFrom.values()) expect(v).toBeLessThanOrEqual(PG.maxPts + 2);
    }
    expect(simulate(2, PROFILES.dusuk, false).rounds.every((x) => x.pun.length === 0)).toBe(true);
  });
});

describe('adalet eğrisi (ch13-e8)', () => {
  it('Diktatör payı: pazar 0 iken %27 (Hadza %73 kendine), ~%90 iken ~%50', () => {
    expect(dictatorOffer(HADZA)).toBeCloseTo(1 - BOOK.hadzaKeeps, 6);
    expect(dictatorOffer(BIG_MARKET)).toBeGreaterThan(0.48); expect(dictatorOffer(BIG_MARKET)).toBeLessThanOrEqual(0.5);
  });
  it('pazar arttıkça teklif tek yönde artar', () => {
    let prev = -1;
    for (let m = 0; m <= 90; m += 10) { const v = dictatorOffer({ ...HADZA, market: m / 100 }); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });
  it('küçük toplulukta pozitif teklifler kabul, büyük pazara bağlı toplulukta adaletsiz teklifler reddedilir', () => {
    expect(pReject(0.05, HADZA)).toBeLessThan(0.3);
    expect(pReject(0.1, HADZA)).toBeLessThan(0.05);
    expect(pReject(0.1, BIG_MARKET)).toBeGreaterThan(0.9);
    expect(pReject(0.5, BIG_MARKET)).toBeLessThan(0.01);
    expect(pReject(0, HADZA)).toBe(1);
  });
  it('topluluk büyüklüğü, pazar ve din ret eşiğini yükseltir; en kârlı teklif de yükselir', () => {
    const a = rejectThreshold({ market: 0, size: 40, religion: 0 });
    expect(rejectThreshold({ market: 0, size: 5000, religion: 0 })).toBeGreaterThan(a + 0.1);
    expect(rejectThreshold({ market: 0.9, size: 40, religion: 0 })).toBeGreaterThan(a + 0.1);
    expect(rejectThreshold({ market: 0, size: 40, religion: 1 })).toBeGreaterThan(a + 0.05);
    expect(bestOffer(BIG_MARKET)).toBeGreaterThan(bestOffer(HADZA) + 0.15);
    expect(rejectThreshold({ market: 0, size: 5000, religion: 0 })).toBeLessThan(rejectThreshold({ market: 0, size: 1e6, religion: 0 }) + 1e-9);
  });
});

describe('zar ve dürüstlük (ch13-e10)', () => {
  it('dürüst dağılım düz: her sayı 1/6', () => {
    honestDist().forEach((v) => expect(v).toBeCloseTo(1 / 6, 9));
    expect(deviation(honestDist())).toBeCloseTo(0, 9);
    expect(expectedPay(honestDist())).toBeCloseTo(2.5, 9);
  });
  it('haklı dürüstlük iki atıştan daha çok kazandıranı bildirir: 5 için 11/36, 6 için 1/36', () => {
    const d = justifiedDist();
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(d[4]).toBeCloseTo(11 / 36, 9); expect(d[5]).toBeCloseTo(1 / 36, 9);
    for (let i = 1; i < 5; i++) expect(d[i]).toBeGreaterThan(d[i - 1]);
    expect(bestOf(6, 2)).toBe(2); expect(bestOf(3, 5)).toBe(5);
    expect(expectedPay(d)).toBeCloseTo(125 / 36, 9);
  });
  it('tam yalan hep 5', () => {
    expect(liarDist()).toEqual([0, 0, 0, 0, 1, 0]);
    expect(expectedPay(liarDist())).toBe(5);
  });
  it('karışım: dürüstlük payı, ödeme ve sapma tek yönlü artar', () => {
    let pp = -1, dd = -1;
    for (let j = 0; j <= 100; j += 20) {
      const d = expectedDist({ justified: j / 100, liar: 0 });
      expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
      expect(expectedPay(d)).toBeGreaterThan(pp); expect(deviation(d)).toBeGreaterThanOrEqual(dd);
      pp = expectedPay(d); dd = deviation(d);
    }
    expect(normMix({ justified: 0.8, liar: 0.5 }).liar).toBeCloseTo(0.2, 9);
  });
  it('örneklem: dürüst toplum düz, yüksek ihlalli toplum 5\'e yığılır; tam yalancılar azınlıkta', () => {
    const n = 6000;
    const flat = sampleReports(1, n, MIXES[0].mix);
    flat.forEach((c) => expect(Math.abs(c / n - 1 / 6)).toBeLessThan(0.02));
    const hi = sampleReports(1, n, MIXES[2].mix), lo = sampleReports(1, n, MIXES[1].mix);
    expect(hi[4]).toBeGreaterThan(lo[4]); expect(hi[4]).toBeGreaterThan(flat[4] * 1.6);
    expect(hi[5] / n).toBeLessThan(0.1);
    const bt = sampleByType(1, n, MIXES[2].mix);
    expect(bt[2].reduce((a, b) => a + b, 0) / n).toBeLessThan(0.1);
    expect(bt[1].reduce((a, b) => a + b, 0)).toBeGreaterThan(bt[2].reduce((a, b) => a + b, 0) * 5);
    expect(sampleReports(2, 500, MIXES[2].mix)).toEqual(sampleReports(2, 500, MIXES[2].mix));
    expect(FACES.length).toBe(6);
    expect(mulberry32(1)()).toBe(mulberry32(1)());
  });
});
