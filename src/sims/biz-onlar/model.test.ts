import { describe, expect, it } from 'vitest';
import {
  KURZBAN_DEFAULT, MATRICES, TAJFEL_DEFAULT, behaviors, classify, confusion, corr, dominant, emotions, expectedShares,
  mixedShare, simulateMemory, simulateTajfel, society, strategyCols, userProfile, CHANCE, COLS, col,
} from './model';

describe('matrisler', () => {
  it('A türünde toplam ve iç grup kazancı bir uçta, fark öbür uçta; B türünde iç grup kazancı ve fark birlikte', () => {
    for (const m of MATRICES) {
      const s = strategyCols(m);
      expect(m.own).toHaveLength(COLS);
      if (m.kind === 'A') { expect(s.mjp).toBe(s.mip); expect(s.md).not.toBe(s.mip); }
      else { expect(s.md).toBe(s.mip); expect(s.mjp).not.toBe(s.mip); }
      expect(col(m, s.fair).diff).toBe(0);
    }
  });
});

describe('Tajfel (ch11-e3): farkı büyütme', () => {
  it('keyfi etiketle çoğunluk iç grup lehine seçer ve A matrislerinde mutlak kazançtan vazgeçer', () => {
    const r = simulateTajfel(TAJFEL_DEFAULT, 1);
    expect(r.favorShare).toBeGreaterThan(0.6);
    expect(r.sacrificeShare).toBeGreaterThan(0.5);
    expect(r.meanDiff).toBeGreaterThan(1);
    // Matris 1'de en çok seçilen sütun farkı büyüten uçta (sol yarı)
    const h = r.hist[0];
    expect(h[0] + h[1] + h[2] + h[3]).toBeGreaterThan(0.6);
  });
  it('etikete bağlılık arttıkça kayırma artar; bağlılık 0 iken ve kontrol koşulunda azalır', () => {
    const f = (u: Partial<typeof TAJFEL_DEFAULT>) => simulateTajfel({ ...TAJFEL_DEFAULT, ...u }, 1).favorShare;
    expect(f({ ident: 1 })).toBeGreaterThan(f({}));
    expect(f({ ident: 0 })).toBeLessThan(f({}) - 0.3);
    expect(f({ control: true })).toBeLessThan(f({}) - 0.3);
  });
  it('adalet duyarlılığı eşit dağıtımı artırır', () => {
    expect(simulateTajfel({ ...TAJFEL_DEFAULT, fair: 1 }, 1).fairShare).toBeGreaterThan(simulateTajfel(TAJFEL_DEFAULT, 1).fairShare);
  });
  it('tohumlu ve deterministik; dağılımların toplamı 1', () => {
    const a = simulateTajfel(TAJFEL_DEFAULT, 4), b = simulateTajfel(TAJFEL_DEFAULT, 4);
    expect(a).toEqual(b);
    for (const h of a.hist) expect(h.reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
  });
  it('sınıflama ve kullanıcı profili', () => {
    const m = MATRICES[0];
    expect(classify(m, 0)).toMatchObject({ favors: true, sacrifices: true });
    expect(classify(m, 6)).toMatchObject({ favors: false, sacrifices: false });
    expect(classify(m, 3).fair).toBe(true);
    expect(userProfile([null, null, null, null]).kind).toBe('none');
    expect(userProfile([0, null, null, null]).kind).toBe('diff');
    expect(userProfile([3, null, null, null]).kind).toBe('fair');
    expect(userProfile([6, null, null, null]).kind).toBe('gain');
  });
});

describe('Kurzban (ch11-e8): ırk koalisyon ipucu olarak işlenir', () => {
  const none = expectedShares(KURZBAN_DEFAULT);
  const shirts = expectedShares({ ...KURZBAN_DEFAULT, shirts: true });
  it('forma yokken karışmalar ırka göre kümelenir (şansın çok üstünde)', () => {
    expect(none.sameRace).toBeGreaterThan(CHANCE.same + 0.15);
  });
  it('koalisyon ipucu olan forma eklenince ırka göre kümelenme belirgin azalır ama silinmez; forma öne çıkar', () => {
    expect(shirts.sameRace).toBeLessThan(none.sameRace - 0.1);
    expect(shirts.sameRace).toBeGreaterThan(CHANCE.same);
    expect(shirts.sameShirt).toBeGreaterThan(shirts.sameRace);
  });
  it('koşulludur: forma anlamsızsa ya da göze çarpmıyorsa ırk aynen kalır', () => {
    expect(expectedShares({ ...KURZBAN_DEFAULT, shirts: true, coalition: 0 }).sameRace).toBeCloseTo(none.sameRace, 6);
    expect(expectedShares({ ...KURZBAN_DEFAULT, shirts: true, shirtVis: 0 }).sameRace).toBeCloseTo(none.sameRace, 6);
  });
  it('olasılıklar toplamı 1, kendisine düşmez; örneklem beklentiye yakın ve tohumlu', () => {
    const p = confusion({ ...KURZBAN_DEFAULT, shirts: true }, 2);
    expect(p[2]).toBe(0);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    const s = simulateMemory({ ...KURZBAN_DEFAULT, shirts: true }, 1, 200);
    expect(Math.abs(s.sameShirt - shirts.sameShirt)).toBeLessThan(0.06);
    expect(simulateMemory(KURZBAN_DEFAULT, 2)).toEqual(simulateMemory(KURZBAN_DEFAULT, 2));
  });
});

describe('Sıcaklık-yetkinlik (ch11-e10)', () => {
  it('köşeler dört duyguya karşılık gelir ve paylar toplamı 1', () => {
    expect(dominant({ w: 0.9, c: 0.9 })).toBe('gurur');
    expect(dominant({ w: 0.1, c: 0.9 })).toBe('kiskanclik');
    expect(dominant({ w: 0.9, c: 0.1 })).toBe('acima');
    expect(dominant({ w: 0.1, c: 0.1 })).toBe('tiksinme');
    const e = emotions({ w: 0.3, c: 0.6 });
    expect(Object.values(e).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });
  it('davranış eğilimi: acıma yardım, tiksinme dışlama ve saldırı', () => {
    const pity = behaviors({ w: 0.9, c: 0.1 }), dis = behaviors({ w: 0.1, c: 0.1 }), pride = behaviors({ w: 0.9, c: 0.9 });
    expect(pity.yardim).toBeGreaterThan(dis.yardim);
    expect(dis.dislama).toBeGreaterThan(pride.dislama);
    expect(dis.saldiri).toBeGreaterThan(pity.saldiri);
    expect(pride.iliski).toBeGreaterThan(dis.iliski);
  });
});

describe('Durante (ch11-e12): eşitsizlik ve karışık stereotip', () => {
  it('Gini arttıkça karışık köşelerdeki grup payı artar, sıcaklık-yetkinlik ilişkisi zayıflayıp negatife döner', () => {
    const g = [0.25, 0.35, 0.45, 0.6].map((x) => society(x, 1));
    const mix = g.map(mixedShare), r = g.map(corr);
    for (let i = 1; i < 4; i++) { expect(mix[i]).toBeGreaterThan(mix[i - 1]); expect(r[i]).toBeLessThan(r[i - 1]); }
    expect(r[0]).toBeGreaterThan(0);
    expect(r[3]).toBeLessThan(0);
  });
});
