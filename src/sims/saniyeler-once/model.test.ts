import { describe, expect, it } from 'vitest';
import {
  BASE, CLEAN, FAST_DEFAULT, STREET_DEFAULT, STIM, compare, cueLevels, decide, describeFast, describeStreet,
  newStreet, pass, simulateFast, violationProb, type FastInputs, type StreetCfg,
} from './model';

const fast = (o: Partial<FastInputs>) => simulateFast({ ...FAST_DEFAULT, ...o });

describe('hızlı yol ve düşünce', () => {
  it('Whalen: maskeli 30 ms korkulu göz fark edilmez ama amigdala yükselir; fren yetişmez', () => {
    const r = fast({});
    expect(r.awareness).toBeLessThan(0.1);
    expect(r.peakA).toBeGreaterThan(0.3);
    expect(r.peakF).toBeLessThan(0.1);
    expect(r.brake).toBeLessThan(0.1);
  });
  it('korkulu göz, nötr yüzden belirgin güçlü amigdala tepkisi verir (mutlu/nötr karşılaştırması)', () => {
    expect(fast({}).peakA).toBeGreaterThan(2 * fast({ stim: 'calm' }).peakA);
    expect(STIM.sign.threat).toBeGreaterThan(STIM.calm.threat);
  });
  it('kitap: amigdala ~100 ms civarında yükselir; frontal en az 100 ms geriden gelir', () => {
    const r = fast({ dur: 500, masked: false });
    expect(r.tA50).toBeGreaterThan(40);
    expect(r.tA50).toBeLessThanOrEqual(120);
    expect(r.tF50 - r.tA50).toBeGreaterThanOrEqual(100);
  });
  it('süre uzadıkça farkındalık ve frenleme artar (maskeli)', () => {
    let prevB = -1, prevA = -1;
    for (const dur of [30, 60, 100, 200, 400, 800, 1500, 2000]) {
      const r = fast({ dur });
      expect(r.brake).toBeGreaterThanOrEqual(prevB - 0.02);
      expect(r.awareness).toBeGreaterThanOrEqual(prevA);
      prevB = r.brake; prevA = r.awareness;
    }
    expect(fast({ dur: 1500 }).brake).toBeGreaterThan(0.4);
    expect(fast({ dur: 1500 }).awareness).toBeGreaterThan(0.95);
  });
  it('kitap: 100 ms altında gösterim fark edilmez, uzun gösterimde frontal devreye girer', () => {
    expect(fast({ dur: 80 }).awareness).toBeLessThan(0.5);
    expect(fast({ dur: 300 }).awareness).toBeGreaterThan(0.9);
  });
  it('maske kapalıyken aynı kısa uyaran fark edilir ve daha çok frenlenir', () => {
    const m = fast({ dur: 60, masked: true }), o = fast({ dur: 60, masked: false });
    expect(o.awareness).toBeGreaterThan(m.awareness);
    expect(o.brake).toBeGreaterThan(m.brake);
  });
  it('bilişsel yük ve düşük frontal güç freni zayıflatır; frontal sıfırsa fren yok', () => {
    const base = fast({ dur: 800, masked: false });
    expect(fast({ dur: 800, masked: false, load: 0.9 }).brake).toBeLessThan(base.brake);
    expect(fast({ dur: 800, masked: false, frontal: 0.2 }).brake).toBeLessThan(base.brake);
    const none = fast({ dur: 800, masked: false, frontal: 0 });
    expect(none.brake).toBe(0);
    expect(none.peakF).toBe(0);
  });
  it('çok kısa gösterimde tepe amigdala, uzun gösterimdekinden küçük ama sıfır değil', () => {
    const short = fast({ dur: 30 }), long = fast({ dur: 300, frontal: 0 });
    expect(short.peakA).toBeGreaterThan(0.3);
    expect(short.peakA).toBeLessThan(long.peakA);
  });
  it('yüz türü: öğrenilmiş çağrışım Siyah yüzde amigdala tepkisini artırır, tanıdıklık azaltır; Beyaz yüzde etkisiz', () => {
    const b = fast({ stim: 'faceB' }), w = fast({ stim: 'faceW' });
    expect(b.peakA).toBeGreaterThan(w.peakA);
    expect(fast({ stim: 'faceB', fam: 0.9 }).peakA).toBeLessThan(b.peakA);
    expect(fast({ stim: 'faceB', assoc: 0 }).peakA).toBeCloseTo(w.peakA, 5);
    expect(fast({ stim: 'faceW', assoc: 1 }).peakA).toBeCloseTo(w.peakA, 5);
  });
  it('deterministik ve açıklama metni üretir', () => {
    expect(Array.from(fast({}).amy)).toEqual(Array.from(fast({}).amy));
    expect(describeFast(FAST_DEFAULT, fast({}))).toContain('fark edilmedi');
    const u = { ...FAST_DEFAULT, dur: 1500, masked: false };
    expect(describeFast(u, simulateFast(u))).toContain('frontal korteks');
  });
});

const cfg = (o: Partial<StreetCfg>): StreetCfg => ({ ...STREET_DEFAULT, ...o });

describe('norm ihlallerinin yayılması', () => {
  it('Keizer: eşleşen ihlal işareti ilgili davranış olasılığını ~iki katına çıkarır', () => {
    const clean = cueLevels(cfg({}), []);
    const gr = cueLevels(cfg({ graffiti: true }), []);
    expect(violationProb('flyer', gr, cfg({ graffiti: true })) / violationProb('flyer', clean, cfg({}))).toBeCloseTo(2, 5);
    // yalnızca eşleşen etki: çapraz ipucu olmadan oran 2
    const only = { graffiti: 1, bikes: 0, litter: 0 };
    expect(violationProb('flyer', only, cfg({})) / BASE.flyer).toBeCloseTo(2, 5);
    expect(violationProb('shortcut', { graffiti: 0, bikes: 1, litter: 0 }, cfg({})) / BASE.shortcut).toBeCloseTo(2, 5);
    expect(violationProb('steal', { graffiti: 0, bikes: 0, litter: 1 }, cfg({})) / BASE.steal).toBeCloseTo(2, 5);
  });
  it('ajan tabanlı oranlar: grafiti varken ilan atma ~2 kat (Monte Carlo)', () => {
    const c = compare(cfg({ graffiti: true, chain: false }), 6000, 3);
    expect(c.orderly.flyer).toBeGreaterThan(0.27);
    expect(c.orderly.flyer).toBeLessThan(0.33);
    expect(c.ratio.flyer).toBeGreaterThan(1.8);
    expect(c.ratio.flyer).toBeLessThan(2.2);
  });
  it('ipucu olmayan ortam, taban oranlara yakındır ve karşılaştırma 1 verir', () => {
    const c = compare(cfg({ chain: false }), 3000, 5);
    for (const k of ['flyer', 'shortcut', 'steal'] as const) expect(c.ratio[k]).toBe(1);
  });
  it('zincirleme: ajanların bıraktığı ilanlar zarf alma oranını artırır', () => {
    const on = compare(cfg({ graffiti: true, chain: true }), 4000, 9).current.steal;
    const off = compare(cfg({ graffiti: true, chain: false }), 4000, 9).current.steal;
    expect(on).toBeGreaterThan(off);
  });
  it('ilanlar zamanla ortamdan kalkar (yaşam süresi)', () => {
    const s = newStreet(cfg({ graffiti: true }), 1);
    for (let i = 0; i < 400; i++) pass(s);
    expect(s.drops.length).toBeLessThan(10);
    expect(s.n.flyer).toBe(400);
  });
  it('etki gücü azalınca (replikasyon) oran küçülür; denetim ihlalleri azaltır', () => {
    const full = compare(cfg({ graffiti: true, chain: false }), 4000, 2).ratio.flyer;
    const weak = compare(cfg({ graffiti: true, chain: false, strength: 0.4 }), 4000, 2).ratio.flyer;
    expect(weak).toBeGreaterThan(1);
    expect(weak).toBeLessThan(full);
    const watched = compare(cfg({ graffiti: true, chain: false, oversight: 1 }), 4000, 2).current.flyer;
    expect(watched).toBeLessThan(compare(cfg({ graffiti: true, chain: false }), 4000, 2).current.flyer);
  });
  it('tohumlu ve tekrarlanabilir; tüm ipuçları bir arada olasılık sınırı aşılmaz', () => {
    const a = newStreet(cfg({ graffiti: true, bikes: true, litter: true }), 11), b = newStreet(cfg({ graffiti: true, bikes: true, litter: true }), 11);
    for (let i = 0; i < 50; i++) expect(pass(a)).toEqual(pass(b));
    const all = cueLevels(cfg({ graffiti: true, bikes: true, litter: true }), []);
    for (const k of ['flyer', 'shortcut', 'steal'] as const) expect(violationProb(k, all, cfg({}))).toBeLessThanOrEqual(0.95);
    expect(decide(newStreet(cfg(CLEAN), 1), 'steal')).toBeTypeOf('boolean');
  });
  it('açıklama metni oranı söyler', () => {
    const c = cfg({ graffiti: true, chain: false });
    expect(describeStreet(c, compare(c, 2000, 4))).toMatch(/×\d,\d/);
    expect(describeStreet(cfg({}), compare(cfg({}), 500, 4))).toContain('Düzenli');
  });
});
