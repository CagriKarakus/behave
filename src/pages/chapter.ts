import type { Chapter, Content } from '../content/types';
import { chapterLabel } from '../content/normalize';
import { html, raw, type Safe } from '../lib/html';
import { chapterHref } from '../lib/router';
import { simsFor } from '../sims/registry';
import { experimentCard } from './experiment';

const CONF_DOTS = { 'yüksek': '●●●', 'orta': '●●○', 'düşük': '●○○' } as const;

const paragraphs = (s: string): Safe => html`${s.split(/\n{2,}/).filter((p) => p.trim()).map((p) => html`<p>${p}</p>`)}`;

function navLink(c: Chapter | undefined, dir: 'prev' | 'next'): Safe {
  if (!c) return html`<span class="nav-link nav-empty"></span>`;
  return html`<a class="nav-link nav-${dir}" href="${chapterHref(c.id)}" rel="${dir}">
    <span class="nav-dir">${dir === 'prev' ? '← Önceki' : 'Sonraki →'}</span>
    <span class="nav-label">${chapterLabel(c)}</span>
    <span class="nav-title">${c.titleTr}</span>
  </a>`;
}

export function renderNotFound(el: HTMLElement, what: string): () => void {
  el.innerHTML = html`<div class="page narrow">
    <h1 id="page-title" tabindex="-1">Sayfa bulunamadı</h1>
    <p class="lede">${what}</p>
    <p><a class="btn-link" href="#/">← Tüm bölümlere dön</a></p>
  </div>`.value;
  return () => { el.innerHTML = ''; };
}

export function renderChapter(el: HTMLElement, content: Content, id: string, focusExp?: string): () => void {
  const idx = content.chapters.findIndex((c) => c.id === id);
  if (idx < 0) return renderNotFound(el, `“${id}” kimlikli bir bölüm yok.`);
  const c = content.chapters[idx];
  const sims = simsFor(c.id);
  const byId = new Map(content.chapters.map((x) => [x.id, x]));

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
      ${c.summary ? html`<div class="summary prose">${paragraphs(c.summary)}</div>` : ''}
    </header>

    ${sims.length ? html`<aside class="ch-sim" aria-label="Simülasyon">
      ${sims.map((s, i) => html`<section class="sim-card" aria-labelledby="simh-${i}">
        <h2 id="simh-${i}" class="sim-title">${s.title}</h2>
        <p class="muted sim-blurb">${s.blurb}</p>
        <div class="sim-host" data-sim="${s.id}"></div>
      </section>`)}
    </aside>` : ''}

    <div class="ch-rest">
      ${c.keyConcepts.length ? html`<section aria-labelledby="h-kav">
        <h2 id="h-kav" class="sec-h">Temel kavramlar</h2>
        <dl class="concepts">${c.keyConcepts.map((k) => html`<div class="concept"><dt>${k.term}</dt>${k.explanation ? html`<dd>${k.explanation}</dd>` : ''}</div>`)}</dl>
      </section>` : ''}

      ${c.experiments.length ? html`<section aria-labelledby="h-den">
        <h2 id="h-den" class="sec-h">Deneyler</h2>
        <div class="exp-list">${c.experiments.map((e) => experimentCard(e, c, false))}</div>
        <p><a class="btn-link" href="#/deneyler">Tüm deneyler →</a></p>
      </section>` : c.keyStudies.length ? html`<section aria-labelledby="h-cal">
        <h2 id="h-cal" class="sec-h">Öne çıkan çalışmalar</h2>
        <ul class="studies">${c.keyStudies.map((k) => html`<li><strong>${k.name}</strong>${k.finding ? html`<span>${k.finding}</span>` : ''}</li>`)}</ul>
      </section>` : ''}

      ${c.links.length ? html`<section aria-labelledby="h-bag">
        <h2 id="h-bag" class="sec-h">Bölümler arası bağlantılar</h2>
        <ul class="links">${c.links.map((l) => {
          const t = byId.get(l.to);
          return t
            ? html`<li><a href="${chapterHref(t.id)}"><span class="link-no">${chapterLabel(t)}</span> <span class="link-title">${t.titleTr}</span></a>${l.why ? html`<p>${l.why}</p>` : ''}</li>`
            : html`<li><span class="link-no">${l.to}</span>${l.why ? html`<p>${l.why}</p>` : ''}</li>`;
        })}</ul>
      </section>` : ''}

      ${!sims.length && c.simulationIdeas.length ? html`<section aria-labelledby="h-fik">
        <h2 id="h-fik" class="sec-h">Simülasyon fikirleri</h2>
        <ul class="ideas">${c.simulationIdeas.map((s) => html`<li class="idea">
          <span class="badge badge-soon">Yakında</span>
          <h3>${s.title}</h3>
          ${s.shows ? html`<p>${s.shows}</p>` : ''}
          ${s.inputs.length ? html`<p class="io"><span>Girdiler</span> ${s.inputs.join(' · ')}</p>` : ''}
          ${s.outputs.length ? html`<p class="io"><span>Çıktılar</span> ${s.outputs.join(' · ')}</p>` : ''}
        </li>`)}</ul>
      </section>` : ''}

      ${c.verifyNotes.length ? html`<details class="verify">
        <summary>Doğrulama notları (${c.verifyNotes.length})</summary>
        <ul>${c.verifyNotes.map((n) => html`<li>${n}</li>`)}</ul>
      </details>` : ''}

      <nav class="pager" aria-label="Bölümler arası gezinti">
        ${navLink(content.chapters[idx - 1], 'prev')}
        ${navLink(content.chapters[idx + 1], 'next')}
      </nav>
    </div>
  </article>`.value;

  const cleanups: Array<() => void> = [];
  el.querySelectorAll<HTMLElement>('.sim-host').forEach((host, i) => {
    cleanups.push(sims[i].mount(host));
  });
  if (focusExp) {
    const card = Array.from(el.querySelectorAll<HTMLElement>('.exp')).find((x) => x.dataset.exp === focusExp);
    if (card) {
      card.querySelector('details')?.setAttribute('open', '');
      card.classList.add('exp-target');
      requestAnimationFrame(() => card.scrollIntoView({ block: 'start' }));
    }
  }
  return () => {
    for (const f of cleanups) f();
    el.innerHTML = '';
  };
}
