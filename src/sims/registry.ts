// Simülasyon görünümleri dinamik import edilir: ana sayfa ve simülasyonsuz bölümler
// simülasyon JS/CSS'ini indirmez; her simülasyon kendi parçasında gelir.
//
// Kayıt otomatiktir: her `src/sims/<isim>/meta.ts` bir `meta` nesnesi dışa aktarır,
// görünüm aynı klasördeki `view.ts` dosyasından tembel yüklenir. Yeni simülasyon için
// bu dosyaya dokunmak gerekmez.

export type Unmount = () => void;
export type Mount = (container: HTMLElement) => Unmount;

export interface SimMeta {
  id: string;
  /** Bölüm id'si: "ch05", "app1" ... */
  chapter: string;
  title: string;
  blurb: string;
  /** Aynı bölümde sıralama (küçük önce). */
  order?: number;
}

export interface SimDef extends SimMeta {
  load: () => Promise<Mount>;
}

const metas = import.meta.glob<{ meta: SimMeta }>('./*/meta.ts', { eager: true });
const views = import.meta.glob<{ mount: Mount }>('./*/view.ts');

function build(): Record<string, SimDef[]> {
  const out: Record<string, SimDef[]> = {};
  for (const [path, mod] of Object.entries(metas)) {
    const viewPath = path.replace(/meta\.ts$/, 'view.ts');
    const loader = views[viewPath];
    if (!loader) throw new Error(`Simülasyon görünümü yok: ${viewPath}`);
    const def: SimDef = { ...mod.meta, load: () => loader().then((m) => m.mount) };
    (out[def.chapter] ??= []).push(def);
  }
  for (const list of Object.values(out)) list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  return out;
}

/** Bölüm id (normalleştirilmiş) -> simülasyonlar. */
export const SIMS: Record<string, SimDef[]> = build();

export const simsFor = (chapterId: string): SimDef[] => SIMS[chapterId] ?? [];
