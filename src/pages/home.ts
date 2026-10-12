import type { ChapterMeta, ContentIndex } from '../content/types';
import { CONF_DOTS, chapterLabel } from '../content/normalize';
import { html, raw, type Safe } from '../lib/html';
import { chapterHref } from '../lib/router';
import { buildTimeline, formatDuration, logPosition } from '../lib/timeline';
import { simsFor } from '../sims/registry';
import { staticPage, type Page } from './page';

/** "Okumadan önce" kutusunun kapatma tercihi (yalnızca bu tarayıcıda). Depolama kısıtlıysa kutu her seferinde görünür. */
export const NOTICE_KEY = 'behave-notice-dismissed';
const noticeDismissed = (): boolean => { try { return localStorage.getItem(NOTICE_KEY) === '1'; } catch { return false; } };
const rememberDismissed = (): void => { try { localStorage.setItem(NOTICE_KEY, '1'); } catch { /* kısıtlı ortam */ } };

export function chapterCard(c: ChapterMeta): Safe {
  const simCount = simsFor(c.id).length;
  const hasSim = simCount > 0;
  return html`<li class="card-item">
    <a class="ch-card${hasSim ? ' has-sim' : ''}" href="${chapterHref(c.id)}">
      <span class="ch-card-top">
        <span class="ch-no">${chapterLabel(c)}</span>
        ${hasSim ? raw(`<span class="badge badge-sim">${simCount > 1 ? `${simCount} simülasyon` : 'Simülasyon'}</span>`) : ''}
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

export function renderHome(el: HTMLElement, content: ContentIndex): Page {
  const tl = buildTimeline(content.chapters);
  const ticks = tl.ticks;

  el.innerHTML = html`
  <div class="page home">
    <header class="hero">
      <p class="eyebrow">${content.book.author}${content.book.year ? ` · ${content.book.year}` : ''}</p>
      <h1 id="page-title" tabindex="-1">${content.book.titleTr}</h1>
      <p class="hero-en" lang="en">${content.book.titleEn}</p>
      <p class="hero-note">Türkçe ad önerilen çeviridir (resmî baskı adı doğrulanmadı).</p>
      <p class="lede">Sapolsky bir davranışı tek bir nedene bağlamaz: bir saniye öncesinden evrimsel geçmişe kadar geriye giden bir zaman merdiveni kurar. Aşağıdaki şerit bu merdiveni logaritmik ölçekte gösterir. Bir bölüme gir, özetini oku, varsa simülasyonla oyna.</p>
      ${noticeDismissed() ? '' : html`<aside class="notice" role="note" aria-labelledby="notice-h" data-notice>
        <div class="notice-body">
          <h2 id="notice-h" class="notice-h">Okumadan önce</h2>
          <p>Bu sitedeki içerik Sapolsky'nin Behave kitabından esinlenmiştir ve kitabın yerine geçmez. Özetler ve açıklamalar bizim yorumumuzdur. Simülasyonlar fikirleri kavramayı kolaylaştırmak için tasarlanmış basitleştirilmiş modellerdir; gösterdikleri sayılar kesin sonuçlar değildir. Kitapta anlatılan bazı deneyler sonradan tekrarlanamamış ya da tartışmalı hale gelmiştir; her deneyin kartında bilinen güncel durumu (sağlam, karışık, tartışmalı, bilinmiyor) yer alır. Güncel araştırmalar bu sonuçları değiştirebilir.</p>
          <p class="notice-links"><a href="#/deneyler">Deneyler sayfası</a> <a href="#/deneyler?odak=durum">Replikasyon durumuna göre süz</a></p>
        </div>
        <button type="button" class="notice-close" data-notice-close aria-label="“Okumadan önce” kutusunu kapat">Kapat</button>
      </aside>`}
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
        ${tl.stops.map((s) => html`<span class="mark" style="left:${(s.pos * 100).toFixed(2)}%;--lane:${s.lane}" title="${s.label}"></span>`)}
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

    ${tl.stops.length ? html`
    <aside class="meridian meridian-l" aria-hidden="true" data-meridian>
      <span class="mer-cap">Zaman</span>
      <i class="mer-rail"></i><i class="mer-fill"></i>
      ${ticks.map((t) => html`<span class="mer-tick" style="top:${(logPosition(t.s, tl.minLog, tl.maxLog) * 100).toFixed(2)}%"><b>${t.label}</b><u></u></span>`)}
      <i class="mer-pin"></i>
    </aside>
    <aside class="meridian meridian-r" aria-hidden="true" data-meridian>
      <span class="mer-cap">Basamak</span>
      <i class="mer-rail"></i><i class="mer-fill"></i>
      ${tl.stops.map((st, i) => html`<span class="mer-stop" style="top:${(st.pos * 100).toFixed(2)}%;--lane:${st.lane}" title="${st.label}"><u></u><b>${i + 1}</b></span>`)}
      <i class="mer-pin"></i>
    </aside>` : ''}
  </div>`.value;

  // Kenar meridyenleri: zaman merdiveni bölümünde ne kadar ilerlendiğini gösterir.
  const meridians = [...el.querySelectorAll<HTMLElement>('[data-meridian]')];
  const section = el.querySelector<HTMLElement>('.timeline');
  let raf = 0;
  const sync = () => {
    raf = 0;
    if (!section) return;
    const r = section.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.5 - r.top) / Math.max(1, r.height)));
    // Yalnızca zaman merdiveni bölümü ekranın ortasındayken görünür.
    const shown = r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.45;
    for (const m of meridians) { m.style.setProperty('--p', p.toFixed(4)); m.classList.toggle('on', shown); }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(sync); };
  if (meridians.length) {
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    sync();
  }

  const box = el.querySelector<HTMLElement>('[data-notice]');
  const closeBtn = el.querySelector<HTMLButtonElement>('[data-notice-close]');
  const onClose = () => {
    rememberDismissed();
    box?.remove();
    (document.getElementById('page-title') as HTMLElement | null)?.focus({ preventScroll: true });
  };
  closeBtn?.addEventListener('click', onClose);

  return staticPage(() => {
    closeBtn?.removeEventListener('click', onClose);
    removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll);
    if (raf) cancelAnimationFrame(raf);
    el.innerHTML = '';
  });
}
