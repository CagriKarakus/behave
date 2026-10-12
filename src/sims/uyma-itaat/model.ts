// Uyma (Asch) ve itaat (Milgram) modelleri. Saf hesap: DOM yok, rastlantı tohumlu.
// Kalibrasyon noktaları (Bölüm 12, chapters.json: ch12-e8 ve ch12-e9):
//  - Asch: tek başına cevaplayanlar denemelerin ~%1'inde hata yapar; oybirlikli yanlış çoğunlukta
//    denemelerin ~üçte birinde uyulur; etki 3 kişide belirginleşir, ~6 kişide doyuma ulaşır.
//  - Milgram: temel koşulda katılımcıların %65'i 450 V'a kadar çıkar; araştırmacı başka odadayken,
//    sıradan bir büroda ya da öğrenci aynı odadayken itaat azalır.
// Müttefikin, gizli cevabın, sorumluluk dağılımının ve akran direnişinin büyüklükleri kitaptan değil,
// yalnızca yönü kitaba dayanan nitel varsayımlardır.
import { mulberry32, type Rng } from '../rng';

export function gauss(rng: Rng): number {
  const u = Math.max(rng(), 1e-12), v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Standart normal birikimli dağılım (Abramowitz-Stegun yaklaşımı). */
export function phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// ---------------------------------------------------------------- Asch

export interface AschInputs {
  /** Oybirlikle yanlış söyleyen ortakların sayısı (0-15). */
  n: number;
  /** Doğruyu söyleyen bir müttefik (muhalif) var mı. */
  ally: boolean;
  /** Denek cevabını açıkça mı veriyor (true) yoksa gizlice yazıyor mu (false). */
  open: boolean;
  /** Çizgi farkı ne kadar belirgin: 0 çok zor, 1 çok kolay. */
  easy: number;
}

export const ASCH_DEFAULT: AschInputs = { n: 7, ally: false, open: true, easy: 0.5 };

export const ASCH = {
  floor: 0.01,      // tek başına: denemelerin ~%1'inde hata (kitap)
  excess: 0.325,    // oybirlikli 7 kişide ~üçte bir (kitap)
  k: 3.2,           // 3 kişide belirginleşme, ~6'da doyum (kitap)
  allyFactor: 0.25, // müttefik varken artık uyma çarpanı (nitel)
  privateFactor: 0.35, // gizli cevapta çarpan (nitel)
  trials: 12,       // denek başına kritik deneme
  subjects: 100,
  spread: 0.6,      // deneklerin duyarlılık farkı (log-normal)
};

/** Çoğunluk büyüklüğüne bağlı doygunluk eğrisi, 0-1. */
export const aschShape = (n: number): number => 1 - Math.exp(-Math.pow(n / ASCH.k, 2));

/** Tek bir kritik denemede yanlış cevaba uyma olasılığı. */
export function aschProb(u: AschInputs): number {
  let m = aschShape(u.n) * ASCH.excess;
  m *= 1.6 - 1.2 * u.easy;
  if (u.ally) m *= ASCH.allyFactor;
  if (!u.open) m *= ASCH.privateFactor;
  return Math.max(0, Math.min(0.9, ASCH.floor + m));
}

export function aschCurve(u: AschInputs, max = 15): number[] {
  return Array.from({ length: max }, (_, i) => aschProb({ ...u, n: i + 1 }));
}

export interface AschCohort {
  p: number;
  /** counts[j]: kritik denemelerin j tanesinde uyan denek sayısı (j = 0..trials). */
  counts: number[];
  rate: number;
  anyShare: number;
  neverShare: number;
}

export function simulateAsch(u: AschInputs, seed: number, subjects = ASCH.subjects, trials = ASCH.trials): AschCohort {
  const rng = mulberry32(seed);
  const p = aschProb(u);
  const counts = new Array<number>(trials + 1).fill(0);
  let total = 0;
  for (let s = 0; s < subjects; s++) {
    const h = Math.exp(ASCH.spread * gauss(rng) - (ASCH.spread * ASCH.spread) / 2);
    const ps = Math.min(0.95, p * h);
    let c = 0;
    for (let t = 0; t < trials; t++) if (rng() < ps) c++;
    counts[c]++;
    total += c;
  }
  return { p, counts, rate: total / (subjects * trials), anyShare: 1 - counts[0] / subjects, neverShare: counts[0] / subjects };
}

export interface AschTrial {
  /** Doğru şıkkın dizini (0=A..2=C). */
  correct: number;
  wrong: number;
  /** Konuşma sırası: her ortağın söylediği şık. */
  speakers: Array<{ pick: number; ally: boolean }>;
  conforms: boolean;
}

export function aschTrial(u: AschInputs, rng: Rng): AschTrial {
  const correct = Math.floor(rng() * 3);
  const wrong = (correct + 1 + Math.floor(rng() * 2)) % 3;
  const speakers = Array.from({ length: u.n }, () => ({ pick: wrong, ally: false }));
  if (u.ally) speakers.splice(Math.floor(rng() * (u.n + 1)), 0, { pick: correct, ally: true });
  return { correct, wrong, speakers, conforms: rng() < aschProb(u) };
}

export function describeAsch(u: AschInputs, c: AschCohort): string {
  const r = Math.round(c.rate * 100);
  const who = u.ally ? `${u.n} ortak yanlış, bir müttefik doğru söylüyor` : `${u.n} ortak oybirliğiyle yanlış söylüyor`;
  const how = u.open ? 'cevap açıkça veriliyor' : 'cevap gizlice yazılıyor';
  const tail = c.rate > 0.25 ? 'Denemelerin yaklaşık üçte biri ya da fazlasında uyuluyor.' : c.rate > 0.1 ? 'Uyma var ama sınırlı.' : 'Uyma belirgin biçimde az.';
  return `${who}; ${how}. Denemelerin ~%${r}'sinde yanlışa uyuluyor. ${tail}`;
}

// ---------------------------------------------------------------- Milgram

export const LEVELS = 30;
export const volts = (k: number): number => 15 * k;
export type Learner = 0 | 1 | 2; // ayrı oda, aynı oda, elini tutma

export interface MilgramInputs {
  /** Otoritenin yakınlığı: 0 uzak (telefon), 1 yanında. */
  authority: number;
  /** Kurumun prestiji: 0 sıradan büro, 1 saygın üniversite. */
  prestige: number;
  learner: Learner;
  /** Şoku başkası basıyor (sorumluluk dağılmış). */
  diffused: boolean;
  /** İtaat etmeyen bir akran var. */
  peer: boolean;
}

export const MIL_DEFAULT: MilgramInputs = { authority: 1, prestige: 1, learner: 0, diffused: false, peer: false };

export const MIL = {
  base: 0.65,            // temel koşulda 450 V'a çıkanlar (kitap)
  m0: 0.3853,            // Φ^-1(0.65)
  wAuthority: 1.2,
  wPrestige: 0.6,
  wLearner: [0, 0.5, 1.0] as const,
  wDiffused: 1.1,
  wPeer: 1.4,
  agents: 100,
  /** Modelin varsayımı: öğrencinin tepkisi sertleştikçe zorlanmanın sıçradığı basamaklar (75, 150, 300 V). */
  jumps: [5, 10, 20],
};

/** Zorlanma eşiği: basamak k'de (1-30) ajanın katlanması gereken gerilim; son basamakta 0. */
export function strain(k: number): number {
  let g = 0.4 * (k / LEVELS);
  for (const j of MIL.jumps) if (k >= j) g += 0.2;
  return -3 + 3 * g;
}

/** Ajan tolerans ortalaması (z birimi). Büyüdükçe itaat artar. */
export function milMargin(u: MilgramInputs): number {
  return MIL.m0 + MIL.wAuthority * (u.authority - 1) + MIL.wPrestige * (u.prestige - 1)
    - MIL.wLearner[u.learner] + (u.diffused ? MIL.wDiffused : 0) - (u.peer ? MIL.wPeer : 0);
}

/** Beklenen 450 V'a ulaşma oranı. */
export const milExpected = (u: MilgramInputs): number => phi(milMargin(u));

export interface MilgramRun {
  /** Ajan başına son verilen şokun basamağı (0 = hiç basmadı, 30 = 450 V'a kadar). Artan sıralı. */
  last: number[];
  /** hist[d]: son şoku d. basamak olan ajan sayısı. */
  hist: number[];
  full: number;
  early: number;
  median: number;
  expected: number;
}

export function simulateMilgram(u: MilgramInputs, seed: number, agents = MIL.agents): MilgramRun {
  const rng = mulberry32(seed);
  const m = milMargin(u);
  const last: number[] = [];
  for (let i = 0; i < agents; i++) {
    const tol = m + gauss(rng);
    let d = LEVELS;
    for (let k = 1; k <= LEVELS; k++) if (strain(k) > tol) { d = k - 1; break; }
    last.push(d);
  }
  last.sort((a, b) => a - b);
  const hist = new Array<number>(LEVELS + 1).fill(0);
  for (const d of last) hist[d]++;
  return {
    last, hist, expected: phi(m),
    full: hist[LEVELS] / agents,
    early: last.filter((d) => d < 10).length / agents,
    median: last[Math.floor(agents / 2)],
  };
}

/** Basamak d'yi (en az d şok) vermiş ajan payı. */
export function stillGoing(run: MilgramRun, d: number): number {
  return run.last.filter((x) => x >= d).length / run.last.length;
}

export function describeMilgram(u: MilgramInputs, r: MilgramRun): string {
  const full = Math.round(r.full * 100);
  const bits: string[] = [];
  if (u.authority < 0.5) bits.push('otorite uzak');
  if (u.prestige < 0.5) bits.push('kurum sıradan');
  if (u.learner === 1) bits.push('öğrenci aynı odada');
  if (u.learner === 2) bits.push('öğrenci eli tutulacak kadar yakın');
  if (u.diffused) bits.push('şoku başkası basıyor');
  if (u.peer) bits.push('bir akran itaat etmiyor');
  const cond = bits.length ? bits.join(', ') : 'temel koşul';
  const med = r.median === 0 ? 'hiç şok vermeden' : `${volts(r.median)} V'ta`;
  return `${cond[0].toUpperCase() + cond.slice(1)}: katılımcıların %${full}'i 450 V'a kadar çıkıyor; ortanca katılımcı ${med} bırakıyor.`;
}
