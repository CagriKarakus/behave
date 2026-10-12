import { describe, expect, it } from 'vitest';
import {
  ACTIONS, ROOM_ACTIONS, ROOM_TARGETS, SCENARIOS, TROOP_DEFAULT, action, blur, circuit, coherence, fit, meanD, meanH, meaning, nearest, newTroop,
  profile, rankMean, ratExperiment, stepTroop, systems, verdict, type ActionKey, type TroopParams,
} from './model';

const run = (seed: number, p: TroopParams, n = 1500) => { const t = newTroop(seed); for (let i = 0; i < n; i++) stepTroop(t, p); return t; };
const sc = (k: string) => SCENARIOS.find((s) => s.key === k)!;

describe('saldırganlık haritası', () => {
  it('yedi tür, değerler 0-1 aralığında', () => {
    expect(SCENARIOS).toHaveLength(7);
    for (const s of SCENARIOS) for (const v of Object.values(s.axes)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });
  it('savunma reaktif-sıcak-dürtüsel, planlı soğukkanlı şiddet tam tersi', () => {
    expect(profile(sc('savunma').axes)).toBe('reaktif, sıcakkanlı, dürtüsel');
    expect(profile(sc('planli').axes)).toBe('proaktif, soğukkanlı, planlı');
  });
  it('sistem yükleri farklı biyolojiye işaret eder', () => {
    const s = systems(sc('savunma').axes, sc('savunma')), p = systems(sc('planli').axes, sc('planli'));
    expect(s.amy).toBeGreaterThan(p.amy + 0.4);
    expect(p.pfc).toBeGreaterThan(s.pfc + 0.4);
    expect(p.dop).toBeGreaterThan(s.dop);
    const st = systems(sc('statu').axes, sc('statu')), yr = systems(sc('yer').axes, sc('yer'));
    expect(st.test).toBeGreaterThan(yr.test);
    expect(yr.gc).toBeGreaterThan(st.gc);
  });
  it('uyum: uçlar uyumlu, karışık konum dağınık; bulanıklık metni', () => {
    expect(coherence(sc('savunma').axes)).toBeGreaterThan(0.85);
    expect(coherence(sc('planli').axes)).toBeGreaterThan(0.85);
    expect(coherence(sc('statu').axes)).toBeLessThan(coherence(sc('savunma').axes));
    expect(coherence({ a: 1, b: 1, c: 0 })).toBeLessThan(0.1);
    expect(blur({ a: 0.9, b: 0.1, c: 0.9 })).toBe('sıcakkanlı ama proaktif ve planlı');
    expect(blur(sc('savunma').axes)).toBe('');
  });
  it('en yakın tür: savunmaya yer değiştirme, planlıya avcılık', () => {
    const pos = SCENARIOS.map((s) => s.axes);
    expect(SCENARIOS[nearest(pos, 0)].key).toBe('yer');
    expect(SCENARIOS[nearest(pos, 4)].key).toBe('avcilik');
  });
});

describe('bağlam kapısı', () => {
  const pre = (k: ActionKey, name: string) => action(k).presets.find((p) => p.name.startsWith(name))!.c;
  it('aynı eylem bağlama göre anlam değiştirir', () => {
    expect(verdict(fit('kes', pre('kes', 'Cerrah')))).toBe('good');
    expect(verdict(fit('kes', pre('kes', 'Saldırgan')))).toBe('bad');
    expect(verdict(fit('tetik', pre('tetik', 'Asker')))).toBe('good');
    expect(verdict(fit('tetik', pre('tetik', 'Katil')))).toBe('bad');
    expect(verdict(fit('sar', pre('sar', 'Yas')))).toBe('good');
    expect(verdict(fit('sar', pre('sar', 'Yabancı')))).toBe('bad');
    expect(meaning('kes', 0.9)).toBe('Ameliyat: şifa');
    expect(meaning('tetik', 0.1)).toBe('Cinayet');
  });
  it('orta bölge: yetkisiz savunma tartışmalıdır', () => {
    expect(verdict(fit('tetik', pre('tetik', 'Sivil')))).toBe('mid');
  });
  it('uygunluk ihtiyaç ve rızayla artar (kesme)', () => {
    const c = { need: 0, threat: 0, consent: 0, auth: 0 };
    expect(fit('kes', { ...c, consent: 1 })).toBeGreaterThan(fit('kes', c));
    expect(fit('kes', { ...c, need: 1, consent: 1 })).toBeGreaterThan(fit('kes', { ...c, consent: 1 }));
  });
  it('King ve ark.: bandaj-yaralı ile ateş-uzaylı benzer devre, yanlış eşleşmeler düşük', () => {
    const f = (a: ActionKey, ti: number) => circuit(fit(a, ROOM_TARGETS[ti].c));
    const bandHurt = f('bandaj', 0), fireAlien = f('tetik', 1), fireHurt = f('tetik', 0), bandAlien = f('bandaj', 1);
    expect(Math.abs(bandHurt - fireAlien)).toBeLessThan(0.1);
    expect(bandHurt).toBeGreaterThan(0.65);
    expect(fireAlien).toBeGreaterThan(0.65);
    expect(fireHurt).toBeLessThan(0.3);
    expect(bandAlien).toBeLessThan(0.3);
    expect(ROOM_ACTIONS).toEqual(['bandaj', 'tetik']);
  });
  it('motor yük bağlamdan bağımsızdır; eylemler farklı', () => {
    expect(new Set(ACTIONS.map((a) => a.motorLoad)).size).toBe(ACTIONS.length);
  });
});

describe('yer değiştirme saldırganlığı', () => {
  const base = TROOP_DEFAULT;
  it('aynı tohum aynı sonuç (deterministik)', () => {
    expect(run(5, base, 200).gc).toEqual(run(5, base, 200).gc);
    expect(run(5, base, 200).gc).not.toEqual(run(6, base, 200).gc);
  });
  it('stres 0-1 aralığında kalır', () => {
    const t = run(2, { ...base, hit: 0.6, freq: 4, displace: 1, relief: 0 });
    for (const g of t.gc) { expect(g).toBeGreaterThanOrEqual(0); expect(g).toBeLessThanOrEqual(1); }
  });
  it('ch01-e1: saldırabilen bireyde stres hormonu daha düşük', () => {
    const t = run(11, base);
    expect(meanD(t)).toBeLessThan(meanH(t) - 0.03);
  });
  it('boşalma etkisi 0 iken fark kaybolur: fark varsayımdan gelir', () => {
    const t = run(11, { ...base, relief: 0 });
    expect(Math.abs(meanD(t) - meanH(t))).toBeLessThan(0.03);
  });
  it('yer değiştirme stresi aşağı rütbelere taşır: en alttakinin stresi artar, ortadakinin düşer', () => {
    const none = run(3, { ...base, displace: 0 }), full = run(3, { ...base, displace: 1 });
    expect(rankMean(full, 7)).toBeGreaterThan(rankMean(none, 7));
    expect(rankMean(full, 3)).toBeLessThan(rankMean(none, 3));
  });
  it('aşağı rütbelerde stres daha yüksektir (yenilgi sıklığı)', () => {
    const t = run(4, { ...base, displace: 0 });
    expect(rankMean(t, 7)).toBeGreaterThan(rankMean(t, 0));
  });
  it('varsayılan ayarda stres doymaz: tüm rütbelerde ortalama 0,9 altında', () => {
    const t = run(8, base);
    for (let k = 0; k < 8; k++) expect(rankMean(t, k)).toBeLessThan(0.9);
    expect(rankMean(t, 7)).toBeGreaterThan(0.2);
  });
  it('olaylar: yer değiştirme saldırısı aşağıya yönelir', () => {
    const t = newTroop(1);
    for (let i = 0; i < 100; i++) for (const e of stepTroop(t, base)) if (e.kind === 'displace') expect(e.to).toBeGreaterThan(e.from);
  });
});

describe('sıçan şoku', () => {
  it('yanında küçük sıçan varken stres yanıtı daha az', () => {
    const r = ratExperiment(1, 0.6, 0.6, 0.4);
    expect(r.present).toBeLessThan(r.absent - 0.05);
  });
  it('ısırma eğilimi 0 ise fark yok', () => {
    const r = ratExperiment(1, 0.6, 0, 0.4);
    expect(r.present).toBeCloseTo(r.absent, 6);
  });
});
