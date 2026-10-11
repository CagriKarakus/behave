import { describe, expect, it } from 'vitest';
import { BASE, DECK, FAIR, POT, curve, describe as say, evaluate, threshold, trpActive, type Conditions } from './model';
import { mulberry32, shuffle } from './rng';

const C = (c: Partial<Conditions> = {}): Conditions => ({ ...BASE, ...c });
const p = (o: number, c: Partial<Conditions> = {}) => evaluate(o, C(c)).pReject;

describe('temel eğri', () => {
  it('eşit pay neredeyse hiç reddedilmez, hiçbir şey neredeyse hep reddedilir', () => {
    expect(p(FAIR)).toBeLessThan(0.06);
    expect(p(0)).toBeGreaterThan(0.9);
  });
  it('ret olasılığı teklif arttıkça tek yönde azalır (her koşulda)', () => {
    const conds: Partial<Conditions>[] = [{}, { proposer: 'computer' }, { tmsRight: true }, { amyLesion: true }, { trp: true }];
    for (const c of conds) {
      const ys = curve(C(c)).map((x) => x.p);
      for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeLessThanOrEqual(ys[i - 1] + 1e-9);
    }
  });
  it('eşiğin üstünde (adil ve cömert teklifler) ret yok denecek kadar azdır', () => {
    for (let o = FAIR; o <= POT; o++) expect(p(o)).toBeLessThan(0.06);
  });
  it('olasılıklar [0,1] aralığında, katkılar toplamı sürücüye eşit', () => {
    for (let o = 0; o <= POT; o++) {
      const e = evaluate(o, C());
      expect(e.pReject).toBeGreaterThanOrEqual(0);
      expect(e.pReject).toBeLessThanOrEqual(1);
      expect(e.parts.reduce((a, x) => a + x.v, 0)).toBeCloseTo(e.drive, 9);
    }
  });
});

describe('Sanfey: insula (ch15-e6)', () => {
  it('insandan gelen adaletsiz teklif insulayı bilgisayardan fazla etkinleştirir', () => {
    for (const o of [0, 1, 2, 3]) expect(evaluate(o, C()).act.insula).toBeGreaterThan(evaluate(o, C({ proposer: 'computer' })).act.insula);
  });
  it('insula etkinliği arttıkça ret olasılığı artar', () => {
    const xs = [0, 1, 2, 3, 4, 5].map((o) => evaluate(o, C()));
    const sorted = [...xs].sort((a, b) => a.act.insula - b.act.insula);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].pReject).toBeGreaterThanOrEqual(sorted[i - 1].pReject);
  });
  it('bilgisayara karşı ret azalır', () => {
    for (const o of [0, 1, 2, 3, 4]) expect(p(o, { proposer: 'computer' })).toBeLessThan(p(o));
  });
  it('kabul edilebilir en düşük teklif bilgisayarda daha düşüktür', () => {
    expect(threshold(C({ proposer: 'computer' }))).toBeLessThan(threshold(C()));
  });
});

describe('Knoch/Fehr: sağ dlPFC TMS (ch02-e5)', () => {
  it('insana karşı adaletsiz teklifleri daha çok kabul ettirir', () => {
    for (const o of [1, 2, 3]) expect(p(o, { tmsRight: true })).toBeLessThan(p(o) - 0.05);
  });
  it('adaletsizlik yargısı değişmez', () => {
    for (let o = 0; o <= FAIR; o++) expect(evaluate(o, C({ tmsRight: true })).judge).toBe(evaluate(o, C()).judge);
    expect(evaluate(2, C({ tmsRight: true })).judge).toBeGreaterThan(0.5);
  });
  it('bilgisayardan gelen tekliflerde etki yoktur', () => {
    for (let o = 0; o <= POT; o++) expect(p(o, { proposer: 'computer', tmsRight: true })).toBeCloseTo(p(o, { proposer: 'computer' }), 1);
    // dlPFC'nin ret katkısı bilgisayarda zaten taban düzeyinde: fark küçüktür
    expect(Math.abs(p(2, { proposer: 'computer', tmsRight: true }) - p(2, { proposer: 'computer' }))).toBeLessThan(0.02);
  });
  it('sol dlPFC susturulması etkisizdir', () => {
    for (let o = 0; o <= POT; o++) expect(p(o, { tmsLeft: true })).toBe(p(o));
  });
  it('TMS dlPFC etkinliğini düşürür ama insula etkinliği korunur', () => {
    const a = evaluate(2, C()), b = evaluate(2, C({ tmsRight: true }));
    expect(b.act.dlpfc).toBeLessThan(a.act.dlpfc / 4);
    expect(b.act.insula).toBe(a.act.insula);
  });
});

describe('Amigdala hasarı (ch02-e3)', () => {
  it('haksız tekliflerde ret oranı artmaz: eğri neredeyse düz ve düşük', () => {
    const ys = curve(C({ amyLesion: true })).map((x) => x.p);
    expect(Math.max(...ys)).toBeLessThan(0.4);
    expect(ys[0] - ys[FAIR]).toBeLessThan(0.35);
    // kontrollerde aynı artış çok daha büyük
    expect(p(0) - p(FAIR)).toBeGreaterThan(0.85);
  });
  it('hasarlılar kontrollerden daha az reddeder, kabul eşiği 0 ₺', () => {
    for (const o of [0, 1, 2, 3]) expect(p(o, { amyLesion: true })).toBeLessThan(p(o));
    expect(threshold(C({ amyLesion: true }))).toBe(0);
  });
  it('amigdala etkinliği arttıkça kontrolde ret artar (Gospic)', () => {
    const xs = [5, 4, 3, 2, 1, 0].map((o) => evaluate(o, C()));
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i].act.amy).toBeGreaterThan(xs[i - 1].act.amy);
      expect(xs[i].pReject).toBeGreaterThan(xs[i - 1].pReject);
    }
    expect(evaluate(0, C({ amyLesion: true })).act.amy).toBe(0);
  });
});

describe('Wood: serotonin/triptofan (ch02-e12)', () => {
  it('ilk oturumda adaletsiz tekliflerin reddi artar', () => {
    for (const o of [1, 2, 3, 4]) expect(p(o, { trp: true })).toBeGreaterThan(p(o));
    expect(threshold(C({ trp: true }))).toBeGreaterThan(threshold(C()));
  });
  it('adil teklifte etki yok denecek kadar küçüktür', () => {
    expect(Math.abs(p(FAIR, { trp: true }) - p(FAIR))).toBeLessThan(0.01);
  });
  it('etki yalnızca ilk oturumdadır', () => {
    expect(trpActive(C({ trp: true, session: 2 }))).toBe(false);
    for (let o = 0; o <= POT; o++) expect(p(o, { trp: true, session: 2 })).toBe(p(o));
  });
});

describe('de Quervain: ret etmenin tatmini (ch02-e9)', () => {
  it('kaudat tatmini adaletsizlikle artar, adil teklifte düşüktür', () => {
    expect(evaluate(1, C()).satisfaction).toBeGreaterThan(evaluate(4, C()).satisfaction);
    expect(evaluate(FAIR, C()).satisfaction).toBeLessThan(0.15);
  });
  it('amigdalasız ve bilgisayara karşı tatmin daha azdır', () => {
    expect(evaluate(2, C({ amyLesion: true })).satisfaction).toBeLessThan(evaluate(2, C()).satisfaction);
    expect(evaluate(2, C({ proposer: 'computer' })).satisfaction).toBeLessThan(evaluate(2, C()).satisfaction);
  });
});

describe('yardımcılar', () => {
  it('tohumlu karıştırma deterministik ve desteyi korur', () => {
    const a = shuffle(DECK, mulberry32(7)), b = shuffle(DECK, mulberry32(7)), c = shuffle(DECK, mulberry32(8));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([...DECK].sort());
    expect(a).not.toEqual(c);
  });
  it('describe her koşulda dolu bir cümle verir', () => {
    for (const c of [C(), C({ proposer: 'computer' }), C({ tmsRight: true, amyLesion: true, trp: true }), C({ trp: true, session: 2 })]) {
      for (const o of [0, 3, 5]) expect(say(o, c, evaluate(o, c)).length).toBeGreaterThan(20);
    }
  });
});
