import { describe, expect, it } from 'vitest';
import { AX, MS, U0, clamp, describeAxis, hormAt, lag, msOfLog, neuroAt, organ, receptor, settleAxis, stepAxis, type AxisInputs } from './model';

const ux = (p: Partial<AxisInputs> = {}): AxisInputs => ({ ...U0, ...p });

describe('Endokrin modeli', () => {
  it('dinlenmede eksenler düşük kalır', () => {
    for (const k of ['hpa', 'hpg', 'two'] as const) {
      const x = settleAxis(k, ux());
      expect(Math.max(...x.s)).toBeLessThan(0.22);
      expect(x.s).toHaveLength(AX[k].n);
      expect(describeAxis(k, x, ux(), false)).toBe('Dinlenme: eksen düşük, hedef hücreler sakin.');
    }
    const g = settleAxis('glu', ux());
    expect(g.s[0]).toBeLessThan(0.3);
    expect(describeAxis('glu', g, ux(), false)).toContain('Dinlenme');
  });

  it('sürücü artınca son basamak ve hedef hücre yanıtı artar', () => {
    const lo = settleAxis('hpa', ux({ drive: 0.2 }));
    const hi = settleAxis('hpa', ux({ drive: 0.9 }));
    expect(hi.s[2]).toBeGreaterThan(lo.s[2]);
    expect(hi.e).toBeGreaterThan(lo.e);
  });

  it('geri bildirim kapalıyken son hormon daha yüksek', () => {
    const on = settleAxis('hpa', ux({ drive: 0.9, feedback: 1 }));
    const off = settleAxis('hpa', ux({ drive: 0.9, feedback: 0 }));
    expect(off.s[2]).toBeGreaterThan(on.s[2]);
    expect(describeAxis('hpa', off, ux({ drive: 0.9, feedback: 0 }), false)).toContain('Geri bildirim yok');
  });

  it('sinyal yukarıdan aşağı ilerler: darbe sonrası üst basamak önce yükselir', () => {
    let x = settleAxis('hpa', ux());
    for (let t = 0; t < 10; t++) x = stepAxis('hpa', x, ux({ drive: 1 }), 1);
    expect(x.s[0]).toBeGreaterThan(x.s[1]);
    expect(x.s[1]).toBeGreaterThan(x.s[2]);
    expect(describeAxis('hpa', x, ux({ drive: 1 }), true)).toContain('yukarıdan aşağı');
  });

  it('yemek glikozu yükseltir, insülin geriden gelir', () => {
    let x = settleAxis('glu', ux());
    for (let t = 0; t < 20; t++) x = stepAxis('glu', x, ux({ meal: 1 }), 1);
    expect(x.s[0]).toBeGreaterThan(0.3);
    const d = describeAxis('glu', { s: [0.7, 0.3], e: 0 }, ux({ meal: 1 }), true);
    expect(d).toContain('insülin geriden geliyor');
  });

  it('receptor: number=0 iken response=0', () => {
    const r = receptor({ hormone: 0.9, number: 0, affinity: 0.5, specificity: 1, other: 0 });
    expect(r.response).toBe(0);
    expect(r.occ).toBeGreaterThan(0);
  });

  it('receptor: titiz değilse yanlış hormon payı oluşur, titizse 0', () => {
    expect(receptor({ hormone: 0.4, number: 0.6, affinity: 0.5, specificity: 1, other: 0.8 }).wrongShare).toBe(0);
    expect(receptor({ hormone: 0.4, number: 0.6, affinity: 0.5, specificity: 0.15, other: 0.8 }).wrongShare).toBeGreaterThan(0.3);
    expect(receptor({ hormone: 0, number: 1, affinity: 0.5, specificity: 1, other: 0 }).wrongShare).toBe(0);
  });

  it('receptor: bağlanma isteği yükselince doluluk artar', () => {
    const a = receptor({ hormone: 0.3, number: 0.5, affinity: 0.2, specificity: 1, other: 0 }).occ;
    const b = receptor({ hormone: 0.3, number: 0.5, affinity: 0.9, specificity: 1, other: 0 }).occ;
    expect(b).toBeGreaterThan(a);
  });

  it('neuroAt / hormAt: milisaniyede nörotransmitter, saatlerde hormon', () => {
    expect(neuroAt(5)).toBeGreaterThan(0.5);
    expect(hormAt(5)).toBeLessThan(0.01);
    expect(neuroAt(MS.h)).toBeLessThan(1e-6);
    expect(hormAt(MS.h)).toBeGreaterThan(0.9);
    expect(hormAt(5 * MS.day)).toBeLessThan(hormAt(MS.day));
    expect(neuroAt(0)).toBe(0);
    expect(msOfLog(3)).toBeCloseTo(1000);
  });

  it('organ: yapı 0.3..1, etki [0,1]', () => {
    expect(organ(0, 1)).toEqual({ structure: 0.3, effect: 0.3 });
    expect(organ(1, 1)).toEqual({ structure: 1, effect: 1 });
    expect(organ(0.5, 0).effect).toBe(0);
    expect(organ(0.5, 0.6).structure).toBeCloseTo(0.65);
  });

  it('clamp ve lag', () => {
    expect(clamp(2)).toBe(1);
    expect(clamp(-1)).toBe(0);
    expect(lag(0, 1, 10, 10, 1)).toBeCloseTo(1 - Math.exp(-0.1));
    expect(lag(1, 0, 10, 5, 1)).toBeCloseTo(Math.exp(-0.2));
  });
});
