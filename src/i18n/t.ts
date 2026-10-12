import { getLocale } from './locale';
import { EN, TR, type MsgKey } from './messages';

export type Params = Record<string, string | number>;

const fill = (s: string, p?: Params): string => (p ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in p ? String(p[k]) : m)) : s);

/** Mesajı geçerli dilde döndürür; `{ad}` yer tutucuları `p` ile doldurulur. */
export function t(key: MsgKey, p?: Params): string {
  return fill((getLocale() === 'en' ? EN : TR)[key], p);
}

/** Çoğul biçimi: `key.one` / `key.other` anahtarlarından `Intl.PluralRules` ile seçer. `{n}` otomatik doldurulur. */
export function tn(base: string, n: number, p?: Params): string {
  const loc = getLocale();
  const cat = new Intl.PluralRules(loc).select(n) === 'one' ? 'one' : 'other';
  const key = `${base}.${cat}` as MsgKey;
  return t(key, { n, ...p });
}
