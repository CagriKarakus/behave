import type { ChapterMeta, ContentIndex } from '../content/types';
import { CONF_DOTS, chapterLabel } from '../content/normalize';
import { html, raw, type Safe } from '../lib/html';
import { getLocale } from '../i18n/locale';
import { t, tn } from '../i18n/t';
import type { MsgKey } from '../i18n/messages';
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
        ${hasSim ? raw(`<span class="badge badge-sim">${tn('home.simCount', simCount)}</span>`) : ''}
      </span>
      <span class="ch-card-title">${c.titleTr}</span>
      ${c.titleEn ? html`<span class="ch-card-en" lang="en">${c.titleEn}</span>` : ''}
      <span class="ch-card-meta">
        ${c.timescale ? html`<span class="badge">${c.timescale}</span>` : ''}
        ${c.confidence ? html`<span class="badge badge-conf" title="${t('home.confTitle', { c: t(`conf.${c.confidence}` as MsgKey) })}"><span aria-hidden="true">${CONF_DOTS[c.confidence]}</span> ${t('conf.label', { c: t(`conf.${c.confidence}` as MsgKey) })}</span>` : ''}
      </span>
    </a>
  </li>`;
}


const SEG = 160;
/** Eksende küçük (soluk) çizilen işaretler: 1 gün, 1 ay, 100 yıl. */
const MINOR_TICKS = new Set(['d', 'mo', '100yr']);
const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));
const f1 = (n: number): string => n.toFixed(1);

/** Küçük, tekrarlanabilir rastgele sayı üreteci (her yenilemede aynı dal çıkar). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

type Pt = { x: number; y: number };
const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return { x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x, y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y };
};

/**
 * Kenar dalı: iki iç içe geçen dalgalı gövde, düzensiz aralıklı dalcıklar, alt dalcıklar, yapraklar ve
 * farklı boyda çiçekler/tomurcuklar. `data-y` her öğenin hangi yükseklikte belirdiğini söyler.
 */
function branchSvg(h: number, w: number, seed: number): string {
  const rnd = rng(seed);
  const n = Math.max(1, Math.ceil(h / SEG));
  const total = SEG * n;
  const stemPath = (x0: number, sign: number): string => {
    let d = `M${f1(x0)},0 Q${f1(x0 + sign * 18)},${SEG / 2} ${f1(x0)},${SEG}`;
    for (let i = 2; i <= n; i++) d += ` T${f1(x0)},${SEG * i}`;
    return d;
  };
  // Gövdeler yan yana şeritlerde ilerler; dalcıklar kendi şeridinde kalır, böylece birbirine karışmaz.
  const count = Math.min(4, Math.max(2, Math.round(w / 130)));
  const lane = w / count;
  const room = lane * 0.4;
  const lags = [0, 110, 45, 150];
  let out = '';
  for (let i = 0; i < count; i++) {
    const x0 = lane * (i + 0.5);
    const sign = i % 2 === 0 ? 1 : -1;
    const lag = lags[i] ?? 0;
    out += `<path class="br-stem${i ? ' br-stem2' : ''}" pathLength="1" data-lag="${lag}" data-total="${total}" d="${stemPath(x0, sign)}"/>`;
    const xAt = (y: number): number => x0 + sign * 9 * Math.sin((Math.PI * y) / SEG);
    let y = 50 + rnd() * 60;
    while (y < h) {
      const dir = rnd() < 0.5 ? -1 : 1;
      const L = room * (0.5 + rnd() * 0.5);
      const dy = 18 + rnd() * 36;
      const p0 = { x: xAt(y), y };
      const ex = p0.x + dir * L;
      const p1 = { x: p0.x + dir * L * 0.35, y: y + 4 + rnd() * 8 };
      const p2 = { x: p0.x + dir * L * 0.75, y: y + dy * 0.6 };
      const p3 = { x: ex, y: Math.min(h - 6, y + dy) };
      const ly = y + lag;
      out += `<path class="br-twig" data-y="${f1(ly)}" pathLength="1" d="M${f1(p0.x)},${f1(p0.y)} C${f1(p1.x)},${f1(p1.y)} ${f1(p2.x)},${f1(p2.y)} ${f1(p3.x)},${f1(p3.y)}"/>`;
      for (const t of [0.35, 0.65]) {
        if (rnd() < 0.6) {
          const q = cubic(p0, p1, p2, p3, t);
          const ang = (dir > 0 ? -35 : -145) + (rnd() - 0.5) * 40;
          out += `<g transform="translate(${f1(q.x)} ${f1(q.y)}) rotate(${f1(ang)})"><path class="br-leaf br-bl" data-y="${f1(ly + dy * t + 20)}" d="M0,0 Q5,-5 12,0 Q5,5 0,0"/></g>`;
        }
      }
      if (L > room * 0.7 && rnd() < 0.7) {
        const t = 0.55 + rnd() * 0.15;
        const q = cubic(p0, p1, p2, p3, t);
        const sd = rnd() < 0.5 ? -1 : 1;
        const sl = room * (0.2 + rnd() * 0.25);
        const sx = q.x + sd * sl;
        const sy = Math.min(h - 6, q.y + 14 + rnd() * 20);
        out += `<path class="br-twig" data-y="${f1(ly + dy * t)}" pathLength="1" d="M${f1(q.x)},${f1(q.y)} Q${f1(q.x + sd * sl * 0.4)},${f1(q.y + 2)} ${f1(sx)},${f1(sy)}"/>`;
        out += bloom(sx, sy, 3 + rnd() * 2.5, ly + dy * t + 40, rnd() < 0.35);
      }
      out += bloom(ex, p3.y, 4.5 + rnd() * 4.5, ly + dy + 30, rnd() < 0.2);
      y += 40 + rnd() * 70;
    }
  }
  return `<svg viewBox="0 0 ${f1(w)} ${h}" width="${f1(w)}" height="${h}" focusable="false">${out}<circle class="br-tip" r="5"/></svg>`;
}

function bloom(x: number, y: number, r: number, at: number, bud: boolean): string {
  const pet = bud
    ? `<circle class="br-p" r="${f1(r * 0.7)}"/>`
    : `<circle class="br-p" r="${f1(r)}"/><circle class="br-p" cx="${f1(-r * 0.8)}" cy="${f1(-r * 0.7)}" r="${f1(r * 0.7)}"/><circle class="br-p" cx="${f1(r * 0.8)}" cy="${f1(-r * 0.8)}" r="${f1(r * 0.7)}"/><circle class="br-p" cx="${f1(r * 0.1)}" cy="${f1(r * 0.9)}" r="${f1(r * 0.6)}"/><circle class="br-c" r="${f1(r * 0.35)}"/>`;
  return `<g transform="translate(${f1(x)} ${f1(y)})"><g class="br-bl" data-y="${f1(at)}">${pet}</g></g>`;
}

export function renderHome(el: HTMLElement, content: ContentIndex): Page {
  const tl = buildTimeline(content.chapters);
  const ticks = tl.ticks;

  el.innerHTML = html`
  <div class="page home">
    <header class="hero">
      <p class="eyebrow">${content.book.author}${content.book.year ? ` · ${content.book.year}` : ''}</p>
      <h1 id="page-title" tabindex="-1">${content.book.titleTr}</h1>
      ${getLocale() === 'tr' ? html`<p class="hero-en" lang="en">${content.book.titleEn}</p>
      <p class="hero-note">${t('home.heroNote')}</p>` : ''}
      <p class="lede">${t('home.lede')}</p>
      ${noticeDismissed() ? '' : html`<aside class="notice" role="note" aria-labelledby="notice-h" data-notice>
        <div class="notice-body">
          <h2 id="notice-h" class="notice-h">${t('home.noticeTitle')}</h2>
          <p>${t('home.noticeBody')}</p>
          <p class="notice-links"><a href="#/deneyler">${t('home.noticeExperiments')}</a> <a href="#/deneyler?odak=durum">${t('home.noticeFilter')}</a></p>
        </div>
        <button type="button" class="notice-close" data-notice-close aria-label="${t('home.noticeCloseAria')}">${t('home.noticeClose')}</button>
      </aside>`}
      <p><a class="btn-link" href="#/deneyler">${t('home.allExperiments')}</a></p>
    </header>

    ${tl.stops.length ? html`
    <section class="timeline" aria-labelledby="tl-h">
      <div class="branch branch-l" data-branch aria-hidden="true"></div>
      <div class="branch branch-r" data-branch aria-hidden="true"></div>
      <h2 id="tl-h" class="sec-h">${t('home.timelineTitle')}</h2>
      <div class="axis" aria-hidden="true">
        <div class="axis-line"></div>
        ${ticks.map((tk, ti) => {
          const p = logPosition(tk.s, tl.minLog, tl.maxLog) * 100;
          return html`<span class="tick${MINOR_TICKS.has(tk.id) ? ' minor' : ''}${ti === ticks.length - 1 ? ' tick-last' : ''}${ti === 0 ? ' tick-first' : ''}" style="left:${p.toFixed(2)}%"><i></i><span>${tk.label}</span></span>`;
        })}
        ${tl.stops.map((s) => html`<span class="mark" style="left:${(s.pos * 100).toFixed(2)}%;--lane:${s.lane}" title="${s.label}"></span>`)}
      </div>
      <p class="axis-note">${t('home.axisNote')}</p>
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
      <h2 id="gr-h" class="sec-h">${t('home.groupsTitle')}</h2>
      <p class="muted">${t('home.groupsNote')}</p>
      ${tl.groups.map((g) => html`
      <div class="group">
        <h3 class="group-h">${g.title}</h3>
        <p class="muted group-blurb">${g.blurb}</p>
        <ul class="cards">${g.chapters.map(chapterCard)}</ul>
      </div>`)}
    </section>` : ''}

    ${tl.stops.length ? html`
    <aside class="meridian meridian-l" aria-hidden="true" data-meridian>
      <span class="mer-cap">${t('home.merTime')}</span>
      <i class="mer-rail"></i><i class="mer-fill"></i>
      ${ticks.map((tk) => html`<span class="mer-tick" style="top:${(logPosition(tk.s, tl.minLog, tl.maxLog) * 100).toFixed(2)}%"><b>${tk.label}</b><u></u></span>`)}
      <i class="mer-pin"></i>
    </aside>
    <aside class="meridian meridian-r" aria-hidden="true" data-meridian>
      <span class="mer-cap">${t('home.merStep')}</span>
      <i class="mer-rail"></i><i class="mer-fill"></i>
      ${tl.stops.map((st, i) => html`<span class="mer-stop" style="top:${(st.pos * 100).toFixed(2)}%;--lane:${st.lane}" title="${st.label}"><u></u><b>${i + 1}</b></span>`)}
      <i class="mer-pin"></i>
    </aside>` : ''}
  </div>`.value;

  // Kenar meridyenleri: zaman merdiveni bölümünde ne kadar ilerlendiğini gösterir.
  const meridians = [...el.querySelectorAll<HTMLElement>('[data-meridian]')];
  const section = el.querySelector<HTMLElement>('.timeline');
  const branches = [...el.querySelectorAll<HTMLElement>('[data-branch]')];
  type Item = { el: SVGElement; y: number; k: number; bl: boolean };
  type Built = { stems: { el: SVGPathElement; lag: number; total: number }[]; items: Item[]; tip: SVGCircleElement | null };
  const built = new Map<HTMLElement, Built>();
  let builtH = 0;
  let builtW = 0;
  /** Dallar: uç, ekranın ortasındaki konuma kadar uzar; bölüm geçilince tam boyda kalır, yukarı çıkınca geri çekilir. */
  const growBranches = (p: number, h: number, r: DOMRect): void => {
    if (!branches.length || h < 1) return;
    // Dallar, kenar cetveli ile içerik sütunu arasındaki boşluğu doldurur.
    const vw = document.documentElement.clientWidth;
    const w = Math.round(Math.min(560, Math.max(180, (r.left + r.width / 2) - 470 - 118)));
    branches[0].style.left = `${118 - r.left}px`;
    if (branches[1]) branches[1].style.right = `${118 - (vw - r.right)}px`;
    if (Math.abs(h - builtH) > 1 || w !== builtW) {
      builtH = h; builtW = w;
      branches.forEach((b, i) => {
        b.style.width = `${w}px`;
        b.innerHTML = branchSvg(Math.round(h), w, i === 0 ? 7 : 29);
        built.set(b, {
          stems: [...b.querySelectorAll<SVGPathElement>('.br-stem')].map((e) => ({ el: e, lag: Number(e.dataset.lag) || 0, total: Number(e.dataset.total) || h })),
          items: [...b.querySelectorAll<SVGElement>('.br-twig, .br-bl')].map((e) => ({ el: e, y: Number(e.dataset.y), k: -1, bl: e.classList.contains('br-bl') })),
          tip: b.querySelector<SVGCircleElement>('.br-tip'),
        });
      });
    }
    const tipY = p * h;
    for (const b of branches) {
      const st = built.get(b);
      if (!st) continue;
      for (const s of st.stems) s.el.style.strokeDashoffset = String(1 - clamp01((tipY - s.lag) / s.total));
      const main = st.stems[0]?.el;
      if (st.tip) {
        let pt: { x: number; y: number } | null = null;
        try { pt = main && typeof main.getPointAtLength === 'function' ? main.getPointAtLength(main.getTotalLength() * clamp01(tipY / (st.stems[0]?.total || h))) : null; } catch { pt = null; }
        st.tip.style.opacity = p > 0 && p < 1 && pt ? '1' : '0';
        if (pt) { st.tip.setAttribute('cx', String(pt.x)); st.tip.setAttribute('cy', String(pt.y)); }
      }
      for (const it of st.items) {
        const k = it.bl ? clamp01((tipY - it.y - 40) / 50) : clamp01((tipY - it.y) / 90);
        if (k === it.k) continue;
        it.k = k;
        if (it.bl) { it.el.style.opacity = String(k); it.el.style.transform = `scale(${0.2 + 0.8 * k})`; }
        else it.el.style.strokeDashoffset = String(1 - k);
      }
    }
  };
  let raf = 0;
  const sync = () => {
    raf = 0;
    if (!section) return;
    const r = section.getBoundingClientRect();
    growBranches(Math.min(1, Math.max(0, (innerHeight * 0.5 - r.top) / Math.max(1, r.height))), r.height, r);
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
