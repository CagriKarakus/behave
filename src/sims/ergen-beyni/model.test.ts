import { describe, expect, it } from 'vitest';
import {
  AGE_MAX, AGE_MIN, GROUPS, PROFILES, accumbens, asymmetry, badRate, dopamine, forcedActual, frontal, gap, goodRate, greyMatter,
  groupAge, mulberry32, myelin, newsFor, peerSensitivity, riskRate, runBatch, updateFraction, updatedEstimate, describeAge, describeDrive,
  describeNews, rewardSignal, control, goProbability, remainingFromRisk, riskFromRemaining,
} from './model';

const rate = (g: 'teen' | 'young' | 'adult', peers: number, reward = 0.5) => riskRate({ age: groupAge(g), peers, reward });
const argmax = (f: (a: number) => number) => {
  let best = AGE_MIN;
  for (let a = AGE_MIN; a <= AGE_MAX; a += 0.5) if (f(a) > f(best)) best = a;
  return best;
};

describe('Sekme 1: olgunlaşma eğrileri', () => {
  it('frontal korteks tek yönlü artar ve yirmilerin ortasında doyar (kitap: ~20\'lerin ortası)', () => {
    for (let a = AGE_MIN; a < AGE_MAX; a++) expect(frontal(a + 1)).toBeGreaterThan(frontal(a));
    expect(frontal(10)).toBeLessThan(0.25);
    expect(frontal(15)).toBeCloseTo(0.5, 1);
    expect(frontal(25)).toBeGreaterThan(0.93);
    expect(frontal(AGE_MAX)).toBeGreaterThan(0.98);
  });
  it('dopamin tepesi ergenlikte, frontal henüz yarıdayken', () => {
    const peak = argmax(dopamine);
    expect(peak).toBeGreaterThanOrEqual(13);
    expect(peak).toBeLessThanOrEqual(17);
    expect(frontal(peak)).toBeLessThan(0.6);
    expect(dopamine(peak)).toBeGreaterThan(dopamine(8));
    expect(dopamine(peak)).toBeGreaterThan(dopamine(28) * 2);
  });
  it('boşluk ergenlikte en büyük, yirmilerin başında kapanır', () => {
    const peak = argmax(gap);
    expect(peak).toBeGreaterThanOrEqual(11);
    expect(peak).toBeLessThanOrEqual(16);
    expect(gap(peak)).toBeGreaterThan(0.4);
    expect(gap(25)).toBe(0);
    expect(gap(30)).toBe(0);
  });
  it('gri madde ~12 yaşında tepe yapar sonra budanır; miyelinleşme sürekli artar', () => {
    const peak = argmax(greyMatter);
    expect(peak).toBeGreaterThanOrEqual(10);
    expect(peak).toBeLessThanOrEqual(14);
    expect(greyMatter(30)).toBeLessThan(greyMatter(peak) - 0.25);
    for (let a = AGE_MIN; a < AGE_MAX; a++) expect(myelin(a + 1)).toBeGreaterThan(myelin(a));
    expect(myelin(AGE_MAX)).toBeCloseTo(1, 5);
  });
  it('tüm eğriler 0-1 aralığında', () => {
    for (let a = AGE_MIN; a <= AGE_MAX; a += 0.5) for (const f of [frontal, dopamine, greyMatter, myelin, gap, peerSensitivity]) {
      expect(f(a)).toBeGreaterThanOrEqual(0);
      expect(f(a)).toBeLessThanOrEqual(1.0001);
    }
  });
  it('açıklama yaşa göre değişir', () => {
    expect(describeAge(14)).toContain('fren henüz tam değil');
    expect(describeAge(7)).toContain('henüz düşük');
    expect(describeAge(18)).toContain('boşluk kapanıyor');
    expect(describeAge(27)).toContain('olgun');
  });
});

describe('Galvan: ödül büyüklüğüne accumbens tepkisi (ch06-e5)', () => {
  it('çocukta tepki ödül büyüklüğünden bağımsız', () => {
    expect(accumbens(8, 0)).toBeCloseTo(accumbens(8, 0.5), 6);
    expect(accumbens(8, 1)).toBeCloseTo(accumbens(8, 0.5), 6);
  });
  it('yetişkinde tepki ödülle orantılı artar', () => {
    expect(accumbens(25, 0)).toBeLessThan(accumbens(25, 0.5));
    expect(accumbens(25, 0.5)).toBeLessThan(accumbens(25, 1));
  });
  it('ergende orta ödül yetişkinle aynı, büyük ödül çok daha yüksek, küçük ödül düşük', () => {
    expect(accumbens(15, 0.5)).toBeCloseTo(accumbens(25, 0.5), 6);
    expect(accumbens(15, 1)).toBeGreaterThan(accumbens(25, 1) * 1.3);
    expect(accumbens(15, 0)).toBeLessThan(accumbens(25, 0));
    expect(accumbens(15, 0)).toBeLessThan(accumbens(15, 0.5));
  });
  it('yaşlar arasında süreklidir', () => {
    for (let a = 8; a < 25; a += 0.5) expect(Math.abs(accumbens(a + 0.5, 1) - accumbens(a, 1))).toBeLessThan(0.1);
  });
});

describe('Sekme 2: akranlarla sürüş (ch06-e6)', () => {
  it('yalnızken üç yaş grubu benzer oranda risk alır', () => {
    const r = GROUPS.map((g) => rate(g.id, 0));
    expect(Math.max(...r) - Math.min(...r)).toBeLessThan(0.03);
  });
  it('iki akran ergenlerde riski yaklaşık üç katına çıkarır', () => {
    const ratio = rate('teen', 2) / rate('teen', 0);
    expect(ratio).toBeGreaterThan(2.7);
    expect(ratio).toBeLessThan(3.5);
  });
  it('yetişkinde akran etkisi yok, genç yetişkinde ara bir değer', () => {
    expect(rate('adult', 2) / rate('adult', 0)).toBeLessThan(1.05);
    const y = rate('young', 2) / rate('young', 0);
    expect(y).toBeGreaterThan(1.05);
    expect(y).toBeLessThan(rate('teen', 2) / rate('teen', 0));
  });
  it('akran sayısı arttıkça ergen riski artar ama doyar', () => {
    const r = [0, 1, 2, 3, 4].map((n) => rate('teen', n));
    for (let i = 1; i < r.length; i++) expect(r[i]).toBeGreaterThan(r[i - 1]);
    expect(r[1] - r[0]).toBeGreaterThan(r[4] - r[3]);
  });
  it('akranlar ergende ödül sinyalini artırır, frontal denetimi azaltır (Chein)', () => {
    const base = { age: 15, reward: 0.5 };
    expect(rewardSignal({ ...base, peers: 2 })).toBeGreaterThan(rewardSignal({ ...base, peers: 0 }) * 1.5);
    expect(control({ ...base, peers: 2 })).toBeLessThan(control({ ...base, peers: 0 }) * 0.7);
    expect(rewardSignal({ age: 30, reward: 0.5, peers: 4 })).toBeCloseTo(rewardSignal({ age: 30, reward: 0.5, peers: 0 }), 2);
  });
  it('büyük ödül yalnızken bile ergende riski artırır (Galvan), küçük ödül azaltır', () => {
    expect(rate('teen', 0, 1)).toBeGreaterThan(rate('adult', 0, 1) * 1.4);
    expect(rate('teen', 0, 0)).toBeLessThan(rate('adult', 0, 0));
  });
  it('çarpışma riski arttıkça geçme olasılığı düşer; kalan süre ile risk dönüşümü tutarlı', () => {
    const p = { age: 15, peers: 2, reward: 0.5 };
    expect(goProbability(p, 0.6)).toBeLessThan(goProbability(p, 0.1));
    expect(riskFromRemaining(remainingFromRisk(0.4))).toBeCloseTo(0.4, 6);
  });
  it('tohumlu ajan turları deterministik ve beklenen orana yakın', () => {
    const p = { age: 15, peers: 2, reward: 0.5 };
    expect(runBatch(7, p, 300)).toEqual(runBatch(7, p, 300));
    expect(Math.abs(runBatch(7, p, 4000).rate - riskRate(p))).toBeLessThan(0.03);
    const a = runBatch(3, { ...p, peers: 0 }, 4000), b = runBatch(3, p, 4000);
    expect(b.crash).toBeGreaterThan(a.crash);
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it('açıklama akran etkisini söyler', () => {
    expect(describeDrive('teen', 2, 0.5)).toMatch(/kat/);
    expect(describeDrive('adult', 2, 0.5)).toContain('neredeyse değişmiyor');
    expect(describeDrive('teen', 0, 0.5)).toContain('Yalnız');
  });
});

describe('Sekme 3: haber güncelleme (ch06-e4, tartışmalı)', () => {
  it('yetişkin iki habere de güncellenir; ergen kötü habere neredeyse hiç', () => {
    const adult = PROFILES.find((p) => p.id === 'adult')!, teen = PROFILES.find((p) => p.id === 'teen')!;
    expect(badRate(adult.age) / goodRate(adult.age)).toBeGreaterThan(0.85);
    expect(badRate(teen.age) / goodRate(teen.age)).toBeLessThan(0.2);
    expect(goodRate(teen.age)).toBeCloseTo(goodRate(adult.age), 6);
  });
  it('asimetri yaşla tek yönlü azalır', () => {
    const a = PROFILES.map((p) => asymmetry(p.age));
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeLessThan(a[i - 1]);
  });
  it('haber türü tahmin ile gerçek olasılığa göre belirlenir', () => {
    expect(newsFor(40, 20)).toEqual({ kind: 'good', actual: 20, gap: 20 });
    expect(newsFor(20, 35)).toEqual({ kind: 'bad', actual: 35, gap: 15 });
    expect(newsFor(30, 31)).toBeNull();
  });
  it('zorunlu haber her tahminde geçerli türde haber üretir', () => {
    const rng = mulberry32(5);
    for (let e = 1; e <= 99; e += 7) for (const kind of ['good', 'bad'] as const) {
      const actual = forcedActual(e, kind, rng);
      expect(actual).toBeGreaterThanOrEqual(1);
      expect(actual).toBeLessThanOrEqual(99);
      const n = newsFor(e, actual);
      if (n) expect(n.kind).toBe(kind);
    }
  });
  it('güncellenen tahmin haber yönünde ve oranı geri okunabilir', () => {
    const good = newsFor(40, 20)!, bad = newsFor(20, 40)!;
    const teen = 15;
    expect(updatedEstimate(teen, 40, good)).toBeLessThan(40);
    expect(updatedEstimate(teen, 20, bad)).toBeGreaterThanOrEqual(20);
    const dGood = 40 - updatedEstimate(teen, 40, good), dBad = updatedEstimate(teen, 20, bad) - 20;
    expect(dBad).toBeLessThan(dGood / 4);
    expect(updateFraction(40, updatedEstimate(teen, 40, good), good)).toBeCloseTo(goodRate(teen), 6);
    expect(updateFraction(20, updatedEstimate(26, 20, bad), bad)).toBeCloseTo(badRate(26), 6);
  });
  it('açıklama ergen için kötü haberin işlenmediğini söyler', () => {
    expect(describeNews('teen')).toContain('işlenmiyor');
    expect(describeNews('adult')).toContain('İki haber de');
  });
});
