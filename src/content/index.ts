import rawIndex from 'virtual:behave-index';
import loaders from 'virtual:behave-chapters';
import rawIndexEn from 'virtual:behave-index/en';
import loadersEn from 'virtual:behave-chapters/en';
import { normalizeDetail, normalizeIndex } from './normalize';
import type { ChapterDetail, Content, ContentIndex } from './types';

/** Sayfaların içerik kaynağı: küçük özet (hemen) + bölüm ayrıntısı (gerektiğinde, ayrı parça). */
export interface ContentSource {
  index: ContentIndex;
  detail(id: string): Promise<ChapterDetail>;
  /** İngilizce karşılığı (yoksa uygulama aynı kaynağı kullanır). */
  en?: ContentSource;
}

/** Seçilen dil için kaynak; İngilizce yoksa Türkçe'ye düşer. */
export const sourceFor = (src: ContentSource, lang: 'tr' | 'en'): ContentSource => (lang === 'en' && src.en ? src.en : src);

/** content/chapters.json (derleme sırasında bölünür). Ayrıntı yalnızca istenince indirilir. */
export function createContentSource(): ContentSource {
  return { ...build(rawIndex, loaders), en: build(rawIndexEn, loadersEn) };
}

function build(rawIdx: { book: unknown; chapters: unknown[] }, loaders: Record<string, () => Promise<{ default: unknown }>>): ContentSource {
  const index = normalizeIndex(rawIdx);
  const cache = new Map<string, Promise<ChapterDetail>>();
  return {
    index,
    detail(id) {
      let p = cache.get(id);
      if (!p) {
        const load = loaders[id];
        p = (load ? load().then((m) => m.default) : Promise.resolve({})).then((d) => normalizeDetail(d, id));
        // Yükleme başarısız olursa (çevrimdışı vb.) bir sonraki denemede yeniden denensin.
        p.catch(() => cache.delete(id));
        cache.set(id, p);
      }
      return p;
    },
  };
}

/** Tam (bölünmemiş) bir Content'ten kaynak üretir. Testler ve örnek veriler için. */
export function sourceFromContent(c: Content): ContentSource {
  const byId = new Map(c.chapters.map((ch) => [ch.id, ch]));
  return {
    index: { book: c.book, chapters: c.chapters.map(({ id, kind, number, titleEn, titleTr, timescale, timescaleSeconds, confidence }) => ({ id, kind, number, titleEn, titleTr, timescale, timescaleSeconds, confidence })) },
    detail: (id) => {
      const ch = byId.get(id);
      return ch ? Promise.resolve(ch) : Promise.reject(new Error('Bölüm yok: ' + id));
    },
  };
}
