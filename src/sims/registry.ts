import { mount as mountBso } from './bir-saniye-once/view';
import { mount as mountEndo } from './endokrin-eksen/view';

export interface SimDef {
  id: string;
  title: string;
  blurb: string;
  mount: (container: HTMLElement) => () => void;
}

/** Bölüm id (normalleştirilmiş) -> simülasyonlar. Yeni simülasyon için README'deki adımlara bak. */
export const SIMS: Record<string, SimDef[]> = {
  ch02: [{
    id: 'bir-saniye-once',
    title: 'Bir Saniye Önce devresi',
    blurb: 'Amigdala, frontal korteks ve dopamin ağı',
    mount: mountBso,
  }],
  app2: [{
    id: 'endokrin-eksen',
    title: 'Endokrin eksen',
    blurb: 'HPA / HPG / pankreas eksenleri, reseptör ve süre',
    mount: mountEndo,
  }],
};

export const simsFor = (chapterId: string): SimDef[] => SIMS[chapterId] ?? [];
