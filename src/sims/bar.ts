// Yapışkan `.sim-bar` için ortak küçültme düğmesi. Çubuk mobilde ekranın altına yapışır; uzun sekmelerde
// kontrollerin üstüne binmesin diye okuyucu çubuğu tek satıra indirebilir (tercih oturum boyunca hatırlanır).
// Sayfa bölümü simülasyonu bağladıktan sonra çağırır; böylece her simülasyon (yenileri de) aynı davranışı alır.

const KEY = 'behave-sim-bar';
let seq = 0;

const read = (): boolean => { try { return sessionStorage.getItem(KEY) === 'collapsed'; } catch { return false; } };
const write = (collapsed: boolean): void => { try { sessionStorage.setItem(KEY, collapsed ? 'collapsed' : 'open'); } catch { /* kısıtlı ortam */ } };

const CHEVRON = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Çubuğa küçült/büyüt düğmesi ekler. Dönen fonksiyon dinleyiciyi bırakır. */
export function enhanceSimBar(host: HTMLElement): () => void {
  const bar = host.querySelector<HTMLElement>('.sim-bar');
  const inner = bar?.querySelector<HTMLElement>('.sim-bar-in');
  if (!bar || !inner || inner.querySelector('.bar-toggle')) return () => {};
  if (!inner.id) inner.id = `simbar-in-${++seq}`;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bar-toggle';
  btn.innerHTML = CHEVRON;
  btn.setAttribute('aria-controls', inner.id);
  inner.appendChild(btn);

  const apply = (collapsed: boolean): void => {
    bar.dataset.collapsed = String(collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
    const label = collapsed ? 'Çıktı çubuğunu büyüt' : 'Çıktı çubuğunu küçült';
    btn.setAttribute('aria-label', label);
    btn.title = label;
  };
  apply(read());
  const onClick = (): void => { const next = bar.dataset.collapsed !== 'true'; apply(next); write(next); };
  btn.addEventListener('click', onClick);
  return () => { btn.removeEventListener('click', onClick); btn.remove(); };
}
