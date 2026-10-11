// Nitel Ultimatum oyunu modeli: yanıtlayıcının bir teklifi reddetme olasılığı,
// birkaç beyin bölgesinin etkinliğinden (insula, amigdala, dlPFC, vmPFC/OFC, kaudat) toplanır.
// Sayılar ölçüm değildir; kitaptaki bulguların YÖNÜNÜ ve sırasını yeniden üretir:
//  - Sanfey (ch15-e6): insandan gelen adaletsiz teklif insulayı etkinleştirir, bilgisayardan gelen daha az; insula arttıkça ret artar.
//  - Gospic / Van Honk (ch02-e3): amigdala etkinliği arttıkça ret artar; amigdala hasarlılar haksız tekliflerde ret oranını artırmaz.
//  - Knoch / Fehr (ch02-e5): sağ dlPFC susturulunca kötü teklif daha çok kabul edilir, adaletsizlik yargısı değişmez; yalnızca insana karşı; sol dlPFC etkisiz.
//  - Wood (ch02-e12) ve replikasyon notu: serotonin azalınca (triptofan yoksunluğu) ret artar; etki yalnızca ilk oturumda.
//  - de Quervain (ch02-e9): cezalandırma kaudatı etkinleştirir ("ret etmenin tatmini").

export const POT = 10; // bölüştürülen para (₺)
export const FAIR = 5; // eşit pay

export type Proposer = 'human' | 'computer';
export type RegionId = 'insula' | 'amy' | 'caud' | 'dlpfc' | 'vm';
export type Activity = Record<RegionId, number>;

export interface Conditions {
  proposer: Proposer;
  /** Sağ dlPFC'ye TMS (Knoch). */
  tmsRight: boolean;
  /** Sol dlPFC'ye TMS (kitapta etkisiz). */
  tmsLeft: boolean;
  /** Amigdala hasarı (Urbach-Wiethe; Van Honk). */
  amyLesion: boolean;
  /** Serotonin/triptofan azalması (Wood). */
  trp: boolean;
  /** 1 = ilk oturum, 2 = sonraki oturum. */
  session: 1 | 2;
}

export const BASE: Conditions = { proposer: 'human', tmsRight: false, tmsLeft: false, amyLesion: false, trp: false, session: 1 };

export interface Part { id: string; label: string; v: number }

export interface Evaluation {
  offer: number;
  /** 0 (eşit pay) .. 1 (hiçbir şey): payın aritmetiğinden gelen adaletsizlik. */
  unfair: number;
  act: Activity;
  /** Reddetme eğilimine (logit) gelen katkılar. */
  parts: Part[];
  drive: number;
  /** Ortalama bir kişinin reddetme olasılığı. */
  pReject: number;
  /** "Adaletsiz buluyor" göstergesi (yargı); TMS ile değişmez. */
  judge: number;
  /** Kaudat: ret etmenin beklenen tatmini (de Quervain). */
  satisfaction: number;
  /** Serotonin düşüklüğü bu oturumda etkili mi. */
  trpActive: boolean;
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));
/** Sıcaklık: eğriyi yumuşatır (bireyler arası değişkenliği kabaca temsil eder). */
const TEMP = 0.7;

/** Triptofan etkisi yalnızca ilk oturumda (Wood). */
export const trpActive = (c: Conditions): boolean => c.trp && c.session === 1;

// Katkı ağırlıkları (logit): nitel ayar.
const W = { base: -2.2, insula: 4.0, amy: 1.4, caud: 1.0, dlpfc: 2.4, vm: -3.6, ser: 0.9 };
const COMPUTER_GATE = 0.4; // bilgisayardan gelen teklifin sosyal ağırlığı
const LESION_GATE = 0.08; // amigdalasız: sosyal kuşku/tetikte olma payı

export function evaluate(offer: number, c: Conditions): Evaluation {
  const o = Math.max(0, Math.min(POT, offer));
  const unfair = clamp01((FAIR - o) / FAIR);
  const human = c.proposer === 'human';
  // Sosyal değerlendirme: insanda tam, bilgisayarda düşük; amigdala hasarında kuşku payı azalır.
  const s = unfair * (human ? 1 : COMPUTER_GATE) * (c.amyLesion ? LESION_GATE : 1);
  const ser = trpActive(c) ? 1 : 0;

  const insula = clamp01(0.06 + 0.94 * s * (1 + 0.3 * ser));
  const amy = c.amyLesion ? 0 : clamp01(0.05 + 0.9 * unfair * (human ? 1 : COMPUTER_GATE));
  const caud = clamp01(0.85 * insula);
  // Sağ dlPFC adalet hedefini eyleme çevirir; yalnızca insana karşı devrede. TMS onu susturur.
  const dlpfc = c.tmsRight ? 0.04 : clamp01(0.1 + 0.9 * (human ? s : 0));
  const vm = clamp01(0.1 + 0.9 * (1 - unfair));

  const parts: Part[] = [
    { id: 'insula', label: 'İnsula', v: W.insula * insula },
    { id: 'amy', label: 'Amigdala', v: W.amy * amy },
    { id: 'caud', label: 'Kaudat', v: W.caud * caud },
    { id: 'dlpfc', label: 'dlPFC', v: W.dlpfc * dlpfc },
    { id: 'vm', label: 'vmPFC/OFC', v: W.vm * vm },
    { id: 'ser', label: 'Serotonin düşük', v: W.ser * ser * s },
    { id: 'base', label: 'Taban', v: W.base },
  ];
  const drive = parts.reduce((a, p) => a + p.v, 0);
  return { offer: o, unfair, act: { insula, amy, caud, dlpfc, vm }, parts, drive, pReject: sigmoid(TEMP * drive), judge: unfair, satisfaction: caud, trpActive: ser === 1 };
}

/** Reddetme olasılığı eğrisi: 0..POT ₺ arası tam sayı teklifler. */
export function curve(c: Conditions): Array<{ offer: number; p: number }> {
  const out: Array<{ offer: number; p: number }> = [];
  for (let o = 0; o <= POT; o++) out.push({ offer: o, p: evaluate(o, c).pReject });
  return out;
}

/** Kabul edilebilir en düşük teklif: ret olasılığının %50'nin altına indiği ilk tam sayı (₺). */
export function threshold(c: Conditions): number {
  for (let o = 0; o <= POT; o++) if (evaluate(o, c).pReject < 0.5) return o;
  return POT;
}

/** Tur teklifleri destesi (tohumla karıştırılır): adildan çok adaletsize. */
export const DECK: readonly number[] = [5, 4, 3, 2, 1, 5, 3, 2];

export function describe(offer: number, c: Conditions, e: Evaluation): string {
  const who = c.proposer === 'human' ? 'İnsan' : 'Bilgisayar';
  const p = Math.round(e.pReject * 100);
  const head = `${who} ${POT} ₺'dan ${offer} ₺ öneriyor`;
  const notes: string[] = [];
  if (c.tmsRight) notes.push('sağ dlPFC susturulmuş');
  if (c.tmsLeft) notes.push('sol dlPFC susturulmuş');
  if (c.amyLesion) notes.push('amigdala hasarlı');
  if (trpActive(c)) notes.push('serotonin düşük');
  else if (c.trp) notes.push('triptofan etkisi ilk oturumda kalmıştı');
  const tail = notes.length ? ` (${notes.join(', ')})` : '';
  if (e.unfair === 0) return `${head}${tail}: eşit pay, ortalama bir kişi neredeyse hiç reddetmez (%${p}).`;
  const feel = e.act.insula > 0.5 ? 'insula belirgin etkin' : e.act.insula > 0.25 ? 'insula orta düzeyde etkin' : 'insula sönük';
  return `${head}${tail}: ${feel}, ortalama kişi %${p} olasılıkla reddeder.`;
}
