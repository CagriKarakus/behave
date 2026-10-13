// Kitabın haritası: her bölümün tek cümlelik dersi. Cümleler content/chapters.json bölüm özetlerinden
// (summary) kısaltılmıştır; kitapta olmayan iddia içermez. Simülasyon bağlantıları registry'den gelir.
import { L } from './text';

export type Group = 'zaman' | 'gelisim' | 'biz' | 'ek';

export interface MapChapter { id: string; label: string; title: string; group: Group; lesson: string }

const GROUP_KEYS: Array<Group | 'hepsi'> = ['hepsi', 'zaman', 'gelisim', 'biz', 'ek'];
/** Süzgeç düğmeleri; etiketler okuma anında alınır. */
export const GROUPS: Array<{ key: Group | 'hepsi'; label: string }> = GROUP_KEYS.map((key) => ({ key, get label(): string { return L().map.groups[key]; } }));

const chapterOf = (id: string, group: Group): MapChapter => ({
  id, group,
  get label(): string { return L().map.chapters[id].label; },
  get title(): string { return L().map.chapters[id].title; },
  get lesson(): string { return L().map.chapters[id].lesson; },
});

/** Metinler getter'dır: dil değişince bayat kalmaz. */
export const CHAPTERS: MapChapter[] = [
  chapterOf('intro', 'ek'),
  chapterOf('ch01', 'ek'),
  chapterOf('ch02', 'zaman'),
  chapterOf('ch03', 'zaman'),
  chapterOf('ch04', 'zaman'),
  chapterOf('ch05', 'zaman'),
  chapterOf('ch06', 'gelisim'),
  chapterOf('ch07', 'gelisim'),
  chapterOf('ch08', 'gelisim'),
  chapterOf('ch09', 'gelisim'),
  chapterOf('ch10', 'gelisim'),
  chapterOf('ch11', 'biz'),
  chapterOf('ch12', 'biz'),
  chapterOf('ch13', 'biz'),
  chapterOf('ch14', 'biz'),
  chapterOf('ch15', 'biz'),
  chapterOf('ch16', 'biz'),
  chapterOf('ch17', 'biz'),
  chapterOf('app1', 'ek'),
  chapterOf('app2', 'ek'),
  chapterOf('app3', 'ek'),
];

/** Sonsöz'ün tekrarlanan temaları (keyConcepts), kendi cümlelerimizle. */
export interface Theme { term: string; text: string; chapters: string[]; tab?: 'ort' | 'biz' }
const themeOf = (i: number, chapters: string[], tab?: 'ort' | 'biz'): Theme => ({
  get term(): string { return L().map.themes[i].term; },
  get text(): string { return L().map.themes[i].text; },
  chapters, tab,
});
export const THEMES: Theme[] = [
  themeOf(0, [], 'ort'),
  themeOf(1, ['ch04']),
  themeOf(2, ['ch08']),
  themeOf(3, ['ch11', 'ch17'], 'biz'),
  themeOf(4, ['ch11', 'ch13']),
  themeOf(5, ['ch02', 'ch13']),
  themeOf(6, ['ch12']),
  themeOf(7, ['ch09']),
];
