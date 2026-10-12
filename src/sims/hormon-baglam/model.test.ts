import { describe, expect, it } from 'vitest';
import {
  MATCHES, O_BASE, PARTNERS, S_BASE, T_BASE, beliefTable, betray, chronic, choice, empathy, gcLevel, habit, lieRate,
  meanOffer, minutesOf, offerProbs, perf, perfAcute, popOffers, prejudice, risk, sampleOffers, sliderOf, statusKept,
  transfer, vole,
} from './model';
import { mulberry32 } from './rng';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

describe('testosteron: zorluk hipotezi (ch04-e1, e2)', () => {
  it('olasılıklar toplamı 1', () => {
    const c = choice({ ...T_BASE, dose: 0.7 });
    expect(c.saldiri + c.comertlik + c.cekil).toBeCloseTo(1, 10);
    expect(sum(popOffers({ ...T_BASE, dose: 1, route: 'comertlik' }))).toBeCloseTo(1, 10);
  });
  it('hormon yokken de davranış var: hormon yaratmaz, büyütür', () => {
    const c = choice({ ...T_BASE, dose: 0 });
    expect(c.saldiri).toBeGreaterThan(0.1);
    expect(c.comertlik).toBeGreaterThan(0.1);
  });
  it('meydan okuma yokken doz neredeyse hiçbir şeyi değiştirmez; varken belirgin büyütür', () => {
    const no0 = choice({ ...T_BASE, challenge: false, dose: 0 }), no1 = choice({ ...T_BASE, challenge: false, dose: 1 });
    const ch0 = choice({ ...T_BASE, dose: 0 }), ch1 = choice({ ...T_BASE, dose: 1 });
    expect(Math.abs(no1.saldiri - no0.saldiri)).toBeLessThan(0.08);
    expect(ch1.saldiri - ch0.saldiri).toBeGreaterThan(0.4);
  });
  it('aynı hormon, bağlam tersine dönünce ters yönde etkili (Eisenegger)', () => {
    const base = { ...T_BASE, challenge: true };
    const gen0 = meanOffer({ ...base, route: 'comertlik', dose: 0 }), gen1 = meanOffer({ ...base, route: 'comertlik', dose: 1 });
    const agg0 = meanOffer({ ...base, route: 'saldiri', dose: 0 }), agg1 = meanOffer({ ...base, route: 'saldiri', dose: 1 });
    expect(gen1).toBeGreaterThan(gen0 + 0.3); // statü cömertlikle korunuyorsa daha adil teklif
    expect(agg1).toBeLessThan(agg0 - 0.3); // saldırıyla korunuyorsa daha adaletsiz
    expect(gen0).toBeCloseTo(agg0, 10); // hormonsuz iki ortam aynı
  });
  it('doz arttıkça seçilen yoldaki eylem monoton artar', () => {
    let prev = -1;
    for (let d = 0; d <= 1.001; d += 0.1) {
      const v = choice({ ...T_BASE, dose: d, route: 'saldiri' }).saldiri;
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
  it('öteden gelen eğilim sonucu kaydırır (hormon eğilimi büyütür)', () => {
    const calm = choice({ ...T_BASE, dose: 1, disp: -1 }).saldiri, hot = choice({ ...T_BASE, dose: 1, disp: 1 }).saldiri;
    expect(hot).toBeGreaterThan(calm);
  });
  it('statü korunma: doğru yol + doz', () => {
    expect(statusKept({ ...T_BASE, dose: 1, route: 'comertlik' })).toBeGreaterThan(statusKept({ ...T_BASE, dose: 0, route: 'comertlik' }));
  });
});

describe('testosteron: inanç deneyi (ch04-e3)', () => {
  it('gerçek maddeden bağımsız, "testosteron aldım" inancı teklifleri düşürür', () => {
    const t = beliefTable({ ...T_BASE, route: 'comertlik', dose: 1 });
    expect(t[0][1]).toBeLessThan(t[0][0]); // gerçekte plasebo
    expect(t[1][1]).toBeLessThan(t[1][0]); // gerçekte testosteron
  });
  it('ilaç etkisi ve inanç etkisi ayrı terimlerdir', () => {
    const t = beliefTable({ ...T_BASE, route: 'comertlik', dose: 1 });
    expect(t[1][0]).toBeGreaterThan(t[0][0]); // ilaç: cömertlik bağlamında yükseltir
    expect(t[1][1]).toBeGreaterThan(t[0][1]);
  });
  it('doz 0 iken iki satır eşit', () => {
    const t = beliefTable({ ...T_BASE, dose: 0 });
    expect(t[0]).toEqual(t[1]);
  });
});

describe('testosteron: yalan (Wibral, ch04-e4)', () => {
  it('dürüstlüğün itibar getirdiği bağlamda doz yalanı azaltır', () => {
    expect(lieRate({ ...T_BASE, route: 'comertlik', dose: 1 })).toBeLessThan(lieRate({ ...T_BASE, route: 'comertlik', dose: 0 }));
  });
  it('kitapta test edilmeyen saldırı yolunda değişmez', () => {
    expect(lieRate({ ...T_BASE, route: 'saldiri', dose: 1 })).toBe(lieRate({ ...T_BASE, route: 'saldiri', dose: 0 }));
  });
});

describe('ultimatum örneklemi', () => {
  it('aynı tohum aynı sonucu verir; teklifler 0..5', () => {
    const i = { ...T_BASE, dose: 1, route: 'comertlik' as const };
    const a = sampleOffers(i, 24, mulberry32(3)), b = sampleOffers(i, 24, mulberry32(3));
    expect(a).toEqual(b);
    expect(a.every((x) => x >= 0 && x <= 5 && Number.isInteger(x))).toBe(true);
    expect(sampleOffers(i, 24, mulberry32(4))).not.toEqual(a);
  });
  it('bireysel adalet eğilimi teklifi yükseltir', () => {
    const m = (p: number[]) => p.reduce((a, x, j) => a + x * j, 0);
    expect(m(offerProbs(T_BASE, 1))).toBeGreaterThan(m(offerProbs(T_BASE, -1)));
  });
});

describe('oksitosin (ch04-e7, e8)', () => {
  const on = { ...O_BASE, dose: 1, threat: 0.8 }, off = { ...on, dose: 0 };
  it('iç gruba yatırım artar, dış gruba artmaz', () => {
    expect(transfer('biz', on)).toBeGreaterThan(transfer('biz', off) + 1);
    expect(transfer('onlar', on)).toBe(transfer('onlar', off));
  });
  it('rastgele mekanizmada (kontrol) etki yok: etki genel risk alma değil sosyal güven (Kosfeld)', () => {
    expect(transfer('rastgele', on)).toBe(transfer('rastgele', off));
    expect(transfer('yabanci', on)).toBeGreaterThan(transfer('yabanci', off));
  });
  it('dış gruba önyargı ve önleyici ihanet artar; tehditle birlikte daha çok', () => {
    expect(prejudice(on)).toBeGreaterThan(prejudice(off));
    expect(betray(on)).toBeGreaterThan(betray(off));
    const lowThreat = { ...on, threat: 0.1 };
    expect(betray(on) - betray(off)).toBeGreaterThan(betray(lowThreat) - betray({ ...lowThreat, dose: 0 }));
  });
  it('birleşik analizlerde Kosfeld güven etkisi kaybolur; De Dreu etkisi küçülür ama yönü korunur', () => {
    const pooled = { ...on, evidence: 'birlesik' as const };
    expect(transfer('yabanci', pooled)).toBe(transfer('yabanci', off));
    expect(transfer('biz', pooled)).toBeGreaterThan(transfer('biz', off));
    expect(transfer('biz', pooled)).toBeLessThan(transfer('biz', on));
    expect(prejudice(pooled)).toBeLessThan(prejudice(on));
  });
  it('geçerli aralıklar', () => {
    for (const p of PARTNERS) { const v = transfer(p, on); expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(10); }
    expect(prejudice(on)).toBeLessThanOrEqual(1);
  });
});

describe('tarla faresi (ch04-e5)', () => {
  it('reseptör arttıkça tanıdık dişiyle yakınlık artar, yabancıyla neredeyse değişmez', () => {
    const lo = vole({ receptor: 0.15, vasopressin: 0.5 }), hi = vole({ receptor: 0.85, vasopressin: 0.5 });
    expect(hi.familiar - lo.familiar).toBeGreaterThan(0.3);
    expect(hi.stranger - lo.stranger).toBeLessThan(0.05);
  });
  it('reseptör olmadan hormon tek başına bağ kurmaz', () => {
    expect(vole({ receptor: 0, vasopressin: 1 }).familiar).toBeCloseTo(0.1, 10);
  });
});

describe('stres eğrisi (ters U, ch04-e9)', () => {
  it('akut: orta stres sıfır ve aşırı stresten iyi', () => {
    expect(perfAcute(0.4)).toBeGreaterThan(perfAcute(0));
    expect(perfAcute(0.4)).toBeGreaterThan(perfAcute(1));
    expect(perfAcute(0.4)).toBeCloseTo(1, 10);
  });
  it('kronik: orta düzeyde bile performans stressizin altına düşer', () => {
    expect(perf(0.4, 20)).toBeGreaterThan(perf(0, 20));
    expect(perf(0.4, 60 * 24 * 21)).toBeLessThan(perf(0, 20));
  });
  it('kronikleşme süreyle artar, süre dönüşümü gidiş-dönüş tutarlı', () => {
    expect(chronic(30)).toBe(0);
    expect(chronic(60 * 24 * 21)).toBe(1);
    expect(chronic(60 * 24 * 7)).toBeGreaterThan(chronic(60 * 24 * 2));
    expect(sliderOf(minutesOf(37))).toBe(37);
  });
  it('kronik stres alışkanlığa kaydırır', () => {
    expect(habit(0.4, 60 * 24 * 21)).toBeGreaterThan(habit(0.4, 20) + 0.4);
  });
});

describe('risk alma (Lighthall, ch04-e10)', () => {
  it('stressizken erkekler daha çok risk alır', () => {
    expect(risk(0).erkek).toBeGreaterThan(risk(0).kadin);
  });
  it('orta stres: erkekte artar, kadında azalır; fark açılır', () => {
    expect(risk(0.4).erkek).toBeGreaterThan(risk(0).erkek);
    expect(risk(0.4).kadin).toBeLessThan(risk(0).kadin);
    expect(risk(0.4).erkek - risk(0.4).kadin).toBeGreaterThan(risk(0).erkek - risk(0).kadin);
  });
  it('büyük stres: ikisinde de risk almayı artırır', () => {
    expect(risk(1).erkek).toBeGreaterThan(risk(0).erkek);
    expect(risk(1).kadin).toBeGreaterThan(risk(0).kadin);
  });
});

describe('empati ve yer değiştirme (ch04-e11, e12, ch01-e1)', () => {
  it('stres yabancıya empatiyi yakın çevreden çok daraltır', () => {
    const lo = empathy({ ...S_BASE, sev: 0 }), hi = empathy({ ...S_BASE, sev: 1 });
    expect(lo.yabanci - hi.yabanci).toBeGreaterThan(lo.yakin - hi.yakin);
    expect(hi.yakin).toBeGreaterThan(hi.yabanci);
  });
  it('glukokortikoid engellenince yabancıya empati korunur (Martin)', () => {
    const blocked = empathy({ ...S_BASE, sev: 1, block: true }), open = empathy({ ...S_BASE, sev: 1 });
    expect(blocked.yabanci).toBeGreaterThan(open.yabanci + 0.4);
  });
  it('saldırganlığı yer değiştirmek stres hormonu düzeyini düşürür', () => {
    expect(gcLevel({ ...S_BASE, sev: 0.8, displace: true })).toBeLessThan(gcLevel({ ...S_BASE, sev: 0.8 }));
  });
  it('Card ve Dahl yüzdeleri kitaptaki gibi', () => {
    const up = Object.fromEntries(MATCHES.map((m) => [m.id, m.up]));
    expect(up).toEqual({ galibiyet: 0, beklenen: 0, beklenmedik: 10, playoff: 13, rakip: 20 });
  });
});
