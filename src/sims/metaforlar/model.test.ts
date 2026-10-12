import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CARDS, CARD_IDS, DEFAULTS, K_REPL, backlashOne, cyberNext, cyberShare, describeCard, describeSacred, expectedBacklash,
  expectedSupport, gauges, maxShift, mulberry32, offerParts, simulateCrowd, supportOne, type CardId, type Holder, type Inputs,
} from './model';

const ch15 = (JSON.parse(readFileSync('content/chapters.json', 'utf8')).chapters as Array<{ id: string; experiments: Array<{ id: string; replication: { status: string } }> }>)
  .find((c) => c.id === 'ch15')!;
const g = (id: CardId, x: Partial<Inputs>, key: string) => gauges(id, { ...DEFAULTS, ...x }).find((q) => q.key === key)!;

describe('kart verisi chapters.json ile tutarlı (ch15)', () => {
  it('her deney kimliği vardır ve rozet durumu chapters.json ile aynıdır', () => {
    for (const id of CARD_IDS) {
      for (const e of CARDS[id].exps) {
        const real = ch15.experiments.find((q) => q.id === e.id);
        expect(real, e.id).toBeTruthy();
        expect(e.status, e.id).toBe(real!.replication.status);
      }
    }
  });
  it('bedenlenmiş biliş kartlarının çoğu tartışmalı ya da karışık', () => {
    const weak = CARD_IDS.filter((id) => CARDS[id].exps.every((e) => e.status === 'tartışmalı' || e.status === 'karışık'));
    expect(weak.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Cyberball (ch15-e1)', () => {
  it('dışlanma arttıkça acı ve dACC artar; sana gelen atış payı 1/3 -> 0', () => {
    expect(cyberShare(0)).toBeCloseTo(1 / 3, 6);
    expect(cyberShare(1)).toBe(0);
    const a = g('cyber', { excl: 0.3 }, 'acc').book, b = g('cyber', { excl: 0.9 }, 'acc').book;
    expect(b).toBeGreaterThan(a);
    expect(g('cyber', { excl: 0.9 }, 'pain').book).toBeGreaterThan(g('cyber', { excl: 0.3 }, 'pain').book);
  });
  it('arıza açıklaması dACC etkinleşmesini neredeyse siler (kitap)', () => {
    const open = g('cyber', { excl: 1 }, 'acc').book, glitch = g('cyber', { excl: 1, glitch: 1 }, 'acc').book;
    expect(glitch).toBeLessThan(open * 0.15);
  });
  it('replikasyonda duygu sağlam kalır, ortak dACC iddiası küçülür', () => {
    const pain = g('cyber', { excl: 1 }, 'pain'), acc = g('cyber', { excl: 1 }, 'acc');
    expect(pain.repl).toBe(pain.book);
    expect(acc.repl).toBeCloseTo(acc.book * K_REPL.acc, 9);
  });
  it('tohumlu atış dizisi deterministik; uzun dizide pay kuramsal değere yakın', () => {
    const run = (excl: number, seed: number, n: number) => {
      const rnd = mulberry32(seed);
      let h: Holder = 'a', got = 0;
      for (let i = 0; i < n; i++) { h = cyberNext(h, excl, rnd); if (h === 's') got++; }
      return got / n;
    };
    expect(run(0.5, 7, 400)).toBe(run(0.5, 7, 400));
    expect(run(0, 3, 6000)).toBeCloseTo(1 / 3, 1);
    expect(run(1, 3, 500)).toBe(0);
    expect(run(0.6, 3, 6000)).toBeCloseTo(cyberShare(0.6), 1);
  });
});

describe('insula (ch15-e6, e4)', () => {
  it('hem bozuk tat hem ahlaki ihlal insulayı etkinleştirir; ikisi birlikte daha çok', () => {
    const t = g('insula', { gross: 1 }, 'ins').book, v = g('insula', { viol: 1 }, 'ins').book, tv = g('insula', { gross: 1, viol: 1 }, 'ins').book;
    expect(t).toBeGreaterThan(0.4); expect(v).toBeGreaterThan(0.4);
    expect(tv).toBeGreaterThan(Math.max(t, v)); expect(tv).toBeLessThanOrEqual(1);
  });
  it('adaletsiz teklif arttıkça reddetme artar ve bu iki modda da aynıdır (sağlam)', () => {
    const lo = g('insula', { viol: 0.2 }, 'rej'), hi = g('insula', { viol: 0.9 }, 'rej');
    expect(hi.book).toBeGreaterThan(lo.book);
    expect(hi.repl).toBe(hi.book);
    expect(hi.st).toBe('sağlam');
  });
  it('tat -> yargı kayması replikasyonda neredeyse kaybolur', () => {
    const s = g('insula', { gross: 1 }, 'sev');
    expect(s.book - s.base).toBeGreaterThan(0.2);
    expect(s.repl - s.base).toBeLessThan(0.05);
  });
});

describe('fincan, pano, Macbeth, bakteri', () => {
  it('sıcak fincan: sıcakta yargı yukarı, buzluda aşağı; kontrol ölçüsü sabit', () => {
    expect(g('cup', { temp: 1 }, 'warm').book).toBeGreaterThan(0.65);
    expect(g('cup', { temp: 0 }, 'warm').book).toBeLessThan(0.35);
    expect(g('cup', { temp: 1 }, 'oth').book).toBe(0.5);
    expect(g('cup', { temp: 1 }, 'gen').book).toBeGreaterThan(0.6);
  });
  it('replikasyon sonrası fincan ve pano etkisi tabana çok yakın (başarısız replikasyonlar)', () => {
    expect(Math.abs(g('cup', { temp: 1 }, 'warm').repl - 0.5)).toBeLessThan(0.03);
    expect(Math.abs(g('clip', { weight: 1 }, 'ser').repl - 0.5)).toBeLessThan(0.03);
    expect(g('clip', { weight: 1 }, 'ser').book).toBeCloseTo(0.7, 6);
    expect(g('clip', { weight: 0 }, 'ser').book).toBeCloseTo(0.3, 6);
  });
  it('Macbeth: sözlü yalan gargarayı, yazılı yalan sabunu öne çıkarır (e8); el yıkama yardım yanıtını düşürür (e9)', () => {
    const m = { mviol: 1 } as const;
    expect(g('macbeth', { ...m, chan: 0 }, 'gar').book).toBeGreaterThan(g('macbeth', { ...m, chan: 0 }, 'sab').book);
    expect(g('macbeth', { ...m, chan: 1 }, 'sab').book).toBeGreaterThan(g('macbeth', { ...m, chan: 1 }, 'gar').book);
    expect(g('macbeth', { ...m, washed: 1 }, 'hlp').book).toBeLessThan(g('macbeth', { ...m, washed: 0 }, 'hlp').book);
    expect(g('macbeth', { ...m }, 'gar').book).toBeGreaterThan(g('macbeth', { mviol: 0 }, 'gar').book);
  });
  it('bakteri uyarısı yalnızca göç tutumunu kaydırır, ekonomi sabit (kitap)', () => {
    expect(g('germ', { lang: 1 }, 'imm').book).toBeGreaterThan(g('germ', { lang: 0 }, 'imm').book);
    expect(g('germ', { lang: 1 }, 'eco').book).toBe(g('germ', { lang: 0 }, 'eco').book);
  });
  it('replikasyon sonrası etki hiçbir kartta kitabın iddiasından büyük değil ve genel bakış tutarlı', () => {
    for (const id of CARD_IDS) {
      const s = maxShift(id);
      expect(s.repl, id).toBeLessThanOrEqual(s.book);
      expect(s.book, id).toBeGreaterThan(0);
      for (const q of gauges(id, { ...DEFAULTS, ...CARDS[id].max })) expect(Math.abs(q.repl - q.base)).toBeLessThanOrEqual(Math.abs(q.book - q.base) + 1e-9);
    }
    expect(maxShift('cup').repl).toBeLessThanOrEqual(2);
  });
  it('describeCard iki okumayı da yazar', () => {
    const d = describeCard('cup', { ...DEFAULTS, temp: 1 }, 'book');
    expect(d).toContain('kitabın iddiasında'); expect(d).toContain('replikasyon sonrası tahmin');
    expect(describeCard('cup', { ...DEFAULTS, temp: 1 }, 'repl')).toContain('replikasyon sonrası tahminde');
    expect(describeCard('insula', { ...DEFAULTS, viol: 1 }, 'book')).toContain('iki okumada aynı');
  });
});

describe('kutsal değerler (ch15-e12; Atran, Ginges)', () => {
  const sweep = (S: number, kind: 'maddi' | 'sembolik' | 'karma') => [0, 0.25, 0.5, 0.75, 1].map((z) => { const { m, y } = offerParts(kind, z); return expectedSupport(S, m, y); });
  const inc = (xs: number[]) => xs.every((v, i) => i === 0 || v >= xs[i - 1] - 1e-9);
  const dec = (xs: number[]) => xs.every((v, i) => i === 0 || v <= xs[i - 1] + 1e-9);
  it('kutsal değerde maddi teklif büyüdükçe destek düşer (ters tepki)', () => {
    const s = sweep(1, 'maddi');
    expect(dec(s)).toBe(true);
    expect(s[4]).toBeLessThan(s[0] / 2);
  });
  it('sıradan çıkarda maddi teklif desteği artırır', () => {
    const s = sweep(0, 'maddi');
    expect(inc(s)).toBe(true);
    expect(s[4]).toBeGreaterThan(s[0] + 0.3);
  });
  it('sembolik jest kutsal değerde desteği artırır', () => {
    const s = sweep(1, 'sembolik');
    expect(inc(s)).toBe(true);
    expect(s[4]).toBeGreaterThan(s[0] + 0.3);
  });
  it('kutsallık arttıkça maddi teklifin etkisi yön değiştirir (eşik ortalarda)', () => {
    const slope = (S: number) => { const lo = offerParts('maddi', 0), hi = offerParts('maddi', 1); return expectedSupport(S, hi.m, hi.y) - expectedSupport(S, lo.m, lo.y); };
    expect(slope(0.1)).toBeGreaterThan(0);
    expect(slope(0.9)).toBeLessThan(0);
    expect(slope(0.9)).toBeLessThan(slope(0.6));
  });
  it('sembolik jest maddi teklifin ters tepkisini yumuşatır; karma kutsalda sembolik tek başına kadar iyi', () => {
    expect(supportOne(1, 0.6, 0.6)).toBeGreaterThan(supportOne(1, 0.6, 0));
    expect(backlashOne(1, 0.6, 0.6)).toBeLessThan(backlashOne(1, 0.6, 0));
    expect(backlashOne(1, 0.6, 1)).toBe(0);
    for (const S of [0, 0.3, 0.6, 1]) expect(sweep(S, 'karma')[4]).toBeGreaterThanOrEqual(sweep(S, 'sembolik')[4] - 1e-9);
  });
  it('ters tepki yalnızca maddi tekliflerde ve kutsallıkla artar', () => {
    expect(expectedBacklash(0.9, 0.8, 0)).toBeGreaterThan(expectedBacklash(0.2, 0.8, 0));
    expect(expectedBacklash(0.9, 0, 0.8)).toBe(0);
    expect(expectedBacklash(0, 0.8, 0)).toBeLessThan(0.1);
  });
  it('tohumlu kalabalık deterministik, 100 kişi, toplamlar tutar; beklenen desteğe yakın', () => {
    const a = simulateCrowd(0.3, 0.5, 0.2, 5), b = simulateCrowd(0.3, 0.5, 0.2, 5), c = simulateCrowd(0.3, 0.5, 0.2, 6);
    expect(a).toEqual(b);
    expect(a.dots.length).toBe(100);
    expect(a.accept + a.reject + a.angry).toBe(100);
    expect(a.dots.join('')).not.toBe(c.dots.join(''));
    const avg = [1, 2, 3, 4, 5, 6, 7, 8].reduce((t, sd) => t + simulateCrowd(0.3, 0.5, 0.2, sd).accept, 0) / 8 / 100;
    expect(Math.abs(avg - expectedSupport(0.3, 0.5, 0.2))).toBeLessThan(0.06);
    expect(simulateCrowd(1, 1, 0, 2).angry).toBeGreaterThan(50);
    expect(simulateCrowd(1, 0, 1, 2).angry).toBe(0);
  });
  it('describeSacred sayıları yazar', () => {
    const d = describeSacred(1, 'maddi', 1);
    expect(d).toContain('ters tepki'); expect(d).toMatch(/destek %\d+/);
  });
});
