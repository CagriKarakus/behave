import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { content } from './content';
import { effectiveTheme, initTheme, toggleTheme } from './lib/theme';
import { startRouter, type Route } from './lib/router';
import { renderHome } from './pages/home';
import { renderChapter, renderNotFound } from './pages/chapter';
import { renderExperiments } from './pages/experiment';

initTheme();

const app = document.getElementById('app') as HTMLElement;
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#/" aria-label="Davranış: ana sayfa"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">Davranış</span></a>
    <nav class="topnav" aria-label="Ana gezinti"><a href="#/">Bölümler</a><a href="#/deneyler">Deneyler</a></nav>
    <button class="theme-btn" type="button" id="theme-btn"></button>
  </header>
  <main id="main" tabindex="-1"></main>`;
const main = document.getElementById('main') as HTMLElement;
const themeBtn = document.getElementById('theme-btn') as HTMLButtonElement;

function syncThemeBtn(): void {
  const dark = effectiveTheme() === 'dark';
  themeBtn.textContent = dark ? 'Açık tema' : 'Koyu tema';
  themeBtn.setAttribute('aria-label', dark ? 'Açık temaya geç' : 'Koyu temaya geç');
}
themeBtn.addEventListener('click', () => { toggleTheme(); syncThemeBtn(); });
syncThemeBtn();

let cleanup: (() => void) | null = null;

function show(route: Route): void {
  // Önceki sayfanın simülasyonu (rAF, dinleyiciler) burada durdurulur.
  if (cleanup) { cleanup(); cleanup = null; }
  let title = content.book.titleTr;
  if (route.name === 'home') {
    cleanup = renderHome(main, content);
  } else if (route.name === 'chapter') {
    const ch = content.chapters.find((c) => c.id === route.id);
    title = ch ? `${ch.titleTr} · ${content.book.titleTr}` : `Bulunamadı · ${content.book.titleTr}`;
    cleanup = renderChapter(main, content, route.id, route.experiment);
  } else if (route.name === 'experiments') {
    title = `Deneyler · ${content.book.titleTr}`;
    cleanup = renderExperiments(main, content);
  } else {
    cleanup = renderNotFound(main, 'Aradığın sayfa yok.');
  }
  document.title = title;
  if (!(route.name === 'chapter' && route.experiment)) window.scrollTo(0, 0);
  (document.getElementById('page-title') as HTMLElement | null)?.focus({ preventScroll: true });
}

startRouter(show);
