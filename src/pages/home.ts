import type { Chapter, Content } from '../content/types';
import { chapterLabel } from '../content/normalize';
import { html, raw, type Safe } from '../lib/html';
import { chapterHref } from '../lib/router';
import { AXIS_TICKS, buildTimeline, formatDuration, logPosition } from '../lib/timeline';
import { simsFor } from '../sims/registry';

const CONF_DOTS = { 'yüksek': '●●●', 'orta': '●●○', 'düşük': '●○○' } as const;

export function chapterCard(c: Chapter): Safe {
  const hasSim = simsFor(c.id).length > 0;
  return html`<li class="card-item">
    <a class="ch-card${hasSim ? ' has-sim' : ''}" href="${chapterHref(c.id)}">
      <span class="ch-card-top">
        <span class="ch-no">${chapterLabel(c)}</span>
        ${hasSim ? raw('<span class="badge badge-sim">Simülasyon</span>') : ''}
      </span>
      <span class="ch-card-title">${c.titleTr}</span>
      ${c.titleEn ? html`<span class="ch-card-en" lang="en">${c.titleEn}</span>` : ''}
      <span class="ch-card-meta">
        ${c.timescale ? html`<span class="badge">${c.timescale}</span>` : ''}
        ${c.confidence ? html`<span class="badge badge-conf" title="İçerik güven düzeyi: ${c.confidence}"><span aria-hidden="true">${CONF_DOTS[c.confidence]}</span> Güven: ${c.confidence}</span>` : ''}
      </span>
    </a>
  </li>`;
}

export function renderHome(el: HTMLElement, content: Content): () => void {
  const tl = buildTimeline(content.chapters);
  const ticks = AXIS_TICKS.filter((t) => Math.log10(t.s) <= tl.maxLog + 0.05);

  el.innerHTML = html`
  <div class="page home">
    <header class="hero">
      <p class="eyebrow">${content.book.author}${content.book.year ? ` · ${content.book.year}` : ''}</p>
      <h1 id="page-title" tabindex="-1">${content.book.titleTr}</h1>
      <p class="hero-en" lang="en">${content.book.titleEn}</p>
      <p class="lede">Sapolsky bir davranışı tek bir nedene bağlamaz: bir saniye öncesinden evrimsel geçmişe kadar geriye giden bir zaman merdiveni kurar. Aşağıdaki şerit bu merdiveni logaritmik ölçekte gösterir. Bir bölüme gir, özetini oku, varsa simülasyonla oyna.</p>
      <p><a class="btn-link" href="#/deneyler">Kitaptaki deneylerin listesi →</a></p>
    </header>

    ${tl.stops.length ? html`
    <section class="timeline" aria-labelledby="tl-h">
      <h2 id="tl-h" class="sec-h">Zaman merdiveni: davranıştan geriye</h2>
      <div class="axis" aria-hidden="true">
        <div class="axis-line"></div>
        ${ticks.map((t, ti) => {
          const p = logPosition(t.s, tl.minLog, tl.maxLog) * 100;
          return html`<span class="tick${['1 ay', '100 yıl', '1 gün'].includes(t.label) ? ' minor' : ''}${ti === ticks.length - 1 ? ' tick-last' : ''}${ti === 0 ? ' tick-first' : ''}" style="left:${p.toFixed(2)}%"><i></i><span>${t.label}</span></span>`;
        })}
        ${tl.stops.map((s) => html`<span class="mark" style="left:${(s.pos * 100).toFixed(2)}%" title="${s.label}"></span>`)}
      </div>
      <p class="axis-note">Şerit logaritmiktir: soldaki bir saniye, sağdaki evrimsel zaman. Dikey sıra davranıştan geriye doğrudur.</p>
      <ol class="stops">
        ${tl.stops.map((s, i) => html`
        <li class="stop">
          <div class="stop-head">
            <span class="stop-dot" aria-hidden="true">${i + 1}</span>
            <h3 class="stop-label">${s.label}</h3>
            <span class="stop-dur">≈ ${formatDuration(s.seconds)}</span>
          </div>
          <ul class="cards">${s.chapters.map(chapterCard)}</ul>
        </li>`)}
      </ol>
    </section>` : ''}

    ${tl.groups.length ? html`
    <section class="groups" aria-labelledby="gr-h">
      <h2 id="gr-h" class="sec-h">Zaman ölçeği olmayan bölümler</h2>
      <p class="muted">Bu bölümler tek bir zaman basamağına oturmaz; konularına göre gruplandı.</p>
      ${tl.groups.map((g) => html`
      <div class="group">
        <h3 class="group-h">${g.title}</h3>
        <p class="muted group-blurb">${g.blurb}</p>
        <ul class="cards">${g.chapters.map(chapterCard)}</ul>
      </div>`)}
    </section>` : ''}

    <p class="foot-note">Bu uygulama bir inceleme aracıdır; kitabın yerini tutmaz. Simülasyonlar nitel modellerdir: sayılar ölçüm değildir, ilişkilerin yönünü gösterir.</p>
  </div>`.value;

  return () => { el.innerHTML = ''; };
}
