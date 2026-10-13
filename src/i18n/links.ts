// Sayfa ve simülasyon metinlerinde `#/bolum/...` gibi sabit bağlantılar yazılıdır. İngilizce modda hepsi tek yerden
// `#/en/...` önekiyle yeniden yazılır; böylece bağlantı oluşturan yüzlerce noktaya dokunmak gerekmez.
import { toLang } from '../lib/router';

const SEL = 'a[href^="#/"]';

/** `root` altındaki uygulama bağlantılarını İngilizce rotaya çevirir (tekrar çağrılması zararsızdır). */
export function localizeLinks(root: ParentNode): void {
  for (const a of root.querySelectorAll<HTMLAnchorElement>(SEL)) {
    const h = a.getAttribute('href') ?? '';
    const next = toLang(h, 'en');
    if (next !== h) a.setAttribute('href', next);
  }
}

/** İçerik değiştikçe (sayfa, tembel yüklenen simülasyon, sekme) bağlantıları İngilizceye çevirir. Dönen fonksiyon durdurur. */
export function observeLinks(root: HTMLElement): () => void {
  localizeLinks(root);
  if (typeof MutationObserver === 'undefined') return () => {};
  let queued = false;
  const mo = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; localizeLinks(root); });
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => mo.disconnect();
}
