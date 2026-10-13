// Metaforlar ve kutsal değerler (ch15): iki saf model. DOM yok.
//  1) Beden-ahlak karışıklığı: altı bedenlenmiş biliş / iğrenme / dışlanma kartı. Her kartta iki okuma var:
//     "kitabın iddiası" ve "replikasyon sonrası tahmin" (kitap iddiasının çarpanla küçültülmüş hâli).
//  2) Kutsal değerler (Atran, Ginges): maddi teklif büyüdükçe destek düşer (ters tepki), sembolik jest artırır.
// chapters.json ch15 deneylerinde etki büyüklüğü sayısı YOK; yönler kitaptan, büyüklükler ve çarpanlar
// modelin varsayımıdır ("ASSUME" ile işaretli).
import { mulberry32, shuffle } from '../rng';
import { pct } from '../../i18n/fmt';
import { L } from './text';

export const clamp = (x: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, x));
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));

/* =====================================================================
   1) Beden ve ahlak karışıklığı
   ===================================================================== */
export type Status = 'sağlam' | 'karışık' | 'tartışmalı' | 'bilinmiyor';
export type Mode = 'book' | 'repl';
export type CardId = 'cyber' | 'insula' | 'cup' | 'clip' | 'macbeth' | 'germ';
export const CARD_IDS: CardId[] = ['cyber', 'insula', 'cup', 'clip', 'macbeth', 'germ'];

/** ASSUME: replikasyon sonrası çarpanlar (0 = etki yok, 1 = kitaptaki kadar). Yönü chapters.json notları verir. */
export const K_REPL = {
  acc: 0.35, // Cyberball: dACC'nin fiziksel acıya özgü olduğu iddiası sorgulandı (Woo 2014); acı hissi sağlam
  taste: 0.1, // bozuk tat -> ahlaki yargı: çok laboratuvarlı replikasyon başarısız (Ghelfi 2020)
  vice: 0.15, // ahlaki ihlal -> kötü tat: kötülük tadı belirgin kötüleştirmedi (Eskine 2012 başlığı)
  cup: 0.05, // sıcak fincan: büyük örneklemli replikasyonlar etki bulamadı (Lynott 2014, Chabris 2019)
  clip: 0.1, // ağır pano: ön kayıtlı replikasyon fark bulamadı (JASNH 2018)
  macbeth: 0.2, // Macbeth: doğrudan replikasyonlar başarısız, meta-analizde çok küçük (Siev 2018)
  germ: 0.3, // bakteri uyarısı: doğrudan replikasyon bilinmiyor, benzer priming etkileri zayıf çıktı
} as const;

/** ASSUME: kitabın yönünü büyüklüğe çeviren genlikler (puan ölçeği 0-1). */
const AMP = { warmth: 0.22, gener: 0.16, serious: 0.2, taste: 0.25, vice: 0.3, wash: 0.4, help: 0.45, germ: 0.3 } as const;

export interface Inputs {
  excl: number; glitch: 0 | 1; // Cyberball: dışlanma düzeyi, arıza açıklaması
  gross: number; viol: number; // insula: bozuk tat, ahlaki ihlal (adaletsiz teklif)
  temp: number; // fincan: 0 buzlu, 1 sıcak
  weight: number; // pano: 0 hafif, 1 ağır
  mviol: number; chan: 0 | 1; washed: 0 | 1; // Macbeth: ihlalin ağırlığı, kanal (0 sözlü, 1 yazılı), el yıkama
  lang: number; // iğrenme / hastalık dili
}
export const DEFAULTS: Inputs = { excl: 0, glitch: 0, gross: 0, viol: 0, temp: 0.5, weight: 0.5, mviol: 0, chan: 0, washed: 0, lang: 0 };

export interface Gauge {
  key: string;
  label: string;
  /** Kitabın iddiasındaki değer (0-1) ve replikasyon sonrası tahmin (0-1). */
  book: number;
  repl: number;
  /** Etkisiz taban değeri (kısa dikey çizgi). */
  base: number;
  st: Status;
  /** Kontrol ölçüsü: kitapta değişmeyen özellik. */
  control?: boolean;
}

/** Kitabın iddiasından replikasyon sonrası değere: tabandan sapmayı k ile küçültür. */
const shrink = (base: number, book: number, k: number): number => base + (book - base) * k;
const mk = (key: string, label: string, base: number, book: number, k: number, st: Status, control = false): Gauge =>
  ({ key, label, base, book: clamp(book), repl: clamp(shrink(base, book, k)), st, ...(control ? { control } : {}) });
/** Replikasyonda değişmeyen (sağlam) ölçü. */
const same = (key: string, label: string, base: number, v: number, st: Status): Gauge => mk(key, label, base, v, 1, st);

/** Cyberball: ilk atışlarda adil (1/3), sonra diğer iki oyuncu "Sen"e atmayı bırakır. Durağan sana gelen pay. */
export const cyberShare = (excl: number): number => { const p = 0.5 * (1 - excl); return p / (1 + p); };

export type Holder = 'a' | 'b' | 's';
/** Topu tutan oyuncunun atışı: "Sen" (s) atınca A ya da B'ye eşit; A/B atınca "Sen"e 0,5*(1-excl) olasılıkla. */
export function cyberNext(h: Holder, excl: number, rnd: () => number): Holder {
  if (h === 's') return rnd() < 0.5 ? 'a' : 'b';
  return rnd() < 0.5 * (1 - excl) ? 's' : h === 'a' ? 'b' : 'a';
}

export function gauges(id: CardId, x: Inputs): Gauge[] {
  switch (id) {
    case 'cyber': {
      const att = x.glitch ? 0.1 : 1; // kitap: arıza koşulunda ACC etkinleşmesi görülmedi
      return [
        same('pain', L().gauge.pain, 0, x.excl * (x.glitch ? 0.5 : 1), 'sağlam'),
        mk('acc', L().gauge.acc, 0, x.excl * att, K_REPL.acc, 'karışık'),
      ];
    }
    case 'insula': {
      const ins = 1 - (1 - 0.6 * x.gross) * (1 - 0.7 * x.viol);
      return [
        same('ins', L().gauge.ins, 0, ins, 'sağlam'),
        same('rej', L().gauge.rej, 0.1, 0.1 + 0.8 * x.viol ** 1.2, 'sağlam'),
        mk('sev', L().gauge.sev, 0.5, 0.5 + AMP.taste * x.gross, K_REPL.taste, 'tartışmalı'),
        mk('tas', L().gauge.tas, 0.5, 0.5 + AMP.vice * x.viol, K_REPL.vice, 'tartışmalı'),
      ];
    }
    case 'cup': {
      const t = 2 * x.temp - 1;
      return [
        mk('warm', L().gauge.warm, 0.5, 0.5 + AMP.warmth * t, K_REPL.cup, 'tartışmalı'),
        mk('gen', L().gauge.gen, 0.5, 0.5 + AMP.gener * t, K_REPL.cup, 'tartışmalı'),
        mk('oth', L().gauge.oth, 0.5, 0.5, 1, 'tartışmalı', true),
      ];
    }
    case 'clip': {
      const w = 2 * x.weight - 1;
      return [
        mk('ser', L().gauge.ser, 0.5, 0.5 + AMP.serious * w, K_REPL.clip, 'tartışmalı'),
        mk('oth', L().gauge.oth, 0.5, 0.5, 1, 'tartışmalı', true),
      ];
    }
    case 'macbeth': {
      const mouth = x.chan === 0 ? 1 : 0.25, hand = x.chan === 1 ? 1 : 0.25; // beden bölgesi özgüllüğü (e8)
      return [
        mk('gar', L().gauge.gar, 0.3, 0.3 + AMP.wash * x.mviol * mouth, K_REPL.macbeth, 'karışık'),
        mk('sab', L().gauge.sab, 0.3, 0.3 + AMP.wash * x.mviol * hand, K_REPL.macbeth, 'karışık'),
        mk('hlp', L().gauge.hlp, 0.4, 0.4 + AMP.help * x.mviol * (x.washed ? 0.1 : 1), K_REPL.macbeth, 'tartışmalı'),
      ];
    }
    case 'germ':
      return [
        mk('imm', L().gauge.imm, 0.4, 0.4 + AMP.germ * x.lang, K_REPL.germ, 'bilinmiyor'),
        mk('eco', L().gauge.eco, 0.4, 0.4, 1, 'bilinmiyor', true),
      ];
  }
}

export interface CardDef {
  id: CardId;
  /** Metinler (name, short, metaphor, note, exps[].label) okuma anında geçerli dilden gelir. */
  readonly name: string;
  readonly short: string;
  exps: Array<{ id: string; readonly label: string; status: Status }>;
  /** Metaforun gündelik karşılığı. */
  readonly metaphor: string;
  /** Kısa replikasyon notu (chapters.json). */
  readonly note: string;
  /** Genel bakış çubuğu için ana ölçü anahtarı ve onu en yüksek girdide veren girdiler. */
  primary: string;
  /** Canlı çubukta gösterilen ölçü. */
  bar: string;
  max: Partial<Inputs>;
}

const card = (id: CardId, exps: Array<{ id: string; status: Status }>, primary: string, bar: string, max: Partial<Inputs>): CardDef => ({
  id,
  get name() { return L().cards[id].name; },
  get short() { return L().cards[id].short; },
  get metaphor() { return L().cards[id].metaphor; },
  get note() { return L().cards[id].note; },
  exps: exps.map((e, i) => ({ id: e.id, status: e.status, get label() { return L().cards[id].exps[i]; } })),
  primary, bar, max,
});

export const CARDS: Record<CardId, CardDef> = {
  cyber: card('cyber', [{ id: 'ch15-e1', status: 'karışık' }], 'acc', 'acc', { excl: 1 }),
  insula: card('insula', [{ id: 'ch15-e6', status: 'sağlam' }, { id: 'ch15-e4', status: 'tartışmalı' }], 'sev', 'ins', { gross: 1 }),
  cup: card('cup', [{ id: 'ch15-e11', status: 'tartışmalı' }], 'warm', 'warm', { temp: 1 }),
  clip: card('clip', [{ id: 'ch15-e10', status: 'tartışmalı' }], 'ser', 'ser', { weight: 1 }),
  macbeth: card('macbeth', [{ id: 'ch15-e7', status: 'tartışmalı' }, { id: 'ch15-e8', status: 'karışık' }, { id: 'ch15-e9', status: 'tartışmalı' }], 'gar', 'gar', { mviol: 1, chan: 0 }),
  germ: card('germ', [{ id: 'ch15-e5', status: 'bilinmiyor' }], 'imm', 'imm', { lang: 1 }),
};

/** Genel bakış: bir kartın ana ölçüsünde en yüksek girdideki kayma (puan, 0-100). */
export function maxShift(id: CardId): { book: number; repl: number } {
  const c = CARDS[id];
  const g = gauges(id, { ...DEFAULTS, ...c.max }).find((q) => q.key === c.primary)!;
  return { book: Math.round(Math.abs(g.book - g.base) * 100), repl: Math.round(Math.abs(g.repl - g.base) * 100) };
}

export function cardValue(g: Gauge, mode: Mode): number { return mode === 'book' ? g.book : g.repl; }

/** Canlı çubuk için tek cümle. */
export function describeCard(id: CardId, x: Inputs, mode: Mode): string {
  const g = gauges(id, x).find((q) => q.key === CARDS[id].bar)!;
  const pts = (v: number): string => String(Math.round(v * 100));
  const cur = cardValue(g, mode), other = cardValue(g, mode === 'book' ? 'repl' : 'book');
  return L().describeCard(CARDS[id].short, mode === 'book', g.label, pts(cur), pts(g.base), g.book === g.repl, pts(other));
}

/* =====================================================================
   2) Kutsal değerler
   ===================================================================== */
export type OfferKind = 'maddi' | 'sembolik' | 'karma';

/** ASSUME: model katsayıları. Yön kitaptan (ch15-e12), büyüklük varsayım. */
export const SACRED = {
  A: 3.2, // maddi teklifin araçsal değeri (kutsal olmayan kısım için)
  B: 3.0, // kutsala maddi karşılık önermenin ters tepkisi
  C: 2.8, // sembolik jestin değeri (kutsallıkla büyür)
  base0: -1.2, base1: 1.0, // uzlaşmaya başlangıç direnci; kutsallıkla artar
  spread: 0.35, // kalabalıkta kutsallık dağılımı: ortalama ± spread
  n: 100,
} as const;

export function offerParts(kind: OfferKind, size: number): { m: number; y: number } {
  return { m: kind === 'sembolik' ? 0 : size, y: kind === 'maddi' ? 0 : size };
}

/** Tek kişinin uzlaşmaya destek olasılığı. s: kutsallık, m: maddi teklif, y: sembolik jest (hepsi 0-1). */
export function supportOne(s: number, m: number, y: number): number {
  const u = (1 - s) * SACRED.A * m - s * SACRED.B * m * (1 - y) + SACRED.C * (0.25 + 0.75 * s) * y;
  return sigmoid(SACRED.base0 - SACRED.base1 * s + u);
}

/** Ters tepki: kutsal bir değere maddi karşılık önermenin yarattığı öfke (0-1). Sembolik jest siler. */
export const backlashOne = (s: number, m: number, y: number): number => clamp(s * m * (1 - y));

/** Kutsallık dağılımı: ortalama S etrafında eşit aralıklı n nicel (deterministik). */
function sacredness(S: number): number[] {
  return Array.from({ length: SACRED.n }, (_, i) => clamp(S + SACRED.spread * (2 * ((i + 0.5) / SACRED.n) - 1)));
}
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

export function expectedSupport(S: number, m: number, y: number): number { return mean(sacredness(S).map((s) => supportOne(s, m, y))); }
export function expectedBacklash(S: number, m: number, y: number): number { return mean(sacredness(S).map((s) => backlashOne(s, m, y))); }

export type Dot = 'a' | 'r' | 'x'; // kabul, ret, ret ve öfke
export interface Crowd { dots: Dot[]; accept: number; reject: number; angry: number }
/** Tohumlu kalabalık: herkes kendi kutsallığıyla destek olasılığına karşı bir zar atar. */
export function simulateCrowd(S: number, m: number, y: number, seed: number): Crowd {
  const rnd = mulberry32(seed);
  const people = shuffle(sacredness(S), rnd);
  const dots: Dot[] = people.map((s) => {
    const ok = rnd() < supportOne(s, m, y);
    if (ok) return 'a';
    return backlashOne(s, m, y) >= 0.3 ? 'x' : 'r';
  });
  const c = (d: Dot): number => dots.filter((q) => q === d).length;
  return { dots, accept: c('a'), reject: c('r'), angry: c('x') };
}

export function describeSacred(S: number, kind: OfferKind, size: number): string {
  const { m, y } = offerParts(kind, size);
  return L().describeSacred(kind, pct(size), pct(expectedSupport(S, m, y)), pct(expectedBacklash(S, m, y)), pct(expectedSupport(0, m, y)));
}
