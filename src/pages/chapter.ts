import type { ChapterDetail, ChapterMeta } from '../content/types';
import type { ContentSource } from '../content';
import { CONF_DOTS, chapterLabel } from '../content/normalize';
import { html, raw, type Safe } from '../lib/html';
import { chapterHref } from '../lib/router';
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
export function renderChapter(el: HTMLElement, src: ContentSource, id: string, focusExp?: string): Page {
  const chapters = src.index.chapters;
  const idx = chapters.findIndex((c) => c.id === id);
  if (idx < 0) return renderNotFound(el, `“${id}” kimlikli bir bölüm yok.`);
  const c = chapters[idx];
  const sims = simsFor(c.id);
  const byId = new Map(chapters.map((x) => [x.id, x]));

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

    ${sims.length ? html`<aside class="ch-sim" aria-label="Simülasyon">
      ${sims.map((s, i) => html`<section class="sim-card" aria-labelledby="simh-${i}">
        <h2 id="simh-${i}" class="sim-title">${s.title}</h2>
        <p class="muted sim-blurb">${s.blurb}</p>
        <div class="sim-host" data-sim="${s.id}"></div>
      </section>`)}
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
  const cleanups: Array<() => void> = [];
  const slot = (name: string) => el.querySelector<HTMLElement>(`[data-slot="${name}"]`) as HTMLElement;

  // Simülasyonlar: kendi parçaları yüklenince bağlanır; sayfa o arada değişirse bağlanmaz.
  const simsReady = Promise.all(Array.from(el.querySelectorAll<HTMLElement>('.sim-host')).map(async (host, i) => {
    try {
      const mount = await sims[i].load();
      if (disposed) return;
      cleanups.push(mount(host));
    } catch (e) {
      console.error(e);
      if (!disposed) host.textContent = 'Simülasyon yüklenemedi.';
    }
  }));

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
      for (const f of cleanups.splice(0)) f();
      el.innerHTML = '';
    },
    ready: Promise.all([detailReady, simsReady]).then(() => (focusExp ? focusCard(focusExp) : false)),
    focusExperiment,
  };
}
