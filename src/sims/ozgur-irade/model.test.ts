import { describe, expect, it } from 'vitest';
import {
  CASES, FACTORS, LIBET, RP_ONSET, SCH, artefactShare, clockAngle, cumulative, defaultShares, evaluate, explained, judgments,
  makePlayers, markAngle, outcome, pearson, punishStats, quadrant, quintiles, recommend, rpGap, rpLibet, runSchurger, sample,
  trueGap, vetoWindow, wFromAngles, wtp,
} from './model';

const none = FACTORS.map(() => false);
const only = (...ix: number[]) => FACTORS.map((_, i) => ix.includes(i));

describe('Libet (ch16-e2)', () => {
  it('RP, referans niyet anından yaklaşık yarım saniye önce başlar', () => {
    expect(RP_ONSET).toBe(LIBET.wRef - 500);
    expect(rpGap(LIBET.wRef)).toBe(500);
  });
  it('RP eğrisi: başlangıçtan önce 0, harekette 1, arada monoton', () => {
    expect(rpLibet(RP_ONSET - 50)).toBe(0);
    expect(rpLibet(0)).toBe(1);
    let prev = 0;
    for (let t = RP_ONSET; t <= 0; t += 20) { const v = rpLibet(t); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });
  it('saat: açı ve W dönüşümü karşılıklıdır; aralık dışı reddedilir', () => {
    expect(clockAngle(0)).toBe(0);
    expect(clockAngle(LIBET.clockMs / 2)).toBeCloseTo(180, 9);
    for (const w of [-50, -200, -600, -1000]) {
      const press = 100;
      expect(wFromAngles(press, markAngle(press, w))).toBe(w);
    }
    expect(wFromAngles(10, 10 + 20)).toBeNull(); // nokta ileride: 2,5 sn turunda 2,4 sn geride
  });
  it('veto penceresi niyet ile geri dönüşsüz aralık arasındadır', () => {
    expect(vetoWindow(-200, 100)).toBe(100);
    expect(vetoWindow(-80, 100)).toBe(0);
    expect(vetoWindow(-200, 0)).toBe(200);
  });
  it('saat kayması gerçek aralığı kısaltır; artefakt payı kaymayla artar', () => {
    const gap = rpGap(-200);
    expect(trueGap(gap, 0)).toBe(500);
    expect(trueGap(gap, 150)).toBe(350);
    expect(artefactShare(gap, 0)).toBe(0);
    expect(artefactShare(gap, 150)).toBeCloseTo(0.3, 9);
    expect(artefactShare(gap, 900)).toBe(1);
  });
});

describe('Schurger rastgele birikim (ch16-e2 replikasyon notu)', () => {
  const run = runSchurger(SCH, 3, 120);
  it('deterministiktir', () => {
    const b = runSchurger(SCH, 3, 120);
    expect(b.locked).toEqual(run.locked);
    expect(runSchurger(SCH, 4, 120).locked).not.toEqual(run.locked);
  });
  it('eşik geçişlerine hizalanan ortalama RP benzeri yükselir ve eşiğe varır', () => {
    const last = run.locked[run.locked.length - 1];
    expect(last).toBeGreaterThan(0.9);
    const at = (ms: number) => run.locked[run.t.indexOf(ms)];
    expect(at(-1000)).toBeLessThan(0.15);
    expect(at(-500)).toBeGreaterThan(at(-1000) + 0.1);
    expect(at(-100)).toBeGreaterThan(at(-500));
    expect(run.onset).toBeLessThan(-300);
  });
  it('hizalanmamış ortalama düz kalır: yükseliş hizalamadan gelir', () => {
    const spread = Math.max(...run.unlocked) - Math.min(...run.unlocked);
    expect(spread).toBeLessThan(0.25);
    expect(Math.abs(run.unlocked.reduce((a, b) => a + b, 0) / run.unlocked.length)).toBeLessThan(0.15);
  });
  it('gürültü artınca beklenen süre kısalır; sürüklenme artınca da', () => {
    const calm = runSchurger({ ...SCH, noise: 0.22 }, 3, 60), loud = runSchurger({ ...SCH, noise: 0.4 }, 3, 60);
    expect(loud.meanWait).toBeLessThan(calm.meanWait);
    expect(runSchurger({ ...SCH, drive: 0.7 }, 3, 60).meanWait).toBeLessThan(runSchurger({ ...SCH, drive: 0.5 }, 3, 60).meanWait);
  });
});

describe('çok etkenli tahmin (ch16-e5)', () => {
  it('kitabın basamakları: ~%10, ~%25, ~%40', () => {
    const c = cumulative();
    expect(c[1]).toBeCloseTo(0.1, 9);
    expect(c[2]).toBeCloseTo(0.25, 9);
    expect(c[3]).toBeCloseTo(0.4, 9);
  });
  it('kitabın sırasıyla altı etken eklenince %50\'yi biraz aşar (belki %50\'nin üstü), ama kesinliğe yaklaşmaz', () => {
    const c = cumulative();
    expect(c[4]).toBeGreaterThan(c[3]);
    expect(c[5]).toBeLessThan(0.5);
    expect(c[6]).toBeGreaterThan(0.5);
    expect(c[6]).toBeLessThan(0.6);
    expect(explained(FACTORS.map(() => true))).toBeCloseTo(c[6], 12);
    expect(FACTORS.map((f) => f.id)).toEqual(['gen', 'kayip', 'yoksul', 'kortizol', 'kultur', 'adet']);
  });
  it('etken ekledikçe öngörü gücü artar', () => {
    let prev = -1;
    for (let k = 0; k <= FACTORS.length; k++) {
      const e = explained(FACTORS.map((_, i) => i < k));
      expect(e).toBeGreaterThan(prev); prev = e;
    }
  });
  it('en riskli beşte birde gerçekleşen oran artar ama %100\'e varmaz; en düşükte sıfır olmaz', () => {
    const base = evaluate(none), g = evaluate(only(0)), g3 = evaluate(only(0, 1, 2)), all = evaluate(FACTORS.map(() => true));
    expect(Math.abs(base.top - base.bottom)).toBeLessThan(0.06);
    expect(g3.top).toBeGreaterThan(g.top);
    expect(all.top).toBeGreaterThan(g3.top - 0.02);
    expect(all.top).toBeLessThan(0.8);
    expect(all.bottom).toBeGreaterThan(0);
    expect(all.top - all.bottom).toBeGreaterThan(0.4);
    expect(all.top).toBeGreaterThan(base.top + 0.25);
  });
  it('genin katkısı sıfırlanırsa (replikasyon) kalan etkenler öngörüyü taşır', () => {
    const noGene = defaultShares(0), all = FACTORS.map(() => true);
    expect(explained(all, noGene)).toBeCloseTo(0.42, 9);
    expect(evaluate(only(0), noGene).top).toBeLessThan(0.25);
    expect(evaluate(all, noGene).top).toBeGreaterThan(0.45);
  });
  it('kortizol, kültür ve adet döngüsü tek başına toplam öngörüye az katkı yapar (kitap: "biraz daha")', () => {
    for (const i of [3, 4, 5]) {
      expect(FACTORS[i].share).toBeLessThan(0.05);
      expect(evaluate(only(i)).top - evaluate(only(i)).bottom).toBeLessThan(0.2);
    }
  });
  it('örneklem aynı tohumda aynı kişileri verir; yalnızca puan değişir', () => {
    const a = sample(none, defaultShares(), 9, 100), b = sample(FACTORS.map(() => true), defaultShares(), 9, 100);
    expect(a.reduce((s, p) => s + p.y, 0)).toBe(b.reduce((s, p) => s + p.y, 0));
    expect(quintiles(a).reduce((s, g) => s + g.size, 0)).toBe(100);
  });
});

describe('cezanın tatmini (ch16-e7)', () => {
  const players = makePlayers(2, 60);
  it('kaudat etkinliği ödeme isteğini öngörür (pozitif ilişki)', () => {
    expect(punishStats(players, 1, 3, 2).r).toBeGreaterThan(0.4);
  });
  it('ödül ağırlığı sıfırlanınca bu ilişki zayıflar', () => {
    expect(punishStats(players, 1, 0, 2).r).toBeLessThan(punishStats(players, 1, 3, 2).r - 0.3);
  });
  it('maliyet arttıkça cezalandıran sayısı azalır; bedelsiz ceza yaygındır', () => {
    let prev = Infinity;
    for (const cost of [0, 1, 2, 3, 4, 5, 6]) {
      const n = punishStats(players, 1, 3, cost).count;
      expect(n).toBeLessThanOrEqual(prev); prev = n;
    }
    expect(punishStats(players, 1, 3, 0).count / players.length).toBeGreaterThan(0.9);
    expect(punishStats(players, 1, 3, 6).count).toBeLessThan(players.length / 3);
  });
  it('adil teklifte kimse cezalandırmaz; ödenen toplam = sayı x maliyet', () => {
    expect(punishStats(players, 0, 3, 0).count).toBe(0);
    const s = punishStats(players, 0.8, 3, 2);
    expect(s.paid).toBe(s.count * 2);
  });
  it('daha yüksek ödül ağırlığı aynı maliyette daha çok cezalandırır', () => {
    expect(punishStats(players, 1, 5, 4).count).toBeGreaterThan(punishStats(players, 1, 1, 4).count);
    expect(wtp(players[0], 1, 3)).toBeGreaterThanOrEqual(0);
  });
  it('pearson uçları', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 9);
    expect(pearson([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 9);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0);
  });
});

describe('sorumluluk ve ceza kararı (ch16-e6)', () => {
  const c = (id: string) => CASES.find((x) => x.id === id)!;
  it('biyolojik açıklama arttıkça soğuk sorumluluk kararı belirgin düşer; sıcak ceza dürtüsü çok az', () => {
    const a = judgments(c('bilinmez'), 0), b = judgments(c('bilinmez'), 1);
    expect(a.cold - b.cold).toBeGreaterThan(0.7);
    expect(a.hot - b.hot).toBeLessThan(0.2);
    expect(b.hot).toBeGreaterThan(b.cold);
  });
  it('ceza dürtüsü zarara göre artar', () => {
    expect(judgments({ ...c('tumor'), harm: 0.9 }, 0.5).hot).toBeGreaterThan(judgments({ ...c('tumor'), harm: 0.3 }, 0.5).hot);
  });
  it('ceza duygusal tatmin sağlar, onarım sağlamaz; onarım nedeni giderir', () => {
    const t = c('tumor');
    expect(outcome(t, t.bio, 'ceza').satisf).toBeGreaterThan(outcome(t, t.bio, 'karantina').satisf);
    expect(outcome(t, t.bio, 'onarim').satisf).toBe(0);
    expect(outcome(t, t.bio, 'onarim').cause).toBeGreaterThan(0.6);
    expect(outcome(t, t.bio, 'ceza').cause).toBe(0);
  });
  it('tedavisi kolay vakada onarım, zor vakada karantina daha güvenli', () => {
    const easy = c('tumor'), hard = c('bilinmez');
    expect(outcome(easy, 0.9, 'onarim').safety).toBeGreaterThan(outcome(easy, 0.9, 'karantina').safety);
    expect(outcome(hard, 0.1, 'karantina').safety).toBeGreaterThan(outcome(hard, 0.1, 'onarim').safety);
    expect(recommend(0.7, 0.85)).toBe('onarim');
    expect(recommend(0.5, 0.2)).toBe('karantina');
    expect(recommend(0.1, 0.9)).toBe('izleme');
  });
  it('suçlama ve tehlikelilik ayrılabilir: dört çeyrek', () => {
    expect(quadrant(10, 80)).toBe('tamir');
    expect(quadrant(80, 10)).toBe('intikam');
    expect(quadrant(80, 80)).toBe('ikisi');
    expect(quadrant(10, 10)).toBe('hicbiri');
  });
});
