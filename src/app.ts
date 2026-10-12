import type { ContentSource } from './content';
import { effectiveTheme, toggleTheme } from './lib/theme';
import { startRouter, type Route } from './lib/router';
import { renderHome } from './pages/home';
import { renderChapter, renderNotFound } from './pages/chapter';
import { renderExperiments } from './pages/experiment';
import type { Page } from './pages/page';

/**
 * Uygulama kabuğu ve yönlendirme. `host` içine üst çubuğu, atlama bağlantısını ve `<main>`'i kurar;
 * rota değişince önceki sayfayı temizleyip yenisini çizer. Dönen fonksiyon her şeyi söker.
 */
export function createApp(host: HTMLElement, src: ContentSource): () => void {
  const book = src.index.book;
  host.innerHTML = `
  <a class="skip" href="#main">İçeriğe geç</a>
  <header class="topbar">
    <a class="brand" href="#/" aria-label="Davranış: ana sayfa"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">Davranış</span></a>
    <nav class="topnav" aria-label="Ana gezinti"><a href="#/">Bölümler</a><a href="#/deneyler">Deneyler</a></nav>
    <button class="theme-btn" type="button" id="theme-btn"></button>
  </header>
  <main id="main" tabindex="-1"></main>
  <footer class="site-foot"><p>Bu site Robert M. Sapolsky'nin Behave (2017) kitabından esinlenen bağımsız bir okuma ve öğrenme aracıdır; kitabın yazarı ya da yayıncısıyla bağlantılı değildir. Simülasyonlar nitel modellerdir, ölçüm değildir. Bilim ilerledikçe bulgular değişebilir; bazı deneylerin güncel replikasyon durumu kartlarında belirtilmiştir.</p></footer>`;
  const main = host.querySelector('#main') as HTMLElement;
  const skip = host.querySelector('.skip') as HTMLAnchorElement;
  const themeBtn = host.querySelector('#theme-btn') as HTMLButtonElement;

  // Atlama bağlantısı hash'i değiştirmez (yönlendirici "#main"i rota sanıp 404 çizmesin); odağı <main>'e taşır.
  const onSkip = (e: Event) => { e.preventDefault(); main.focus(); };
  skip.addEventListener('click', onSkip);

  function syncThemeBtn(): void {
    const dark = effectiveTheme() === 'dark';
    themeBtn.textContent = dark ? 'Açık tema' : 'Koyu tema';
    themeBtn.setAttribute('aria-label', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
  }
  const onTheme = () => { toggleTheme(); syncThemeBtn(); };
  themeBtn.addEventListener('click', onTheme);
  // Elle seçim yokken işletim sistemi teması değişirse düğme etiketi de güncellensin.
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  mq?.addEventListener?.('change', syncThemeBtn);
  syncThemeBtn();

  // Kaydırma konumu: her geçmiş girdisinin kendi durumunda saklanır. Geri/ileri ve yenilemede geri gelir,
  // bağlantıyla yeni sayfaya gidince en üsttedir.
  try { history.scrollRestoration = 'manual'; } catch { /* eski tarayıcı */ }
  let scrollTimer = 0;
  const saveScroll = () => {
    clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      try { history.replaceState({ ...(history.state ?? {}), y: window.scrollY }, ''); } catch { /* kısıtlı ortam */ }
    }, 120);
  };
  window.addEventListener('scroll', saveScroll, { passive: true });
  const savedY = (): number => {
    const y = (history.state as { y?: unknown } | null)?.y;
    return typeof y === 'number' && y > 0 ? y : 0;
  };

  let page: Page | null = null;
  let chapterId: string | null = null;
  let token = 0;
  let first = true;

  function show(route: Route): void {
    const t = ++token;
    // Aynı bölümde başka bir deneye ya da simülasyona geçiş: sayfayı yeniden kurma.
    if (route.name === 'chapter' && chapterId === route.id && page && ((route.experiment && page.focusExperiment) || (route.sim && page.selectSim))) {
      if (route.sim) void page.selectSim?.(route.sim);
      if (route.experiment) void page.focusExperiment?.(route.experiment).then((found) => { if (t === token && !found) window.scrollTo(0, 0); });
      return;
    }
    // Önceki sayfanın simülasyonu (rAF, dinleyiciler) burada durdurulur.
    if (page) { page.dispose(); page = null; }
    chapterId = null;
    let title = book.titleTr;
    if (route.name === 'home') {
      page = renderHome(main, src.index);
    } else if (route.name === 'chapter') {
      const ch = src.index.chapters.find((c) => c.id === route.id);
      title = ch ? `${ch.titleTr} · ${book.titleTr}` : `Bulunamadı · ${book.titleTr}`;
      page = renderChapter(main, src, route.id, route.experiment, route.sim);
      if (ch) chapterId = ch.id;
    } else if (route.name === 'experiments') {
      title = `Deneyler · ${book.titleTr}`;
      page = renderExperiments(main, src, route.focus);
    } else {
      page = renderNotFound(main, 'Aradığın sayfa yok.');
    }
    document.title = title;

    const wantsCard = route.name === 'chapter' && !!route.experiment;
    const y = savedY();
    if (!wantsCard) window.scrollTo(0, 0);
    // İlk yüklemede odak çalmayız: ilk Tab "İçeriğe geç" bağlantısına gitsin. Sonraki rotalarda başlığa odaklanılır.
    if (!first) (document.getElementById('page-title') as HTMLElement | null)?.focus({ preventScroll: true });
    first = false;
    void page.ready.then((focused) => {
      if (t !== token) return;
      if (wantsCard) { if (!focused) window.scrollTo(0, 0); } // kart bulunamadıysa önceki sayfanın konumu kalmasın
      else if (y) window.scrollTo(0, y);
    });
  }

  const stopRouter = startRouter(show);
  return () => {
    stopRouter();
    token++;
    page?.dispose(); page = null;
    skip.removeEventListener('click', onSkip);
    themeBtn.removeEventListener('click', onTheme);
    mq?.removeEventListener?.('change', syncThemeBtn);
    window.removeEventListener('scroll', saveScroll);
    clearTimeout(scrollTimer);
    host.innerHTML = '';
  };
}
