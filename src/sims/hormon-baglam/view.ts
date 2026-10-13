import { f1, slider as baseSlider } from '../ui';
import type { RepStatus } from '../ui';
import '../sim.css';
import './view.css';
import { Scope, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  MATCHES, OFFERS, PARTNERS, O_BASE, S_BASE, T_BASE,
  beliefTable, betray, chronic, choice, describeO, describeS, describeT, empathy, gcLevel, habit, lieRate,
  meanOffer, minutesOf, perf, perfAcute, popOffers, prejudice, rejectRate, risk, sampleOffers, sliderOf, statusKept,
  transfer, vole, mean,
  type Belief, type Evidence, type OIn, type Route, type SIn, type TIn, type VoleIn,
} from './model';
import { mulberry32 } from '../rng';
import { money, pct, percent } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import type { MsgKey } from '../../i18n/messages';
import { L } from './text';
import type { BookEntry, Rep, Strings } from './text.tr';

type Tab = 't' | 'o' | 's';
const pc = (x: number): number => Math.round(x * 100);

const replLabel = (s: RepStatus): string => t(`repl.${s}` as MsgKey);
const REP: Rep = {
  plain: (s) => t('repl.badge', { s: replLabel(s) }),
  bold: (s) => t('repl.badge', { s: `<b>${replLabel(s)}</b>` }),
};

/** "Kitapta" kutusu: deney kimliklerine bağlantı + isteğe bağlı kavram satırı. */
function bookHtml(book: Record<string, BookEntry>, concept?: string): string {
  const li = Object.entries(book).map(([id, e]) => `<li><a href="#/bolum/${id.split('-')[0]}?deney=${id}">${e.text}</a>${e.tail(REP)}</li>`);
  if (concept) li.push(`<li>${concept}</li>`);
  return `<aside class="book" aria-label="${t('sim.book')}"><h3 class="sim-h">${t('sim.book')}</h3><ul>${li.join('')}</ul></aside>`;
}
const howHtml = (ps: string[]): string => `<details class="how"><summary>${t('sim.how')}</summary><div class="how-in">${ps.map((p) => `<p>${p}</p>`).join('')}</div></details>`;

const TEMPLATE = (id: string, X: Strings) => `
<div class="sim sim-hb">
  <p class="lede">${X.lede}</p>

  <div class="tabs" role="tablist" aria-label="${X.tabsAria}">
    <button class="tab" role="tab" id="${id}-tab-t" data-pane="t" aria-controls="${id}-p-t" aria-selected="true" type="button">${X.tabT}</button>
    <button class="tab" role="tab" id="${id}-tab-o" data-pane="o" aria-controls="${id}-p-o" aria-selected="false" tabindex="-1" type="button">${X.tabO}</button>
    <button class="tab" role="tab" id="${id}-tab-s" data-pane="s" aria-controls="${id}-p-s" aria-selected="false" tabindex="-1" type="button">${X.tabS}</button>
  </div>

  <div class="sim-bar" role="group" aria-label="${X.barAria}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- ===== Testosteron ===== -->
  <section class="pane" role="tabpanel" id="${id}-p-t" data-pane="t" aria-labelledby="${id}-tab-t">
    <div class="chips" data-ref="tChips" role="group" aria-label="${X.presetsAria}"></div>
    <div class="stage">
      <svg data-ref="tSvg" viewBox="0 0 360 190" role="img" aria-label="${X.t.svgAria}"></svg>
      <div class="legend"><span><i style="background:var(--amy)"></i>${X.t.legAtk}</span><span><i style="background:var(--gld)"></i>${X.t.legGen}</span><span><i style="background:var(--lesion)"></i>${X.t.legWit}</span></div>
    </div>
    <div class="readout" data-ref="tRead"></div>
    <section aria-label="${X.inputsH}"><h3 class="sim-h">${X.inputsH}</h3><div class="sliders" data-ref="tSl"></div><div class="ctls" data-ref="tCtl"></div></section>
    <section class="chart" aria-label="${X.t.chartSecAria}">
      <h3 class="sim-h">${X.t.chartH}</h3>
      <svg data-ref="tChart" viewBox="0 0 360 170" role="img" aria-label="${X.t.chartAria}"></svg>
      <div class="legend"><span data-ref="tLeg1"></span><span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 3"/></svg><span data-ref="tLeg2"></span></span></div>
    </section>
    <section class="card" aria-label="${X.t.ultSecAria}">
      <h3 class="sim-h">${X.t.ultH}</h3>
      <p class="note">${X.t.ultNote}</p>
      <svg data-ref="uSvg" viewBox="0 0 360 152" role="img" aria-label="${X.t.ultAria}"></svg>
      <p class="sl-hint" data-ref="uStat"></p>
      <div class="row"><button class="btn" type="button" data-ref="uAgain">${X.t.again}</button></div>
      <table class="tbl" data-ref="uTbl">
        <caption>${X.t.tblCap}</caption>
        <thead><tr><th></th><th scope="col">${X.t.colPlacebo}</th><th scope="col">${X.t.colT}</th></tr></thead>
        <tbody>
          <tr><th scope="row">${X.t.rowPlacebo}</th><td data-ref="c00"></td><td data-ref="c01"></td></tr>
          <tr><th scope="row">${X.t.rowT}</th><td data-ref="c10"></td><td data-ref="c11"></td></tr>
        </tbody>
      </table>
      <p class="sl-hint">${X.t.tblHint}</p>
    </section>
    ${howHtml(X.t.how)}
    ${bookHtml(X.t.book, X.t.concept)}
  </section>

  <!-- ===== Oksitosin ===== -->
  <section class="pane" role="tabpanel" id="${id}-p-o" data-pane="o" aria-labelledby="${id}-tab-o" hidden>
    <div class="chips" data-ref="oChips" role="group" aria-label="${X.presetsAria}"></div>
    <div class="warn" role="note">
      <p class="warn-h">${X.o.warnH(replLabel('tartışmalı'))}</p>
      <p>${X.o.warn(replLabel('karışık'))}</p>
    </div>
    <div class="stage">
      <svg data-ref="oSvg" viewBox="0 0 360 246" role="img" aria-label="${X.o.svgAria}"></svg>
      <div class="legend"><span><i style="background:var(--hyp)"></i>${X.o.legWith}</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="13" y1="0" x2="13" y2="10" stroke="var(--ink)" stroke-width="2.4"/></svg>${X.o.legWithout}</span></div>
    </div>
    <div class="readout" data-ref="oRead"></div>
    <section aria-label="${X.inputsH}"><h3 class="sim-h">${X.inputsH}</h3><div class="sliders" data-ref="oSl"></div><div class="ctls" data-ref="oCtl"></div></section>
    <section class="card" aria-label="${X.o.voleSecAria}">
      <h3 class="sim-h">${X.o.voleH}</h3>
      <p class="note">${X.o.voleNote}</p>
      <div class="chips" data-ref="vChips" role="group" aria-label="${X.o.voleSpeciesAria}"></div>
      <div class="sliders" data-ref="vSl"></div>
      <div class="meters" data-ref="vMet"></div>
      <p class="sl-hint">${X.o.voleHint}</p>
    </section>
    ${howHtml(X.o.how)}
    ${bookHtml(X.o.book)}
  </section>

  <!-- ===== Stres ===== -->
  <section class="pane" role="tabpanel" id="${id}-p-s" data-pane="s" aria-labelledby="${id}-tab-s" hidden>
    <div class="chips" data-ref="sChips" role="group" aria-label="${X.presetsAria}"></div>
    <div class="stage">
      <svg data-ref="sSvg" viewBox="0 0 360 196" role="img" aria-label="${X.s.svgAria}"></svg>
      <div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--pfc)" stroke-width="2.4"/></svg>${X.s.legAcute}</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--red)" stroke-width="2.4" stroke-dasharray="5 3"/></svg>${X.s.legChosen}</span></div>
    </div>
    <div class="stage">
      <svg data-ref="eSvg" viewBox="0 0 360 120" role="img" aria-label="${X.s.empathyAria}"></svg>
    </div>
    <div class="readout" data-ref="sRead"></div>
    <section aria-label="${X.inputsH}"><h3 class="sim-h">${X.inputsH}</h3><div class="sliders" data-ref="sSl"></div><div class="ctls" data-ref="sCtl"></div></section>
    <section class="card" aria-label="${X.s.riskSecAria}">
      <h3 class="sim-h">${X.s.riskH}</h3>
      <div class="meters" data-ref="rMet"></div>
      <p class="sl-hint">${X.s.riskHint}</p>
    </section>
    <section class="card" aria-label="${X.s.mSecAria}">
      <h3 class="sim-h">${X.s.mH}</h3>
      <div class="chips" data-ref="mChips" role="group" aria-label="${X.s.mChipsAria}"></div>
      <div class="meters" data-ref="mMet"></div>
      <p class="sl-hint">${X.s.mHint}</p>
    </section>
    ${howHtml(X.s.how)}
    ${bookHtml(X.s.book)}
  </section>

  <p class="foot">${X.foot}</p>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('hb');
  const X = L();
  container.innerHTML = TEMPLATE(id, X);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  /* ---------- Durum ---------- */
  let tab: Tab = 't';
  let T: TIn = { ...T_BASE };
  let O: OIn = { ...O_BASE };
  let V: VoleIn = { receptor: 0.85, vasopressin: 0.5 };
  let S: SIn = { ...S_BASE };
  let match = 0;
  let seed = 7;
  const syncers: Array<() => void> = [];

  /* ---------- Ortak yardımcılar ---------- */
  function slider(host: HTMLElement, key: string, name: string, hint: string, min: number, max: number,
    get: () => number, set: (v: number) => void, fmt: (v: number) => string, color: string): void {
    const h = baseSlider(scope, host, { id: `${id}-${key}`, name, hint, min, max, fmt, color, onInput: (v) => { set(v); refresh(true); } });
    syncers.push(() => h.set(get(), fmt(get())));
  }
  function chipGroup<V extends string>(host: HTMLElement, label: string, items: Array<[V, string]>, get: () => V, set: (v: V) => void): void {
    const w = document.createElement('div');
    w.className = 'ctl';
    w.innerHTML = `<p class="sl-name">${label}</p><div class="row" role="group" aria-label="${label}"></div>`;
    host.appendChild(w);
    const row = w.querySelector('.row')!;
    const btns = items.map(([v, t]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = t;
      scope.on(b, 'click', () => { set(v); refresh(true); });
      row.appendChild(b);
      return [v, b] as const;
    });
    syncers.push(() => { for (const [v, b] of btns) b.setAttribute('aria-pressed', String(get() === v)); });
  }
  function presets(host: HTMLElement, items: Array<[string, () => void]>): void {
    items.forEach(([t, fn]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = t;
      scope.on(b, 'click', () => { fn(); refresh(true); });
      host.appendChild(b);
    });
  }
  function readouts(host: HTMLElement, labels: string[]): HTMLElement[] {
    return labels.map((l) => {
      const d = document.createElement('div');
      d.className = 'ro';
      d.innerHTML = `<span class="k">${l}</span><span class="v"></span>`;
      host.appendChild(d);
      return d.querySelector('.v') as HTMLElement;
    });
  }
  interface Meter { set: (v: number, text: string, ghost?: number) => void; label: HTMLElement; wrap: HTMLElement }
  function meter(host: HTMLElement, label: string, color: string): Meter {
    const w = document.createElement('div');
    w.className = 'm';
    w.style.setProperty('--c', color);
    w.innerHTML = `<div class="m-top"><span></span><b></b></div><div class="track"><b></b><i hidden></i></div>`;
    w.querySelector('span')!.textContent = label;
    host.appendChild(w);
    const val = w.querySelector('.m-top b')!, fill = w.querySelector<HTMLElement>('.track b')!, gh = w.querySelector<HTMLElement>('.track i')!;
    return {
      wrap: w, label: w.querySelector('span')!,
      set: (v, text, ghost) => {
        val.textContent = text;
        fill.style.width = `${Math.max(0, Math.min(1, v)) * 100}%`;
        gh.hidden = ghost === undefined;
        if (ghost !== undefined) gh.style.left = `${Math.max(0, Math.min(1, ghost)) * 100}%`;
      },
    };
  }

  /* ---------- Üst çubuk göstergeleri ---------- */
  const barM = $('meters');
  const bm = [meter(barM, '', 'var(--ink)'), meter(barM, '', 'var(--ink)'), meter(barM, '', 'var(--ink)')];
  const BAR_COL: Record<Tab, string[]> = {
    t: ['var(--amy)', 'var(--gld)', 'var(--pfc)'],
    o: ['var(--hyp)', 'var(--pit)', 'var(--red)'],
    s: ['var(--pfc)', 'var(--dop)', 'var(--gld)'],
  };
  const BAR_DEF: Record<Tab, Array<[string, string]>> = {
    t: X.bar.t.map((l, i) => [l, BAR_COL.t[i]]),
    o: X.bar.o.map((l, i) => [l, BAR_COL.o[i]]),
    s: X.bar.s.map((l, i) => [l, BAR_COL.s[i]]),
  };
  function setBar(t: Tab, vals: Array<[number, string]>): void {
    bm.forEach((m, i) => {
      m.label.textContent = BAR_DEF[t][i][0];
      m.wrap.style.setProperty('--c', BAR_DEF[t][i][1]);
      m.set(vals[i][0], vals[i][1]);
    });
  }

  /* ---------- Sekmeler ---------- */
  const sayEl = $('say'), live = $('live');
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  function showTab(t: Tab, focus = false): void {
    tab = t;
    for (const b of tabBtns) {
      const on = b.dataset.pane === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const p of panes) p.hidden = p.dataset.pane !== t;
    refresh(false);
  }
  for (const b of tabBtns) {
    scope.on(b, 'click', () => showTab(b.dataset.pane as Tab));
    scope.on(b, 'keydown', (ev) => {
      const i = tabBtns.indexOf(b);
      const j = ev.key === 'ArrowRight' ? (i + 1) % tabBtns.length : ev.key === 'ArrowLeft' ? (i + tabBtns.length - 1) % tabBtns.length : -1;
      if (j >= 0) { ev.preventDefault(); showTab(tabBtns[j].dataset.pane as Tab, true); }
    });
  }
  const poke = scope.announcer(live, () => sayEl.textContent || '');

  /* =====================================================
     TESTOSTERON
     ===================================================== */
  presets($('tChips'), [
    [X.t.chip[0], () => { T = { ...T_BASE, dose: 1, challenge: false }; }],
    [X.t.chip[1], () => { T = { ...T_BASE, dose: 1, route: 'saldiri' }; }],
    [X.t.chip[2], () => { T = { ...T_BASE, dose: 1, route: 'comertlik' }; }],
    [X.t.chip[3], () => { T = { ...T_BASE, dose: 0, route: 'comertlik', belief: 'testosteron' }; }],
  ]);
  slider($('tSl'), 'dose', X.t.sDose, X.t.sDoseHint, 0, 100,
    () => pc(T.dose), (v) => { T.dose = v / 100; }, (v) => percent(String(v)), 'var(--pit)');
  slider($('tSl'), 'disp', X.t.sDisp, X.t.sDispHint, -100, 100,
    () => Math.round(T.disp * 100), (v) => { T.disp = v / 100; }, (v) => (v < -20 ? X.t.dispLo : v > 20 ? X.t.dispHi : X.t.dispMid), 'var(--edge)');
  chipGroup<'var' | 'yok'>($('tCtl'), X.t.ctlChallenge, [['var', X.t.yes], ['yok', X.t.no]],
    () => (T.challenge ? 'var' : 'yok'), (v) => { T.challenge = v === 'var'; });
  chipGroup<Route>($('tCtl'), X.t.ctlRoute, [['saldiri', X.t.routeAtk], ['comertlik', X.t.routeGen]],
    () => T.route, (v) => { T.route = v; });
  chipGroup<Belief>($('tCtl'), X.t.ctlBelief, [['plasebo', X.t.placebo], ['testosteron', X.t.testosterone]],
    () => T.belief, (v) => { T.belief = v; });
  const [tRoDefense, tRoRej, tRoLie] = readouts($('tRead'), [X.t.roDefense, X.t.roReject, X.t.roLie]);

  // Sahne
  const tSvg = $<SVGElement>('tSvg');
  const ROWS: Array<[keyof ReturnType<typeof choice>, string, string]> = [
    ['saldiri', X.t.rows[0], 'var(--amy)'], ['comertlik', X.t.rows[1], 'var(--gld)'], ['cekil', X.t.rows[2], 'var(--lesion)'],
  ];
  svg('rect', { x: 8, y: 8, width: 190, height: 22, rx: 11, fill: 'none', stroke: 'var(--edge)', 'stroke-width': 1.4 }, tSvg).setAttribute('data-k', 'pill');
  const tCtxTx = svgText(tSvg, { x: 18, y: 23, class: 't-cap' }, '');
  svg('circle', { cx: 56, cy: 108, r: 32, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.6 }, tSvg);
  const tAura = svg('circle', { cx: 56, cy: 108, r: 26, fill: 'var(--pit)', 'fill-opacity': 0 }, tSvg);
  svgText(tSvg, { x: 56, y: 112, class: 't-ink', 'text-anchor': 'middle' }, X.t.agent);
  const tHor = svgText(tSvg, { x: 56, y: 156, class: 't-cap', 'text-anchor': 'middle' }, '');
  const tRows = ROWS.map(([, label, col], i) => {
    const y = 66 + i * 52;
    const arrow = svg('path', { d: `M90,108 C120,108 130,${y} 166,${y}`, fill: 'none', stroke: col, 'stroke-linecap': 'round' }, tSvg);
    svgText(tSvg, { x: 172, y: y - 8, class: 't-ink' }, label);
    svg('rect', { x: 172, y: y - 2, width: 130, height: 9, rx: 4.5, fill: 'var(--line)' }, tSvg);
    const fill = svg('rect', { x: 172, y: y - 2, width: 0, height: 9, rx: 4.5, fill: col }, tSvg);
    const tx = svgText(tSvg, { x: 352, y: y + 7, class: 't-pct', 'text-anchor': 'end' }, '');
    return { arrow, fill, tx };
  });

  // Doz-yanıt grafiği
  const tChart = $<SVGElement>('tChart');
  const CX0 = 40, CX1 = 346, CT = 26, CB = 130;
  const cx = (v: number) => CX0 + (CX1 - CX0) * v, cy = (v: number) => CB - (CB - CT) * v;
  function gridXY(sv: SVGElement, xl: string, yl: string): void {
    for (const v of [0, 0.5, 1]) {
      svg('line', { class: 'grid', x1: CX0, x2: CX1, y1: cy(v), y2: cy(v) }, sv);
      svgText(sv, { x: CX0 - 6, y: cy(v) + 3, 'text-anchor': 'end' }, `${pc(v)}`);
      svgText(sv, { x: cx(v), y: CB + 14, 'text-anchor': 'middle' }, `${pc(v)}`);
    }
    svgText(sv, { x: (CX0 + CX1) / 2, y: CB + 30, 'text-anchor': 'middle' }, xl);
    svgText(sv, { x: 4, y: 8 }, yl);
  }
  const pathOf = (fn: (x: number) => number): string => Array.from({ length: 21 }, (_, k) => `${k ? 'L' : 'M'}${cx(k / 20).toFixed(1)},${cy(fn(k / 20)).toFixed(1)}`).join(' ');

  function drawTChart(): void {
    tChart.innerHTML = '';
    gridXY(tChart, X.t.xLabel, X.t.yLabel);
    const key = T.route === 'saldiri' ? 'saldiri' : 'comertlik';
    const col = T.route === 'saldiri' ? 'var(--amy)' : 'var(--gld)';
    const at = (ch: boolean) => (x: number) => choice({ ...T, dose: x, challenge: ch })[key];
    svg('path', { class: 'ln', d: pathOf(at(!T.challenge)), stroke: 'var(--muted)', 'stroke-dasharray': '6 4', 'stroke-width': 1.8 }, tChart);
    svg('path', { class: 'ln', d: pathOf(at(T.challenge)), stroke: col }, tChart);
    svg('circle', { cx: cx(T.dose), cy: cy(choice(T)[key]), r: 5, fill: col, stroke: 'var(--panel)', 'stroke-width': 2 }, tChart);
    $('tLeg1').innerHTML = `<i style="background:${col}"></i>${X.t.legMain(T.route === 'saldiri', T.challenge)}`;
    $('tLeg2').textContent = X.t.legOther(!T.challenge);
  }

  // Ultimatum histogramı
  const uSvg = $<SVGElement>('uSvg');
  const NSAMP = 24;
  function drawHist(): void {
    uSvg.innerHTML = '';
    const rnd = mulberry32(seed * 7919);
    const smp = sampleOffers(T, NSAMP, rnd);
    const p = popOffers(T);
    const BW = 50, X0 = 36, BASE = 116, DOT = 5, STEP = 11;
    OFFERS.forEach((o, j) => {
      const x = X0 + j * BW;
      const n = smp.filter((s) => s === o).length;
      for (let k = 0; k < n; k++) svg('circle', { cx: x + BW / 2, cy: BASE - DOT - 1 - k * STEP, r: DOT, fill: 'var(--pfc)' }, uSvg);
      svg('line', { x1: x + 6, x2: x + BW - 6, y1: BASE - p[j] * NSAMP * STEP, y2: BASE - p[j] * NSAMP * STEP, stroke: 'var(--ink)', 'stroke-width': 2.4 }, uSvg);
      svgText(uSvg, { x: x + BW / 2, y: BASE + 14, 'text-anchor': 'middle', class: 't-cap' }, o === 5 ? X.t.equal(money(5)) : money(o));
    });
    svg('line', { class: 'grid', x1: X0, x2: X0 + 6 * BW, y1: BASE, y2: BASE }, uSvg);
    svgText(uSvg, { x: X0 + 3 * BW, y: BASE + 30, 'text-anchor': 'middle', class: 't-cap' }, X.t.histX);
    const m = smp.reduce((a, b) => a + b, 0) / NSAMP;
    $('uStat').textContent = X.t.histStat(money(f1(m)), money(f1(mean(p))));
  }
  scope.on($('uAgain'), 'click', () => { seed++; drawHist(); poke(); });

  function renderT(): void {
    const c = choice(T);
    const mo = meanOffer(T);
    const p = popOffers(T);
    tCtxTx.textContent = T.challenge ? X.t.ctxOn : X.t.ctxOff;
    tSvg.querySelector('[data-k="pill"]')!.setAttribute('stroke-dasharray', T.challenge ? '0' : '4 3');
    tAura.setAttribute('fill-opacity', (0.75 * T.dose).toFixed(2));
    tHor.textContent = T.dose < 0.05 ? X.t.horNone : X.t.horShort(pct(T.dose));
    ROWS.forEach(([k], i) => {
      const v = c[k];
      tRows[i].fill.setAttribute('width', (130 * v).toFixed(1));
      tRows[i].tx.textContent = pct(v);
      tRows[i].arrow.setAttribute('stroke-width', (1 + 6 * v).toFixed(1));
      tRows[i].arrow.setAttribute('opacity', (0.3 + 0.7 * v).toFixed(2));
    });
    tRoDefense.textContent = T.challenge ? pct(statusKept(T)) : X.t.notAtRisk;
    tRoRej.textContent = pct(rejectRate(p));
    tRoLie.textContent = pct(lieRate(T));
    drawTChart();
    drawHist();
    const bt = beliefTable(T);
    bt.forEach((r, i) => r.forEach((v, j) => {
      const td = $(`c${i}${j}`);
      td.textContent = f1(v);
      td.classList.toggle('on', i === (T.dose > 0.05 ? 1 : 0) && j === (T.belief === 'testosteron' ? 1 : 0));
    }));
    setBar('t', [[c.saldiri, pct(c.saldiri)], [c.comertlik, pct(c.comertlik)], [mo / 5, money(f1(mo))]]);
    sayEl.textContent = X.t.say(describeT(T), money(f1(mo)), T.belief === 'testosteron');
  }

  /* =====================================================
     OKSİTOSİN
     ===================================================== */
  presets($('oChips'), [
    [X.o.chip[0], () => { O = { ...O_BASE, dose: 0 }; }],
    [X.o.chip[1], () => { O = { dose: 0.8, threat: 0.15, evidence: 'ozgun' }; }],
    [X.o.chip[2], () => { O = { dose: 0.8, threat: 0.85, evidence: 'ozgun' }; }],
    [X.o.chip[3], () => { O = { dose: 0.8, threat: 0.85, evidence: 'birlesik' }; }],
  ]);
  slider($('oSl'), 'odose', X.o.sDose, X.o.sDoseHint, 0, 100,
    () => pc(O.dose), (v) => { O.dose = v / 100; }, (v) => percent(String(v)), 'var(--hyp)');
  slider($('oSl'), 'thr', X.o.sThreat, X.o.sThreatHint, 0, 100,
    () => pc(O.threat), (v) => { O.threat = v / 100; }, (v) => percent(String(v)), 'var(--red)');
  chipGroup<Evidence>($('oCtl'), X.o.ctlEvidence, [['ozgun', X.o.evOriginal], ['birlesik', X.o.evPooled]],
    () => O.evidence, (v) => { O.evidence = v; });
  const [oRoBetray, oRoGap] = readouts($('oRead'), [X.o.roBetray, X.o.roGap]);

  const oSvg = $<SVGElement>('oSvg');
  svgText(oSvg, { x: 60, y: 14, class: 't-cap' }, X.o.caption);
  const oRows = PARTNERS.map((p, i) => {
    const b = 40 + i * 52;
    if (p === 'biz') { for (const dx of [-7, 0, 7]) svg('circle', { cx: 30 + dx, cy: b + 12, r: 8, fill: 'var(--hyp)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, oSvg); }
    else if (p === 'onlar') { for (const dx of [-7, 0, 7]) svg('rect', { x: 23 + dx, y: b + 5, width: 14, height: 14, rx: 2, fill: 'var(--pit)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, oSvg); }
    else if (p === 'yabanci') { svg('circle', { cx: 30, cy: b + 12, r: 11, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }, oSvg); svgText(oSvg, { x: 30, y: b + 17, 'text-anchor': 'middle', class: 't-ink' }, '?'); }
    else { svg('rect', { x: 19, y: b + 1, width: 22, height: 22, rx: 5, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6 }, oSvg); for (const [dx, dy] of [[-5, -5], [0, 0], [5, 5]]) svg('circle', { cx: 30 + dx, cy: b + 12 + dy, r: 2, fill: 'var(--ink)' }, oSvg); }
    svgText(oSvg, { x: 60, y: b + 2, class: 't-ink' }, X.o.partnerLabel(X.o.partners[p].name, X.o.partners[p].who));
    svg('rect', { x: 60, y: b + 10, width: 250, height: 12, rx: 6, fill: 'var(--line)' }, oSvg);
    const fill = svg('rect', { x: 60, y: b + 10, width: 0, height: 12, rx: 6, fill: p === 'biz' ? 'var(--hyp)' : p === 'onlar' ? 'var(--pit)' : 'var(--edge)' }, oSvg);
    const ghost = svg('line', { x1: 60, x2: 60, y1: b + 6, y2: b + 26, stroke: 'var(--ink)', 'stroke-width': 2.4 }, oSvg);
    const tx = svgText(oSvg, { x: 352, y: b + 21, class: 't-pct', 'text-anchor': 'end' }, '');
    return { fill, ghost, tx };
  });
  svgText(oSvg, { x: 60, y: 242, class: 't-cap' }, X.o.footnote);

  // Tarla faresi
  presets($('vChips'), [
    [X.o.voleChip[0], () => { V = { receptor: 0.85, vasopressin: 0.5 }; }],
    [X.o.voleChip[1], () => { V = { receptor: 0.15, vasopressin: 0.5 }; }],
    [X.o.voleChip[2], () => { V = { receptor: 0.85, vasopressin: 0.5 }; }],
  ]);
  slider($('vSl'), 'v1a', X.o.sV1a, X.o.sV1aHint, 0, 100,
    () => pc(V.receptor), (v) => { V.receptor = v / 100; }, (v) => percent(String(v)), 'var(--eff)');
  slider($('vSl'), 'avp', X.o.sAvp, X.o.sAvpHint, 0, 100,
    () => pc(V.vasopressin), (v) => { V.vasopressin = v / 100; }, (v) => percent(String(v)), 'var(--pit)');
  const vMet = [meter($('vMet'), X.o.mFamiliar, 'var(--gld)'), meter($('vMet'), X.o.mStranger, 'var(--lesion)')];

  function renderO(): void {
    const off: OIn = { ...O, dose: 0 };
    PARTNERS.forEach((p, i) => {
      const v = transfer(p, O) / 10, g = transfer(p, off) / 10;
      oRows[i].fill.setAttribute('width', (250 * v).toFixed(1));
      oRows[i].ghost.setAttribute('x1', String(60 + 250 * g)); oRows[i].ghost.setAttribute('x2', String(60 + 250 * g));
      oRows[i].tx.textContent = money(f1(transfer(p, O)));
    });
    oRoBetray.textContent = pct(betray(O));
    oRoGap.textContent = money(f1(transfer('biz', O) - transfer('onlar', O)));
    const vv = vole(V);
    vMet[0].set(vv.familiar, pct(vv.familiar));
    vMet[1].set(vv.stranger, pct(vv.stranger));
    setBar('o', [[transfer('biz', O) / 10, money(f1(transfer('biz', O)))], [transfer('onlar', O) / 10, money(f1(transfer('onlar', O)))], [prejudice(O), pct(prejudice(O))]]);
    sayEl.textContent = describeO(O) + (O.evidence === 'birlesik' ? ` ${X.o.pooledNote}` : '');
  }

  /* =====================================================
     STRES
     ===================================================== */
  presets($('sChips'), [
    [X.s.chip[0], () => { S = { ...S, sev: 0.4, minutes: 20 }; }],
    [X.s.chip[1], () => { S = { ...S, sev: 0.95, minutes: 20 }; }],
    [X.s.chip[2], () => { S = { ...S, sev: 0.4, minutes: 20160 }; }],
    [X.s.chip[3], () => { S = { ...S, sev: 0, minutes: 20 }; }],
  ]);
  const fmtDur = (m: number): string => (m < 60 ? X.s.dur.min(Math.round(m)) : m < 1440 ? X.s.dur.hour(Math.round(m / 60)) : m < 10080 ? X.s.dur.day(Math.round(m / 1440)) : X.s.dur.week(Math.round(m / 10080)));
  slider($('sSl'), 'sev', X.s.sSev, X.s.sSevHint, 0, 100,
    () => pc(S.sev), (v) => { S.sev = v / 100; }, (v) => percent(String(v)), 'var(--amy)');
  slider($('sSl'), 'dur', X.s.sDur, X.s.sDurHint, 0, 100,
    () => sliderOf(S.minutes), (v) => { S.minutes = minutesOf(v); }, (v) => fmtDur(minutesOf(v)), 'var(--dop)');
  chipGroup<'a' | 'k'>($('sCtl'), X.s.ctlGc, [['a', X.s.gcNormal], ['k', X.s.gcBlocked]],
    () => (S.block ? 'k' : 'a'), (v) => { S.block = v === 'k'; });
  chipGroup<'a' | 'k'>($('sCtl'), X.s.ctlDisplace, [['a', X.s.no], ['k', X.s.yes]],
    () => (S.displace ? 'k' : 'a'), (v) => { S.displace = v === 'k'; });
  const [sRoGc, sRoRisk, sRoClose] = readouts($('sRead'), [X.s.roGc, X.s.roGoal, X.s.roClose]);

  const mChips = $('mChips');
  const mBtns = MATCHES.map((mt, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = X.matches[mt.id];
    scope.on(b, 'click', () => { match = i; refresh(true); });
    mChips.appendChild(b);
    return b;
  });
  const mMet = meter($('mMet'), X.s.mMeter, 'var(--amy)');
  const rMet = [meter($('rMet'), X.s.riskMale, 'var(--pfc)'), meter($('rMet'), X.s.riskFemale, 'var(--pit)')];

  // Ters U
  const sSvg = $<SVGElement>('sSvg');
  function drawStress(): void {
    sSvg.innerHTML = '';
    for (const v of [0, 0.5, 1]) {
      svg('line', { class: 'grid', x1: CX0, x2: CX1, y1: cy(v), y2: cy(v) }, sSvg);
      svgText(sSvg, { x: CX0 - 6, y: cy(v) + 3, 'text-anchor': 'end' }, `${pc(v)}`);
    }
    [0.1, 0.4, 0.85].forEach((v, k) => svgText(sSvg, { x: cx(v), y: CB + 14, 'text-anchor': 'middle' }, X.s.levels[k]));
    svgText(sSvg, { x: (CX0 + CX1) / 2, y: CB + 32, 'text-anchor': 'middle' }, X.s.xLabel);
    svgText(sSvg, { x: 4, y: 8 }, X.s.yLabel);
    svg('path', { class: 'ln', d: pathOf((x) => perfAcute(x)), stroke: 'var(--pfc)' }, sSvg);
    if (chronic(S.minutes) > 0.02) svg('path', { class: 'ln', d: pathOf((x) => perf(x, S.minutes)), stroke: 'var(--red)', 'stroke-dasharray': '6 4' }, sSvg);
    const py = perf(S.sev, S.minutes);
    svg('line', { x1: cx(S.sev), x2: cx(S.sev), y1: cy(py), y2: CB, stroke: 'var(--muted)', 'stroke-dasharray': '2 3' }, sSvg);
    svg('circle', { cx: cx(S.sev), cy: cy(py), r: 5.5, fill: 'var(--ink)', stroke: 'var(--panel)', 'stroke-width': 2 }, sSvg);
  }
  // Empati
  const eSvg = $<SVGElement>('eSvg');
  svg('circle', { cx: 180, cy: 58, r: 22, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.6 }, eSvg);
  svgText(eSvg, { x: 180, y: 62, class: 't-ink', 'text-anchor': 'middle' }, X.s.agent);
  const eNodes = [{ x: 44, t: X.s.near, col: 'var(--hyp)' }, { x: 316, t: X.s.stranger, col: 'var(--pit)' }].map((n, i) => {
    const line = svg('line', { x1: i ? 204 : 156, x2: i ? 284 : 76, y1: 58, y2: 58, stroke: n.col, 'stroke-linecap': 'round' }, eSvg);
    if (i) svg('rect', { x: n.x - 14, y: 44, width: 28, height: 28, rx: 5, fill: 'var(--panel)', stroke: n.col, 'stroke-width': 1.8, 'stroke-dasharray': '4 3' }, eSvg);
    else svg('circle', { cx: n.x, cy: 58, r: 16, fill: 'var(--panel)', stroke: n.col, 'stroke-width': 1.8 }, eSvg);
    svgText(eSvg, { x: n.x, y: 96, class: 't-cap', 'text-anchor': 'middle' }, n.t);
    const tx = svgText(eSvg, { x: i ? 248 : 112, y: 44, class: 't-pct', 'text-anchor': 'middle' }, '');
    return { line, tx };
  });
  svgText(eSvg, { x: 180, y: 114, class: 't-cap', 'text-anchor': 'middle' }, X.s.lineNote);

  function renderS(): void {
    const em = empathy(S), rk = risk(S.sev), r0 = risk(0);
    drawStress();
    eNodes[0].line.setAttribute('stroke-width', (1 + 9 * em.yakin).toFixed(1));
    eNodes[1].line.setAttribute('stroke-width', (1 + 9 * em.yabanci).toFixed(1));
    eNodes[0].tx.textContent = pct(em.yakin);
    eNodes[1].tx.textContent = pct(em.yabanci);
    sRoGc.textContent = S.displace ? X.s.gcDisplacing(pct(gcLevel(S))) : pct(gcLevel(S));
    sRoRisk.textContent = pct(1 - habit(S.sev, S.minutes));
    sRoClose.textContent = pct(em.yakin);
    rMet[0].set(rk.erkek, pct(rk.erkek), r0.erkek);
    rMet[1].set(rk.kadin, pct(rk.kadin), r0.kadin);
    mBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === match)));
    mMet.set(MATCHES[match].up / 25, MATCHES[match].up ? X.s.mUp(percent(String(MATCHES[match].up))) : X.s.mNone);
    setBar('s', [[perf(S.sev, S.minutes), pct(perf(S.sev, S.minutes))], [habit(S.sev, S.minutes), pct(habit(S.sev, S.minutes))], [em.yabanci, pct(em.yabanci)]]);
    sayEl.textContent = describeS(S) + (S.block ? ` ${X.s.blocked}` : '');
  }

  /* ---------- Çizim döngüsü yerine olay tabanlı yenileme ---------- */
  function refresh(user: boolean): void {
    for (const s of syncers) s();
    if (tab === 't') renderT(); else if (tab === 'o') renderO(); else renderS();
    if (user) poke();
  }

  /* ---------- Rehberli tur ---------- */
  const go = (t: Tab, fn: () => void) => () => { fn(); showTab(t); };
  const tr = X.tour;
  const tour = createTour(scope, [
    { ...tr.s1, apply: go('t', () => { T = { ...T_BASE, dose: 1, challenge: false }; }) },
    { ...tr.s2, apply: go('t', () => { T = { ...T_BASE, dose: 1, route: 'saldiri' }; }) },
    { ...tr.s3, apply: go('t', () => { T = { ...T_BASE, dose: 1, route: 'comertlik' }; }) },
    { ...tr.s4, apply: go('t', () => { T = { ...T_BASE, dose: 0, route: 'comertlik', belief: 'testosteron' }; }) },
    { title: tr.s5.title, text: tr.s5.text(replLabel('tartışmalı')), look: tr.s5.look, apply: go('o', () => { O = { dose: 0.8, threat: 0.85, evidence: 'ozgun' }; }) },
    { ...tr.s6, apply: go('s', () => { S = { ...S_BASE, sev: 0.4, minutes: 20 }; match = 2; }) },
  ]);
  root.querySelector('.lede')!.after(tour.el);

  showTab('t');

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
