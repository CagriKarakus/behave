import { describe, expect, it } from 'vitest';
import { mulberry32, normal, shuffle } from './rng';

describe('ortak tohumlu RNG', () => {
  it('eski kopyalarla aynı sayıları üretir (mulberry32 değişmedi)', () => {
    const r = mulberry32(1);
    expect([r(), r(), r()]).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
    const q = mulberry32(12345);
    expect([q(), q()]).toEqual([0.9797282677609473, 0.3067522644996643]);
  });

  it('aynı tohum aynı diziyi, farklı tohum farklı diziyi verir; değerler [0,1)', () => {
    const a = mulberry32(9), b = mulberry32(9), c = mulberry32(10);
    const xs = Array.from({ length: 50 }, () => a());
    expect(Array.from({ length: 50 }, () => b())).toEqual(xs);
    expect(Array.from({ length: 50 }, () => c())).not.toEqual(xs);
    expect(xs.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('shuffle girdiyi değiştirmez, tohumla belirlidir ve eski sonucu verir', () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(shuffle(src, mulberry32(7))).toEqual([5, 7, 2, 3, 4, 6, 8, 1]);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffle(src, mulberry32(3))].sort()).toEqual(src);
  });

  it('normal: ortalama ~0, standart sapma ~1', () => {
    const r = mulberry32(4);
    const xs = Array.from({ length: 20000 }, () => normal(r));
    const m = xs.reduce((s, v) => s + v, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
    expect(Math.abs(m)).toBeLessThan(0.03);
    expect(Math.abs(sd - 1)).toBeLessThan(0.03);
  });
});
