import { describe, expect, it } from 'vitest';
import {
  BB, BOOK, CONDS, CONTACT_DEFAULT, CT, FO, PAY_DEFAULT, TR, TRENCH_DEFAULT, VILLAGE_DEFAULT, BABOON_DEFAULT,
  approachDays, correlation, describeBaboons, describeContact, describePay, describeTrench, describeVillage, ensembleTruce,
  femaleStress, firstFeudDay, firstTruceDay, simulateBaboons, simulateContact, simulatePay, simulateTrench, simulateVillage,
  simulateVillages, truceCount, truceShare, type TrenchParams,
} from './model';

const D = TRENCH_DEFAULT;
const tr = (p: Partial<TrenchParams>, n = 8) => ensembleTruce({ ...D, ...p }, n);

describe('siperler (ch17-e12)', () => {
  it('deterministik: aynı tohum aynı seyir', () => {
    const a = simulateTrench(D, 3), b = simulateTrench(D, 3);
    expect(Array.from(a.acts[40])).toEqual(Array.from(b.acts[40]));
    expect(a.acts.length).toBe(TR.days);
  });
  it('ateşkes kendiliğinden doğar: başta çatışma, sonra çoğu sektörde ateşkes', () => {
    const r = simulateTrench(D, 3);
    expect(truceCount(r, 4)).toBe(0);
    expect(firstTruceDay(r)).not.toBeNull();
    expect(tr({})).toBeGreaterThan(0.45);
  });
  it('aynı birliklerin uzun süre karşı karşıya kalması ateşkesi güçlendirir (tekdüze artış)', () => {
    const v = [1, 4, 12, 26].map((tenure) => tr({ tenure }));
    expect(v[0]).toBeLessThan(0.15);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThan(v[i - 1]);
  });
  it('ritüel düzenliliği ateşkesi güçlendirir', () => {
    expect(tr({ ritual: 0 })).toBeLessThan(0.15);
    expect(tr({ ritual: 1 })).toBeGreaterThan(tr({ ritual: 0.6 }));
  });
  it('kaza atışı ateşkesi aşındırır', () => {
    expect(tr({ accident: 0 })).toBeGreaterThan(tr({ accident: 0.05 }));
    expect(tr({ accident: 0.05 })).toBeGreaterThan(tr({ accident: 0.08 }));
  });
  it('komuta baskısı (rotasyon ve baskın) karşılıklılığı bozar', () => {
    expect(tr({ command: 0 })).toBeGreaterThan(tr({ command: 1 }) + 0.15);
  });
  it('iki mermi, tam karşılıktan çok daha kalıcı ateşkes verir (kaza varken)', () => {
    expect(tr({ accident: 0.04, rule: 'iki' })).toBeGreaterThan(tr({ accident: 0.04, rule: 'tam' }) + 0.2);
  });
  it('ateşkesten sonra intikam döngüsü bulunabilir; baskın günü güven düşer', () => {
    const r = simulateTrench({ ...D, command: 1, tenure: 4 }, 1);
    const f = firstFeudDay(r);
    expect(f === null || f > (firstTruceDay(r) ?? 0)).toBe(true);
    expect(truceShare(r, 0, 10)).toBeLessThan(truceShare(simulateTrench({ ...D, command: 0, tenure: 26, accident: 0 }, 1), 60, 182));
  });
  it('açıklama metni üretilir', () => {
    expect(describeTrench(simulateTrench(D, 3), 100)).toContain('101. gün');
  });
});

describe('temas (ch17-e3)', () => {
  const last = (p: Partial<typeof CONTACT_DEFAULT>, seed = 3) => simulateContact({ ...CONTACT_DEFAULT, ...p }, seed);
  it('üç koşulla önyargı belirgin düşer', () => {
    const r = last({});
    expect(r.mean[CT.program]).toBeLessThan(r.mean[0] * 0.7);
  });
  it('koşulsuz temas önyargıyı düşürmez, artırabilir', () => {
    const r = last({ status: 0, goal: 0, support: 0 });
    expect(r.mean[CT.rounds]).toBeGreaterThan(r.mean[0]);
  });
  it('koşullar kademeli: 2/3 azaltır, 1/3 azaltmaz', () => {
    expect(last({ status: 0 }).mean[CT.rounds]).toBeLessThan(last({ status: 0 }).mean[0]);
    expect(last({ status: 0, goal: 0 }).mean[CT.rounds]).toBeGreaterThan(last({ status: 0, goal: 0 }).mean[0]);
  });
  it('program sonrası temas kesilirse etki söner (kitapta %91 sürdürmedi)', () => {
    const stop = last({ follow: 1 - BOOK.noContact }), keep = last({ follow: 1 });
    expect(stop.mean[CT.rounds]).toBeGreaterThan(stop.mean[CT.program] + 0.05);
    expect(stop.mean[CT.rounds]).toBeGreaterThan(keep.mean[CT.rounds]);
  });
  it('temkinli etki gücü daha küçük düşüş verir', () => {
    expect(last({ strength: 0.4 }).mean[CT.rounds]).toBeGreaterThan(last({}).mean[CT.rounds]);
  });
  it('eşleşmeler ve açıklama', () => {
    const r = last({});
    expect(r.pairs[5].length).toBe(CT.n);
    expect(describeContact(r, 10)).toContain('10. tur');
  });
});

describe('orman toplulukları (ch17-e4)', () => {
  it('cezalandırma isteği yüksek köylerde devriye çok, orman sağlıklı', () => {
    const lo = simulateVillage({ ...VILLAGE_DEFAULT, willing: 0.2 }, 1), hi = simulateVillage({ ...VILLAGE_DEFAULT, willing: 0.8 }, 1);
    expect(hi.patrollers).toBeGreaterThan(lo.patrollers);
    expect(hi.end).toBeGreaterThan(lo.end + 0.3);
  });
  it('49 köyde güçlü pozitif ilişki; devriye maliyeti çok yüksekse ilişki kaybolur', () => {
    const v = simulateVillages(0.4, 1), x = (a: { willing: number }[]) => a.map((p) => p.willing);
    expect(v.length).toBe(BOOK.villages);
    expect(correlation(x(v), v.map((p) => p.end))).toBeGreaterThan(0.6);
    const none = simulateVillages(1, 1);
    expect(Math.abs(correlation(x(none), none.map((p) => p.end)))).toBeLessThan(0.2);
  });
  it('bedavacı payı ormanı zayıflatır; devriyesiz orman çöker', () => {
    expect(simulateVillage({ ...VILLAGE_DEFAULT, free: 0.5 }, 1).end).toBeLessThan(simulateVillage({ ...VILLAGE_DEFAULT, free: 0.1 }, 1).end);
    expect(simulateVillage({ free: 0.2, willing: 0.1, cost: 0.4 }, 1).end).toBeLessThan(0.05);
    expect(simulateVillage(VILLAGE_DEFAULT, 1).stock.length).toBe(FO.years + 1);
    expect(describeVillage(simulateVillage(VILLAGE_DEFAULT, 1), VILLAGE_DEFAULT)).toContain('orman');
  });
});

describe('hatıra fotoğrafı (ch17-e5)', () => {
  const o = simulatePay(PAY_DEFAULT, 7);
  it('istediğin kadar öde: satış fırlar, ödemeler çok küçük, zarar', () => {
    expect(o.pwyw.sales).toBeGreaterThan(o.sabit.sales * 3);
    expect(o.pwyw.avgPaid).toBeLessThan(2);
    expect(o.pwyw.profit).toBeLessThan(0);
  });
  it('hayır paylı sabit fiyat: satış biraz artar, şirket kazancı düşer', () => {
    expect(o.sabitHayir.sales).toBeGreaterThan(o.sabit.sales);
    expect(o.sabitHayir.sales).toBeLessThan(o.sabit.sales * 1.6);
    expect(o.sabitHayir.profit).toBeLessThan(o.sabit.profit);
  });
  it('ödemenin yarısı hayra: satış ve ödeme artar, kâr pozitif, büyük bağış', () => {
    expect(o.pwywHayir.sales).toBeGreaterThan(o.sabit.sales);
    expect(o.pwywHayir.avgPaid).toBeGreaterThan(o.pwyw.avgPaid * 3);
    expect(o.pwywHayir.profit).toBeGreaterThan(0);
    expect(o.pwywHayir.donation).toBeGreaterThan(o.pwyw.donation);
  });
  it('norm duyarlılığı arttıkça serbest ödemeler büyür; dört koşul ve açıklama', () => {
    expect(simulatePay({ ...PAY_DEFAULT, norm: 0.9 }, 7).pwyw.avgPaid).toBeGreaterThan(o.pwyw.avgPaid);
    expect(CONDS.length).toBe(4);
    expect(describePay(o, 'pwyw')).toContain('İstediğin kadar öde');
  });
});

describe('babunlar (ch17-e11)', () => {
  const r = simulateBaboons(BABOON_DEFAULT, 4);
  it('salgın sonrası dişi:erkek 2:1 (kitap)', () => {
    const d = BB.outbreak + 5;
    expect(r.females[d] / r.resMales[d]).toBeCloseTo(BOOK.sexRatio, 5);
  });
  it('saldırganlık ve dişi gerginliği düşer', () => {
    expect(r.maleAgg[BB.outbreak + 5]).toBeLessThan(r.maleAgg[BB.outbreak - 5] * 0.6);
    expect(r.stress[BB.outbreak + 5]).toBeLessThan(r.stress[BB.outbreak - 5] - 0.2);
  });
  it('yaklaşma: tipik sürüde iki aydan uzun, salgın sonrası günler-haftalar', () => {
    expect(approachDays(r.stress[BB.outbreak - 5])).toBeGreaterThan(BOOK.typicalApproachDays);
    expect(approachDays(r.stress[BB.outbreak + 5])).toBeLessThan(21);
    expect(approachDays(femaleStress(0))).toBeLessThan(approachDays(femaleStress(1)));
  });
  it('yeni gelen yaklaşık altı ayda sürü düzeyine uyar', () => {
    const n = r.newcomers[0], d = Math.min(BB.days - 1, n.arrive + BOOK.newcomerMonths * 30);
    expect(n.a[n.arrive]).toBeCloseTo(BB.newcomerAgg, 5);
    expect(Math.abs(n.a[d] - r.maleAgg[d])).toBeLessThan(0.12);
    expect(n.contact! - n.arrive).toBeLessThan(40);
  });
  it('salgın olmasaydı kültür değişmez ve yeni gelen saldırgan kalır', () => {
    const c = simulateBaboons({ ...BABOON_DEFAULT, kill: 0 }, 4);
    expect(c.maleAgg[BB.days - 1]).toBeGreaterThan(0.55);
    expect(c.newAgg[BB.days - 1]).toBeGreaterThan(0.6);
  });
  it('çok hızlı göç kültürü seyreltir', () => {
    const f = simulateBaboons({ ...BABOON_DEFAULT, gap: 10 }, 4);
    expect(f.maleAgg[BB.days - 1]).toBeGreaterThan(r.maleAgg[BB.days - 1] + 0.1);
  });
  it('açıklama', () => {
    expect(describeBaboons(r, 200)).toContain('dişi:erkek');
    expect(describeBaboons(r, 10)).toContain('çöplükçü');
  });
});
