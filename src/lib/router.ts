import { normalizeId } from '../content/normalize';
import type { Locale } from '../i18n/locale';

export type Route = { name: 'home' } | { name: 'chapter'; id: string; experiment?: string; sim?: string } | { name: 'experiments'; focus?: 'durum' } | { name: 'notfound'; hash: string };

export function parseHash(hash: string): Route {
  const [h, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts.length === 1 && parts[0] === 'deneyler') return new URLSearchParams(query).get('odak') === 'durum' ? { name: 'experiments', focus: 'durum' } : { name: 'experiments' };
  if (parts[0] === 'bolum' && parts.length === 2) {
    let id = parts[1];
    try { id = decodeURIComponent(id); } catch { /* ham kalsın */ }
    const q = new URLSearchParams(query);
    const route: Route = { name: 'chapter', id: normalizeId(id), experiment: q.get('deney') || undefined };
    const sim = q.get('sim');
    if (sim) route.sim = sim;
    return route;
  }
  return { name: 'notfound', hash };
}

/**
 * Dil öneki: `#/en` ve `#/en/...` İngilizce, öneksiz rotalar Türkçe'dir. Rota parçaları (`bolum`, `deneyler`, `?deney=`)
 * iki dilde aynıdır; böylece eski Türkçe bağlantılar bozulmaz.
 */
export function splitLang(hash: string): { lang: Locale; hash: string } {
  const m = /^#?\/en(?=\/|\?|$)(.*)$/.exec(hash);
  if (!m) return { lang: 'tr', hash };
  const rest = m[1];
  return { lang: 'en', hash: rest.startsWith('?') ? `#/${rest}` : `#${rest || '/'}` };
}
/** Bir rota hash'ini verilen dile çevirir (zaten o dildeyse aynen döner). */
export function toLang(hash: string, lang: Locale): string {
  const base = splitLang(hash).hash;
  if (lang === 'tr') return base;
  return base === '#/' || base === '' || base === '#' ? '#/en' : `#/en${base.replace(/^#/, '')}`;
}

export const experimentHref = (chapterId: string, expId: string): string => `#/bolum/${chapterId}?deney=${encodeURIComponent(expId)}`;
export const chapterHref = (id: string): string => `#/bolum/${id}`;
/** `sim` parametresini (varsa `deney` dahil diğer sorgu parametrelerini koruyarak) bir bölüm hash'ine yazar. */
export const withSim = (hash: string, chapterId: string, simId: string): string => {
  const { lang, hash: h } = splitLang(hash);
  const q = new URLSearchParams(h.split('?')[1] ?? '');
  q.set('sim', simId);
  return toLang(`${chapterHref(chapterId)}?${q}`, lang);
};

/**
 * Uygulama rotaları `#/` ile başlar (ya da boştur). `#main` gibi sayfa içi çapalar (atlama bağlantısı vb.)
 * rota değildir: sayfayı değiştirmemeli.
 */
export const isRouteHash = (hash: string): boolean => hash === '' || hash === '#' || hash.startsWith('#/');

/** Hash değişimini dinler; dönen fonksiyon dinleyiciyi kaldırır. */
export function startRouter(onRoute: (r: Route, lang: Locale) => void): () => void {
  const handler = () => {
    if (!isRouteHash(location.hash)) return;
    const { lang, hash } = splitLang(location.hash);
    onRoute(parseHash(hash), lang);
  };
  window.addEventListener('hashchange', handler);
  handler();
  return () => window.removeEventListener('hashchange', handler);
}
