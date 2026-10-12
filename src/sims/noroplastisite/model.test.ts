import { describe, expect, it } from 'vitest';
import {
  calcium, caPos, depolarization, lateShare, mgUnblock, minutesOfSlider, practiceAt, simulatePractice,
  simulateStress, stressAt, synapse, synDelta, synWeight, zoneOf, SYN,
} from './model';
import { mulberry32 } from '../rng';

describe('sinaps: Mg2+ bloğu ve Ca2+ eşikleri', () => {
  it('depolarizasyon arttıkça Mg2+ bloğu kalkar', () => {
    expect(mgUnblock(-70)).toBeLessThan(0.1);
    expect(mgUnblock(-40)).toBeGreaterThan(mgUnblock(-60));
    expect(mgUnblock(0)).toBeGreaterThan(0.7);
  });
  it('frekans ve postsinaptik ateşleme Ca2+ düzeyini artırır (tekdüze)', () => {
    let prev = 0;
    for (const f of [0.5, 1, 2, 5, 10, 20, 50, 100]) {
      const c = calcium(f, 0);
      expect(c).toBeGreaterThan(prev);
      prev = c;
    }
    expect(calcium(1, 1)).toBeGreaterThan(calcium(1, 0.5));
    expect(depolarization(100, 0)).toBeGreaterThan(depolarization(1, 0));
  });
  it('eşikler: düşük = değişim yok, orta = LTD, yüksek = LTP', () => {
    expect(zoneOf(calcium(1, 0))).toBe('yok');
    expect(zoneOf(calcium(5, 0))).toBe('ltd');
    expect(zoneOf(calcium(100, 0))).toBe('ltp');
    expect(caPos(SYN.thD)).toBeLessThan(caPos(SYN.thP));
  });
});

describe('sinaps: kalibrasyon (ch05-e1 Lømo/Bliss, Hebb ilkesi)', () => {
  it('Lømo/Bliss tipi yoğun uyarım (100 Hz, 1 sn) uzun süreli güçlenme verir ve saatlerce sürer', () => {
    const r = synapse({ freq: 100, dur: 1, post: 0 });
    expect(r.zone).toBe('ltp');
    expect(r.delta).toBeGreaterThan(0.5);
    expect(synWeight(r.delta, 180)).toBeGreaterThan(1.3);
    expect(synWeight(r.delta, 60 * 24 * 3)).toBeGreaterThan(1.3);
  });
  it('düşük frekansta değişim olmaz; orta frekansta uzun süreli depresyon (LTD) olur', () => {
    expect(Math.abs(synDelta({ freq: 1, dur: 900, post: 0 }))).toBeLessThan(0.02);
    expect(synDelta({ freq: 5, dur: 300, post: 0 })).toBeLessThan(-0.2);
    expect(synapse({ freq: 5, dur: 300, post: 0 }).zone).toBe('ltd');
  });
  it('Hebb: aynı düşük frekans postsinaptik ateşlemeyle birlikte gelince LTP olur', () => {
    const alone = synDelta({ freq: 1, dur: 900, post: 0 });
    const paired = synDelta({ freq: 1, dur: 900, post: 1 });
    expect(Math.abs(alone)).toBeLessThan(0.02);
    expect(paired).toBeGreaterThan(0.4);
  });
  it('uyarı sayısı arttıkça etki büyür ve doyar; zayıf uyarım erken evrede söner', () => {
    const a = synDelta({ freq: 100, dur: 0.2, post: 0 });
    const b = synDelta({ freq: 100, dur: 1, post: 0 });
    const c = synDelta({ freq: 100, dur: 30, post: 0 });
    expect(a).toBeLessThan(b);
    expect(c - b).toBeLessThan(b - a);
    const weak = synDelta({ freq: 1, dur: 100, post: 1 });
    expect(lateShare(weak)).toBe(0);
    expect(synWeight(weak, 60 * 24)).toBeCloseTo(1, 1);
  });
  it('yarı yol: kısmi uyarım kısmi değişim verir', () => {
    const full = synDelta({ freq: 20, dur: 10, post: 0 });
    expect(synDelta({ freq: 20, dur: 10, post: 0 }, 0.5)).toBeLessThan(full);
    expect(synDelta({ freq: 20, dur: 10, post: 0 }, 0)).toBe(0);
  });
  it('zaman kaydırıcısı tekdüze', () => {
    expect(minutesOfSlider(0)).toBe(0);
    expect(minutesOfSlider(100)).toBe(10000);
    expect(minutesOfSlider(50)).toBeLessThan(minutesOfSlider(60));
  });
});

describe('pratik ve kortikal harita: kalibrasyon (ch05-e7, e8, e12)', () => {
  const area = (i: { minutes: number; mental: number; days: number }, d: number) => practiceAt(simulatePractice(i), d).area;
  it('Pascual-Leone: günde 2 saat, 5 gün fiziksel pratik haritayı büyütür; bırakınca bir gün içinde büyük kısmı kaybolur', () => {
    const i = { minutes: 120, mental: 0, days: 5 };
    const end = area(i, 4.9), after = area(i, 6);
    expect(end).toBeGreaterThan(1.1);
    expect(end - after).toBeGreaterThan(0.7 * (end - 1));
    expect(after - 1).toBeLessThan(0.05);
  });
  it('yalnızca hayal ederek pratik de haritayı büyütür, ama fiziksele göre daha az', () => {
    const phys = area({ minutes: 120, mental: 0, days: 5 }, 4.9);
    const mental = area({ minutes: 120, mental: 1, days: 5 }, 4.9);
    expect(mental).toBeGreaterThan(1.05);
    expect(mental).toBeLessThan(phys);
  });
  it('dört haftalık pratikte genişleme bırakınca günlerce sürer (5 günlüğe göre)', () => {
    const long = { minutes: 120, mental: 0, days: 28 };
    const short = { minutes: 120, mental: 0, days: 5 };
    expect(area(long, 28 + 7) - 1).toBeGreaterThan(0.08);
    expect(area(long, 28 + 7) - 1).toBeGreaterThan(3 * (area(short, 5 + 7) - 1));
  });
  it('Draganski: üç ay pratik büyük, bıraktıktan sonra kısmen geriler', () => {
    const j = { minutes: 60, mental: 0, days: 90 };
    const end = area(j, 89.9), later = area(j, 180);
    expect(end).toBeGreaterThan(1.25);
    expect(later).toBeLessThan(end);
    expect(later).toBeGreaterThan(1.05);
  });
  it('Londra taksi: uzun hazırlıkta kalıcı pay yüksek; erken bırakan adayda kalıcı pay söner', () => {
    const passer = simulatePractice({ minutes: 120, mental: 0, days: 1200 });
    const quitter = simulatePractice({ minutes: 120, mental: 0, days: 120 });
    expect(practiceAt(passer, 1200).slow).toBeGreaterThan(0.25);
    expect(practiceAt(quitter, quitter.horizon).slow).toBeLessThan(0.6 * practiceAt(quitter, 120).slow);
  });
  it('pratik süresi arttıkça etki artar; sıfır pratik değişim vermez', () => {
    expect(area({ minutes: 30, mental: 0, days: 14 }, 13.9)).toBeLessThan(area({ minutes: 120, mental: 0, days: 14 }, 13.9));
    expect(area({ minutes: 0, mental: 0, days: 14 }, 13.9)).toBe(1);
  });
});

describe('stres ve yapı: kalibrasyon (ch05-e3 Vyas; Mitra ve Sapolsky)', () => {
  const end = (i: Parameters<typeof simulateStress>[0]) => { const s = simulateStress(i); return stressAt(s, s.total); };
  it('kronik stres hipokampus dendritlerini küçültür, amigdala (BLA) dendritlerini büyütür', () => {
    const e = end({ kind: 'kronik', days: 28, recover: 0 });
    expect(e.hip).toBeLessThan(0.8);
    expect(e.spine).toBeLessThan(e.hip);
    expect(e.amy).toBeGreaterThan(1.25);
  });
  it('stres süresi arttıkça etki büyür', () => {
    expect(end({ kind: 'kronik', days: 7, recover: 0 }).hip).toBeGreaterThan(end({ kind: 'kronik', days: 42, recover: 0 }).hip);
    expect(end({ kind: 'kronik', days: 7, recover: 0 }).amy).toBeLessThan(end({ kind: 'kronik', days: 42, recover: 0 }).amy);
  });
  it('stres bitince hipokampus toparlanır, amigdala değişikliği daha kalıcıdır', () => {
    const e0 = end({ kind: 'kronik', days: 28, recover: 0 });
    const e1 = end({ kind: 'kronik', days: 28, recover: 56 });
    const hipRecovered = (e1.hip - e0.hip) / (1 - e0.hip);
    const amyRetained = (e1.amy - 1) / (e0.amy - 1);
    expect(hipRecovered).toBeGreaterThan(0.8);
    expect(amyRetained).toBeGreaterThan(0.8);
    expect(amyRetained).toBeGreaterThan(hipRecovered * 0.9);
  });
  it('Mitra ve Sapolsky: tek doz glukokortikoid 12 gün sonra amigdala dendritini büyütür, hipokampusu değil', () => {
    const e = end({ kind: 'tek', days: 0, recover: 12 });
    expect(e.amy).toBeGreaterThan(1.1);
    expect(e.hip).toBeGreaterThan(0.95);
  });
  it('bağlam: gönüllü koşu hipokampus dendritlerini büyütür, amigdalayı büyütmez', () => {
    const e = end({ kind: 'kosu', days: 28, recover: 0 });
    expect(e.hip).toBeGreaterThan(1.03);
    expect(e.amy).toBeCloseTo(1, 5);
  });
  it('stres yoksa değişim yok', () => {
    const e = end({ kind: 'kronik', days: 0, recover: 30 });
    expect(e.hip).toBeCloseTo(1, 5);
    expect(e.amy).toBeCloseTo(1, 5);
  });
});

describe('tohumlu rastgele sayı', () => {
  it('aynı tohum aynı diziyi verir', () => {
    const a = mulberry32(7), b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
