import { describe, expect, it } from 'vitest';
import { loadReferenceModel } from '../../test/reference';
import * as ts from './model';

// Orijinal HTML'deki model script'i ile TS portu aynı girdilerde birebir aynı sayıları vermeli.
const ref = loadReferenceModel('bir-saniye-once.html');

const SCEN: Array<{ u: Partial<ts.Inputs>; lesion: ts.Lesion }> = [
  { u: {}, lesion: {} },
  { u: { threat: 0.9 }, lesion: {} },
  { u: { threat: 0.5, frontal: 0.3 }, lesion: {} },
  { u: { cue: 0.8, prob: 0.5 }, lesion: {} },
  { u: { cue: 0.8, prob: 0.5, effort: 0.9 }, lesion: {} },
  { u: { cue: 0.8, prob: 1 }, lesion: {} },
  { u: { threat: 0.4, stress: 0.9, frontal: 0.5 }, lesion: {} },
  { u: { threat: 0.3, cue: 0.8, prob: 0.5, frontal: 0.4 }, lesion: {} },
  { u: { threat: 0.9 }, lesion: { bla: true, cea: true } },
  { u: { threat: 0.5 }, lesion: { vmpfc: true } },
  { u: { threat: 0.7, cue: 0.3, prob: 0.2, effort: 0.4, stress: 0.2 }, lesion: { dlpfc: true, itc: true } },
];

describe('orijinal HTML modeli ile eşdeğerlik (bir-saniye-once)', () => {
  it('sabitler aynı', () => {
    expect(ts.NODES).toEqual(ref.NODES);
    expect(ts.EDGES).toEqual(ref.EDGES);
    expect(ts.REST).toEqual(ref.REST);
  });

  it.each(SCEN.map((s, i) => [i, s] as const))('senaryo %i: settle, describe, netInput, kontrol', (_i, s) => {
    const u = { ...ts.REST, ...s.u };
    const a = ts.settle(u, s.lesion, 12);
    const b = ref.settle(u, s.lesion, 12);
    expect(a).toEqual(b);
    expect(ts.controlOf(a)).toBe(ref.controlOf(b));
    expect(ts.describe(a, u, s.lesion)).toBe(ref.describe(b, u, s.lesion));
    expect(ts.inputs(u)).toEqual(ref.inputs(u));
    expect(ts.gains(u)).toEqual(ref.gains(u));
    for (const n of ts.NODES) expect(ts.netInput(n.id, a, u, s.lesion)).toEqual(ref.netInput(n.id, b, u, s.lesion));
    // Kısa süre sonraki ara durum (geçiş dinamiği)
    expect(ts.settle(u, s.lesion, 0.6)).toEqual(ref.settle(u, s.lesion, 0.6));
    expect(ts.step(a, u, s.lesion, 0.02)).toEqual(ref.step(b, u, s.lesion, 0.02));
  });

  it('sig aynı', () => {
    for (let z = -1; z <= 2; z += 0.05) expect(ts.sig(z)).toBe(ref.sig(z));
  });
});
