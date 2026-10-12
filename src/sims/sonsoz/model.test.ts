import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { simsFor } from '../registry';
import { CHAPTERS, THEMES } from './harita-data';
import { NOTES } from './notes';
import {
  BIZ_DEFAULT, HI, LO, N_PEOPLE, ORT_DEFAULT, baseDraw, bizView, closeness, density, describeBiz, describeOrt, evaluate, histogram,
  makePeople, place, popsOf, settle, share, survival, tierOf, timeline, upperTail, type BizInputs, type OrtInputs, type Pop,
} from './model';

const ort = (p: Partial<OrtInputs> = {}): OrtInputs => ({ ...ORT_DEFAULT, ...p });
const biz = (p: Partial<BizInputs> = {}): BizInputs => ({ ...BIZ_DEFAULT, ...p });
const integrate = (f: (x: number) => number, a: number, b: number, n = 4000): number => {
  const h = (b - a) / n;
  let s = 0;
  for (let k = 0; k < n; k++) s += f(a + (k + 0.5) * h) * h;
  return s;
};

describe('normal kuyruk ve yoğunluk', () => {
  it('bilinen değerler', () => {
    expect(upperTail(0)).toBeCloseTo(0.5, 6);
    expect(upperTail(1.96)).toBeCloseTo(0.025, 4);
    expect(upperTail(-1)).toBeCloseTo(0.8413, 4);
    expect(upperTail(4)).toBeCloseTo(3.167e-5, 8);
  });
  it('yoğunluk 1\'e integre olur ve survival, yoğunluğun kuyruk integraline eşittir (çan ve iki tepeli)', () => {
    for (const shape of ['bell', 'twin'] as const) {
      const p = { mean: 50, sd: 16, shape };
      expect(integrate((x) => density(p, x), -100, 200)).toBeCloseTo(1, 3);
      expect(integrate((x) => density(p, x), 75, 250)).toBeCloseTo(survival(p, 75), 3);
    }
  });
  it('iki tepelinin ortalaması ve toplam sapması çanınkiyle aynıdır, ama ortada boşluk vardır', () => {
    const bell: Pop = { mean: 50, sd: 16, shape: 'bell' }, twin: Pop = { ...bell, shape: 'twin' };
    const m = (p: Pop) => integrate((x) => x * density(p, x), -100, 200);
    const v = (p: Pop) => integrate((x) => (x - m(p)) ** 2 * density(p, x), -100, 200);
    expect(m(twin)).toBeCloseTo(50, 2);
    expect(Math.sqrt(v(twin))).toBeCloseTo(16, 1);
    expect(density(twin, 50)).toBeLessThan(density(bell, 50) * 0.6);
    expect(survival(twin, 50)).toBeCloseTo(0.5, 6);
  });
});

describe('sekme 1: aynı ortalama, farklı kuyruk', () => {
  it('varsayılan: A\'da aşan yok denecek kadar az, B\'de birkaç yüzde; aşanların hemen hepsi B\'den', () => {
    const r = evaluate(ort());
    expect(r.a).toBeLessThan(1e-4);
    expect(r.b).toBeGreaterThan(0.04);
    expect(r.b).toBeLessThan(0.08);
    expect(r.fromB).toBeGreaterThan(0.999);
    expect(r.ratio).toBeGreaterThan(1000);
  });
  it('iki popülasyonun ortalaması da aynıdır; ortalamanın üstü yarı yarıyadır', () => {
    const { A, B } = popsOf(ort({ ctx: 7 }));
    expect(A.mean).toBe(B.mean);
    expect(survival(A, A.mean)).toBeCloseTo(0.5, 6);
    expect(survival(B, B.mean)).toBeCloseTo(0.5, 6);
  });
  it('eşik ortalamanın üstündeyken yayılım artınca pay artar; altındayken azalır', () => {
    const up = [6, 10, 14, 18, 22].map((sd) => evaluate(ort({ sdB: sd })).b);
    for (let i = 1; i < up.length; i++) expect(up[i]).toBeGreaterThan(up[i - 1]);
    const down = [6, 10, 14, 18, 22].map((sd) => evaluate(ort({ sdB: sd, thr: 55, mean: 60 })).b);
    for (let i = 1; i < down.length; i++) expect(down[i]).toBeLessThan(down[i - 1]);
  });
  it('bağlam kayması: pay monoton artar, mutlak artış geniş dağılımda daha büyük, oran ise düşer', () => {
    const a0 = evaluate(ort({ ctx: 0 })), a1 = evaluate(ort({ ctx: 8 }));
    expect(a1.a).toBeGreaterThan(a0.a);
    expect(a1.b - a0.b).toBeGreaterThan(a1.a - a0.a);
    expect(a1.ratio).toBeLessThan(a0.ratio);
    const bs = [-15, -8, 0, 8, 15].map((c) => evaluate(ort({ ctx: c })).b);
    for (let i = 1; i < bs.length; i++) expect(bs[i]).toBeGreaterThan(bs[i - 1]);
  });
  it('iki tepeli B, aynı yayılımda çandan farklı kuyruk verir (biçim önemli)', () => {
    const bell = evaluate(ort({ thr: 60 })).b, twin = evaluate(ort({ thr: 60, shapeB: 'twin' })).b;
    expect(Math.abs(twin - bell)).toBeGreaterThan(0.03);
    expect(twin).toBeGreaterThan(evaluate(ort({ thr: 60 })).a * 4);
  });
  it('eşik ortalamaya eşitse (ya da yayılım eşitse) fark kalmaz', () => {
    const r = evaluate(ort({ thr: 50 }));
    expect(r.a).toBeCloseTo(0.5, 6);
    expect(r.b).toBeCloseTo(0.5, 6);
    const e = evaluate(ort({ sdA: 14, sdB: 14 }));
    expect(e.a).toBeCloseTo(e.b, 9);
    expect(e.fromB).toBeCloseTo(0.5, 6);
  });
  it('matchShift: A\'nın ortalaması bu kadar artınca B\'nin payına ulaşır', () => {
    const i = ort(), r = evaluate(i), { A } = popsOf(i);
    expect(survival({ ...A, mean: A.mean + r.matchShift }, i.thr)).toBeCloseTo(r.b, 4);
    expect(r.matchShift).toBeGreaterThan(10);
  });
  it('örneklem: tohumlu deterministik, kaydırıcıyla aynı kişiler yer değiştirir, histogram toplamı N', () => {
    const b1 = baseDraw(400, mulberry32(5)), b2 = baseDraw(400, mulberry32(5));
    expect(b1).toEqual(b2);
    const { B } = popsOf(ort());
    const x = place(B, b1), y = place({ ...B, mean: B.mean + 10 }, b1);
    expect(y[3] - x[3]).toBeCloseTo(10, 6);
    expect(histogram(x, 25).reduce((a, c) => a + c, 0)).toBe(400);
    const mean = x.reduce((a, c) => a + c, 0) / x.length;
    expect(Math.abs(mean - 50)).toBeLessThan(3);
    expect(Math.min(...x)).toBeGreaterThanOrEqual(LO);
    expect(Math.max(...x)).toBeLessThanOrEqual(HI);
  });
  it('iki tepelide örneklem iki kümeye ayrılır', () => {
    const { B } = popsOf(ort({ shapeB: 'twin' }));
    const x = place(B, baseDraw(2000, mulberry32(8)));
    const mid = x.filter((v) => Math.abs(v - 50) < 4).length, side = x.filter((v) => Math.abs(v - 64) < 4).length;
    expect(side).toBeGreaterThan(mid * 1.8);
  });
  it('payı okunur yazar ve cümle ortalamanın aynı olduğunu söyler', () => {
    expect(share(0)).toBe('<%0,01');
    expect(share(0.0034)).toBe('%0,34');
    expect(share(0.059)).toBe('%5,9');
    expect(share(0.37)).toBe('%37');
    const t = describeOrt(ort(), evaluate(ort()));
    expect(t).toMatch(/Ortalama aynı \(50\)/);
    expect(t).toMatch(/neredeyse hepsi B'den/);
    expect(describeOrt(ort({ thr: 95, mean: 30 }), evaluate(ort({ thr: 95, mean: 30 })))).toMatch(/kimse aşmıyor/);
  });
});

describe('sekme 2: biz/onlar kaydırıcısı', () => {
  const people = makePeople(mulberry32(11));
  it('24 kişi, her ilk grup x etiket hücresinde 6 kişi; deterministik; çakışmayan konumlar', () => {
    expect(people).toHaveLength(N_PEOPLE);
    for (const g of [0, 1]) for (const c of [0, 1]) expect(people.filter((p) => p.g === g && p.c === c)).toHaveLength(6);
    expect(makePeople(mulberry32(11))).toEqual(people);
    for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) expect(Math.hypot(people[i].x - people[j].x, people[i].y - people[j].y)).toBeGreaterThan(30);
  });
  it('başlangıçta "biz" yalnızca kendi ilk grubudur (minimal grup)', () => {
    const v = bizView(people, 0, biz());
    expect(v.nBiz).toBe(11);
    expect(v.bizNew).toBe(0);
    expect(v.bizOld).toBe(v.nIn);
    expect(v.meanIn).toBeGreaterThan(0.8);
    expect(v.meanOut).toBeLessThan(0.2);
    expect(v.tiers[0]).toBe('ego');
  });
  it('ortak etiket sınırı yeniden çizer: dış gruptan biz sayılanlar çıkar, eski grubundan bir kısmı arada kalır', () => {
    const v = bizView(people, 0, biz({ label: 1 }));
    expect(v.bizNew).toBeGreaterThanOrEqual(3);
    expect(v.bizOld).toBeLessThan(v.nIn);
    expect(describeBiz(v)).toMatch(/yeniden çizildi/);
  });
  it('ortak hedef karşı grubu "onlar"dan "arada"ya taşır ama tek başına tam biz yapmaz', () => {
    const base = bizView(people, 0, biz()), v = bizView(people, 0, biz({ goal: 1 }));
    expect(v.meanOut).toBeGreaterThan(base.meanOut + 0.25);
    expect(v.nAra).toBeGreaterThan(base.nAra);
    expect(v.bizNew).toBeLessThanOrEqual(3);
    expect(v.bizNew).toBeLessThan(v.nOut / 2);
  });
  it('temas: ortak hedef olmadan zayıf, hedefle güçlü (uygun koşullar)', () => {
    const alone = bizView(people, 0, biz({ contact: 1 })), withGoal = bizView(people, 0, biz({ contact: 1, goal: 0.6 }));
    expect(withGoal.meanOut).toBeGreaterThan(alone.meanOut + 0.2);
    expect(withGoal.bizNew).toBeGreaterThan(alone.bizNew);
  });
  it('etkiler zamanla oturur: süre 0\'da müdahaleler işlemez, süre uzadıkça "biz" genişler (monoton)', () => {
    const all = biz({ goal: 0.6, label: 0.6, contact: 0.8 });
    expect(bizView(people, 0, { ...all, time: 0 }).nBiz).toBe(bizView(people, 0, biz({ time: 0 })).nBiz);
    const tl = timeline(people, 0, all);
    expect(tl).toHaveLength(25);
    for (let i = 1; i < tl.length; i++) expect(tl[i].neu).toBeGreaterThanOrEqual(tl[i - 1].neu);
    expect(tl[tl.length - 1].neu).toBeGreaterThan(tl[0].neu);
    expect(settle(0)).toBe(0);
    expect(settle(1)).toBeGreaterThan(0.9);
  });
  it('tehdit: aynı iyi koşullarda "biz" daha dar kalır ve karşı gruba yakınlık düşer', () => {
    const good = { goal: 0.8, label: 0.8, contact: 0.8, time: 0.9 };
    const calm = bizView(people, 0, biz({ ...good, threat: 0.1 })), tense = bizView(people, 0, biz({ ...good, threat: 1 }));
    expect(tense.nBiz).toBeLessThan(calm.nBiz);
    expect(tense.meanOut).toBeLessThan(calm.meanOut);
    expect(closeness(biz({ threat: 1 }), false, false)).toBeLessThan(closeness(biz({ threat: 0 }), false, false));
  });
  it('iki yönlü: sınırı yönlendirmek hem genişletir hem daraltır (aynı mekanizma)', () => {
    const wide = bizView(people, 0, biz({ goal: 0.8, label: 0.8, contact: 0.8, threat: 0.1, time: 0.9 })).nBiz;
    const narrow = bizView(people, 0, biz({ threat: 1 })).nBiz;
    expect(wide).toBeGreaterThan(narrow + 5);
  });
  it('başka merkezden bakınca da tutarlı; eşikler sınıflandırır', () => {
    const v = bizView(people, 12, biz());
    expect(v.nBiz).toBe(11);
    expect(tierOf(0.5)).toBe('biz');
    expect(tierOf(0.4)).toBe('ara');
    expect(tierOf(0.1)).toBe('onlar');
  });
});

describe('sekme 3: harita verisi', () => {
  const book = JSON.parse(readFileSync('content/chapters.json', 'utf8')).chapters as Array<{ id: string }>;
  it('chapters.json\'daki her bölüm (sonsöz hariç) bir kez, aynı sırayla yer alır', () => {
    expect(CHAPTERS.map((c) => c.id)).toEqual(book.map((c) => c.id).filter((id) => id !== 'epilogue').sort((a, b) => order(a) - order(b)));
  });
  function order(id: string): number { return id === 'intro' ? 0 : id.startsWith('ch') ? +id.slice(2) : 100 + +id.slice(3); }
  it('her ders tek cümlelik ve kısa; kitaptan alıntı değil özet', () => {
    for (const c of CHAPTERS) {
      expect(c.lesson.length).toBeGreaterThan(40);
      expect(c.lesson.length).toBeLessThan(260);
      expect((c.lesson.match(/\. /g) ?? []).length).toBe(0);
    }
  });
  it('kayıttaki her simülasyon bir bölüm satırından (ya da sonsözden) ulaşılabilir', () => {
    const ids = new Set(CHAPTERS.map((c) => c.id).concat('epilogue'));
    for (const c of [...ids]) for (const s of simsFor(c)) expect(s.chapter).toBe(c);
    expect(simsFor('ch11').map((s) => s.id)).toContain('biz-onlar');
    expect(simsFor('epilogue').map((s) => s.id)).toContain('sonsoz');
  });
  it('temalar mevcut bölümlere bağlanır; notlarda ölü deney bağlantısı yok', () => {
    for (const t of THEMES) for (const id of t.chapters) expect(CHAPTERS.some((c) => c.id === id)).toBe(true);
    const all = JSON.parse(readFileSync('content/chapters.json', 'utf8')).chapters as Array<{ experiments?: Array<{ id: string }> }>;
    const exps = new Set(all.flatMap((c) => (c.experiments ?? []).map((e) => e.id)));
    for (const m of Object.values(NOTES).join('').matchAll(/deney=([a-z0-9-]+)/g)) expect(exps.has(m[1])).toBe(true);
  });
});
