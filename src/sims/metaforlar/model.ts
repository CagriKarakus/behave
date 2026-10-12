// Metaforlar ve kutsal değerler (ch15): iki saf model. DOM yok.
//  1) Beden-ahlak karışıklığı: altı bedenlenmiş biliş / iğrenme / dışlanma kartı. Her kartta iki okuma var:
//     "kitabın iddiası" ve "replikasyon sonrası tahmin" (kitap iddiasının çarpanla küçültülmüş hâli).
//  2) Kutsal değerler (Atran, Ginges): maddi teklif büyüdükçe destek düşer (ters tepki), sembolik jest artırır.
// chapters.json ch15 deneylerinde etki büyüklüğü sayısı YOK; yönler kitaptan, büyüklükler ve çarpanlar
// modelin varsayımıdır ("ASSUME" ile işaretli).
import { mulberry32, shuffle } from '../rng';

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
        same('pain', 'Dışlanma acısı (öznel)', 0, x.excl * (x.glitch ? 0.5 : 1), 'sağlam'),
        mk('acc', 'dACC: fiziksel acıyla ortak iz', 0, x.excl * att, K_REPL.acc, 'karışık'),
      ];
    }
    case 'insula': {
      const ins = 1 - (1 - 0.6 * x.gross) * (1 - 0.7 * x.viol);
      return [
        same('ins', 'İnsula etkinliği', 0, ins, 'sağlam'),
        same('rej', 'Adaletsiz teklifi reddetme eğilimi', 0.1, 0.1 + 0.8 * x.viol ** 1.2, 'sağlam'),
        mk('sev', 'Ahlaki yargı sertliği (bozuk tat etkisi)', 0.5, 0.5 + AMP.taste * x.gross, K_REPL.taste, 'tartışmalı'),
        mk('tas', 'İçeceğin tadını kötü bulma (ihlal etkisi)', 0.5, 0.5 + AMP.vice * x.viol, K_REPL.vice, 'tartışmalı'),
      ];
    }
    case 'cup': {
      const t = 2 * x.temp - 1;
      return [
        mk('warm', 'Kişiyi sıcak (cana yakın) bulma', 0.5, 0.5 + AMP.warmth * t, K_REPL.cup, 'tartışmalı'),
        mk('gen', 'Cömertlik ve güven', 0.5, 0.5 + AMP.gener * t, K_REPL.cup, 'tartışmalı'),
        mk('oth', 'Diğer özellikler (kontrol)', 0.5, 0.5, 1, 'tartışmalı', true),
      ];
    }
    case 'clip': {
      const w = 2 * x.weight - 1;
      return [
        mk('ser', 'Adayı ciddi bulma', 0.5, 0.5 + AMP.serious * w, K_REPL.clip, 'tartışmalı'),
        mk('oth', 'Diğer özellikler (kontrol)', 0.5, 0.5, 1, 'tartışmalı', true),
      ];
    }
    case 'macbeth': {
      const mouth = x.chan === 0 ? 1 : 0.25, hand = x.chan === 1 ? 1 : 0.25; // beden bölgesi özgüllüğü (e8)
      return [
        mk('gar', 'Gargara isteği (ağız)', 0.3, 0.3 + AMP.wash * x.mviol * mouth, K_REPL.macbeth, 'karışık'),
        mk('sab', 'El sabunu isteği (el)', 0.3, 0.3 + AMP.wash * x.mviol * hand, K_REPL.macbeth, 'karışık'),
        mk('hlp', 'Yardım talebine yanıt (telafi)', 0.4, 0.4 + AMP.help * x.mviol * (x.washed ? 0.1 : 1), K_REPL.macbeth, 'tartışmalı'),
      ];
    }
    case 'germ':
      return [
        mk('imm', 'Göçe karşı olumsuz tutum', 0.4, 0.4 + AMP.germ * x.lang, K_REPL.germ, 'bilinmiyor'),
        mk('eco', 'Ekonomik konuya tutum (kontrol)', 0.4, 0.4, 1, 'bilinmiyor', true),
      ];
  }
}

export interface CardDef {
  id: CardId;
  name: string;
  short: string;
  exps: Array<{ id: string; label: string; status: Status }>;
  /** Metaforun gündelik karşılığı. */
  metaphor: string;
  /** Kısa replikasyon notu (chapters.json). */
  note: string;
  /** Genel bakış çubuğu için ana ölçü anahtarı ve onu en yüksek girdide veren girdiler. */
  primary: string;
  /** Canlı çubukta gösterilen ölçü. */
  bar: string;
  max: Partial<Inputs>;
}

export const CARDS: Record<CardId, CardDef> = {
  cyber: {
    id: 'cyber', name: 'Cyberball: dışlanma', short: 'Cyberball',
    exps: [{ id: 'ch15-e1', label: 'Eisenberger 2003', status: 'karışık' }],
    metaphor: 'Dışlanmak "acıtır": sosyal acı, beyinde fiziksel acıya benzetilir.',
    note: 'Dışlanmanın olumsuz duygusu çok çalışmada sağlam. "Fiziksel acıyla aynı dACC" iddiası ise meta-analizlerde (Woo 2014) sorgulandı: iki acının nöral örüntüsü ayrışıyor.',
    primary: 'acc', bar: 'acc', max: { excl: 1 },
  },
  insula: {
    id: 'insula', name: 'İnsula: iğrenç ve ahlaksız', short: 'İnsula',
    exps: [{ id: 'ch15-e6', label: 'Sanfey 2003', status: 'sağlam' }, { id: 'ch15-e4', label: 'Eskine/Chan 2012', status: 'tartışmalı' }],
    metaphor: '"İğrenç" hem bozuk yemek hem ahlaksız eylem için kullanılır; ikisi aynı bölgeyi (ön insula) çalıştırır.',
    note: 'Adaletsiz teklifte insula etkinliği ve reddi öngörmesi sağlam. Tat ile ahlaki yargının birbirini kaydırması ise tartışmalı: ters yöndeki bulgunun çok laboratuvarlı replikasyonu başarısız (Ghelfi 2020).',
    primary: 'sev', bar: 'ins', max: { gross: 1 },
  },
  cup: {
    id: 'cup', name: 'Sıcak fincan: cana yakın', short: 'Sıcak fincan',
    exps: [{ id: 'ch15-e11', label: 'Williams ve Bargh 2008', status: 'tartışmalı' }],
    metaphor: '"Sıcak insan" ile elde tutulan sıcak nesne karışır.',
    note: 'Daha büyük örneklemli doğrudan replikasyonlar (Lynott 2014; Chabris 2019) sıcaklık yargısına ya da prososyal seçime etki bulamadı.',
    primary: 'warm', bar: 'warm', max: { temp: 1 },
  },
  clip: {
    id: 'clip', name: 'Ağır pano: ciddi', short: 'Ağır pano',
    exps: [{ id: 'ch15-e10', label: 'Ackerman 2010', status: 'tartışmalı' }],
    metaphor: '"Ağırbaşlı" ile gerçek ağırlık karışır: ağır panodaki özgeçmiş daha ciddi görünür.',
    note: 'Ön kayıtlı bir replikasyon (JASNH 2018) ağır ve hafif pano arasında fark bulamadı; bu tür duyusal priming etkileri krizin en sorgulanan bulguları.',
    primary: 'ser', bar: 'ser', max: { weight: 1 },
  },
  macbeth: {
    id: 'macbeth', name: 'Macbeth: kirli ve temiz', short: 'Macbeth',
    exps: [{ id: 'ch15-e7', label: 'Zhong ve Liljenquist 2006', status: 'tartışmalı' }, { id: 'ch15-e8', label: 'Lee ve Schwarz 2010', status: 'karışık' }, { id: 'ch15-e9', label: 'El yıkama ve yardım', status: 'tartışmalı' }],
    metaphor: '"Kirli" ahlaksızdır; ahlaki lekeyi fiziksel temizlikle silme isteği.',
    note: 'Doğrudan replikasyonlar (Earp 2014) başarısız; meta-analiz etkinin çok küçük olduğunu gösterdi (Siev 2018). Beden bölgesi özgüllüğü (ağız/el) kısmen yeniden üretildi.',
    primary: 'gar', bar: 'gar', max: { mviol: 1, chan: 0 },
  },
  germ: {
    id: 'germ', name: 'Bakteri uyarısı ve göç', short: 'Bakteri ve göç',
    exps: [{ id: 'ch15-e5', label: 'Landau 2009', status: 'bilinmiyor' }],
    metaphor: 'Hastalık ve bulaşma dili, "dışarıdan gelen" için iğrenmeyi çağırır; toplum bir bedene benzetilir.',
    note: 'Doğrudan replikasyonu bilinmiyor; benzer priming etkileri replikasyon krizinde zayıf çıktı. Hastalık tehdidi ile dışgrup tutumu literatürü kısmen destekleniyor.',
    primary: 'imm', bar: 'imm', max: { lang: 1 },
  },
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
  const lead = mode === 'book' ? 'kitabın iddiasında' : 'replikasyon sonrası tahminde';
  const rest = g.book === g.repl ? 'iki okumada aynı (replikasyonda ayakta)' : mode === 'book' ? `replikasyon sonrası tahmin ${pts(other)}` : `kitabın iddiası ${pts(other)}`;
  return `${CARDS[id].short}, ${lead}: ${g.label} ${pts(cur)}/100 (etkisiz taban ${pts(g.base)}); ${rest}.`;
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
  const sup = Math.round(expectedSupport(S, m, y) * 100), ord = Math.round(expectedSupport(0, m, y) * 100);
  const back = Math.round(expectedBacklash(S, m, y) * 100);
  const what = kind === 'maddi' ? 'maddi teklif' : kind === 'sembolik' ? 'sembolik jest' : 'maddi teklif ve sembolik jest birlikte';
  const lvl = Math.round(size * 100);
  return `${what[0].toUpperCase()}${what.slice(1)} %${lvl}: uzlaşmaya destek %${sup}, ters tepki %${back}; aynı teklif sıradan bir çıkar konusunda %${ord} destek alırdı.`;
}
