// Simülasyon görünümleri dinamik import edilir: ana sayfa ve simülasyonsuz bölümler
// simülasyon JS/CSS'ini indirmez; her simülasyon kendi parçasında gelir.

export type Unmount = () => void;
export type Mount = (container: HTMLElement) => Unmount;

export interface SimDef {
  id: string;
  title: string;
  blurb: string;
  load: () => Promise<Mount>;
}

/** Bölüm id (normalleştirilmiş) -> simülasyonlar. Yeni simülasyon için README'deki adımlara bak. */
export const SIMS: Record<string, SimDef[]> = {
  ch02: [{
    id: 'bir-saniye-once',
    title: 'Bir Saniye Önce devresi',
    blurb: 'Amigdala, frontal korteks ve dopamin ağı',
    load: () => import('./bir-saniye-once/view').then((m) => m.mount),
  }],
  app2: [{
    id: 'endokrin-eksen',
    title: 'Endokrin eksen',
    blurb: 'HPA / HPG / pankreas eksenleri, reseptör ve süre',
    load: () => import('./endokrin-eksen/view').then((m) => m.mount),
  }],
};

export const simsFor = (chapterId: string): SimDef[] => SIMS[chapterId] ?? [];
