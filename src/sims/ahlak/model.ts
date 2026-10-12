// Ahlak (ch13): üç saf model. DOM yok.
//  1) Trolley: soğuk hesap (dlPFC) ile sıcak sezgi (vmPFC/amigdala/insula) arasındaki çekişme.
//  2) Kamu malı oyunu + ceza (Herrmann) ve adalet eğrisi (Henrich).
//  3) Zar ve dürüstlük (Gächter ve Schulz).
// Kitaptan gelen sayılar BOOK nesnesinde; modelin kendi varsayımları "ASSUME" ile işaretli.
import { mulberry32 } from '../rng';

export const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

/** content/chapters.json (ch13-e1, e4, e7, e8, e10) içindeki sayılar. */
export const BOOK = {
  knobe: { zarar: 0.85, yarar: 0.23 },
  hadzaKeeps: 0.73, // Diktatör Oyunu: Hadza payın ortalama %73'ünü kendine ayırdı
  fairNear: 0.5, // pazara bağlı balıkçılar ve kentliler 50:50'ye yaklaştı
  marketMax: 0.9, // yerleşik balıkçı topluluklarında yaklaşık %90
  smallGroup: 50, // 50 kişiden küçük Hadza grupları
  bigGroup: 5000, // 5000+ kişilik topluluklar
  loopLogical: 0.3, // döngüde mantıken beklenen onay
} as const;

/* =====================================================================
   1) Trolley
   ===================================================================== */
export type Intent = 'kaza' | 'yan' | 'arac';
export interface Dims { force: 0 | 1; prox: 0 | 1; intent: Intent; saved: number }
export type ScenarioId = 'anahtar' | 'kazara' | 'kopru' | 'sopa' | 'dongu';
export interface Scenario {
  id: ScenarioId;
  short: string; text: string; ask: string;
  dims: Omit<Dims, 'saved'>;
  /** Kitaptaki onay oranı (aralık ya da nokta); sopada sayı yok. */
  book: [number, number] | null;
}

export const SCENARIOS: Scenario[] = [
  { id: 'anahtar', short: 'Anahtar', ask: 'Anahtarı çevirir misin?',
    text: 'Kontrolsüz bir tramvay beş kişiye gidiyor. Anahtarı çevirirsen yan raya geçer ve orada duran bir kişiyi öldürür.',
    dims: { force: 0, prox: 0, intent: 'yan' }, book: [0.6, 0.7] },
  { id: 'kazara', short: 'Kazara itme', ask: 'Bu kazara itmeyi onaylar mısın?',
    text: 'Anahtara koşarken yoldaki birini kazara itip düşürürsün. O raylara düşer ve tramvay beş kişiden döner.',
    dims: { force: 1, prox: 1, intent: 'kaza' }, book: [0.8, 0.8] },
  { id: 'kopru', short: 'Köprüden itme', ask: 'Adamı iter misin?',
    text: 'Köprüde yanındaki iri adamı elinle raylara itersen tramvay onda durur ve beş kişi kurtulur.',
    dims: { force: 1, prox: 1, intent: 'arac' }, book: [0.3, 0.3] },
  { id: 'sopa', short: 'Sopayla itme', ask: 'Adamı sopayla iter misin?',
    text: 'Aynı köprü, aynı adam; ama onu uzun bir sopayla itersin. Kasın yine bir kişiyi araç yapmak için kullanılıyor.',
    dims: { force: 1, prox: 0, intent: 'arac' }, book: null },
  { id: 'dongu', short: 'Döngü', ask: 'Anahtarı çevirir misin?',
    text: 'Anahtar tramvayı, ana raya geri dönen bir döngüye sokar. Döngüdeki bir kişinin bedeni tramvayı durdurmazsa tramvay geri dönüp beş kişiyi ezer.',
    dims: { force: 0, prox: 0, intent: 'arac' }, book: [0.6, 0.7] },
];

/* ASSUME: ağırlıklar kitaptaki oranlardan ayarlanan log-odds katsayılarıdır. */
export const W = {
  A: Math.log(4) / Math.log(5), // soğuk hesap ln(kurtarılan) ile ölçeklenir; 5 kişide tek başına 4:1
  choice: Math.log(2), // bir kişinin ölümünü seçmenin genel bedeli (kaza değilse)
  force: 1.3405, // kişisel güç x araç etkileşimi
  prox: 0.2, // yakınlık (küçük)
} as const;

export interface Systems {
  cold: number; hot: number; hotParts: { choice: number; force: number; prox: number };
  net: number; pYes: number; pConsistent: number;
}

export function systems(d: Dims): Systems {
  const chosen = d.intent === 'kaza' ? 0 : 1;
  const means = d.intent === 'arac' ? 1 : 0;
  const cold = W.A * Math.log(Math.max(1.0001, d.saved));
  const part = { choice: W.choice * chosen, force: W.force * d.force * means, prox: W.prox * d.prox * chosen };
  const hot = part.choice + part.force + part.prox;
  const net = cold - hot;
  // Tutarlı niyet kuralı: araç olarak kullanmak, kasla itme olmasa da itme gibi sayılsaydı.
  const consistent = cold - (part.choice + W.force * means + part.prox);
  return { cold, hot, hotParts: part, net, pYes: sigmoid(net), pConsistent: sigmoid(consistent) };
}

export const dimsOf = (s: Scenario, saved = 5): Dims => ({ ...s.dims, saved });
export const scenarioP = (s: Scenario, saved = 5): number => systems(dimsOf(s, saved)).pYes;

export function describeTrolley(d: Dims): string {
  const s = systems(d);
  const p = Math.round(s.pYes * 100);
  const lead = s.net > 0.15 ? 'Soğuk hesap ağır basıyor' : s.net < -0.15 ? 'Sıcak sezgi ağır basıyor' : 'İki sistem başa baş';
  const why = d.intent === 'kaza' ? 'zarar seçilmiş bir eylem değil, sezgi neredeyse sessiz'
    : d.force && d.intent === 'arac' ? 'kişisel güçle bir kişiyi araç yapmak alarmı en yükseğe çıkarıyor'
      : d.intent === 'arac' ? 'kişisel güç yok, sezgi aracı olmayı pek ayırt etmiyor'
        : 'zarar yan etki, kişisel güç yok';
  return `${lead}: ${why}. Ortalama biri için "evet" olasılığı yaklaşık %${p}.`;
}

export type Answers = Partial<Record<ScenarioId, boolean>>;
export function profile(a: Answers): 'bekliyor' | 'faydaci' | 'deontolog' | 'degisen' {
  const v = SCENARIOS.map((s) => a[s.id]);
  if (v.some((x) => x === undefined)) return 'bekliyor';
  if (v.every(Boolean)) return 'faydaci';
  if (v.every((x) => !x)) return 'deontolog';
  return 'degisen';
}

/* =====================================================================
   2a) Kamu malı oyunu + ceza (Herrmann ve ark.)
   ===================================================================== */
/* ASSUME: oyun parametreleri (kitapta/chapters.json'da yok) */
export const PG = { E: 20, mpcr: 0.4, groupSize: 4, groups: 4, rounds: 10, maxPts: 10, cost: 1, impact: 3 } as const;
export const N_AGENTS = PG.groupSize * PG.groups;

export interface Society { capital: number; law: number }
export const PROFILES: Record<'yuksek' | 'dusuk', Society> = { yuksek: { capital: 0.85, law: 0.85 }, dusuk: { capital: 0.15, law: 0.15 } };

/** ASSUME: antisosyal (intikamcı) cezalandırıcı oyuncu oranı; ortalama sosyal sermaye ve hukukla düşer. */
export function antiShare(s: Society): number {
  const civic = (s.capital + s.law) / 2;
  return 0.7 * clamp((0.7 - civic) / 0.7);
}

export interface Agent { coop: number; rho: number; anti: boolean; group: number }
export function makeAgents(seed: number, s: Society): Agent[] {
  const rnd = mulberry32(seed * 7919 + 13);
  const order = Array.from({ length: N_AGENTS }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const k = Math.round(antiShare(s) * N_AGENTS);
  const antiSet = new Set(order.slice(0, k)); // iç içe: oran artınca öncekiler kalır
  return Array.from({ length: N_AGENTS }, (_, i) => {
    const u = 0.2 + 0.8 * rnd(), r = 0.55 + 0.4 * rnd();
    const anti = antiSet.has(i);
    return { coop: anti ? u * 0.5 : u, rho: r, anti, group: Math.floor(i / PG.groupSize) };
  });
}

export interface Punish { from: number; to: number; pts: number; anti: boolean }
export interface Round { c: number[]; pun: Punish[]; pay: number[]; proSpend: number; antiSpend: number }
export interface Run { agents: Agent[]; rounds: Round[]; punishment: boolean }

const K = { delta: 1.5, pro: 1.0, anti: 0.7, proPts: 1.0, antiPts: 3.0, revenge: 1.0, tol: 2.0 };

export function simulate(seed: number, s: Society, punishment: boolean, nRounds: number = PG.rounds): Run {
  const agents = makeAgents(seed, s);
  const rnd = mulberry32(seed * 104729 + 7);
  const E = PG.E;
  const rounds: Round[] = [];
  let prev: Round | null = null;
  for (let t = 0; t < nRounds; t++) {
    const c = agents.map((a, i) => {
      let target: number;
      if (!prev) target = E * (0.3 + 0.5 * a.coop);
      else {
        const mates = agents.map((_, j) => j).filter((j) => agents[j].group === a.group && j !== i);
        const avg = mates.reduce((x, j) => x + prev!.c[j], 0) / mates.length;
        target = a.rho * (avg - K.delta) + (1 - a.rho) * E * a.coop * 0.5;
        let pro = 0, anti = 0;
        for (const p of prev.pun) if (p.to === i) { if (prev.c[p.from] > prev.c[i]) pro += p.pts; else anti += p.pts; }
        target += (a.anti ? 0 : E * K.pro * Math.min(1, pro / 3)) - E * K.anti * Math.min(1, anti / 4);
      }
      return Math.round(clamp((prev ? prev.c[i] + 0.55 * (target - prev.c[i]) : target) + (rnd() - 0.5) * 2, 0, E));
    });
    const pun: Punish[] = [];
    if (punishment) {
      agents.forEach((a, i) => {
        const raw: Punish[] = [];
        // Korku: antisosyal cezaya uğrayan ahlaklı cezalandırıcı bir sonraki turda çekinir.
        const hit = !a.anti && prev ? prev.pun.filter((p) => p.to === i && p.anti).reduce((x, p) => x + p.pts, 0) : 0;
        const timid = 1 - 0.95 * Math.min(1, hit / 2);
        for (let j = 0; j < N_AGENTS; j++) {
          if (j === i || agents[j].group !== a.group) continue;
          const d = (c[j] - c[i]) / E;
          let pts = 0, isAnti = false;
          if (!a.anti && d < -K.tol / E) pts = PG.maxPts * -d * K.proPts * timid;
          else if (a.anti && d > K.tol / E) { pts = PG.maxPts * d * K.antiPts; isAnti = true; }
          if (a.anti && prev) {
            const got = prev.pun.filter((p) => p.from === j && p.to === i).reduce((x, p) => x + p.pts, 0);
            if (got > 0) { pts += K.revenge * got; isAnti = c[j] >= c[i] || isAnti; }
          }
          if (pts >= 0.5) raw.push({ from: i, to: j, pts, anti: isAnti });
        }
        const tot = raw.reduce((x, p) => x + p.pts, 0);
        const f = tot > PG.maxPts ? PG.maxPts / tot : 1;
        for (const p of raw) { const q = Math.round(p.pts * f); if (q > 0) pun.push({ ...p, pts: q }); }
      });
    }
    const pay = agents.map((a, i) => {
      const pool = agents.reduce((x, b, j) => x + (b.group === a.group ? c[j] : 0), 0);
      const base = E - c[i] + PG.mpcr * pool;
      const given = pun.filter((p) => p.from === i).reduce((x, p) => x + p.pts, 0) * PG.cost;
      const got = pun.filter((p) => p.to === i).reduce((x, p) => x + p.pts, 0) * PG.impact;
      return base - given - Math.min(got, base);
    });
    const proSpend = pun.filter((p) => !p.anti).reduce((x, p) => x + p.pts, 0);
    const antiSpend = pun.filter((p) => p.anti).reduce((x, p) => x + p.pts, 0);
    const r = { c, pun, pay, proSpend, antiSpend };
    rounds.push(r);
    prev = r;
  }
  return { agents, rounds, punishment };
}

const mean = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const avgContribution = (r: Round): number => mean(r.c);
export const avgPay = (r: Round): number => mean(r.pay);
export function antiFraction(run: Run, upTo = run.rounds.length): number {
  let a = 0, p = 0;
  for (const r of run.rounds.slice(0, upTo)) { a += r.antiSpend; p += r.proSpend; }
  return a + p === 0 ? 0 : a / (a + p);
}
export function totals(run: Run, upTo = run.rounds.length): { pro: number; anti: number; pay: number } {
  const rs = run.rounds.slice(0, upTo);
  return { pro: rs.reduce((x, r) => x + r.proSpend, 0), anti: rs.reduce((x, r) => x + r.antiSpend, 0), pay: mean(rs.map(avgPay)) };
}

export function describePG(none: Run, pun: Run, upTo: number, s: Society): string {
  const last = pun.rounds[upTo - 1], base = none.rounds[upTo - 1];
  const a = Math.round(avgContribution(last)), b = Math.round(avgContribution(base));
  const af = Math.round(antiFraction(pun, upTo) * 100);
  const civic = (s.capital + s.law) / 2;
  const tag = civic >= 0.6 ? 'Ceza çoğunlukla bedava binenlere gidiyor' : civic >= 0.4 ? 'Ceza karışık hedefleniyor' : 'Ceza giderek işbirlikçilere de yöneliyor';
  return `${upTo}. tur: cezalı oyunda ortalama katkı ${a}/${PG.E}, cezasızda ${b}/${PG.E}. ${tag} (cezanın %${af}'i antisosyal).`;
}

/* =====================================================================
   2b) Adalet eğrisi (Henrich ve ark.)
   ===================================================================== */
export interface Market { market: number; size: number; religion: number }
export const HADZA: Market = { market: 0, size: 40, religion: 0 };
export const BIG_MARKET: Market = { market: BOOK.marketMax, size: BOOK.bigGroup, religion: 0.5 };

/** Kitap: pazar 0 iken Diktatör teklifi %27, pazar ~%90 iken ~%50 (uçlar kitaptan, ara biçim varsayım). */
export function dictatorOffer(m: Market): number {
  const lo = 1 - BOOK.hadzaKeeps, hi = BOOK.fairNear;
  return lo + (hi - lo) * (1 - Math.pow(1 - clamp(m.market / BOOK.marketMax), 2));
}
const sizeScore = (size: number): number =>
  clamp((Math.log10(size) - Math.log10(BOOK.smallGroup)) / (Math.log10(BOOK.bigGroup) - Math.log10(BOOK.smallGroup)));
/** ASSUME: ceza isteği pazar, topluluk büyüklüğü ve dünya dini oranının ağırlıklı toplamı. */
export function punishScore(m: Market): number {
  return clamp(0.4 * (m.market / BOOK.marketMax) + 0.4 * sizeScore(m.size) + 0.2 * m.religion);
}
/** Bu payın altındaki teklifler reddedilir; küçük toplulukta ~0, büyük pazara bağlı toplulukta ~%25-30. */
export const rejectThreshold = (m: Market): number => 0.01 + 0.3 * punishScore(m);
export function pReject(offer: number, m: Market): number {
  if (offer <= 0) return 1;
  return 1 / (1 + Math.exp((offer - rejectThreshold(m)) / 0.025));
}
/** Teklif edenin beklenen kazancını en çoğa çıkaran teklif (0-0,5). */
export function bestOffer(m: Market): number {
  let best = 0, bv = -1;
  for (let x = 0; x <= 0.5001; x += 0.01) { const v = (1 - x) * (1 - pReject(x, m)); if (v > bv) { bv = v; best = x; } }
  return best;
}

/* =====================================================================
   3) Zar ve dürüstlük (Gächter ve Schulz)
   ===================================================================== */
/** ASSUME: 1-5 yüzdeki sayı kadar kazandırır, 6 sıfır; 5 en çok kazandırır. */
export const payOf = (face: number): number => (face === 6 ? 0 : face);
export const FACES = [1, 2, 3, 4, 5, 6] as const;
export const bestOf = (a: number, b: number): number => (payOf(b) > payOf(a) ? b : a);

export const honestDist = (): number[] => FACES.map(() => 1 / 6);
export function justifiedDist(): number[] {
  const out = [0, 0, 0, 0, 0, 0];
  for (const a of FACES) for (const b of FACES) out[bestOf(a, b) - 1] += 1 / 36;
  return out;
}
export const liarDist = (): number[] => [0, 0, 0, 0, 1, 0];

export interface Mix { justified: number; liar: number }
export function normMix(m: Mix): Mix {
  const j = clamp(m.justified), l = clamp(m.liar, 0, 1 - j);
  return { justified: j, liar: l };
}
export const honestShare = (m: Mix): number => 1 - normMix(m).justified - normMix(m).liar;
export function expectedDist(m0: Mix): number[] {
  const m = normMix(m0), h = honestDist(), j = justifiedDist(), l = liarDist();
  return FACES.map((_, i) => honestShare(m) * h[i] + m.justified * j[i] + m.liar * l[i]);
}
export const expectedPay = (d: number[]): number => d.reduce((x, p, i) => x + p * payOf(i + 1), 0);
/** Düz dağılımdan toplam sapma (toplam değişim uzaklığı): 0 = dürüst. */
export const deviation = (d: number[]): number => d.reduce((x, p) => x + Math.abs(p - 1 / 6), 0) / 2;

/** Oyuncuları tipe göre ayırarak örnekler: sonuç [dürüst, haklı dürüstlük, tam yalan] x 6 sayı sayımı. */
export function sampleByType(seed: number, n: number, m0: Mix): number[][] {
  const m = normMix(m0), rnd = mulberry32(seed * 2654435761 + 5);
  const out = [0, 1, 2].map(() => [0, 0, 0, 0, 0, 0]);
  for (let i = 0; i < n; i++) {
    const a = 1 + Math.floor(rnd() * 6), b = 1 + Math.floor(rnd() * 6), u = rnd();
    const t = u < m.liar ? 2 : u < m.liar + m.justified ? 1 : 0;
    out[t][(t === 2 ? 5 : t === 1 ? bestOf(a, b) : a) - 1]++;
  }
  return out;
}
export const sampleReports = (seed: number, n: number, m: Mix): number[] =>
  FACES.map((_, i) => sampleByType(seed, n, m).reduce((x, row) => x + row[i], 0));
/** ASSUME: toplum karışımları. Kitaptan yalnızca yön: ihlal arttıkça yalan artar; tam yalan her yerde nadir. */
export const MIXES: { id: string; name: string; mix: Mix }[] = [
  { id: 'durust', name: 'Herkes dürüst', mix: { justified: 0, liar: 0 } },
  { id: 'dusuk', name: 'Düşük ihlalli toplum', mix: { justified: 0.25, liar: 0.02 } },
  { id: 'yuksek', name: 'Yüksek ihlalli toplum', mix: { justified: 0.65, liar: 0.05 } },
  { id: 'yalan', name: 'Herkes tam yalancı', mix: { justified: 0, liar: 1 } },
];

const f2 = (x: number): string => x.toFixed(2).replace('.', ',');
export function describeDice(m0: Mix): string {
  const m = normMix(m0), d = expectedDist(m);
  if (m.justified + m.liar < 0.005) return 'Herkes dürüst: her sayı altıda bir (%17) civarında, dağılım düz.';
  if (m.liar > 0.995) return 'Herkes hep 5 bildiriyor: tek sütun, dağılım tamamen çarpık.';
  return `Beklenen ödeme ${f2(expectedPay(d))} (dürüstken 2,50). 5 bildirenler %${Math.round(d[4] * 100)}, 6 bildirenler %${Math.round(d[5] * 100)}: haklı dürüstlük sağ uçtaki 5'i şişirir.`;
}
