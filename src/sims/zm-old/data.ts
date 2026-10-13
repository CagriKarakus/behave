import { t } from '../../i18n/t';
import { L } from './text';

// Zaman merdiveni içeriği: basamaklar, davranışlar, etken kartları ve basamaklar arası bağlar.
// Kartlar ilgili bölümlerin kavram ve bulgularından (content/chapters.json) derlenmiş örneklerdir;
// kitabın bu davranışlara özgü bir sonucu değildir.
// Yapı (kimlik, yön, sayı) burada; görünen metin `L()` üzerinden OKUMA ANINDA alınır (alıcı özellikler).

export type Dir = 'for' | 'against' | 'ctx';

export interface Rung {
  ch: string;
  sim: string;
  /** Zaman etiketi (bölümün timescale alanından). */
  when: string;
  /** Bölümün Türkçe başlığı (kısa). */
  name: string;
}

/** Yukarıdan aşağıya: en yakın zamandan en uzağa. */
const RUNG_IDS: Array<[string, string]> = [
  ['ch02', 'bir-saniye-once'],
  ['ch03', 'saniyeler-once'],
  ['ch04', 'hormon-baglam'],
  ['ch05', 'noroplastisite'],
  ['ch06', 'ergen-beyni'],
  ['ch07', 'cocukluk'],
  ['ch08', 'gen-cevre'],
  ['ch09', 'kultur-ekoloji'],
  ['ch10', 'isbirligi-evrimi'],
];
export const RUNGS: Rung[] = RUNG_IDS.map(([ch, sim], i) => ({
  ch, sim,
  get when() { return L().rungs[i].when; },
  get name() { return L().rungs[i].name; },
}));

export interface Card { title: string; text: string; dir: Dir }
export interface Behavior { key: string; label: string; cards: Card[] }

const BEH: Array<{ key: string; dirs: Dir[] }> = [
  { key: 'yardim', dirs: ['ctx', 'ctx', 'ctx', 'against', 'ctx', 'for', 'ctx', 'for', 'for'] },
  { key: 'vurma', dirs: ['ctx', 'for', 'ctx', 'for', 'for', 'for', 'ctx', 'ctx', 'ctx'] },
  { key: 'tetik', dirs: ['ctx', 'for', 'for', 'ctx', 'for', 'ctx', 'against', 'ctx', 'for'] },
];
// Replikasyon etiketi karta göre değişir: MAO-A ve akran etkisi "karışık", koridor deneyi "bilinmiyor".
const REP: Record<string, 'karışık' | 'bilinmiyor'> = { 'vurma:6': 'karışık', 'tetik:4': 'karışık', 'tetik:7': 'bilinmiyor' };

export const BEHAVIORS: Behavior[] = BEH.map((b, bi) => ({
  key: b.key,
  get label() { return L().behaviors[bi].label; },
  cards: b.dirs.map((dir, ci): Card => ({
    dir,
    get title() { return L().behaviors[bi].cards[ci].title; },
    get text() { return L().behaviors[bi].cards[ci].text.replace('{rep}', t(`repl.${REP[`${b.key}:${ci}`] ?? 'karışık'}`)); },
  })),
}));

export interface Link {
  /** Etkileyen (daha derin) basamak. */
  from: number;
  /** Etkilenen (daha yakın) basamak. */
  to: number;
  label: string;
}

export const LINKS: Link[] = ([
  [1, 0],
  [2, 0],
  [3, 0],
  [2, 1],
  [4, 0],
  [5, 4],
  [5, 2],
  [6, 5],
  [7, 5],
  [8, 6],
  [8, 7],
] as Array<[number, number]>).map(([from, to], i) => ({
  from, to,
  get label() { return L().links[i]; },
}));

export interface Example {
  key: string;
  label: string;
  /** Eksen: alt ve üst sınır, birim. */
  lo: number; hi: number; unit: string;
  /** Çift arasındaki varsayılan fark. */
  delta: number; maxDelta: number; step: number;
  axis: string;
  hint: string;
  /** Şerit renkleri (token adları). */
  from: string; to: string;
  boxes: number;
}

export const EXAMPLES: Example[] = [
  { key: 'renk', lo: 0, hi: 100, unit: '%', delta: 6, maxDelta: 30, step: 1, from: '--pfc', to: '--amy', boxes: 4 },
  { key: 'not', lo: 0, hi: 100, unit: 'puan', delta: 2, maxDelta: 20, step: 1, from: '--lesion', to: '--gld', boxes: 4 },
  { key: 'boy', lo: 140, hi: 200, unit: 'cm', delta: 3, maxDelta: 20, step: 1, from: '--hyp', to: '--pit', boxes: 4 },
].map((e, i) => ({
  ...e,
  get label() { return L().examples[i].label; },
  get axis() { return L().examples[i].axis; },
  get hint() { return L().examples[i].hint; },
}));
