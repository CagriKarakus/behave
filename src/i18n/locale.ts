// Dil durumu. Varsayılan Türkçe'dir; İngilizce yalnızca `#/en/...` rotalarında (ya da kayıtlı tercihle ana sayfada) açılır.
// Sayfalar ve simülasyonlar `getLocale()` ile okur; uygulama kabuğu her rota değişiminde `setLocale()` çağırır.

export type Locale = 'tr' | 'en';
export const LOCALES: readonly Locale[] = ['tr', 'en'];
export const LANG_KEY = 'behave-lang';

let current: Locale = 'tr';

export const getLocale = (): Locale => current;
export const isLocale = (v: unknown): v is Locale => v === 'tr' || v === 'en';

export function setLocale(l: Locale): void {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

export function storedLocale(): Locale | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return isLocale(v) ? v : null;
  } catch { return null; }
}
export function rememberLocale(l: Locale): void {
  try { localStorage.setItem(LANG_KEY, l); } catch { /* kısıtlı ortam */ }
}

/** Sayıları/ondalığı yerel yazım biçimine uyarlamak için: Türkçe virgül, İngilizce nokta. */
export const decimalSep = (): string => (current === 'tr' ? ',' : '.');
