import { describe, expect, it } from 'vitest';
import {
  BOND_DEFAULT, CHOCOLATE, COMPASSION_TRAINING, EMPATHY_DEFAULT, EMPATHY_TRAINING, GIVE_DEFAULT, STEPS, THETA,
  bondResult, contagionWeight, describeBond, describeEmpathy, describeGive, forecast, happinessChange, painResponse,
  simulateEmpathy, simulateGive, trajectory, type EmpathyInputs,
} from './model';

const N = 400; // kalibrasyon testlerinde büyük örnek: tek tohuma bağlı olmasın
const emp = (u: Partial<EmpathyInputs>) => simulateEmpathy({ ...EMPATHY_DEFAULT, ...u }, 7, N);

describe('Sekme 1: duygusal bulaşma ve şefkat (ch14-e9, e7, e8)', () => {
  it('Klimecki/Singer: empati eğitimi sıkıntıyı yükseltir, şefkat eğitimi şefkati yükseltip sıkıntıyı düşürür', () => {
    const e = simulateEmpathy(EMPATHY_TRAINING, 7, N), c = simulateEmpathy(COMPASSION_TRAINING, 7, N);
    expect(e.dEnd).toBeGreaterThan(THETA);
    expect(c.dEnd).toBeLessThan(THETA - 0.15);
    expect(c.wEnd).toBeGreaterThan(e.wEnd + 0.4);
    expect(c.help).toBeGreaterThan(e.help * 4);
    expect(e.avoid).toBeGreaterThan(0.6);
  });
  it('sıkıntı eşiği aşılınca yardım düşer: benlik odaklıyken acı arttıkça yardım önce artar, sonra çöker', () => {
    const h = (p: number) => emp({ selfFocus: 0.85, pain: p }).help;
    expect(h(0.3)).toBeGreaterThan(h(0.1));
    expect(h(0.3)).toBeGreaterThan(h(1) * 3);
    expect(h(0.6)).toBeGreaterThan(h(0.8));
    expect(h(0.8)).toBeGreaterThan(h(1));
    // karşıdakine odakta aynı acı yardımı çökertmez
    expect(emp({ selfFocus: 0.15, pain: 1 }).help).toBeGreaterThan(h(1) * 5);
  });
  it('Eisenberg: sıkıntısı (uyarılması) yüksek gözlemciler daha az yardım eder', () => {
    expect(simulateEmpathy(EMPATHY_TRAINING, 7, N).corr).toBeLessThan(-0.3);
    expect(emp({}).corr).toBeLessThan(-0.3);
  });
  it('Martin: stres arttıkça sıkıntı artar ve yardım azalır', () => {
    expect(emp({ stress: 1 }).dEnd).toBeGreaterThan(emp({ stress: 0 }).dEnd);
    expect(emp({ stress: 0 }).help).toBeGreaterThan(emp({ stress: 0.5 }).help);
    expect(emp({ stress: 0.5 }).help).toBeGreaterThan(emp({ stress: 1 }).help);
  });
  it('şefkat eğitimi arttıkça şefkat artar, sıkıntı düşer, yardım artar (benlik odaklıyken de)', () => {
    const r = (t: number) => emp({ selfFocus: 0.9, pain: 0.8, training: t });
    expect(r(1).wEnd).toBeGreaterThan(r(0).wEnd);
    expect(r(1).dEnd).toBeLessThan(r(0).dEnd);
    expect(r(1).help).toBeGreaterThan(r(0).help);
  });
  it('karşıdakine odak şefkati, kendine odak sıkıntıyı besler', () => {
    expect(emp({ selfFocus: 0.1 }).wEnd).toBeGreaterThan(emp({ selfFocus: 0.9 }).wEnd);
    expect(emp({ selfFocus: 0.1 }).dEnd).toBeLessThan(emp({ selfFocus: 0.9 }).dEnd);
  });
  it('zaman serisi sınırlı ve yumuşak; acı sıfırken sıkıntı oluşmaz', () => {
    const t = trajectory(EMPATHY_DEFAULT);
    expect(t.d).toHaveLength(STEPS + 1);
    for (const v of [...t.d, ...t.w]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    for (let i = 1; i < t.d.length; i++) expect(Math.abs(t.d[i] - t.d[i - 1])).toBeLessThan(0.05);
    expect(trajectory({ ...EMPATHY_DEFAULT, pain: 0, stress: 0 }).d[STEPS]).toBe(0);
  });
  it('tohumlu ve deterministik; payların toplamı 1', () => {
    const a = simulateEmpathy(EMPATHY_DEFAULT, 4), b = simulateEmpathy(EMPATHY_DEFAULT, 4), c = simulateEmpathy(EMPATHY_DEFAULT, 5);
    expect(a).toEqual(b);
    expect(a.obs.map((o) => o.kind)).not.toEqual(c.obs.map((o) => o.kind));
    expect(a.help + a.avoid + a.idle).toBeCloseTo(1, 10);
    expect(a.obs).toHaveLength(40);
  });
  it('açıklama cümlesi dolu ve NaN içermez', () => {
    for (const u of [EMPATHY_DEFAULT, EMPATHY_TRAINING, COMPASSION_TRAINING]) {
      const s = describeEmpathy(u, simulateEmpathy(u, 1));
      expect(s.length).toBeGreaterThan(30);
      expect(s).not.toMatch(/NaN|undefined/);
    }
  });
});

describe('Sekme 2: kime yardım? (ch14-e4 Bartal, e2 Langford, e8 Martin)', () => {
  const T = { cage: 'cage', light: 'light', dark: 'dark' } as const;
  it('Bartal: kafes arkadaşını kurtarma çikolata kadar güçlü; çoğunlukla çikolata paylaşılır', () => {
    const r = bondResult(BOND_DEFAULT).rows.cage;
    expect(r.rescue).toBeGreaterThan(0.9);
    expect(Math.abs(r.rescue - CHOCOLATE)).toBeLessThan(0.1);
    expect(r.share).toBeGreaterThan(0.5); // "zamanın yarısından fazlası"
  });
  it('Bartal: kendi soyundan yabancıya da yardım eder; öteki soyun yabancısına yardım düşüktür', () => {
    const r = bondResult(BOND_DEFAULT).rows;
    expect(r.light.rescue).toBeGreaterThan(0.7);
    expect(r.dark.rescue).toBeLessThan(0.2);
    expect(r.dark.rescue).toBeLessThan(r.light.rescue);
  });
  it('Bartal: öteki soyla birlikte yaşadıkça o soya yardım artar (biz tanımı kayar)', () => {
    const d = (days: number) => bondResult({ ...BOND_DEFAULT, days }).rows.dark;
    expect(d(2).rescue).toBeGreaterThan(d(0).rescue);
    expect(d(5).rescue).toBeGreaterThan(d(2).rescue);
    expect(d(14).rescue).toBeGreaterThan(0.75);
    expect(d(14).share).toBeGreaterThan(d(0).share);
    // kendi soyuna yardım değişmez
    expect(bondResult({ ...BOND_DEFAULT, days: 14 }).rows.light.rescue).toBe(bondResult(BOND_DEFAULT).rows.light.rescue);
  });
  it('Bartal: farklı soydan bakıcıyla büyüyen sıçan biyolojik değil, büyüdüğü soya yardım eder', () => {
    const r = bondResult({ ...BOND_DEFAULT, rearing: 'dark' }).rows;
    expect(r.dark.rescue).toBeGreaterThan(0.7);
    expect(r.light.rescue).toBeLessThan(0.2);
  });
  it('kurtarmanın bedeli arttıkça kurtarma azalır, sıralama korunur', () => {
    const lo = bondResult({ ...BOND_DEFAULT, cost: 0.1 }).rows, hi = bondResult({ ...BOND_DEFAULT, cost: 0.7 }).rows;
    for (const t of Object.values(T)) expect(hi[t].rescue).toBeLessThan(lo[t].rescue);
    expect(hi.cage.rescue).toBeGreaterThan(hi.light.rescue);
    expect(hi.light.rescue).toBeGreaterThan(hi.dark.rescue);
  });
  it('Langford: acı yalnızca kafes arkadaşları arasında bulaşır; çok yalayanı izleyen daha çok, az yalayanı izleyen daha az yalar', () => {
    const r = (target: 'cage' | 'dark', partnerPain: number, gcBlock = false) => bondResult({ ...BOND_DEFAULT, target, partnerPain, gcBlock }).sel.response;
    expect(r('cage', 0.9)).toBeGreaterThan(0.65);
    expect(r('cage', 0.1)).toBeLessThan(0.35);
    expect(Math.abs(r('dark', 0.9) - 0.5)).toBeLessThan(0.06);
    expect(Math.abs(r('dark', 0.1) - 0.5)).toBeLessThan(0.06);
    expect(painResponse(1, 0.5)).toBe(0.5);
  });
  it('Martin: glukokortikoid engellenince yabancıda da bulaşma ortaya çıkar', () => {
    expect(contagionWeight('dark', true)).toBeGreaterThan(contagionWeight('dark', false) * 5);
    const on = bondResult({ ...BOND_DEFAULT, target: 'dark', gcBlock: true }).sel.response;
    const off = bondResult({ ...BOND_DEFAULT, target: 'dark', gcBlock: false }).sel.response;
    expect(on - 0.5).toBeGreaterThan((off - 0.5) * 5);
  });
  it('olasılıklar 0-1 aralığında; açıklama NaN içermez', () => {
    for (const t of ['cage', 'light', 'dark'] as const) {
      const b = { ...BOND_DEFAULT, target: t, days: 7 };
      const r = bondResult(b);
      for (const row of Object.values(r.rows)) for (const v of [row.u, row.rescue, row.share, row.w, row.response]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
      expect(describeBond(b, r)).not.toMatch(/NaN|undefined/);
    }
  });
});

describe('Sekme 3: bağış ve ödül (ch14-e12 Harbaugh, e11 Dunn)', () => {
  const g = (u: Partial<typeof GIVE_DEFAULT>) => simulateGive({ ...GIVE_DEFAULT, ...u }, 3, N);
  it('Harbaugh: gönüllü bağışta ödül devresi, aynı tutardaki zorunlu vergiden yüksek (sıcak ışıltı)', () => {
    const r = g({});
    expect(r.vol).toBeGreaterThan(r.tax + 0.1);
    expect(r.recv).toBeGreaterThan(r.tax);
  });
  it('sıcak ışıltı yoksa gönüllü bağış ile vergi arasındaki fark kalmaz; ışıltı arttıkça fark artar', () => {
    const d = (warm: number) => { const r = g({ warm }); return r.vol - r.tax; };
    expect(d(0)).toBeLessThan(0.01);
    expect(d(0.5)).toBeGreaterThan(d(0.2));
    expect(d(0.9)).toBeGreaterThan(d(0.5));
  });
  it('Harbaugh: vergi sırasında ödül devresi güçlü yanıt verenler gönüllü olarak daha cömert', () => {
    expect(g({}).r).toBeGreaterThan(0.5);
    expect(g({ altru: 0.8, warm: 0.1 }).r).toBeGreaterThan(0.5);
    expect(g({ altru: 0, warm: 0 }).r).toBeLessThan(0.3);
  });
  it('Dunn: yalnızca başkasına harcamak mutluluğu artırır; miktar önemsizdir; dışarıdan tahmin tersidir', () => {
    const w = GIVE_DEFAULT.warm;
    expect(happinessChange(w, false, 'orig')).toBeGreaterThan(happinessChange(w, true, 'orig') * 8);
    // tahmin edenler kendine harcamayı ve 20 doları daha iyi sanar
    expect(forecast(true, 20)).toBeGreaterThan(forecast(true, 5));
    expect(forecast(true, 5)).toBeGreaterThan(forecast(false, 5));
    expect(forecast(true, 20)).toBeGreaterThan(forecast(false, 20));
  });
  it('Dunn replikasyonu: etki küçülür ama yönü korunur; sıcak ışıltı arttıkça artar', () => {
    const o = happinessChange(0.5, false, 'orig'), s = happinessChange(0.5, false, 'small');
    expect(s).toBeLessThan(o * 0.6);
    expect(s).toBeGreaterThan(happinessChange(0.5, true, 'small') * 3);
    expect(happinessChange(0.9, false, 'orig')).toBeGreaterThan(happinessChange(0.1, false, 'orig'));
  });
  it('tohumlu ve deterministik; değerler 0-1; açıklama NaN içermez', () => {
    const a = simulateGive(GIVE_DEFAULT, 5), b = simulateGive(GIVE_DEFAULT, 5);
    expect(a).toEqual(b);
    for (const x of a.givers) for (const v of Object.values(x)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    expect(describeGive(a)).not.toMatch(/NaN|undefined/);
  });
});
