// Ortak sayı biçimleyicileri. Türkçe çıktı eski yerel kopyalarla birebir aynıdır (ondalık virgül, `%12`);
// İngilizce'de ondalık nokta ve `12%` kullanılır.
import { decimalSep, getLocale } from './locale';

/** `v` değerini `d` ondalıkla yazar; ondalık ayırıcı dile göredir. */
export const num = (v: number, d = 1): string => v.toFixed(d).replace('.', decimalSep());
/** Yüzde işaretini dile göre yerleştirir: Türkçe `%12`, İngilizce `12%`. */
export const percent = (s: string): string => (getLocale() === 'tr' ? `%${s}` : `${s}%`);
/** 0..1 oranını tam yüzde olarak yazar. */
export const pct = (frac: number): string => percent(String(Math.round(frac * 100)));
/** 0..1 oranını bir ondalıklı yüzde (1%'ten küçükse iki ondalık) olarak yazar. */
export const pct1 = (frac: number): string => percent(num(frac * 100, frac < 0.01 ? 2 : 1));
/** Binlik ayırıcılı tam sayı (Türkçe `12.345`, İngilizce `12,345`). */
export const int = (v: number): string => v.toLocaleString(getLocale() === 'tr' ? 'tr-TR' : 'en-US');
/** Ultimatum oyunundaki para birimi: Türkçe `10 ₺`, İngilizce `$10` (Sanfey ve ark. 2003'teki 10 $). */
export const money = (v: number | string): string => (getLocale() === 'tr' ? `${v} ₺` : `$${v}`);
