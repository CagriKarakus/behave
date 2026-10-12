import { normalizeId } from '../content/normalize';

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

export const experimentHref = (chapterId: string, expId: string): string => `#/bolum/${chapterId}?deney=${encodeURIComponent(expId)}`;
export const chapterHref = (id: string): string => `#/bolum/${id}`;
/** `sim` parametresini (varsa `deney` dahil diğer sorgu parametrelerini koruyarak) bir bölüm hash'ine yazar. */
export const withSim = (hash: string, chapterId: string, simId: string): string => {
  const q = new URLSearchParams(hash.split('?')[1] ?? '');
  q.set('sim', simId);
  return `${chapterHref(chapterId)}?${q}`;
};

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
