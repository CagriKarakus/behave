import { sourceFor, type ContentSource } from './content';
import { observeLinks } from './i18n/links';
import { rememberLocale, setLocale, storedLocale, type Locale } from './i18n/locale';
import { t } from './i18n/t';
import { effectiveTheme, toggleTheme } from './lib/theme';
import { startRouter, toLang, type Route } from './lib/router';
import { renderHome } from './pages/home';
import { renderChapter, renderNotFound } from './pages/chapter';
import { renderExperiments } from './pages/experiment';
import type { Page } from './pages/page';

/**
 * Uygulama kabuğu ve yönlendirme. `host` içine üst çubuğu, atlama bağlantısını ve `<main>`'i kurar;
 * rota değişince önceki sayfayı temizleyip yenisini çizer. Dönen fonksiyon her şeyi söker.
 */
export function createApp(host: HTMLElement, src: ContentSource): () => void {
  host.innerHTML = `
  <a class="skip" href="#main"></a>
  <header class="topbar">
    <a class="brand" href="#/"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name"></span></a>
    <nav class="topnav"><a href="#/" data-nav="chapters"></a><a href="#/deneyler" data-nav="experiments"></a></nav>
    <a class="theme-btn lang-btn" id="lang-btn" href="#/"></a>
    <button class="theme-btn" type="button" id="theme-btn"></button>
  </header>
  <main id="main" tabindex="-1"></main>
  <footer class="site-foot"><p></p></footer>`;
  const main = host.querySelector('#main') as HTMLElement;
  const skip = host.querySelector('.skip') as HTMLAnchorElement;
  const themeBtn = host.querySelector('#theme-btn') as HTMLButtonElement;
  const langBtn = host.querySelector('#lang-btn') as HTMLAnchorElement;
  let lang: Locale = 'tr';
  let stopLinks: () => void = () => {};

  /** Kabuğun (üst çubuk, altbilgi) metinlerini geçerli dile göre yazar. */
  function syncChrome(): void {
    skip.textContent = t('app.skip');
    host.querySelector('.brand')?.setAttribute('aria-label', t('app.brandAria'));
    (host.querySelector('.brand-name') as HTMLElement).textContent = t('app.brand');
    host.querySelector('.topnav')?.setAttribute('aria-label', t('app.navAria'));
    (host.querySelector('[data-nav=chapters]') as HTMLElement).textContent = t('app.navChapters');
    (host.querySelector('[data-nav=experiments]') as HTMLElement).textContent = t('app.navExperiments');
    (host.querySelector('.site-foot p') as HTMLElement).textContent = t('app.footer');
    langBtn.textContent = lang === 'tr' ? 'EN' : 'TR';
    langBtn.setAttribute('aria-label', t('app.langSwitch'));
    langBtn.setAttribute('lang', lang === 'tr' ? 'en' : 'tr');
    langBtn.setAttribute('hreflang', lang === 'tr' ? 'en' : 'tr');
    langBtn.href = toLang(location.hash || '#/', lang === 'tr' ? 'en' : 'tr');
    // Üst çubuk bağlantıları (İngilizce'de öneklenir); <main> dışında kaldığı için ayrıca yazılır.
    for (const a of host.querySelectorAll<HTMLAnchorElement>('.brand, .topnav a')) a.href = toLang(a.getAttribute('href') ?? '#/', lang).replace(/^$/, '#/');
    document.querySelector('meta[name=description]')?.setAttribute('content', t('app.metaDescription'));
  }

  // Atlama bağlantısı hash'i değiştirmez (yönlendirici "#main"i rota sanıp 404 çizmesin); odağı <main>'e taşır.
  const onSkip = (e: Event) => { e.preventDefault(); main.focus(); };
  skip.addEventListener('click', onSkip);

  function syncThemeBtn(): void {
    const dark = effectiveTheme() === 'dark';
    themeBtn.textContent = dark ? t('app.themeLight') : t('app.themeDark');
    themeBtn.setAttribute('aria-label', dark ? t('app.themeToLight') : t('app.themeToDark'));
  }
  const onTheme = () => { toggleTheme(); syncThemeBtn(); };
  themeBtn.addEventListener('click', onTheme);
  // Elle seçim yokken işletim sistemi teması değişirse düğme etiketi de güncellensin.
  const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
  mq?.addEventListener?.('change', syncThemeBtn);
  syncThemeBtn();
  const onLangClick = () => { rememberLocale(lang === 'tr' ? 'en' : 'tr'); };
  langBtn.addEventListener('click', onLangClick);

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

  function show(route: Route, routeLang: Locale = 'tr'): void {
    const tk = ++token;
    const langChanged = routeLang !== lang || first;
    // Dil değişince kabuk ve bağlantı yeniden yazıcı yenilenir; sayfa yeniden kurulur.
    if (langChanged) {
      lang = routeLang;
      setLocale(lang);
      stopLinks(); stopLinks = lang === 'en' ? observeLinks(main) : () => {};
      syncThemeBtn();
    }
    syncChrome();
    const cs = sourceFor(src, lang);
    const book = cs.index.book;
    // Aynı bölümde başka bir deneye ya da simülasyona geçiş: sayfayı yeniden kurma.
    if (!langChanged && route.name === 'chapter' && chapterId === route.id && page && ((route.experiment && page.focusExperiment) || (route.sim && page.selectSim))) {
      if (route.sim) void page.selectSim?.(route.sim);
      if (route.experiment) void page.focusExperiment?.(route.experiment).then((found) => { if (tk === token && !found) window.scrollTo(0, 0); });
      return;
    }
    // Önceki sayfanın simülasyonu (rAF, dinleyiciler) burada durdurulur.
    if (page) { page.dispose(); page = null; }
    chapterId = null;
    let title = book.titleTr;
    if (route.name === 'home') {
      page = renderHome(main, cs.index);
    } else if (route.name === 'chapter') {
      const ch = cs.index.chapters.find((c) => c.id === route.id);
      title = ch ? `${ch.titleTr} · ${book.titleTr}` : `${t('app.notFoundTitle')} · ${book.titleTr}`;
      page = renderChapter(main, cs, route.id, route.experiment, route.sim);
      if (ch) chapterId = ch.id;
    } else if (route.name === 'experiments') {
      title = `${t('exp.title')} · ${book.titleTr}`;
      page = renderExperiments(main, cs, route.focus);
    } else {
      page = renderNotFound(main, t('app.notFound'));
    }
    document.title = title;

    const wantsCard = route.name === 'chapter' && !!route.experiment;
    const y = savedY();
    if (!wantsCard) window.scrollTo(0, 0);
    // İlk yüklemede odak çalmayız: ilk Tab "İçeriğe geç" bağlantısına gitsin. Sonraki rotalarda başlığa odaklanılır.
    if (!first) (document.getElementById('page-title') as HTMLElement | null)?.focus({ preventScroll: true });
    first = false;
    void page.ready.then((focused) => {
      if (tk !== token) return;
      if (wantsCard) { if (!focused) window.scrollTo(0, 0); } // kart bulunamadıysa önceki sayfanın konumu kalmasın
      else if (y) window.scrollTo(0, y);
    });
  }

  // Kayıtlı tercih İngilizce ise, rota belirtilmemiş açılışta (boş ya da "#/") İngilizce ana sayfaya geçilir.
  // Açıkça Türkçe bir bağlantıya (#/bolum/...) dokunulmaz.
  if (storedLocale() === 'en' && /^(#\/?)?$/.test(location.hash)) {
    try { history.replaceState(history.state, '', '#/en'); } catch { /* kısıtlı ortam */ }
  }
  const stopRouter = startRouter(show);
  return () => {
    stopRouter();
    token++;
    page?.dispose(); page = null;
    skip.removeEventListener('click', onSkip);
    themeBtn.removeEventListener('click', onTheme);
    langBtn.removeEventListener('click', onLangClick);
    stopLinks();
    setLocale('tr');
    mq?.removeEventListener?.('change', syncThemeBtn);
    window.removeEventListener('scroll', saveScroll);
    clearTimeout(scrollTimer);
    host.innerHTML = '';
  };
}
