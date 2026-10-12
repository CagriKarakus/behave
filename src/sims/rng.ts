// Simülasyonların ortak tohumlu rastgele sayı üreteci (mulberry32): testler ve "yeniden çalıştır"
// deterministik kalsın. Aynı tohum her zaman aynı diziyi verir.
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates karıştırma; girdiyi değiştirmez. */
export function shuffle<T>(xs: readonly T[], rnd: Rng): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Standart normal örnek (Box-Muller). */
export function normal(rnd: Rng): number {
  const u = Math.max(1e-9, rnd());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd());
}
