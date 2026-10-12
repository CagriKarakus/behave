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


const SEG = 160;
const BW = 210;
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
function branchSvg(h: number, seed: number): string {
  const rnd = rng(seed);
  const n = Math.ceil(h / SEG) + 1;
  const stemPath = (x0: number, sign: number): string => {
    let d = `M${x0},0 Q${x0 + sign * 18},${SEG / 2} ${x0},${SEG}`;
    for (let i = 2; i <= n; i++) d += ` T${x0},${SEG * i}`;
    return d;
  };
  const vines = [
    { cls: 'br-stem', x0: 62, sign: 1, lag: 0, left: 54, right: 130 },
    { cls: 'br-stem br-stem2', x0: 138, sign: -1, lag: 110, left: 120, right: 56 },
  ];
  let out = '';
  for (const v of vines) {
    out += `<path class="${v.cls}" pathLength="1" data-lag="${v.lag}" d="${stemPath(v.x0, v.sign)}"/>`;
    const xAt = (y: number): number => v.x0 + v.sign * 9 * Math.sin((Math.PI * y) / SEG);
    let y = 70 + rnd() * 50;
    while (y < h + 20) {
      const dir = rnd() < 0.5 ? -1 : 1;
      const room = dir > 0 ? v.right : v.left;
      const L = room * (0.45 + rnd() * 0.55);
      const dy = 18 + rnd() * 40;
      const p0 = { x: xAt(y), y };
      const ex = p0.x + dir * L;
      const p1 = { x: p0.x + dir * L * 0.35, y: y + 4 + rnd() * 8 };
      const p2 = { x: p0.x + dir * L * 0.75, y: y + dy * 0.6 };
      const p3 = { x: ex, y: y + dy };
      const ly = y + v.lag;
      out += `<path class="br-twig" data-y="${f1(ly)}" pathLength="1" d="M${f1(p0.x)},${f1(p0.y)} C${f1(p1.x)},${f1(p1.y)} ${f1(p2.x)},${f1(p2.y)} ${f1(p3.x)},${f1(p3.y)}"/>`;
      // yapraklar
      for (const t of [0.35, 0.65]) {
        if (rnd() < 0.6) {
          const q = cubic(p0, p1, p2, p3, t);
          const ang = (dir > 0 ? -35 : -145) + (rnd() - 0.5) * 40;
          out += `<g transform="translate(${f1(q.x)} ${f1(q.y)}) rotate(${f1(ang)})"><path class="br-leaf br-bl" data-y="${f1(ly + dy * t + 20)}" d="M0,0 Q5,-5 12,0 Q5,5 0,0"/></g>`;
        }
      }
      // alt dalcık
      if (L > room * 0.6 && rnd() < 0.8) {
        const t = 0.55 + rnd() * 0.15;
        const q = cubic(p0, p1, p2, p3, t);
        const sd = rnd() < 0.5 ? -1 : 1;
        const sl = 22 + rnd() * 30;
        const sx = q.x + sd * sl;
        const sy = q.y + 14 + rnd() * 22;
        out += `<path class="br-twig" data-y="${f1(ly + dy * t)}" pathLength="1" d="M${f1(q.x)},${f1(q.y)} Q${f1(q.x + sd * sl * 0.4)},${f1(q.y + 2)} ${f1(sx)},${f1(sy)}"/>`;
        out += bloom(sx, sy, 3 + rnd() * 2.5, ly + dy * t + 40, rnd() < 0.35);
      }
      out += bloom(ex, p3.y, 4.5 + rnd() * 4.5, ly + dy + 30, rnd() < 0.2);
      y += 38 + rnd() * 70;
    }
  }
  return `<svg viewBox="0 0 ${BW} ${h}" width="${BW}" height="${h}" focusable="false">${out}<circle class="br-tip" r="5"/></svg>`;
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
      <div class="branch branch-l" data-branch aria-hidden="true"></div>
      <div class="branch branch-r" data-branch aria-hidden="true"></div>
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
  const branches = [...el.querySelectorAll<HTMLElement>('[data-branch]')];
  type Item = { el: SVGElement; y: number; k: number; bl: boolean };
  type Built = { stems: { el: SVGPathElement; lag: number }[]; items: Item[]; tip: SVGCircleElement | null };
  const built = new Map<HTMLElement, Built>();
  let builtH = 0;
  /** Dallar: uç, ekranın ortasındaki konuma kadar uzar; bölüm geçilince tam boyda kalır, yukarı çıkınca geri çekilir. */
  const growBranches = (p: number, h: number): void => {
    if (!branches.length || h < 1) return;
    if (Math.abs(h - builtH) > 1) {
      builtH = h;
      branches.forEach((b, i) => {
        b.innerHTML = branchSvg(Math.round(h), i === 0 ? 7 : 29);
        built.set(b, {
          stems: [...b.querySelectorAll<SVGPathElement>('.br-stem')].map((e) => ({ el: e, lag: Number(e.dataset.lag) || 0 })),
          items: [...b.querySelectorAll<SVGElement>('.br-twig, .br-bl')].map((e) => ({ el: e, y: Number(e.dataset.y), k: -1, bl: e.classList.contains('br-bl') })),
          tip: b.querySelector<SVGCircleElement>('.br-tip'),
        });
      });
    }
    const tipY = p * h;
    for (const b of branches) {
      const st = built.get(b);
      if (!st) continue;
      for (const s of st.stems) s.el.style.strokeDashoffset = String(1 - clamp01((tipY - s.lag) / h));
      const main = st.stems[0]?.el;
      if (st.tip) {
        let pt: { x: number; y: number } | null = null;
        try { pt = main && typeof main.getPointAtLength === 'function' ? main.getPointAtLength(main.getTotalLength() * p) : null; } catch { pt = null; }
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
    growBranches(Math.min(1, Math.max(0, (innerHeight * 0.5 - r.top) / Math.max(1, r.height))), r.height);
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
