/** Bir sayfa çizicisinin döndürdüğü tutamak. */
export interface Page {
  /** Sayfayı temizler: simülasyonları durdurur, dinleyicileri bırakır, DOM'u boşaltır. */
  dispose(): void;
  /** İçerik ayrıntısı ve simülasyonlar yüklenince çözülür. Değer: istenen deney kartı bulunup gösterildi mi. */
  ready: Promise<boolean>;
  /** Aynı bölüm sayfasında başka bir deneye geçer (sayfayı ve simülasyonu yeniden kurmadan). */
  focusExperiment?(id: string): Promise<boolean>;
}

export const staticPage = (dispose: () => void): Page => ({ dispose, ready: Promise.resolve(false) });
