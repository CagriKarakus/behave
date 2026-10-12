// Simülasyon metin deposu. Her simülasyonun Türkçe metni `text.tr.ts` içindedir ve kodla birlikte gelir;
// İngilizce metin `text.en.ts` ayrı bir parça olarak yalnızca İngilizce modda yüklenir (kayıt defteri `load()` içinde)
// ve burada saklanır. Görünümler/modeller metni her zaman `simText()` ile (ya da sim klasöründeki `L()` ile) OKUMA ANINDA alır;
// modül yüklenirken metin hesaplanmaz, böylece dil değişince bayat metin kalmaz.
import { getLocale } from './locale';

const store = new Map<string, unknown>();

/** Kayıt defteri, yüklenen İngilizce metni buraya koyar. */
export function setSimEn(id: string, strings: unknown): void { store.set(id, strings); }
export const hasSimEn = (id: string): boolean => store.has(id);

/** Geçerli dilin metni; İngilizce henüz yüklenmediyse (ör. testler) Türkçe döner. */
export function simText<S>(id: string, tr: S): S {
  return getLocale() === 'en' ? ((store.get(id) as S | undefined) ?? tr) : tr;
}
