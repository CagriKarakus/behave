import { normalizeId } from '../content/normalize';

export type Route = { name: 'home' } | { name: 'chapter'; id: string; experiment?: string } | { name: 'experiments' } | { name: 'notfound'; hash: string };

export function parseHash(hash: string): Route {
  const [h, query = ''] = hash.replace(/^#/, '').split('?');
  const parts = h.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts.length === 1 && parts[0] === 'deneyler') return { name: 'experiments' };
  if (parts[0] === 'bolum' && parts.length === 2) {
    let id = parts[1];
    try { id = decodeURIComponent(id); } catch { /* ham kalsın */ }
    const experiment = new URLSearchParams(query).get('deney') || undefined;
    return { name: 'chapter', id: normalizeId(id), experiment };
  }
  return { name: 'notfound', hash };
}

export const experimentHref = (chapterId: string, expId: string): string => `#/bolum/${chapterId}?deney=${encodeURIComponent(expId)}`;
export const chapterHref = (id: string): string => `#/bolum/${id}`;

/**
 * Uygulama rotaları `#/` ile başlar (ya da boştur). `#main` gibi sayfa içi çapalar (atlama bağlantısı vb.)
 * rota değildir: sayfayı değiştirmemeli.
 */
export const isRouteHash = (hash: string): boolean => hash === '' || hash === '#' || hash.startsWith('#/');

/** Hash değişimini dinler; dönen fonksiyon dinleyiciyi kaldırır. */
export function startRouter(onRoute: (r: Route) => void): () => void {
  const handler = () => { if (isRouteHash(location.hash)) onRoute(parseHash(location.hash)); };
  window.addEventListener('hashchange', handler);
  handler();
  return () => window.removeEventListener('hashchange', handler);
}
