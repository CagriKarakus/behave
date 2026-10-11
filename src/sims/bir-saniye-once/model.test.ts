import { describe, expect, it } from 'vitest';
import { EDGES, NODES, REST, controlOf, describe as say, gains, inputs, netInput, settle, sig, step, type Activity, type Inputs, type Lesion } from './model';

const u = (p: Partial<Inputs> = {}): Inputs => ({ ...REST, ...p });

describe('Bir Saniye Önce modeli', () => {
  it('9 bölge ve 15 bağlantı içerir', () => {
    expect(NODES).toHaveLength(9);
    expect(EDGES).toHaveLength(15);
  });

  it('dinlenmede tüm devreler düşük, kontrol yüksek kalır', () => {
    const x = settle(REST, {});
    expect(x.cea).toBeLessThan(0.2);
    expect(x.nacc).toBeLessThan(0.3);
    expect(controlOf(x)).toBeGreaterThan(0.2);
    expect(say(x, REST, {})).toBe('Dinlenme hâli: tüm devreler düşük, frontal korteks denetimde.');
    for (const n of NODES) { expect(x[n.id]).toBeGreaterThanOrEqual(0); expect(x[n.id]).toBeLessThanOrEqual(1); }
  });

  it('lezyonlu düğüm 0 kalır ve çıktısı hedeflere gitmez', () => {
    const lesion: Lesion = { bla: true, cea: true };
    const x = settle(u({ threat: 0.9 }), lesion);
    expect(x.bla).toBe(0);
    expect(x.cea).toBe(0);
    expect(say(x, u({ threat: 0.9 }), lesion)).toContain('Amigdala devre dışı');
    expect(netInput('itc', x, u({ threat: 0.9 }), lesion).parts.find((p) => p.from === 'bla')?.v).toBe(0);
  });

  it('tehdit artınca CeA artar', () => {
    const lo = settle(u({ threat: 0.1 }), {}).cea;
    const mid = settle(u({ threat: 0.5 }), {}).cea;
    const hi = settle(u({ threat: 0.9 }), {}).cea;
    expect(mid).toBeGreaterThan(lo);
    expect(hi).toBeGreaterThan(mid);
  });

  it('zayıf frontal güç, güçlü olana göre daha yüksek CeA verir', () => {
    const strong = settle(u({ threat: 0.5 }), {}).cea;
    const weak = settle(u({ threat: 0.5, frontal: 0.3 }), {}).cea;
    expect(weak).toBeGreaterThan(strong);
  });

  it('ödül belirsizken (%50) VTA, kesin ödüle göre yüksektir', () => {
    expect(settle(u({ cue: 0.8, prob: 0.5 }), {}).vta).toBeGreaterThan(settle(u({ cue: 0.8, prob: 1 }), {}).vta);
  });

  it('describe: senaryo cümleleri', () => {
    const t = u({ threat: 0.9 });
    expect(say(settle(t, {}), t, {})).toBe('Amigdala yüksek; frontal korteks devrede ama tehdit çok güçlü.');
    const w = u({ threat: 0.9, frontal: 0.1 });
    expect(say(settle(w, {}), w, {})).toBe('Amigdala baskın, frontal fren zayıf: tepki dizginlenemiyor.');
    const vm: Lesion = { vmpfc: true };
    const tv = u({ threat: 0.5 });
    expect(say(settle(tv, vm), tv, vm)).toContain('vmPFC yok');
    const bla: Lesion = { bla: true };
    expect(say(settle(t, bla), t, bla)).toContain('BLA yok');
  });

  it('sig 0.5 noktasında 0.5, step lezyonda 0', () => {
    expect(sig(0.5)).toBe(0.5);
    const x = Object.fromEntries(NODES.map((n) => [n.id, 0.5])) as Activity;
    expect(step(x, REST, { nacc: true }, 0.02).nacc).toBe(0);
  });

  it('inputs ve gains beklenen yapıda', () => {
    expect(inputs(u({ effort: 1 })).acc).toBeCloseTo(0.7);
    expect(gains(u({ stress: 1, frontal: 1 })).ofc).toBeCloseTo(0.55);
    expect(gains(u({ stress: 1 })).bla).toBeCloseTo(1.5);
  });
});
