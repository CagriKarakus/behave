import { describe, expect, it } from 'vitest';
import {
  ECOS, GA, GB, ISLAND_KM, NC, WALL, analyze, clearBorders, corridor, cultureOf, diamKm, grantAll, newWorld, paintWall, pggSweep,
  playPgg, reseed, riverFence, step, windowOf, type World,
} from './model';

const run = (pref: number, mob: number, steps: number, seed = 7) => {
  const w = newWorld(seed);
  const traj = [analyze(w, pref)];
  for (let t = 0; t < steps; t++) { step(w, pref, mob); traj.push(analyze(w, pref)); }
  return { w, traj };
};
const count = (w: World, g: number) => w.c.reduce((a, v) => a + (v === g ? 1 : 0), 0);

describe('Sekme 1: Schelling benzeri ızgara', () => {
  it('aynı tohum aynı sonucu verir; ajan sayısı korunur', () => {
    const a = run(0.4, 0.5, 30), b = run(0.4, 0.5, 30);
    expect(Array.from(a.w.c)).toEqual(Array.from(b.w.c));
    const n0 = a.traj[0].n;
    expect(a.traj.every((m) => m.n === n0)).toBe(true);
    expect(a.traj[30].sizes.reduce((x, y) => x + y, 0)).toBe(n0);
  });
  it('benzerlik tercihi ayrışmayı artırır', () => {
    const lo = run(0.1, 0.5, 60).traj[60], hi = run(0.5, 0.5, 60).traj[60];
    expect(hi.same).toBeGreaterThan(lo.same + 0.1);
    expect(hi.meanKm).toBeGreaterThan(lo.meanKm);
  });
  it('ayrışma ilerledikçe parçalar büyür', () => {
    const { traj } = run(0.4, 0.5, 60);
    expect(traj[0].meanKm).toBeLessThan(15);
    expect(traj[60].meanKm).toBeGreaterThan(traj[0].meanKm * 3);
  });
  it('kalibrasyon (ch09-e9): risk orta büyüklükte parçalarda tepe yapar, uçlarda düşüktür', () => {
    for (const [pref, mob] of [[0.3, 0.5], [0.4, 0.5], [0.5, 0.5], [0.5, 1]] as const) {
      const { traj } = run(pref, mob, 150);
      let pk = 0;
      traj.forEach((m, i) => { if (m.risk > traj[pk].risk) pk = i; });
      const peak = traj[pk];
      expect(peak.meanKm).toBeGreaterThan(ISLAND_KM.lo * 0.75);
      expect(peak.meanKm).toBeLessThan(ISLAND_KM.hi * 1.15);
      expect(peak.risk).toBeGreaterThan(0.6);
      expect(traj[0].risk).toBeLessThan(peak.risk * 0.4);
      expect(traj[150].risk).toBeLessThan(peak.risk * 0.7);
    }
  });
  it('düşük hareketlilik orta büyüklükte adaları kalıcı kılar (risk yüksek kalır)', () => {
    const slow = run(0.5, 0.1, 200).traj[200], fast = run(0.5, 1, 200).traj[200];
    expect(slow.risk).toBeGreaterThan(fast.risk * 2);
  });
  it('pencere eğrisi 20-60 km çevresinde tepe yapar', () => {
    expect(windowOf(35)).toBeGreaterThan(0.95);
    expect(windowOf(ISLAND_KM.lo)).toBeGreaterThan(0.35);
    expect(windowOf(ISLAND_KM.hi)).toBeGreaterThan(0.35);
    expect(windowOf(5)).toBeLessThan(0.05);
    expect(windowOf(150)).toBeLessThan(0.05);
    expect(diamKm(1)).toBeCloseTo(4.5, 0);
  });
  it('özerklik (net sınır) riski düşürür, kaldırılınca geri gelir (Rutherford)', () => {
    const { w, traj } = run(0.5, 0.1, 80);
    const base = traj[80].risk;
    grantAll(w, traj[80]);
    const aut = analyze(w, 0.5).risk;
    expect(aut).toBeLessThan(base * 0.4);
    clearBorders(w);
    expect(analyze(w, 0.5).risk).toBeCloseTo(base, 5);
  });
  it('çit hücreleri ajan sayısını korur ve temas sayılmaz', () => {
    const w = newWorld(3);
    const n = count(w, GA) + count(w, GB);
    for (let y = 0; y < 40; y++) paintWall(w, y * 40 + 20, true);
    expect(count(w, WALL)).toBe(40);
    expect(count(w, GA) + count(w, GB)).toBe(n);
    paintWall(w, 20, false);
    expect(count(w, WALL)).toBe(39);
    const r = newWorld(5);
    riverFence(r);
    expect(count(reseed(r, 9, 0.5), WALL)).toBe(count(r, WALL));
  });
  it('grup oranı başlangıç paylarını belirler', () => {
    const w = newWorld(1, 0.7);
    const a = count(w, GA), b = count(w, GB);
    expect(a / (a + b)).toBeGreaterThan(0.6);
    expect(a + b).toBe(Math.round(NC * 0.9));
  });
});

describe('Sekme 2: ekoloji -> kültür', () => {
  const by = (id: string) => { const e = ECOS.find((x) => x.id === id)!; return cultureOf(e.L, e.V); };
  it('pirinç buğdaydan daha kollektivist ve bütüncül (ch09-e3, ch09-e2)', () => {
    expect(by('rice').K).toBeGreaterThan(by('wheat').K + 0.3);
    expect(by('rice').Hol).toBeGreaterThan(by('wheat').Hol);
    expect(by('rice').ctx).toBeGreaterThan(by('wheat').ctx);
    expect(by('rice').ctr).toBeLessThan(by('wheat').ctr);
    expect(by('rice').rel).toBeGreaterThan(by('wheat').rel);
    expect(by('rice').self).toBeLessThan(by('wheat').self);
  });
  it('buğday bölgelerinde boşanma ve patent daha yüksek (ch09-e3)', () => {
    expect(by('wheat').divorce).toBeGreaterThan(by('rice').divorce);
    expect(by('wheat').patent).toBeGreaterThan(by('rice').patent);
  });
  it('göçebe çobanlıkta onur duyarlılığı en yüksek grupta', () => {
    expect(by('herd').O).toBeGreaterThan(0.6);
    expect(by('herd').O).toBeGreaterThan(by('rice').O * 3);
    expect(by('herd').O).toBeGreaterThan(by('wheat').O * 2);
  });
  it('değerler 0..1 aralığında kalır', () => {
    for (let L = 0; L <= 1; L += 0.25) for (let V = 0; V <= 1; V += 0.25) {
      const c = cultureOf(L, V);
      for (const v of [c.K, c.Hol, c.O]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    }
  });
});

describe('Sekme 3a: koridor hakaret deneyi (ch09-e5)', () => {
  const south = (ins: boolean) => corridor(0.8, ins, 3000, 1), north = (ins: boolean) => corridor(0.2, ins, 3000, 1);
  it('hakaret Güneyli hormonlarını belirgin yükseltir, Kuzeylilerinkini yükseltmez', () => {
    expect(south(true).dT).toBeGreaterThan(0.4);
    expect(south(true).dC).toBeGreaterThan(0.35);
    expect(north(true).dT).toBeLessThan(0.1);
    expect(north(true).dC).toBeLessThan(0.1);
    expect(south(false).dT).toBeLessThan(0.1);
  });
  it('hayal edilen şiddet: kontrolde Güneyli biraz yüksek, hakaretten sonra Güneyli çok yüksek, Kuzeylide değişim yok', () => {
    const c = { s: south(false).violent, n: north(false).violent }, i = { s: south(true).violent, n: north(true).violent };
    expect(c.s).toBeGreaterThan(c.n);
    expect(c.s - c.n).toBeLessThan(0.1);
    expect(i.n - c.n).toBeLessThan(0.05);
    expect(i.s - c.s).toBeGreaterThan(0.3);
  });
  it('tohumlu ve deterministik', () => {
    expect(corridor(0.5, true, 40, 3)).toEqual(corridor(0.5, true, 40, 3));
  });
});

describe('Sekme 3b: kamu malı oyunu ve antisosyal ceza (ch09-e6)', () => {
  const avg = (p: { ineq: number; trust: number }, reps = 12) => {
    let anti = 0, pro = 0, cap = 0, coop = 0;
    for (let s = 0; s < reps; s++) {
      const r = playPgg({ ...p, cost: 1, seed: 40 + s });
      anti += r.anti; pro += r.pro; cap += r.capital; coop += r.coop[9];
    }
    return { share: anti / Math.max(1, anti + pro), cap: cap / reps, coop: coop / reps };
  };
  it('yüksek güven: antisosyal ceza neredeyse yok (Avustralya örüntüsü)', () => {
    expect(avg({ ineq: 0.2, trust: 0.85 }).share).toBeLessThan(0.08);
  });
  it('düşük güven ve yüksek eşitsizlik: cömerde giden ceza hile yapana gidenden fazla (Yunanistan, Umman örüntüsü)', () => {
    const lo = avg({ ineq: 0.7, trust: 0.25 });
    expect(lo.share).toBeGreaterThan(0.5);
    expect(lo.coop).toBeLessThan(avg({ ineq: 0.2, trust: 0.85 }).coop - 0.2);
  });
  it('eşitsizlik arttıkça sosyal sermaye azalır, antisosyal pay artar', () => {
    for (const trust of [0.85, 0.5, 0.25]) {
      const s = pggSweep(trust, 1, 4, 10);
      expect(s[4].capital).toBeLessThan(s[0].capital - 0.05);
      expect(s[4].antiShare).toBeGreaterThan(s[0].antiShare);
    }
  });
  it('cezalandırma maliyeti artınca ceza azalır', () => {
    const tot = (cost: number) => { let t = 0; for (let s = 0; s < 8; s++) { const r = playPgg({ ineq: 0.5, trust: 0.4, cost, seed: s }); t += r.pro + r.anti; } return t; };
    expect(tot(3)).toBeLessThan(tot(1));
  });
  it('tohumlu ve deterministik; değerler aralıkta', () => {
    const a = playPgg({ ineq: 0.5, trust: 0.5, cost: 1, seed: 4 });
    expect(a).toEqual(playPgg({ ineq: 0.5, trust: 0.5, cost: 1, seed: 4 }));
    expect(a.coop).toHaveLength(10);
    for (const v of [...a.coop, ...a.trust, a.antiShare]) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
  });
});
