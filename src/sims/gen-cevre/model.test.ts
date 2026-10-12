import { mulberry32 } from '../rng';
import { describe, expect, it } from 'vitest';
import {
  CASPI_RATIO, CRABBE_TABLE, DEFAULT_PARAMS, GWAS_N, M_STEPS, PRESETS, SES_TABLE, decompose, describeGwas, describeMao, describeTable,
  discovery, genCells, h2Curve, maoInteraction, maoPopulationRisk, maoRisk, rankFlips, simulateGwas, simulatePop, tableFromParams,
  variantShares,
} from './model';

const popOf = (p: Partial<typeof DEFAULT_PARAMS>, seed = 3) => simulatePop(genCells({ ...DEFAULT_PARAMS, ...p }), seed);

describe('tablo ve kalıtılabilirlik', () => {
  it('tohumlu RNG ve popülasyon deterministik', () => {
    expect(mulberry32(5)()).toBe(mulberry32(5)());
    expect(Array.from(popOf({}).y.slice(0, 5))).toEqual(Array.from(popOf({}).y.slice(0, 5)));
    expect(Array.from(popOf({}, 4).y.slice(0, 3))).not.toEqual(Array.from(popOf({}, 3).y.slice(0, 3)));
  });

  it('varyans payları 1\'e toplanır', () => {
    const d = decompose(popOf({ inter: 0.6 }));
    expect(d.h2 + d.env + d.gxe + d.res).toBeCloseTo(1, 6);
  });

  it('gen farkı yoksa h² ≈ 0', () => {
    expect(decompose(popOf({ gen: 0, n: 1 })).h2).toBeLessThan(0.02);
  });

  it('aynı genler: ortam sayısı arttıkça h² düşer (etkileşimsiz)', () => {
    const c = h2Curve(popOf({ n: 6, inter: 0 }));
    expect(c).toHaveLength(6);
    expect(c[0]).toBeGreaterThan(0.5);
    for (let i = 1; i < c.length; i++) expect(c[i]).toBeLessThan(c[i - 1]);
    expect(c[5]).toBeLessThan(c[0] / 2);
  });

  it('ortam çeşitliliği arttıkça h² düşer', () => {
    const lo = decompose(popOf({ n: 4, spread: 0.1 })).h2;
    const hi = decompose(popOf({ n: 4, spread: 1 })).h2;
    expect(hi).toBeLessThan(lo);
  });

  it('etkileşimsiz tabloda etkileşim payı küçük; sıralama değişenlerde büyük ve çizgiler kesişir', () => {
    const none = PRESETS.find((p) => p.id === 'none')!.params!;
    const cross = PRESETS.find((p) => p.id === 'cross')!.params!;
    const a = decompose(simulatePop(genCells(none), 1)), b = decompose(simulatePop(genCells(cross), 1));
    expect(a.gxe).toBeLessThan(0.02);
    expect(b.gxe).toBeGreaterThan(0.1);
    expect(rankFlips(genCells(none))).toBe(0);
    expect(rankFlips(genCells(cross))).toBeGreaterThan(0);
  });

  it('etkileşim varken ortam içi h² ortamdan ortama değişir', () => {
    const cross = PRESETS.find((p) => p.id === 'cross')!.params!;
    const d = decompose(simulatePop(genCells(cross), 2));
    expect(Math.max(...d.perEnv) - Math.min(...d.perEnv)).toBeGreaterThan(0.1);
    expect(describeTable(d, h2Curve(simulatePop(genCells(cross), 2)), rankFlips(genCells(cross)), 4)).toContain('kesişiyor');
  });

  it('kalibrasyon (Crabbe): A varyantı laboratuvara göre ≈ 8 kat değişir, B ve C benzer kalır', () => {
    const [A, B, C] = CRABBE_TABLE.cells;
    expect(A[1] / A[0]).toBeGreaterThan(7); // 5.000+ cm / 667 cm
    expect(A[1] / A[2]).toBeGreaterThan(7); // 5.000+ cm / 701 cm
    expect(A[2] / A[0]).toBeCloseTo(701 / 667, 1);
    expect(Math.max(...B) - Math.min(...B)).toBeLessThan(10);
    expect(Math.max(...C) - Math.min(...C)).toBeLessThan(10);
    expect(rankFlips(CRABBE_TABLE.cells)).toBeGreaterThan(0);
  });

  it('kalibrasyon (Turkheimer): ortam içi h² yoksulda ≈ %10, zengin ortamda ≈ %70', () => {
    const d = decompose(simulatePop(SES_TABLE.cells, 11, 1500));
    expect(d.perEnv[0]).toBeGreaterThan(0.05);
    expect(d.perEnv[0]).toBeLessThan(0.16);
    expect(d.perEnv[1]).toBeGreaterThan(0.62);
    expect(d.perEnv[1]).toBeLessThan(0.78);
  });

  it('tableFromParams ortam adları ve boyutları tutarlı', () => {
    const t = tableFromParams({ ...DEFAULT_PARAMS, n: 5 });
    expect(t.envNames).toHaveLength(5);
    expect(t.cells.every((r) => r.length === 5)).toBe(true);
    expect(describeTable(decompose(popOf({ n: 1 })), [0.6], 0, 1)).toContain('Tek ortam');
  });
});

describe('MAO-A × çocukluk', () => {
  it('kötü muamele yokken varyant fark yaratmaz; ağır muamelede oran ≈ 3', () => {
    expect(maoRisk(true, 0, CASPI_RATIO)).toBeCloseTo(maoRisk(false, 0, CASPI_RATIO), 10);
    expect(maoRisk(true, 1, CASPI_RATIO) / maoRisk(false, 1, CASPI_RATIO)).toBeCloseTo(3, 6);
  });
  it('kötü muamele yalnızca ağırsa etki var; ara düzeyde azalır', () => {
    expect(maoRisk(true, 0.3, 3)).toBeCloseTo(maoRisk(false, 0.3, 3), 10);
    const r = (l: number) => maoRisk(true, l, 3) / maoRisk(false, l, 3);
    expect(r(0.6)).toBeGreaterThan(1);
    expect(r(0.6)).toBeLessThan(r(1));
  });
  it('replikasyon yok senaryosunda etkileşim sıfır, çizgiler paralel', () => {
    expect(maoInteraction(1)).toBeCloseTo(0, 10);
    expect(maoInteraction(3)).toBeGreaterThan(0.2);
  });
  it('popülasyon düzeyinde genotip tek başına zayıf bir işaret; paylaşım küçüldükçe daha zayıf', () => {
    const rr = (s: number) => maoPopulationRisk(true, s, 3) / maoPopulationRisk(false, s, 3);
    expect(rr(0.05)).toBeLessThan(rr(0.3));
    expect(rr(0.05)).toBeLessThan(1.3);
    expect(rr(0)).toBeCloseTo(1, 10);
  });
  it('risk 0..1 aralığında; açıklama metni üretilir', () => {
    expect(maoRisk(true, 1, 5)).toBeLessThanOrEqual(0.95);
    expect(describeMao(1, 3, 0.1)).toContain('kat');
    expect(describeMao(0, 3, 0.1)).toContain('fark yok');
    expect(describeMao(1, 1, 0.1)).toContain('Etkileşim yok');
  });
});

describe('boy ve GWAS', () => {
  it('varyant payları toplamı 1 ve büyükten küçüğe', () => {
    const s = variantShares(1000);
    expect(s.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeLessThanOrEqual(s[i - 1]);
  });

  it('tek gen: üç küme; çok gen: sürekli, çan şekli', () => {
    const one = simulateGwas(1, 0.2);
    expect(one.distinctG).toBeLessThanOrEqual(3);
    const many = simulateGwas(30000, 0.2);
    expect(many.distinctG).toBeGreaterThan(1500);
    const peak = Math.max(...many.pHist), mid = many.pHist[15] + many.pHist[14];
    expect(mid / 2).toBeGreaterThan(peak * 0.7);
    expect(many.pHist[0] + many.pHist[29]).toBeLessThan(peak * 0.05);
  });

  it('çevre payı kadar varyans çevreden gelir', () => {
    for (const env of [0.2, 0.5, 0.9]) {
      const r = simulateGwas(1000, env);
      expect(r.varG / r.varP).toBeGreaterThan((1 - env) * 0.8 - 0.05);
      expect(r.varG / r.varP).toBeLessThan((1 - env) * 1.2 + 0.05);
    }
    expect(simulateGwas(1000, 1).varG).toBeLessThan(1e-9);
  });

  it('varyant sayısı arttıkça en güçlü tek varyantın payı küçülür', () => {
    const tops = [1, 100, 10000, 300000].map((M) => discovery(M, 0.8, GWAS_N.y2010).top);
    for (let i = 1; i < tops.length; i++) expect(tops[i]).toBeLessThan(tops[i - 1]);
    expect(tops[0]).toBeCloseTo(0.8, 6);
    expect(tops[3]).toBeLessThan(0.01);
  });

  it('kalibrasyon (ch08-e10, 2010): yüzlerce varyant, en güçlüsü ≈ %0,4, hepsi birlikte ≈ %10', () => {
    const d = discovery(300000, 0.8, GWAS_N.y2010);
    expect(d.count).toBeGreaterThan(150);
    expect(d.count).toBeLessThan(700);
    expect(d.top).toBeGreaterThan(0.002);
    expect(d.top).toBeLessThan(0.008);
    expect(d.sum).toBeGreaterThan(0.06);
    expect(d.sum).toBeLessThan(0.16);
  });

  it('kalibrasyon (ch08-e10, 2022): daha büyük örneklem >12.000 varyant bulur, açıklanan pay ~2010\'dan çok yüksek', () => {
    const a = discovery(300000, 0.8, GWAS_N.y2010), b = discovery(300000, 0.8, GWAS_N.y2022);
    expect(b.count).toBeGreaterThan(12000);
    expect(b.sum).toBeGreaterThan(a.sum * 3);
    expect(b.sum).toBeLessThan(0.8);
  });

  it('M basamakları artan; açıklama metni üretilir', () => {
    for (let i = 1; i < M_STEPS.length; i++) expect(M_STEPS[i]).toBeGreaterThan(M_STEPS[i - 1]);
    expect(describeGwas(1, 0.2, discovery(1, 0.8, GWAS_N.y2010))).toContain('Tek bir gen');
    expect(describeGwas(300000, 0.2, discovery(300000, 0.8, GWAS_N.y2010))).toContain('çan eğrisi');
    expect(describeGwas(100, 1, discovery(100, 0, GWAS_N.y2010))).toContain('Çevre');
  });
});
