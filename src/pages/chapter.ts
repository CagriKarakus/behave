import type { ChapterDetail, ChapterMeta } from '../content/types';
import type { ContentSource } from '../content';
import { CONF_DOTS, chapterLabel } from '../content/normalize';
import { html, raw, type Safe } from '../lib/html';
import { chapterHref, withSim } from '../lib/router';
import { enhanceSimBar } from '../sims/bar';
import { simsFor } from '../sims/registry';
import { experimentCard } from './experiment';
import { staticPage, type Page } from './page';

const paragraphs = (s: string): Safe => html`${s.split(/\n{2,}/).filter((p) => p.trim()).map((p) => html`<p>${p}</p>`)}`;

function navLink(c: ChapterMeta | undefined, dir: 'prev' | 'next'): Safe {
  if (!c) return html`<span class="nav-link nav-empty"></span>`;
  return html`<a class="nav-link nav-${dir}" href="${chapterHref(c.id)}" rel="${dir}">
    <span class="nav-dir">${dir === 'prev' ? '← Önceki' : 'Sonraki →'}</span>
    <span class="nav-label">${chapterLabel(c)}</span>
    <span class="nav-title">${c.titleTr}</span>
  </a>`;
}

export function renderNotFound(el: HTMLElement, what: string): Page {
  el.innerHTML = html`<div class="page narrow">
    <h1 id="page-title" tabindex="-1">Sayfa bulunamadı</h1>
    <p class="lede">${what}</p>
    <p><a class="btn-link" href="#/">← Tüm bölümlere dön</a></p>
  </div>`.value;
  return staticPage(() => { el.innerHTML = ''; });
}

/** Bölümün ayrıntı kısmı (özet hariç): içerik yüklenince `.ch-rest` içine yazılır. */
function restHtml(c: ChapterMeta, d: ChapterDetail, hasSim: boolean, byId: Map<string, ChapterMeta>): Safe {
  return html`
      ${d.keyConcepts.length ? html`<section aria-labelledby="h-kav">
        <h2 id="h-kav" class="sec-h">Temel kavramlar</h2>
        <dl class="concepts">${d.keyConcepts.map((k) => html`<div class="concept"><dt>${k.term}</dt>${k.explanation ? html`<dd>${k.explanation}</dd>` : ''}</div>`)}</dl>
      </section>` : ''}

      ${d.experiments.length ? html`<section aria-labelledby="h-den">
        <h2 id="h-den" class="sec-h">Deneyler</h2>
        <div class="exp-list">${d.experiments.map((e) => experimentCard(e, c, false))}</div>
        <p><a class="btn-link" href="#/deneyler">Tüm deneyler →</a></p>
      </section>` : d.keyStudies.length ? html`<section aria-labelledby="h-cal">
        <h2 id="h-cal" class="sec-h">Öne çıkan çalışmalar</h2>
        <ul class="studies">${d.keyStudies.map((k) => html`<li><strong>${k.name}</strong>${k.finding ? html`<span>${k.finding}</span>` : ''}</li>`)}</ul>
      </section>` : ''}

      ${d.links.length ? html`<section aria-labelledby="h-bag">
        <h2 id="h-bag" class="sec-h">Bölümler arası bağlantılar</h2>
        <ul class="links">${d.links.map((l) => {
          const t = byId.get(l.to);
          return t
            ? html`<li><a href="${chapterHref(t.id)}"><span class="link-no">${chapterLabel(t)}</span> <span class="link-title">${t.titleTr}</span></a>${l.why ? html`<p>${l.why}</p>` : ''}</li>`
            : html`<li><span class="link-no">${l.to}</span>${l.why ? html`<p>${l.why}</p>` : ''}</li>`;
        })}</ul>
      </section>` : ''}

      ${!hasSim && d.simulationIdeas.length ? html`<section aria-labelledby="h-fik">
        <h2 id="h-fik" class="sec-h">Simülasyon fikirleri</h2>
        <ul class="ideas">${d.simulationIdeas.map((s) => html`<li class="idea">
          <span class="badge badge-soon">Yakında</span>
          <h3>${s.title}</h3>
          ${s.shows ? html`<p>${s.shows}</p>` : ''}
          ${s.inputs.length ? html`<p class="io"><span>Girdiler</span> ${s.inputs.join(' · ')}</p>` : ''}
          ${s.outputs.length ? html`<p class="io"><span>Çıktılar</span> ${s.outputs.join(' · ')}</p>` : ''}
        </li>`)}</ul>
      </section>` : ''}

      ${d.verifyNotes.length ? html`<details class="verify">
        <summary>Doğrulama notları (${d.verifyNotes.length})</summary>
        <ul>${d.verifyNotes.map((n) => html`<li>${n}</li>`)}</ul>
      </details>` : ''}`;
}

/**
 * Bölüm sayfası. Başlık ve gezinti özetten hemen çizilir; metin, kavramlar ve deneyler bölüm
 * ayrıntısı yüklenince, simülasyon da kendi parçası yüklenince gelir.
 */
export function renderChapter(el: HTMLElement, src: ContentSource, id: string, focusExp?: string, simId?: string): Page {
  const chapters = src.index.chapters;
  const idx = chapters.findIndex((c) => c.id === id);
  if (idx < 0) return renderNotFound(el, `“${id}” kimlikli bir bölüm yok.`);
  const c = chapters[idx];
  const sims = simsFor(c.id);
  const byId = new Map(chapters.map((x) => [x.id, x]));
  // Geçersiz ya da eksik ?sim= ilk simülasyona düşer.
  const indexOf = (id?: string): number => Math.max(0, sims.findIndex((x) => x.id === id));
  const start = indexOf(simId);

  el.innerHTML = html`
  <article class="page chapter${sims.length ? ' has-sim' : ''}" aria-labelledby="page-title">
    <header class="ch-head">
      <a class="back" href="#/">← Tüm bölümler</a>
      <p class="eyebrow">${chapterLabel(c)}${c.timescale ? ` · ${c.timescale}` : ''}</p>
      <h1 id="page-title" tabindex="-1">${c.titleTr}</h1>
      ${c.titleEn ? html`<p class="hero-en" lang="en">${c.titleEn}</p>` : ''}
      <p class="badges">
        ${c.confidence ? html`<span class="badge badge-conf" title="İçerik güven düzeyi"><span aria-hidden="true">${CONF_DOTS[c.confidence]}</span> Güven: ${c.confidence}</span>` : ''}
        ${sims.length ? raw('<span class="badge badge-sim">Simülasyon var</span>') : ''}
      </p>
      <div class="summary prose" data-slot="summary"></div>
    </header>

    ${sims.length > 1 ? html`<aside class="ch-sim" aria-label="Simülasyon">
      <div class="sim-tabs" role="tablist" aria-label="Simülasyonlar">
        ${sims.map((s, i) => html`<button type="button" class="sim-tab" role="tab" id="simtab-${i}" data-sim-tab="${s.id}" aria-controls="simpanel"
          aria-selected="${i === start ? 'true' : 'false'}" tabindex="${i === start ? '0' : '-1'}">
          <span class="sim-tab-title">${s.title}</span>
          <span class="sim-tab-blurb">${s.blurb}</span>
        </button>`)}
      </div>
      <div class="sim-card" id="simpanel" role="tabpanel" aria-labelledby="simtab-${start}" tabindex="-1">
        <div class="sim-host" data-sim="${sims[start].id}"></div>
      </div>
    </aside>` : sims.length ? html`<aside class="ch-sim" aria-label="Simülasyon">
      <section class="sim-card" aria-labelledby="simh-0">
        <h2 id="simh-0" class="sim-title">${sims[0].title}</h2>
        <p class="muted sim-blurb">${sims[0].blurb}</p>
        <div class="sim-host" data-sim="${sims[0].id}"></div>
      </section>
    </aside>` : ''}

    <div class="ch-rest">
      <div data-slot="rest" class="ch-rest-body" aria-busy="true"><p class="muted" role="status">Yükleniyor…</p></div>
      <nav class="pager" aria-label="Bölümler arası gezinti">
        ${navLink(chapters[idx - 1], 'prev')}
        ${navLink(chapters[idx + 1], 'next')}
      </nav>
    </div>
  </article>`.value;

  let disposed = false;
  const slot = (name: string) => el.querySelector<HTMLElement>(`[data-slot="${name}"]`) as HTMLElement;

  // Yalnızca seçili simülasyon bağlanır; sekme değişince eskisi unmount edilir, yenisi dinamik yüklenir.
  // Sayfa ya da seçim o arada değişirse geç gelen yükleme bağlanmaz (`seq`).
  const host = el.querySelector<HTMLElement>('.sim-host');
  const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('.sim-tab'));
  let current = -1;
  let unmountSim: (() => void) | null = null;
  let seq = 0;

  const activate = async (i: number): Promise<void> => {
    if (!host || i === current) return;
    const my = ++seq;
    current = i;
    unmountSim?.(); unmountSim = null;
    host.replaceChildren();
    host.dataset.sim = sims[i].id;
    tabs.forEach((tb, k) => { tb.setAttribute('aria-selected', String(k === i)); tb.tabIndex = k === i ? 0 : -1; });
    el.querySelector('#simpanel')?.setAttribute('aria-labelledby', `simtab-${i}`);
    try {
      const mount = await sims[i].load();
      if (disposed || my !== seq) return;
      const unmount = mount(host);
      const offBar = enhanceSimBar(host);
      unmountSim = () => { offBar(); unmount(); };
    } catch (e) {
      console.error(e);
      if (!disposed && my === seq) host.textContent = 'Simülasyon yüklenemedi.';
    }
  };
  const simsReady = sims.length ? activate(start) : Promise.resolve();

  const choose = (i: number, focus: boolean): void => {
    if (focus) tabs[i].focus();
    if (i === current) return;
    try { history.replaceState(history.state, '', withSim(location.hash, c.id, sims[i].id)); } catch { /* kısıtlı ortam */ }
    void activate(i);
  };
  const onTabClick = (e: Event) => { const i = tabs.indexOf((e.target as HTMLElement).closest('.sim-tab') as HTMLButtonElement); if (i >= 0) choose(i, false); };
  const onTabKey = (e: KeyboardEvent) => {
    const i = tabs.indexOf(e.target as HTMLButtonElement);
    if (i < 0) return;
    const n = tabs.length;
    const next = e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowLeft' ? (i + n - 1) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    choose(next, true);
  };
  const tablist = el.querySelector('.sim-tabs');
  tablist?.addEventListener('click', onTabClick);
  tablist?.addEventListener('keydown', onTabKey as EventListener);

  const focusCard = (expId: string): boolean => {
    const cards = Array.from(el.querySelectorAll<HTMLElement>('.exp'));
    const card = cards.find((x) => x.dataset.exp === expId);
    for (const x of cards) x.classList.toggle('exp-target', x === card);
    if (!card) return false;
    card.querySelector('details')?.setAttribute('open', '');
    requestAnimationFrame(() => { if (!disposed) card.scrollIntoView({ block: 'start' }); });
    return true;
  };

  const detailReady = src.detail(c.id).then((d) => {
    if (disposed) return;
    const summary = slot('summary');
    summary.innerHTML = d.summary ? paragraphs(d.summary).value : '';
    summary.hidden = !d.summary;
    const rest = slot('rest');
    rest.innerHTML = restHtml(c, d, sims.length > 0, byId).value;
    rest.removeAttribute('aria-busy');
  }).catch((e) => {
    console.error(e);
    if (disposed) return;
    const rest = slot('rest');
    rest.innerHTML = '<p class="muted" role="alert">Bölüm içeriği yüklenemedi. Bağlantını denetleyip sayfayı yenile.</p>';
    rest.removeAttribute('aria-busy');
  });

  const focusExperiment = async (expId: string): Promise<boolean> => {
    await detailReady;
    return !disposed && focusCard(expId);
  };

  return {
    dispose() {
      disposed = true;
      seq++;
      unmountSim?.(); unmountSim = null;
      tablist?.removeEventListener('click', onTabClick);
      tablist?.removeEventListener('keydown', onTabKey as EventListener);
      el.innerHTML = '';
    },
    ready: Promise.all([detailReady, simsReady]).then(() => (focusExp ? focusCard(focusExp) : false)),
    focusExperiment,
    selectSim: sims.length > 1 ? async (id: string) => { if (!disposed) await activate(indexOf(id)); } : undefined,
  };
}
