// Ergen beyni: saf model çekirdeği (DOM yok). Sayılar illüstratiftir; yönleri Bölüm 6'daki bulgulardan gelir.
import { mulberry32 } from '../rng';
import { pct as pc } from '../../i18n/fmt';
import { L } from './text';

export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// ---------------------------------------------------------------------------------------------
// Sekme 1: olgunlaşma eğrileri (yaş 5-30)
// ---------------------------------------------------------------------------------------------
export const AGE_MIN = 5;
export const AGE_MAX = 30;

/** Frontal korteks olgunluğu: en geç olgunlaşan bölge; yirmili yaşların ortasında doyuma varır. */
export const frontal = (age: number): number => sigmoid((age - 15) / 3.3);

/** Limbik / dopamin (ödül) sistemi etkinliği: ergenlikte tepe yapar, sonra düşer. */
export const dopamine = (age: number): number => {
  const sd = age < 15 ? 3.6 : 5.5;
  return 0.25 + 0.75 * Math.exp(-((age - 15) ** 2) / (2 * sd * sd));
};

/** Frontal korteks gri maddesi (göreli kalınlık): çocuklukta artar, ~11-12 yaşında tepe, sonra budanır. */
export const greyMatter = (age: number): number => {
  const up = sigmoid((age - 8) / 1.6);
  const prune = sigmoid((age - 16) / 3.2);
  return clamp01((0.45 + 0.55 * up - 0.38 * prune) / 0.875);
};

/** Miyelinleşme: yaşla tek yönlü artar, yirmilerin ortasında doyar. */
export const myelin = (age: number): number => clamp01((1 - Math.exp(-(age - 3) / 8.5)) / (1 - Math.exp(-27 / 8.5)));

/** "Boşluk": ödül sistemi güçlüyken frontal denetimin geride kalması. */
export const gap = (age: number): number => Math.max(0, dopamine(age) - frontal(age));

/** Akran duyarlılığı: ödül sistemi yüksek, frontal olgunluk düşük olduğunda büyür; en yüksek değeri 1'dir. */
const rawSens = (age: number): number => dopamine(age) * (1 - frontal(age));
let sensMax = 0;
for (let a = AGE_MIN; a <= AGE_MAX; a += 0.25) sensMax = Math.max(sensMax, rawSens(a));
export const peerSensitivity = (age: number): number => rawSens(age) / sensMax;

export function ageCurves(age: number) {
  return { dopamine: dopamine(age), frontal: frontal(age), grey: greyMatter(age), myelin: myelin(age), gap: gap(age) };
}

export function describeAge(age: number): string {
  const f = frontal(age), d = dopamine(age), g = gap(age);
  const a = Math.round(age);
  const T = L();
  if (g > 0.3) return T.ageHigh(a, pc(d), pc(f));
  if (age < 10) return T.ageChild(a);
  if (f < 0.9) return T.ageMid(a, pc(f));
  return T.ageAdult(a, pc(f));
}

// ---------------------------------------------------------------------------------------------
// Ödül büyüklüğüne accumbens tepkisi (Galvan ve ark. 2006, ch06-e5)
// ---------------------------------------------------------------------------------------------
// Ödül büyüklüğü r: 0 küçük, 0.5 orta, 1 büyük. Çıktı: göreli accumbens tepkisi (0-1).
// Çocuk: ödülden bağımsız. Yetişkin: ödülle orantılı artış. Ergen: orta ödülde yetişkinle aynı,
// büyük ödülde çok yüksek, küçük ödülde düşük.
const ACC_ANCHORS: Array<{ age: number; v: [number, number, number] }> = [
  { age: 8, v: [0.45, 0.45, 0.45] },
  { age: 15, v: [0.15, 0.5, 1.0] },
  { age: 25, v: [0.25, 0.5, 0.7] },
];

export function accumbens(age: number, reward: number): number {
  const r = clamp01(reward);
  let lo = ACC_ANCHORS[0], hi = ACC_ANCHORS[ACC_ANCHORS.length - 1];
  if (age <= lo.age) hi = lo;
  else if (age >= hi.age) lo = hi;
  else for (let i = 0; i < ACC_ANCHORS.length - 1; i++) {
    if (age >= ACC_ANCHORS[i].age && age <= ACC_ANCHORS[i + 1].age) { lo = ACC_ANCHORS[i]; hi = ACC_ANCHORS[i + 1]; break; }
  }
  const t = hi.age === lo.age ? 0 : (age - lo.age) / (hi.age - lo.age);
  const at = (k: 0 | 1 | 2) => lerp(lo.v[k], hi.v[k], t);
  return r <= 0.5 ? lerp(at(0), at(1), r / 0.5) : lerp(at(1), at(2), (r - 0.5) / 0.5);
}

// ---------------------------------------------------------------------------------------------
// Sekme 2: akranlarla sürüş (Gardner ve Steinberg 2005; Chein ve ark. 2011, ch06-e6)
// ---------------------------------------------------------------------------------------------
export type GroupId = 'teen' | 'young' | 'adult';
export const GROUPS: Array<{ id: GroupId; name: string; age: number }> = [
  { id: 'teen', get name() { return L().groups.teen; }, age: 15 },
  { id: 'young', get name() { return L().groups.young; }, age: 21 },
  { id: 'adult', get name() { return L().groups.adult; }, age: 30 },
];
export const groupAge = (g: GroupId): number => GROUPS.find((x) => x.id === g)!.age;

export const MAX_PEERS = 4;
/** Akranların etkisi doyar: 1 akran 0.5, 2 akran 0.67, 4 akran 0.8. */
export const peerPresence = (n: number): number => n / (n + 1);

/** Soğuk (tek başına) kararda denetim: ergenlerde yetişkine yakın, yaklaşık 16'da doyar. */
const coolControl = (age: number): number => sigmoid((age - 9) / 2.2);

// Karar kuralı: logit = B0 + KV·ödül sinyali − KC·denetim·çarpışma riski
const B0 = -1.9, KV = 3, KC = 2.5;
const G_V = 2.0;  // akranlar varken ventral striatum (ödül) sinyalinin artışı (Chein)
const G_C = 0.7;  // akranlar varken vmPFC denetiminin azalışı (Chein)
export const LOSS = 5; // çarpışmanın puan kaybı

export interface DriveParams { age: number; peers: number; reward: number }

/** Ödül sinyali (accumbens): Galvan eğrisi; akranlar varken yalnızca akran duyarlı yaşlarda artar. */
export function rewardSignal({ age, peers, reward }: DriveParams): number {
  return accumbens(age, reward) * (1 + G_V * peerSensitivity(age) * peerPresence(peers));
}
/** Etkin frontal denetim: akranlar varken (vmPFC azalır) yalnızca akran duyarlı yaşlarda düşer. */
export function control({ age, peers }: DriveParams): number {
  return coolControl(age) * (1 - G_C * peerSensitivity(age) * peerPresence(peers));
}

/** Çarpışma riski c verildiğinde sarıda geçme olasılığı. */
export function goProbability(p: DriveParams, crashRisk: number): number {
  return sigmoid(B0 + KV * rewardSignal(p) - KC * control(p) * crashRisk);
}

/** Tur başına çarpışma riski aralığı (sarının kalan süresi kısaldıkça risk artar). */
export const RISK_MIN = 0.1, RISK_MAX = 0.7;
const RISK_GRID = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
export const riskFromRemaining = (sec: number): number => clamp01(0.75 - 0.22 * sec);
export const remainingFromRisk = (c: number): number => (0.75 - c) / 0.22;

/** Beklenen risk alma oranı (çarpışma riski dağılımı üzerinden ortalama). */
export function riskRate(p: DriveParams): number {
  let s = 0;
  for (const c of RISK_GRID) s += goProbability(p, c);
  return s / RISK_GRID.length;
}

export const pointsFor = (reward: number): number => Math.round(1 + 4 * clamp01(reward));

export interface Round { risk: number; go: boolean; crash: boolean; points: number }

/** Bir tur: risk rastgele çekilir, ajan olasılıkla geçer, geçerse risk olasılığıyla çarpışır. */
export function agentRound(rng: () => number, p: DriveParams): Round {
  const risk = lerp(RISK_MIN, RISK_MAX, rng());
  const go = rng() < goProbability(p, risk);
  const crash = go && rng() < risk;
  return { risk, go, crash, points: go ? (crash ? -LOSS : pointsFor(p.reward)) : 0 };
}

export function runBatch(seed: number, p: DriveParams, n: number): { go: number; crash: number; n: number; score: number; rate: number } {
  const rng = mulberry32(seed);
  let go = 0, crash = 0, score = 0;
  for (let i = 0; i < n; i++) { const r = agentRound(rng, p); if (r.go) go++; if (r.crash) crash++; score += r.points; }
  return { go, crash, n, score, rate: n ? go / n : 0 };
}

export function describeDrive(g: GroupId, peers: number, reward: number): string {
  const p = { age: groupAge(g), peers, reward };
  const alone = riskRate({ ...p, peers: 0 });
  const now = riskRate(p);
  const name = L().groupsLc[g];
  if (peers === 0) return L().driveAlone(name, pc(now));
  const ratio = now / Math.max(alone, 0.001);
  if (ratio < 1.15) return L().driveSame(peers, name, pc(alone), pc(now));
  return L().driveRatio(peers, name, pc(alone), pc(now), ratio.toFixed(1));
}

// ---------------------------------------------------------------------------------------------
// Sekme 3: iyi/kötü habere güncelleme (Moutsiana ve ark. 2013, ch06-e4) — replikasyon: tartışmalı
// ---------------------------------------------------------------------------------------------
export type ProfileId = 'child' | 'teen' | 'young' | 'adult';
export const PROFILES: Array<{ id: ProfileId; name: string; age: number }> = [
  { id: 'child', get name() { return L().profiles.child; }, age: 10 },
  { id: 'teen', get name() { return L().profiles.teen; }, age: 15 },
  { id: 'young', get name() { return L().profiles.young; }, age: 21 },
  { id: 'adult', get name() { return L().profiles.adult; }, age: 26 },
];

/** İyi haberde güncelleme oranı: her yaşta benzer. */
export const goodRate = (_age: number): number => 0.55;
/** Kötü habere güncelleme: ergenlikte iyi haberin çok altında, yetişkinlikte ona yakın. Varsayım: model parametresi. */
export const badRate = (age: number): number => goodRate(age) * (0.03 + 0.97 * sigmoid((age - 19.5) / 2.2));
/** Asimetri: iyi haber güncellemesi eksi kötü haber güncellemesi (oran puanı). */
export const asymmetry = (age: number): number => goodRate(age) - badRate(age);

export type NewsKind = 'good' | 'bad';

export interface News { kind: NewsKind; actual: number; gap: number }

/** Tahmin (%) ve gerçek olasılığa (%) göre haber. Tahmin gerçekten yüksekse iyi haber (olay sanıldığı kadar olası değil). */
export function newsFor(estimate: number, actual: number): News | null {
  const d = actual - estimate;
  if (Math.abs(d) < 3) return null;
  return { kind: d < 0 ? 'good' : 'bad', actual, gap: Math.abs(d) };
}

/** Zorunlu haber türü için gerçek olasılığı üret (tahmin ± fark). */
export function forcedActual(estimate: number, kind: NewsKind, rng: () => number): number {
  const d = 10 + Math.round(rng() * 10);
  if (kind === 'good') return Math.max(1, estimate - Math.min(d, Math.max(3, estimate - 1)));
  return Math.min(99, estimate + Math.min(d, Math.max(3, 99 - estimate)));
}

/** Profilin ikinci tahmini (gürültüsüz beklenen değer). */
export function updatedEstimate(age: number, estimate: number, news: News): number {
  const a = news.kind === 'good' ? goodRate(age) : badRate(age);
  const move = a * news.gap * (news.kind === 'good' ? -1 : 1);
  return Math.max(0, Math.min(100, estimate + move));
}

/** Güncelleme oranı: ikinci tahminin haber yönündeki hareketi / haber farkı. */
export function updateFraction(estimate: number, second: number, news: News): number {
  const toward = news.kind === 'good' ? estimate - second : second - estimate;
  return news.gap === 0 ? 0 : toward / news.gap;
}

export function describeNews(profile: ProfileId): string {
  const pr = PROFILES.find((p) => p.id === profile)!;
  const g = pc(goodRate(pr.age)), b = pc(badRate(pr.age));
  if (Math.round(badRate(pr.age) * 100) >= Math.round(goodRate(pr.age) * 100) * 0.85) return L().newsBoth(pr.name, g, b);
  return L().newsBadWeak(pr.name, g, b);
}
