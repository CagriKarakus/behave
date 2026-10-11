import { describe, expect, it } from 'vitest';
import { loadReferenceModel } from '../../test/reference';
import * as ts from './model';

// Orijinal HTML'deki model script'i ile TS portu aynı girdilerde birebir aynı sayıları vermeli.
const ref = loadReferenceModel('endokrin-eksen.html');
const AXES = ['hpa', 'hpg', 'two', 'glu'] as const;
const INPUTS: Partial<ts.AxisInputs>[] = [
  {}, { drive: 0.9 }, { drive: 0.5, other: 0.6 }, { drive: 0.7, other: -0.8 }, { drive: 0.9, feedback: 0 },
  { meal: 1, brain: 0.5 }, { meal: 0.3 }, { brain: 1 },
];

describe('orijinal HTML modeli ile eşdeğerlik (endokrin-eksen)', () => {
  it('sabitler aynı', () => {
    expect(ts.AX).toEqual(ref.AX);
    expect(ts.U0).toEqual(ref.U0);
    expect(ts.MS).toEqual(ref.MS);
  });

  for (const axis of AXES) {
    it(`${axis}: settleAxis, stepAxis dizisi, describeAxis`, () => {
      for (const p of INPUTS) {
        const u = { ...ts.U0, ...p };
        const a = ts.settleAxis(axis, u, 900);
        const b = ref.settleAxis(axis, u, 900);
        expect(a).toEqual(b);
        let xa = a, xb = b;
        for (let t = 0; t < 120; t++) {
          const u2 = { ...u, drive: t < 30 ? 1 : u.drive, meal: t < 30 ? 1 : u.meal };
          xa = ts.stepAxis(axis, xa, u2, t % 3 === 0 ? 1 : 2.5);
          xb = ref.stepAxis(axis, xb, u2, t % 3 === 0 ? 1 : 2.5);
          expect(xa).toEqual(xb);
          if (t % 10 === 0) for (const pulsing of [false, true]) expect(ts.describeAxis(axis, xa, u2, pulsing)).toBe(ref.describeAxis(axis, xb, u2, pulsing));
        }
        expect(ts.describeAxis(axis, a, u, false)).toBe(ref.describeAxis(axis, b, u, false));
      }
    });
  }

  it('receptor: ızgara', () => {
    const g = [0, 0.15, 0.4, 0.5, 0.8, 1];
    for (const hormone of g) for (const number of g) for (const affinity of g) for (const specificity of g) for (const other of g) {
      const p = { hormone, number, affinity, specificity, other };
      expect(ts.receptor(p)).toEqual(ref.receptor(p));
    }
  });

  it('neuroAt, hormAt, msOfLog, organ, clamp, lag', () => {
    for (let v = 0; v <= 8.94; v += 0.06) {
      const ms = ts.msOfLog(v);
      expect(ms).toBe(ref.msOfLog(v));
      expect(ts.neuroAt(ms)).toBe(ref.neuroAt(ms));
      expect(ts.hormAt(ms)).toBe(ref.hormAt(ms));
    }
    for (const f of [0, 0.3, 0.5, 1]) for (const a of [0, 0.6, 1]) expect(ts.organ(f, a)).toEqual(ref.organ(f, a));
    for (const v of [-2, 0, 0.4, 1, 3]) expect(ts.clamp(v)).toBe(ref.clamp(v));
    expect(ts.lag(0.2, 0.9, 8, 15, 1)).toBe(ref.lag(0.2, 0.9, 8, 15, 1));
    expect(ts.lag(0.9, 0.2, 8, 15, 1)).toBe(ref.lag(0.9, 0.2, 8, 15, 1));
  });
});
