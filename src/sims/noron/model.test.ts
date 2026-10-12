import { describe, expect, it } from 'vitest';
import {
  AMP0, DEND, PEAK, REST, SYN_DEFAULT, THR, advance, advanceSyn, createNeuron, createSyn, edgeStats, feedback, feedforward, fiCurve, lateral, pattern,
  pspMv, queue, recentRate, release, singleSpike, tInput, tStats, trial, vOf, type SynP,
} from './model';

const six = [0, 1, 2, 3, 4, 5];
const volley = (n: Parameters<typeof queue>[0], ds: number[], s: 1 | -1, delay: number) => { for (const d of ds) queue(n, d, s, delay); };

describe('toplama ve eşik', () => {
  it('dinlenme gerilimi kitaptaki gibi -70 mV; girdi yokken değişmez ve ateşlemez', () => {
    const n = createNeuron(1);
    advance(n, 200, { thr: THR, exc: 0, inh: 0 });
    expect(REST).toBe(-70);
    expect(vOf(n)).toBeCloseTo(-70, 6);
    expect(n.spikes.length).toBe(0);
  });

  it('tek girdi yalnızca küçük bir dalgalanma yapıp söner (kitap)', () => {
    const r = trial((n) => queue(n, 0, 1, 5));
    expect(r.spikes).toBe(0);
    expect(r.analogPeak).toBeGreaterThan(AMP0 * 0.9);
    expect(r.analogPeak).toBeLessThan(AMP0 * 1.05);
    expect(THR - REST).toBeGreaterThan(r.analogPeak * 3);
  });

  it('uzak dendrit daha zayıf; en uzaktaki tek girdi en yakının yarısı kadar', () => {
    expect(pspMv(5)).toBeLessThan(pspMv(0));
    expect(pspMv(5)).toBeCloseTo(pspMv(0) / 2, 6);
    expect(DEND.length).toBe(6);
  });

  it('uzamsal toplama: altı dendrit birlikte ateşletir, dördü ateşletmez', () => {
    expect(trial((n) => volley(n, six, 1, 5)).spikes).toBe(1);
    expect(trial((n) => volley(n, [0, 1, 2, 3], 1, 5)).spikes).toBe(0);
  });

  it('zamansal toplama: sekiz girdi sıkça gelirse ateşler, seyrek gelirse ateşlemez', () => {
    const train = (gap: number) => trial((n) => { for (let i = 0; i < 8; i++) queue(n, 0, 1, 5 + i * gap); });
    expect(train(2).spikes).toBe(1);
    expect(train(8).spikes).toBe(0);
    expect(train(2).analogPeak).toBeGreaterThan(train(8).analogPeak * 2);
  });

  it('engelleyici girdi toplamı eşiğin altına çeker', () => {
    expect(trial((n) => { volley(n, six, 1, 5); volley(n, [0, 1, 2], -1, 5); }).spikes).toBe(0);
  });

  it('tam ya da hiç: zayıf ve çok güçlü uyarı aynı tepeyi verir, analog toplam farklıdır', () => {
    const weak = trial((n) => volley(n, [0, 1, 2, 3, 4], 1, 5));
    const strong = trial((n) => { for (let k = 0; k < 3; k++) volley(n, six, 1, 5); });
    expect(weak.spikes).toBe(1);
    expect(strong.spikes).toBe(1);
    expect(weak.vPeak).toBe(PEAK);
    expect(strong.vPeak).toBe(PEAK);
    expect(strong.analogPeak).toBeGreaterThan(weak.analogPeak * 2.5);
  });

  it('refrakter dönem: 2 ms sonra gelen ikinci dalga boşa gider, 25 ms sonra gelen ateşletir', () => {
    expect(trial((n) => { volley(n, six, 1, 5); volley(n, six, 1, 7); }).spikes).toBe(1);
    expect(trial((n) => { volley(n, six, 1, 5); volley(n, six, 1, 30); }).spikes).toBe(2);
  });

  it('eşik yükselince aynı girdi ateşletmez', () => {
    expect(trial((n) => volley(n, [0, 1, 2, 3, 4], 1, 5), THR).spikes).toBe(1);
    expect(trial((n) => volley(n, [0, 1, 2, 3, 4], 1, 5), -52).spikes).toBe(0);
  });

  it('ateşleme hızı girdi şiddetiyle artar; engelleyici girdi eğriyi sağa kaydırır; tohum aynıysa sonuç aynı', () => {
    const a = fiCurve(THR, 0), b = fiCurve(THR, 0.5);
    expect(a[0]).toBe(0);
    expect(a[10]).toBeGreaterThan(a[5]);
    expect(a[5]).toBeGreaterThan(a[3]);
    expect(a[10]).toBeGreaterThan(60);
    expect(a[10]).toBeLessThan(150);
    expect(b[5]).toBeLessThan(a[5] * 0.7);
    expect(fiCurve(THR, 0)).toEqual(a);
    const n = createNeuron(4);
    advance(n, 500, { thr: THR, exc: 0.7, inh: 0 });
    expect(recentRate(n)).toBeGreaterThan(20);
  });
});

describe('sinaps', () => {
  const P = (p: Partial<SynP> = {}): SynP => ({ ...SYN_DEFAULT, ...p });

  it('impuls q birim salar; hız 0 iken kendiliğinden salım olmaz', () => {
    const s = createSyn();
    release(s, P({ q: 1.2 }));
    expect(s.C).toBeCloseTo(1.2, 9);
    const s2 = createSyn();
    advanceSyn(s2, P({ rate: 0 }), 300, true);
    expect(s2.released).toBe(0);
    const s3 = createSyn();
    advanceSyn(s3, P({ rate: 20 }), 300);
    expect(s3.released).toBeGreaterThanOrEqual(6);
  });

  it('yollar toplamı 1; baskın yol geri alım, enzim baskın türde enzim', () => {
    const a = singleSpike(P()), b = singleSpike(P({ type: 'enzim' }));
    expect(a.fRu + a.fEn + a.fDf).toBeCloseTo(1, 2);
    expect(a.fRu).toBeGreaterThan(0.6);
    expect(b.fEn).toBeGreaterThan(0.8);
  });

  it('geri alımı engellemek yarı ömrü ve yanıt süresini uzatır, enzime kayar (SSRI benzeri)', () => {
    const a = singleSpike(P()), b = singleSpike(P({ blockRu: true }));
    expect(b.half).toBeGreaterThan(a.half * 2.5);
    expect(b.dur).toBeGreaterThan(a.dur * 1.7);
    expect(b.peakR).toBeGreaterThan(a.peakR);
    expect(b.fEn).toBeGreaterThan(a.fEn * 2);
  });

  it('enzimi engellemek geri alım baskın sinapsta az, enzim baskın sinapsta çok işe yarar', () => {
    const g0 = singleSpike(P()), g1 = singleSpike(P({ blockEn: true }));
    const e0 = singleSpike(P({ type: 'enzim' })), e1 = singleSpike(P({ type: 'enzim', blockEn: true }));
    expect(g1.half / g0.half).toBeLessThan(1.4);
    expect(e1.half / e0.half).toBeGreaterThan(4);
  });

  it('reseptör yoğunluğu yanıtı ölçekler, nörotransmitter düzeyini değil', () => {
    const a = singleSpike(P({ density: 1 })), b = singleSpike(P({ density: 0.5 }));
    expect(b.peakR / a.peakR).toBeCloseTo(0.5, 1);
    expect(b.half).toBeCloseTo(a.half, 6);
  });

  it('sık ateşlemede geri alım engeli düzeyi biriktirir', () => {
    const mean = (p: SynP) => { const s = createSyn(); advanceSyn(s, p, 600, true); return s.tr.reduce((x, r) => x + r[1], 0) / s.tr.length; };
    expect(mean(P({ blockRu: true, rate: 40 }))).toBeGreaterThan(mean(P({ rate: 40 })) * 2.5);
    expect(mean(P({ rate: 40 }))).toBeGreaterThan(mean(P({ rate: 10 })));
  });
});

describe('devreler', () => {
  it('yanal inhibisyon yokken çıkış girişin aynısı; düzgün alan 1/(1+g) olur', () => {
    const p = pattern('basamak');
    const o = lateral(p.v, 0, 2);
    o.forEach((v, i) => expect(v).toBeCloseTo(p.v[i], 9));
    const flat = lateral(Array(16).fill(0.6), 1, 3);
    flat.forEach((v) => expect(v).toBeCloseTo(0.3, 3));
  });

  it('yanal inhibisyon kenar zıtlığını artırır: parlak tarafta aşım, karanlık tarafta çukur; düz bölge zayıflar', () => {
    const p = pattern('basamak');
    const s0 = edgeStats(p, lateral(p.v, 0, 2)), s1 = edgeStats(p, lateral(p.v, 0.5, 2)), s2 = edgeStats(p, lateral(p.v, 1, 2));
    expect(s0.contrast).toBeCloseTo(1, 6);
    expect(s1.contrast).toBeGreaterThan(1.3);
    expect(s2.contrast).toBeGreaterThan(s1.contrast);
    expect(s2.overshoot).toBeGreaterThan(0.2);
    expect(s2.plateau).toBeLessThan(0.6);
    const o = lateral(p.v, 1, 2);
    expect(o[p.e]).toBeLessThan(o[p.lo]);
    expect(o[p.e + 1]).toBeGreaterThan(o[p.hi]);
    const bar = pattern('cubuk');
    expect(edgeStats(bar, lateral(bar.v, 1, 2)).contrast).toBeGreaterThan(1.5);
    const noisy = pattern('gurultu');
    expect(edgeStats(noisy, lateral(noisy.v, 1, 2)).contrast).toBeGreaterThan(1.5);
  });

  it('negatif geri bildirim sinyali kısaltır: uzun girdide yanıt süresi ve sondaki yanıt düşer', () => {
    const inp = tInput('uzun');
    const a = tStats(feedback(inp, 0), inp), b = tStats(feedback(inp, 2.5), inp);
    expect(a.dur).toBeGreaterThan(140);
    expect(b.dur).toBeLessThan(a.dur / 3);
    expect(b.tail).toBeLessThan(0.4);
    expect(b.peak).toBeLessThan(a.peak);
  });

  it('ileri beslemeli inhibisyon yanıtı gecikme kadar daraltır; gecikme uzayınca genişler; baskı yokken girdi kadar sürer', () => {
    const inp = tInput('uzun');
    const none = tStats(feedforward(inp, 0, 10), inp);
    const d10 = tStats(feedforward(inp, 1, 10), inp), d20 = tStats(feedforward(inp, 1, 20), inp);
    expect(none.dur).toBeGreaterThan(140);
    expect(d10.dur).toBeGreaterThan(7);
    expect(d10.dur).toBeLessThan(15);
    expect(d20.dur).toBeGreaterThan(d10.dur * 1.6);
    expect(d10.tail).toBeLessThan(0.05);
    expect(d10.peak).toBeGreaterThan(0.9);
  });

  it('iki vuru ileri beslemeli devrede iki ayrı kısa yanıt verir', () => {
    const inp = tInput('iki');
    const out = feedforward(inp, 1, 10);
    expect(tStats(out, inp).dur).toBeLessThan(25);
    const hi = out.map((v) => v >= 0.5);
    let edges = 0;
    for (let i = 1; i < hi.length; i++) if (hi[i] && !hi[i - 1]) edges++;
    expect(edges).toBe(2);
  });
});
