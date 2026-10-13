// Simülasyon görünümleri dinamik import edilir: ana sayfa ve simülasyonsuz bölümler
// simülasyon JS/CSS'ini indirmez; her simülasyon kendi parçasında gelir.
//
// Kayıt otomatiktir: her `src/sims/<isim>/meta.ts` bir `meta` nesnesi dışa aktarır,
// görünüm aynı klasördeki `view.ts` dosyasından tembel yüklenir. Yeni simülasyon için
// bu dosyaya dokunmak gerekmez.

import { getLocale } from '../i18n/locale';
import { setSimEn } from '../i18n/sim-text';

export type Unmount = () => void;
export type Mount = (container: HTMLElement) => Unmount;

export interface SimMeta {
  id: string;
  /** Bölüm id'si: "ch05", "app1" ... */
  chapter: string;
  title: string;
  blurb: string;
  /** İngilizce başlık ve kısa açıklama (kitaptaki/yayındaki standart terimlerle). */
  en?: { title: string; blurb: string };
  /** Aynı bölümde sıralama (küçük önce). */
  order?: number;
}

export interface SimDef extends SimMeta {
  load: () => Promise<Mount>;
}

const metas = import.meta.glob<{ meta: SimMeta }>('./*/meta.ts', { eager: true });
const views = import.meta.glob<{ mount: Mount }>('./*/view.ts');
/** İngilizce metin tablosu (isteğe bağlı): yalnızca İngilizce modda ayrı parça olarak yüklenir. */
const enTexts = import.meta.glob<{ default: unknown }>('./*/text.en.ts');

function build(): Record<string, SimDef[]> {
  const out: Record<string, SimDef[]> = {};
  for (const [path, mod] of Object.entries(metas)) {
    const viewPath = path.replace(/meta\.ts$/, 'view.ts');
    const loader = views[viewPath];
    if (!loader) throw new Error(`Simülasyon görünümü yok: ${viewPath}`);
    const enLoader = enTexts[path.replace(/meta\.ts$/, 'text.en.ts')];
    const def: SimDef = {
      ...mod.meta,
      load: async () => {
        // İngilizce modda metin, görünüm çalışmadan önce hazır olmalı.
        if (getLocale() === 'en' && enLoader) setSimEn(mod.meta.id, (await enLoader()).default);
        return (await loader()).mount;
      },
    };
    (out[def.chapter] ??= []).push(def);
  }
  for (const list of Object.values(out)) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  return out;
}

/** Bölüm id (normalleştirilmiş) -> simülasyonlar. */
export const SIMS: Record<string, SimDef[]> = build();

/** Geçerli dile göre başlık/açıklaması çözülmüş kopya (Türkçe'de nesne aynen döner). */
const localized = (d: SimDef): SimDef => (getLocale() === 'en' && d.en ? { ...d, title: d.en.title, blurb: d.en.blurb } : d);

export const simsFor = (chapterId: string): SimDef[] => (SIMS[chapterId] ?? []).map(localized);
