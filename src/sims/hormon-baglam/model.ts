// Hormonlar ve bağlam: nitel model. Sayılar ölçüm değildir; kitaptaki (chapters.json, ch04) bulguların
// YÖNÜNÜ ve sırasını yeniden üretir. Her hormon, kişinin zaten var olan eğilimine bir kazanç ekler
// ve bu kazancı bağlam belirler; hormon tek başına yeni bir davranış icat etmez.
//  - Testosteron (ch04-e1, e2, e3, e4): statü meydan okuması varken, statüyü koruyan yolu büyütür.
//  - Oksitosin (ch04-e5, e7, e8): iç gruba cömertliği büyütür, dış gruba önyargıyı büyütebilir.
//  - Stres (ch04-e9, e10, e11, e12): ters U; kronikleşince bozulur; var olan eğilimleri büyütür.

import { money, num, pct } from '../../i18n/fmt';
import { L } from './text';

export const clamp = (x: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, x));
export const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

/* ============================ Testosteron ============================ */

export type Route = 'saldiri' | 'comertlik';
export type Belief = 'plasebo' | 'testosteron';

export interface TIn {
  /** 0 = hormon yok (kesilmiş), 1 = yüksek doz. */
  dose: number;
  /** Statüye yönelik bir meydan okuma var mı. */
  challenge: boolean;
  /** Bu ortamda statüyü koruyan yol. */
  route: Route;
  /** Öteden gelen eğilim: -1 uzlaşmacı ... +1 saldırgan. */
  disp: number;
  /** Katılımcının ne aldığını sandığı (gerçek dozdan bağımsız). */
  belief: Belief;
}

export const T_BASE: TIn = { dose: 0, challenge: true, route: 'saldiri', disp: 0, belief: 'plasebo' };

/** Modelin varsayımı: hormon kazancı ve bağlamsızken kalan pay (zorluk hipotezi). */
export const GAIN = 2.2;
export const NO_CONTEXT = 0.15;
export const gain = (dose: number, challenge: boolean): number => GAIN * dose * (challenge ? 1 : NO_CONTEXT);

export interface Choice { saldiri: number; comertlik: number; cekil: number }

/** Meydan okumaya verilen yanıtın olasılıkları (softmax). */
export function choice(i: TIn): Choice {
  const g = gain(i.dose, i.challenge);
  const sv = (r: Route): number => (i.route === r ? 1 : 0.1);
  const u = [
    -0.8 + 1.2 * i.disp + g * sv('saldiri'),
    -0.3 - 0.6 * i.disp + g * sv('comertlik'),
    i.challenge ? -0.4 : 0,
  ].map(Math.exp);
  const s = u[0] + u[1] + u[2];
  return { saldiri: u[0] / s, comertlik: u[1] / s, cekil: u[2] / s };
}

/** Statüyü koruma: seçilen yol tam, öbürü kısmen, geri çekilme hiç sayılır. */
export function statusKept(i: TIn): number {
  const c = choice(i);
  const mine = i.route === 'saldiri' ? c.saldiri : c.comertlik;
  const other = i.route === 'saldiri' ? c.comertlik : c.saldiri;
  return clamp(mine + 0.25 * other);
}

/* ---- Ultimatum varyantı ---- */
export const POT = 10;
export const OFFERS = [0, 1, 2, 3, 4, 5] as const;
export const STATUS_S = 2.5; // statü değerinin ₺ karşılığı (varsayım)
export const BELIEF_B = 3; // "testosteron aldım" inancının etkisi (varsayım; yön kitaptan)
/** Yanıtlayıcının teklifi reddetme olasılığı (varsayım; reddedilen teklif statü kaybıdır). */
export const reject = (o: number): number => 1 / (1 + Math.exp(1.6 * (o - 2.2)));

/** Teklifin faydası: para + adalet tercihi + statü + inanç. theta: bireysel adalet eğilimi. */
export function offerUtility(o: number, i: TIn, theta = 0): number {
  const g = gain(i.dose, i.challenge);
  const status = i.route === 'comertlik' ? o / 5 : (5 - o) / 5;
  const money = (POT - o) * (1 - reject(o));
  const fair = (1 + theta - 0.8 * i.disp) * 1.5 * (o / 5);
  const belief = i.belief === 'testosteron' ? -BELIEF_B * (o / 5) : 0;
  return money + fair + g * STATUS_S * status + belief;
}

export function offerProbs(i: TIn, theta = 0): number[] {
  const u = OFFERS.map((o) => offerUtility(o, i, theta));
  const m = Math.max(...u);
  const e = u.map((x) => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((x) => x / s);
}

/** Bireysel adalet eğilimi (theta) için sabit ızgara: iki terimli ağırlıklar, determinist. */
const TH = [-3, -2, -1, 0, 1, 2, 3].map((k) => k * 0.4);
const TW = [1, 6, 15, 20, 15, 6, 1].map((w) => w / 64);

/** Nüfus ortalaması: teklif dağılımı. */
export function popOffers(i: TIn): number[] {
  const out = OFFERS.map(() => 0);
  TH.forEach((th, k) => offerProbs(i, th).forEach((p, j) => { out[j] += TW[k] * p; }));
  return out;
}
export const mean = (p: number[]): number => p.reduce((a, x, j) => a + x * OFFERS[j], 0);
export const meanOffer = (i: TIn): number => mean(popOffers(i));
export const rejectRate = (p: number[]): number => p.reduce((a, x, j) => a + x * reject(OFFERS[j]), 0);

/** Gerçek madde (satır: plasebo/testosteron) x inanç (sütun: plasebo/testosteron) ortalama teklifleri. */
export function beliefTable(i: TIn): number[][] {
  return [0, 1].map((d) => [0, 1].map((b) => meanOffer({ ...i, dose: d ? i.dose : 0, belief: b ? 'testosteron' : 'plasebo' })));
}

/** Tohumlu örneklem: n kişi bir teklif seçer. */
export function sampleOffers(i: TIn, n: number, rnd: () => number): number[] {
  const out: number[] = [];
  for (let k = 0; k < n; k++) {
    const u1 = Math.max(rnd(), 1e-9), u2 = rnd();
    const th = 0.5 * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const p = offerProbs(i, th);
    let r = rnd(), j = 0;
    while (j < p.length - 1 && r > p[j]) { r -= p[j]; j++; }
    out.push(OFFERS[j]);
  }
  return out;
}

/** Wibral: zar raporunda yalan oranı. Dürüstlüğün itibar getirdiği bağlamda testosteron yalanı azaltır. */
export const LIE_BASE = 0.4; // varsayım
export function lieRate(i: TIn): number {
  const g = gain(i.dose, i.challenge);
  return i.route === 'comertlik' ? LIE_BASE * (1 - Math.min(0.9, 0.3 * g)) : LIE_BASE;
}

export function describeT(i: TIn): string {
  const c = choice(i);
  const X = L().model;
  const ctx = !i.challenge ? X.tCtxNone : i.route === 'saldiri' ? X.tCtxAtk : X.tCtxGen;
  const hor = i.dose < 0.05 ? X.tHorNone : X.tHor(pct(i.dose));
  return X.tLine(ctx, hor, pct(c.saldiri), pct(c.comertlik), pct(c.cekil));
}

/* ============================ Oksitosin ============================ */

export type Partner = 'biz' | 'onlar' | 'yabanci' | 'rastgele';
export type Evidence = 'ozgun' | 'birlesik';
export const PARTNERS: Partner[] = ['biz', 'onlar', 'yabanci', 'rastgele'];

export interface OIn { dose: number; threat: number; evidence: Evidence }
export const O_BASE: OIn = { dose: 0, threat: 0.2, evidence: 'ozgun' };

/** Kanıt görünümü: birleşik analizlerde Kosfeld güven etkisi görülmedi (0); De Dreu bulguları "karışık" (varsayım: yarısı). */
export const evK = (e: Evidence): number => (e === 'ozgun' ? 1 : 0);
export const evD = (e: Evidence): number => (e === 'ozgun' ? 1 : 0.5);

const BASE_LOGIT: Record<Partner, number> = { biz: 0.2, onlar: -0.8, yabanci: -0.3, rastgele: -0.3 };

/** Emanetçiye gönderilen pay (0..10 ₺). */
export function transfer(p: Partner, o: OIn): number {
  let z = BASE_LOGIT[p];
  if (p === 'biz') z += 0.9 * o.dose * evD(o.evidence);
  if (p === 'yabanci') z += 0.9 * o.dose * evK(o.evidence);
  return POT * sigmoid(z);
}
/** Dış gruba önleyici ihanet olasılığı (maddi risk/tehdit yüksekken). */
export function betray(o: OIn): number {
  return sigmoid(-2 + 2.2 * o.threat + 2.4 * o.dose * evD(o.evidence) * o.threat);
}
/** Dış gruba örtük önyargı skoru (0..1). */
export function prejudice(o: OIn): number {
  return clamp(0.3 + 0.35 * o.dose * evD(o.evidence) * (0.5 + 0.5 * o.threat));
}

export function describeO(o: OIn): string {
  const f = (x: number) => money(num(x, 1));
  const X = L().model;
  if (o.dose < 0.05) return X.oNone(f(transfer('biz', o)), f(transfer('onlar', o)));
  return X.oDose(pct(o.dose), f(transfer('biz', o)), f(transfer('onlar', o)), pct(prejudice(o)), pct(betray(o)));
}

/* ---- Tarla faresi: vazopressin reseptörü ve eş bağı ---- */
export interface VoleIn { receptor: number; vasopressin: number }
/** Tanıdık ve yabancı dişiyle geçirilen göreli süre (0..1). Reseptör x hormon birlikte gerekir. */
export function vole(v: VoleIn): { familiar: number; stranger: number } {
  return {
    familiar: 0.1 + 0.8 * v.receptor * (0.3 + 0.7 * v.vasopressin),
    stranger: 0.1 + 0.05 * v.receptor * v.vasopressin,
  };
}

/* ============================ Stres ============================ */

export interface SIn {
  /** Stres şiddeti 0..1. */
  sev: number;
  /** Stresin süresi (dakika). */
  minutes: number;
  /** Glukokortikoid yanıtı ilaçla engellenmiş (Martin). */
  block: boolean;
  /** Saldırganlığı daha zayıf birine yöneltmek (yer değiştirme) mümkün ve kullanılıyor. */
  displace: boolean;
}
export const S_BASE: SIn = { sev: 0.4, minutes: 20, block: false, displace: false };

/** Süre kaydırıcısı (0..100) -> dakika, logaritmik: 5 dk ... 30 gün. */
export const MIN_LO = 5, MIN_HI = 30 * 24 * 60;
export const minutesOf = (v: number): number => MIN_LO * Math.pow(MIN_HI / MIN_LO, v / 100);
export const sliderOf = (m: number): number => Math.round((100 * Math.log(m / MIN_LO)) / Math.log(MIN_HI / MIN_LO));

/** Kronikleşme: 1 günden kısa akut (0), ~3 haftada tam kronik (1). */
export function chronic(minutes: number): number {
  const l = Math.log10(Math.max(1, minutes));
  return clamp((l - 3.16) / (4.48 - 3.16));
}

/** Akut ters U: orta stres en iyi (tepe 0,4), aşırı stres kötü. */
export function perfAcute(s: number): number {
  return s <= 0.4 ? 0.55 + 0.45 * Math.sin((Math.PI / 2) * (s / 0.4)) : 0.2 + 0.8 * Math.cos((Math.PI / 2) * ((s - 0.4) / 0.6));
}
export const perf = (s: number, minutes: number): number => perfAcute(s) * (1 - 0.55 * chronic(minutes));

/** Alışkanlığa kayma payı (Dias-Ferreira yönü; sayılar varsayım). */
export function habit(s: number, minutes: number): number {
  return clamp(0.1 + 0.55 * chronic(minutes) + 0.35 * s * s, 0, 0.95);
}

const bell = (s: number): number => Math.exp(-(((s - 0.4) / 0.22) ** 2));
const ramp = (s: number): number => clamp((s - 0.65) / 0.35);
/** Lighthall: orta stres cinsiyet farkını açar, büyük stres ikisinde de risk almayı artırır. Akut deney. */
export function risk(s: number): { erkek: number; kadin: number } {
  return { erkek: clamp(0.52 + 0.1 * bell(s) + 0.28 * ramp(s)), kadin: clamp(0.4 - 0.1 * bell(s) + 0.3 * ramp(s)) };
}

/** Glukokortikoid yanıtı (0..1); yer değiştirme boşaltımı onu düşürür, ilaç engeller. */
export function gcLevel(s: SIn): number {
  const base = clamp(s.sev * (0.5 + 0.5 * Math.min(1, 0.4 + chronic(s.minutes))));
  return base * (s.block ? 0.1 : 1) * (s.displace ? 0.7 : 1);
}
/** Empati kapsamı: yakın çevreye kalır, yabancıya stres hormonuyla daralır (Langford, Martin). */
export function empathy(s: SIn): { yakin: number; yabanci: number } {
  const gc = s.block ? 0.1 * s.sev : s.sev;
  return { yakin: 0.85 - 0.25 * gc, yabanci: 0.8 * (1 - gc) ** 1.5 + 0.03 };
}

/** Card ve Dahl: maçın sonucuna göre aile içi şiddet bildirimindeki göreli artış (kitaptaki yüzdeler). */
export const MATCHES = [
  { id: 'galibiyet', up: 0 },
  { id: 'beklenen', up: 0 },
  { id: 'beklenmedik', up: 10 },
  { id: 'playoff', up: 13 },
  { id: 'rakip', up: 20 },
] as const;

export function describeS(s: SIn): string {
  const c = chronic(s.minutes);
  const X = L().model;
  const tip = s.sev < 0.15 ? X.sLow : s.sev <= 0.6 ? X.sMid : X.sHigh;
  const sure = c < 0.15 ? X.sShort : c < 0.7 ? X.sGrowing : X.sChronic;
  return X.sLine(tip, sure, pct(perf(s.sev, s.minutes)), pct(habit(s.sev, s.minutes)), pct(empathy(s).yabanci));
}
