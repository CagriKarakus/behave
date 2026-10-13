import { f2, pc, slider, repBadge } from '../ui';
import '../sim.css';
import './view.css';
import { Scope, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import { t } from '../../i18n/t';
import { num, percent } from '../../i18n/fmt';
import {
  CASES, FACTORS, LIBET, RESPS, RP_ONSET, SCH, artefactShare, clamp, clockAngle, defaultShares, evaluate,
  judgments, makePlayers, markAngle, outcome, punishStats, punishes, quadrant, quintiles, recommend, rpGap, rpLibet, runSchurger, sample,
  trueGap, vetoWindow, wFromAngles, wtp, type Resp, type SchParams, type SchRun,
} from './model';
import { L } from './text';
import type { Strings } from './text.tr';

type Tab = 'lib' | 'cok' | 'ceza';
type View = 'libet' | 'sch' | 'both';

const ms = (v: number): string => `${v < 0 ? '−' : ''}${Math.abs(Math.round(v))} ms`;
const FCOL = ['var(--pit)', 'var(--amy)', 'var(--dop)', 'var(--gld)', 'var(--pfc)', 'var(--lesion)'];

const sv = (w: number, h: number, inner: string): string => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
const lg = (...a: [string, string][]): string => `<div class="legend">${a.map(([i, t]) => `<span>${i}${t}</span>`).join('')}</div>`;
const line = (c: string, dash = ''): string => sv(26, 10, `<path d="M1 5H25" stroke="${c}" stroke-width="2.4"${dash}/>`);
const swatch = (c: string, o = 1): string => sv(16, 12, `<rect x="1" y="2" width="14" height="8" rx="2" fill="${c}" fill-opacity="${o}" stroke="${c}"/>`);
const dotS = (filled: boolean): string => sv(14, 12, `<circle cx="7" cy="6" r="4.4" fill="${filled ? 'var(--amy)' : 'none'}" stroke="${filled ? 'var(--amy)' : 'var(--edge)'}" stroke-width="1.5"/>`);


/** Sekme bölmesindeki "Kitapta" kutusu satırı: bağlantı + ayraç + öncül + replikasyon rozeti + ardıl. */
type BookT = Strings['book']['libet'];
const bookLi = (id: string, b: BookT, rep: Parameters<typeof repBadge>[0], tail = ''): string =>
  `<li><a href="#/bolum/ch16?deney=${id}">${b.cite}</a>${b.lead}${b.pre} ${repBadge(rep)}${b.sep}${b.post}${tail}</li>`;
const bookAside = (items: string): string => `<aside class="book" aria-label="${t('sim.book')}"><h3 class="sim-h">${t('sim.book')}</h3><ul>${items}</ul></aside>`;
const howBox = (ps: string[]): string =>
  `<details class="how"><summary>${t('sim.how')}</summary><div class="how-in">${ps.map((p) => `<p>${p}</p>`).join('')}</div></details>`;

const TEMPLATE = (id: string, T: Strings) => `
<div class="sim sim-ozg">
  <p class="lede">${T.lede}</p>
  <div class="tabs" role="tablist" aria-label="${T.tabsLabel}">
    <button class="tab" role="tab" id="${id}-tab-lib" data-pane="lib" aria-controls="${id}-pane-lib" aria-selected="true" type="button">${T.tabs.lib}</button>
    <button class="tab" role="tab" id="${id}-tab-cok" data-pane="cok" aria-controls="${id}-pane-cok" aria-selected="false" tabindex="-1" type="button">${T.tabs.cok}</button>
    <button class="tab" role="tab" id="${id}-tab-ceza" data-pane="ceza" aria-controls="${id}-pane-ceza" aria-selected="false" tabindex="-1" type="button">${T.tabs.ceza}</button>
  </div>

  <div class="sim-bar" role="group" aria-label="${T.outputsLabel}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- ============ 1 · Libet ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-lib" data-pane="lib" aria-labelledby="${id}-tab-lib">
    <div data-ref="tour1"></div>
    <section class="card" aria-label="${T.lib.clockCard}">
      <h3 class="sim-h">${T.lib.clockH}</h3>
      <p class="note" data-ref="clockNote"></p>
      <div class="chart"><svg viewBox="0 0 360 220" role="img" aria-label="${T.lib.clockSvgLabel}" data-ref="clock"></svg></div>
      ${lg([swatch('var(--pfc)'), T.lib.legendDot], [sv(14, 12, '<path d="M7 1L12.5 6L7 11L1.5 6z" fill="var(--dop)" stroke="var(--ink)" stroke-width="1"/>'), T.lib.legendW])}
      <div class="row"><button class="btn btn-go" type="button" data-ref="go">${T.lib.start}</button><button class="btn" type="button" data-ref="save" disabled>${T.lib.saveMark}</button></div>
      <div class="sliders" data-ref="wSl"></div>
      <p class="note" data-ref="tries"></p>
    </section>

    <section class="card" aria-label="${T.lib.rpCard}">
      <h3 class="sim-h">${T.lib.rpH}</h3>
      <div class="chips" role="group" aria-label="${T.lib.viewGroup}" data-ref="viewChips"></div>
      <div class="chart"><svg viewBox="0 0 360 214" role="img" aria-label="${T.lib.rpSvgLabel}" data-ref="rp"></svg></div>
      <div data-ref="rpKey"></div>
      <div class="sliders" data-ref="schSl"></div>
      <div class="row" data-ref="schRow"><button class="btn" type="button" data-ref="rerun">${T.lib.rerun}</button></div>
    </section>

    <section class="card" aria-label="${T.lib.vetoCard}">
      <h3 class="sim-h">${T.lib.vetoH}</h3>
      <div class="sliders" data-ref="vetoSl"></div>
      <div class="readout" data-ref="vetoRead"></div>
    </section>

    ${howBox(T.lib.how)}
    ${bookAside(bookLi('ch16-e2', T.book.libet, 'tartışmalı'))}
  </section>

  <!-- ============ 2 · Çok etkenli tahmin ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-cok" data-pane="cok" aria-labelledby="${id}-tab-cok" hidden>
    <div data-ref="tour2"></div>
    <section class="card" aria-label="${T.cok.factsCard}">
      <h3 class="sim-h">${T.cok.factsH}</h3>
      <div class="fgrid" role="group" aria-label="${T.cok.factsGroup}" data-ref="facts"></div>
      <div class="sliders" data-ref="geneSl"></div>
    </section>
    <section class="card" aria-label="${T.cok.powerCard}">
      <h3 class="sim-h">${T.cok.powerH}</h3>
      <div class="chart"><svg viewBox="0 0 360 100" role="img" aria-label="${T.cok.stackSvgLabel}" data-ref="stack"></svg></div>
    </section>
    <section class="card" aria-label="${T.cok.crowdCard}">
      <h3 class="sim-h">${T.cok.crowdH}</h3>
      <p class="note">${T.cok.crowdNote}</p>
      <div class="chart"><svg viewBox="0 0 360 196" role="img" aria-label="${T.cok.gridLabel}" data-ref="grid"></svg></div>
      ${lg([dotS(true), T.cok.legendShown], [dotS(false), T.cok.legendNot])}
      <div class="row"><button class="btn" type="button" data-ref="reseedC">${T.cok.reseed}</button></div>
      <div class="readout" data-ref="cokRead"></div>
    </section>
    ${howBox(T.cok.how)}
    ${bookAside(bookLi('ch16-e5', T.book.sapolsky, 'tartışmalı'))}
  </section>

  <!-- ============ 3 · Ceza ve tatmin ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-ceza" data-pane="ceza" aria-labelledby="${id}-tab-ceza" hidden>
    <div data-ref="tour3"></div>
    <section class="card" data-card="pun" aria-label="${T.ceza.punCard}">
      <h3 class="sim-h">${T.ceza.punH}</h3>
      <p class="note">${T.ceza.punNote}</p>
      <div class="chart"><svg viewBox="0 0 360 230" role="img" aria-label="${T.ceza.scatLabel}" data-ref="scat"></svg></div>
      ${lg([dotS(true), T.ceza.legendPun], [dotS(false), T.ceza.legendNoPun], [line('var(--ink)', ' stroke-dasharray="4 3"'), T.ceza.legendCost])}
      <div class="sliders" data-ref="punSl"></div>
      <div class="row"><button class="btn" type="button" data-ref="reseedP">${T.ceza.reseed}</button></div>
      <div class="readout" data-ref="punRead"></div>
    </section>

    <section class="card" data-card="case" aria-label="${T.ceza.caseCard}">
      <h3 class="sim-h">${T.ceza.caseH}</h3>
      <div class="chips" role="group" aria-label="${T.ceza.caseGroup}" data-ref="caseChips"></div>
      <p class="note" data-ref="caseText"></p>
      <div class="sliders" data-ref="bioSl"></div>
      <div class="dual" data-ref="dual"></div>
      <p class="note" data-ref="dualNote"></p>
    </section>

    <section class="card" data-card="case" aria-label="${T.ceza.rateCard}">
      <h3 class="sim-h">${T.ceza.rateH}</h3>
      <p class="note">${T.ceza.rateNote}</p>
      <div class="sliders" data-ref="rateSl"></div>
      <div class="seg" role="group" aria-label="${T.ceza.respGroup}" data-ref="resps"></div>
      <div class="dual" data-ref="outs"></div>
      <p class="note" data-ref="advice"></p>
      <div class="chart"><svg viewBox="0 0 360 250" role="img" aria-label="${T.ceza.quadLabel}" data-ref="quad"></svg></div>
      <div data-ref="quadKey"></div>
    </section>

    ${howBox(T.ceza.how)}
    ${bookAside(
      bookLi('ch16-e7', T.book.quervain, 'karışık') +
      bookLi('ch16-e6', T.book.buckholtz, 'bilinmiyor') +
      bookLi('ch16-e1', T.book.steinberg, 'sağlam', ` <a href="#/bolum/ch16?deney=ch16-e3">${T.book.dweck}</a> (${t('repl.tartışmalı')}), <a href="#/bolum/ch16?deney=ch16-e4">${T.book.tms}</a> (${t('repl.bilinmiyor')}).`),
    )}
  </section>

  <p class="foot">${T.foot}</p>
</div>`;

interface SliderHandle { inp: HTMLInputElement; set: (v: number) => void }
interface Meter { label: string; text: string; frac: number; color: string }

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('ozg');
  const T = L();
  container.innerHTML = TEMPLATE(id, T);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  let slN = 0;

  /* ---------- Durum ---------- */
  const S = {
    tab: 'lib' as Tab,
    // 1 · Libet
    clock: 'idle' as 'idle' | 'run' | 'done', t0: 0, press: 0, w: LIBET.wRef as number, tries: [] as number[],
    view: 'libet' as View, sch: { ...SCH } as SchParams, seed: 3, noReturn: LIBET.noReturn as number, shift: 0,
    // 2 · Çok etkenli
    known: FACTORS.map(() => false), gene: FACTORS[0].share, seedC: 1,
    // 3 · Ceza
    seedP: 2, unfair: 1, cost: 2, wRew: 3, caseId: 'tumor', bio: CASES[0].bio, resp: 'onarim' as Resp, focus: 'pun' as 'pun' | 'case',
    rates: Object.fromEntries(CASES.map((c) => [c.id, { b: 50, d: 50, t: false }])) as Record<string, { b: number; d: number; t: boolean }>,
  };
  let dirty = true, lastSay = '', lastNow = performance.now(), saved = false;
  const curCase = () => CASES.find((c) => c.id === S.caseId)!;

  /* ---------- Yardımcılar ---------- */
  function makeSlider(parent: HTMLElement, o: { name: string; hint: string; min: number; max: number; step: number; val: number; fmt: (v: number) => string; cb: (v: number) => void; color?: string }): SliderHandle {
    const h = slider(scope, parent, { id: `${id}-s${++slN}`, name: o.name, hint: o.hint, min: o.min, max: o.max, step: o.step, value: o.val, fmt: o.fmt, color: o.color, cls: 'sl', onInput: (v) => { o.cb(v); dirty = true; } });
    return { inp: h.inp, set: (v) => h.set(v) };
  }
  function toggles<T extends string>(parent: HTMLElement, items: { k: T; name: string }[], get: () => T, pick: (k: T) => void, cls = 'btn'): () => void {
    const btns = items.map((it) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = cls; b.textContent = it.name; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => { pick(it.k); dirty = true; });
      parent.appendChild(b);
      return b;
    });
    return () => items.forEach((it, i) => btns[i].setAttribute('aria-pressed', String(get() === it.k)));
  }
  const tiles = (xs: [string, string][]): string => xs.map(([l, v]) => `<div class="ro"><span>${l}</span><b>${v}</b></div>`).join('');
  const setW = (el: HTMLElement, frac: number) => { el.style.width = `${(clamp(frac) * 100).toFixed(1)}%`; };
  /** Etiket + iz + değer satırları; her satır için bir ayarlayıcı döner. */
  function barRows(parent: HTMLElement, rows: { label: string; color: string }[]): ((frac: number, text: string) => void)[] {
    return rows.map((r) => {
      const d = document.createElement('div');
      d.className = 'brow';
      d.style.setProperty('--c', r.color);
      d.innerHTML = `<span class="bl">${r.label}</span><div class="track"><b></b></div><b class="bv"></b>`;
      parent.appendChild(d);
      const fill = d.querySelector<HTMLElement>('.track b')!, val = d.querySelector<HTMLElement>('.bv')!;
      return (frac: number, text: string) => { setW(fill, frac); val.textContent = text; };
    });
  }

  /* ---------- Sekmeler ---------- */
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  function showTab(t: Tab, focus = false): void {
    S.tab = t; dirty = true;
    for (const b of tabBtns) {
      const on = b.dataset.pane === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const p of panes) p.hidden = p.dataset.pane !== t;
  }
  for (const b of tabBtns) {
    scope.on(b, 'click', () => showTab(b.dataset.pane as Tab));
    scope.on(b, 'keydown', (ev) => {
      const i = tabBtns.indexOf(b);
      const j = ev.key === 'ArrowRight' ? (i + 1) % tabBtns.length : ev.key === 'ArrowLeft' ? (i + tabBtns.length - 1) % tabBtns.length : -1;
      if (j >= 0) { ev.preventDefault(); showTab(tabBtns[j].dataset.pane as Tab, true); }
    });
  }

  /* ---------- Çıktı çubuğu ---------- */
  const meterWrap = $('meters');
  const meterEls = [0, 1, 2].map(() => {
    const d = document.createElement('div');
    d.className = 'm';
    d.innerHTML = '<div class="m-top"><span></span><b></b></div><div class="track"><b></b></div>';
    meterWrap.appendChild(d);
    return { d, l: d.querySelector('span')!, t: d.querySelector<HTMLElement>('.m-top b')!, f: d.querySelector<HTMLElement>('.track b')! };
  });
  function setBar(say: string, ms3: Meter[]): void {
    $('say').textContent = say;
    lastSay = say;
    ms3.forEach((m, i) => {
      const e = meterEls[i];
      e.d.style.setProperty('--c', m.color);
      e.l.textContent = m.label; e.t.textContent = m.text; setW(e.f, m.frac);
    });
  }

  /* =====================================================================
     1 · Libet
     ===================================================================== */
  const CX = 180, CY = 108, R = 80;
  const pos = (deg: number, r: number): [number, number] => [CX + r * Math.sin((deg * Math.PI) / 180), CY - r * Math.cos((deg * Math.PI) / 180)];
  const clockSvg = $<SVGSVGElement>('clock');
  let dotEl: SVGElement | null = null;
  const NOTE = T.lib.note;

  function drawClock(): void {
    clockSvg.replaceChildren();
    const g = svg('g', {}, clockSvg);
    svg('circle', { class: 'ring', cx: CX, cy: CY, r: R }, g);
    for (let i = 0; i < 25; i++) {
      const a = (i / 25) * 360, [x1, y1] = pos(a, R - (i % 5 === 0 ? 11 : 6)), [x2, y2] = pos(a, R);
      svg('line', { class: i % 5 === 0 ? 'tk big' : 'tk', x1, y1, x2, y2 }, g);
    }
    const done = S.clock === 'done';
    const pressDeg = done ? S.press : 0;
    if (done) {
      const mk = markAngle(S.press, S.w), [ax, ay] = pos(mk, R), [bx, by] = pos(S.press, R);
      svg('path', { class: 'arc', d: `M${ax.toFixed(1)} ${ay.toFixed(1)}A${R} ${R} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}` }, g);
      const [wx, wy] = pos(mk, R);
      svg('path', { class: 'wmk', d: `M${wx} ${wy - 8}L${wx + 7} ${wy}L${wx} ${wy + 8}L${wx - 7} ${wy}z` }, g);
      const [lx, ly] = pos(mk, R + 17), [mx, my] = pos(S.press, R + 17);
      svgText(g, { class: 'lb w', x: lx, y: ly + 4, 'text-anchor': 'middle' }, T.lib.markW);
      svgText(g, { class: 'lb', x: mx, y: my + 4, 'text-anchor': 'middle' }, T.lib.markM);
      svgText(g, { class: 'big-n', x: CX, y: CY + 4, 'text-anchor': 'middle' }, ms(S.w));
      svgText(g, { class: 'sub', x: CX, y: CY + 22, 'text-anchor': 'middle' }, T.lib.relToMove);
    } else {
      svgText(g, { class: 'sub', x: CX, y: CY + 4, 'text-anchor': 'middle' }, S.clock === 'run' ? T.lib.clockRunning : T.lib.clockReady);
    }
    const [dx, dy] = pos(pressDeg, R);
    dotEl = svg('circle', { class: done ? 'dot frozen' : 'dot', cx: dx, cy: dy, r: 7 }, g);
    clockSvg.setAttribute('aria-label', done ? T.lib.clockLabelDone(ms(S.w)) : T.lib.clockLabelRun);
  }

  const goBtn = $<HTMLButtonElement>('go'), saveBtn = $<HTMLButtonElement>('save');
  function clockGo(): void {
    if (S.clock === 'run') {
      S.press = clockAngle(Math.max(0, lastNow - S.t0));
      S.clock = 'done';
    } else { S.t0 = lastNow; S.clock = 'run'; }
    saved = false; dirty = true;
  }
  scope.on(goBtn, 'click', clockGo);
  scope.on(saveBtn, 'click', () => {
    S.tries.push(S.w); saved = true; dirty = true;
  });
  scope.on(clockSvg, 'pointerdown', (ev) => {
    if (S.clock !== 'done') return;
    const e = ev as PointerEvent, r = clockSvg.getBoundingClientRect();
    if (!r.width) return;
    const k = r.width / 360;
    const deg = ((Math.atan2(e.clientX - (r.left + CX * k), -(e.clientY - (r.top + CY * k))) * 180) / Math.PI + 360) % 360;
    const w = wFromAngles(S.press, deg);
    if (w !== null) { S.w = w; wSl.set(w); saved = false; dirty = true; }
  });

  const wSl = makeSlider($('wSl'), {
    name: T.lib.wName, hint: T.lib.wHint(ms(LIBET.wRef)), min: LIBET.wMin, max: 0, step: 10, val: S.w, color: 'var(--dop)',
    fmt: ms, cb: (v) => { S.w = v; saved = false; },
  });

  /* ---- RP grafiği ---- */
  const rpSvg = $<SVGSVGElement>('rp');
  const X = (t: number) => 30 + (t + 1000) * 0.2564, Y = (a: number) => 170 - clamp(a, -0.05, 1.05) * 130;
  const pathOf = (xs: number[], f: (i: number) => number): string => 'M' + xs.map((t, i) => `${X(t).toFixed(1)} ${Y(f(i)).toFixed(1)}`).join('L');
  const schMemo: { key: string; run: SchRun | null } = { key: '', run: null };
  function schRun(): SchRun {
    const k = `${S.sch.drive}|${S.sch.noise}|${S.seed}`;
    if (schMemo.key !== k || !schMemo.run) { schMemo.key = k; schMemo.run = runSchurger(S.sch, S.seed); }
    return schMemo.run;
  }
  const gapNow = () => rpGap(S.w);
  function drawRP(): void {
    rpSvg.replaceChildren();
    const sch = S.view !== 'libet' ? schRun() : null;
    const g = svg('g', {}, rpSvg);
    for (const t of [-1000, -750, -500, -250, 0]) {
      svg('line', { class: 'grid', x1: X(t), x2: X(t), y1: 40, y2: 170 }, g);
      svgText(g, { class: 'ax', x: X(t), y: 186, 'text-anchor': 'middle' }, t === 0 ? '0' : `${t}`.replace('-', '−'));
    }
    svg('line', { class: 'base', x1: 30, x2: 312, y1: 170, y2: 170 }, g);
    svgText(g, { class: 'ax', x: 171, y: 204, 'text-anchor': 'middle' }, T.lib.axisUnit);
    // veto penceresi
    const vw = vetoWindow(S.w, S.noReturn);
    if (vw > 0) svg('rect', { class: 'veto', x: X(S.w), y: 40, width: X(-S.noReturn) - X(S.w), height: 130 }, g);
    // eğriler
    const ts: number[] = []; for (let t = RP_ONSET; t <= 0; t += 10) ts.push(t);
    if (S.view !== 'sch') svg('path', { class: 'ln libet', d: pathOf(ts, (i) => rpLibet(ts[i])) }, g);
    if (sch) {
      sch.examples.forEach((ex) => svg('path', { class: 'ln ex', d: pathOf(sch.t, (i) => ex[i]) }, g));
      svg('path', { class: 'ln flat', d: pathOf(sch.t, (i) => sch.unlocked[i]) }, g);
      svg('path', { class: 'ln sch', d: pathOf(sch.t, (i) => sch.locked[i]) }, g);
    }
    // işaretler
    svg('line', { class: 'mline', x1: X(0), x2: X(0), y1: 34, y2: 170 }, g);
    svgText(g, { class: 'lb', x: X(0) + 4, y: 30, 'text-anchor': 'start' }, T.lib.moveLabel);
    svg('line', { class: 'wline', x1: X(S.w), x2: X(S.w), y1: 34, y2: 170 }, g);
    svgText(g, { class: 'lb w', x: X(S.w), y: 30, 'text-anchor': 'middle' }, 'W');
    // aralık oku
    const from = S.view === 'sch' && sch && sch.onset ? sch.onset : RP_ONSET;
    const gap = S.w - from;
    if (gap > 0) {
      svg('path', { class: 'brk', d: `M${X(from)} 19V13H${X(S.w)}V19` }, g);
      svgText(g, { class: 'lb', x: (X(from) + X(S.w)) / 2, y: 9, 'text-anchor': 'middle' }, T.lib.gapLabel(S.view === 'sch', Math.round(gap)));
    }
    rpSvg.setAttribute('aria-label', S.view === 'sch' ? T.lib.rpSvgLabelSch : T.lib.rpSvgLabelLibet);
    $('rpKey').innerHTML = lg(
      ...(S.view !== 'sch' ? [[line('var(--pfc)'), T.lib.keyLibet] as [string, string]] : []),
      ...(sch ? [[line('var(--pit)'), T.lib.keySch] as [string, string], [line('var(--muted)', ' stroke-dasharray="4 3"'), T.lib.keyFlat] as [string, string]] : []),
      [line('var(--dop)', ' stroke-dasharray="3 3"'), T.lib.keyW], [swatch('var(--dop)', 0.3), T.lib.keyVeto],
    );
  }
  const viewHandles = toggles($('viewChips'), [{ k: 'libet' as View, name: T.lib.views.libet }, { k: 'sch' as View, name: T.lib.views.sch }, { k: 'both' as View, name: T.lib.views.both }], () => S.view, (k) => { S.view = k; }, 'chip');
  const schSl = $('schSl'), schRow = $('schRow');
  makeSlider(schSl, { name: T.lib.driveName, hint: T.lib.driveHint, min: 0.4, max: 0.75, step: 0.05, val: S.sch.drive, fmt: f2, color: 'var(--pit)', cb: (v) => { S.sch.drive = v; } });
  makeSlider(schSl, { name: T.lib.noiseName, hint: T.lib.noiseHint, min: 0.2, max: 0.5, step: 0.05, val: S.sch.noise, fmt: f2, color: 'var(--pit)', cb: (v) => { S.sch.noise = v; } });
  scope.on($('rerun'), 'click', () => { S.seed++; dirty = true; });

  /* ---- Veto ve kayma ---- */
  const noRetSl = makeSlider($('vetoSl'), { name: T.lib.noRetName, hint: T.lib.noRetHint(LIBET.noReturn), min: 0, max: 300, step: 10, val: S.noReturn, fmt: (v) => `${v} ms`, color: 'var(--dop)', cb: (v) => { S.noReturn = v; } });
  const shiftSl = makeSlider($('vetoSl'), { name: T.lib.shiftName, hint: T.lib.shiftHint, min: 0, max: 500, step: 10, val: S.shift, fmt: (v) => `${v} ms`, color: 'var(--red)', cb: (v) => { S.shift = v; } });
  const libetNums = () => {
    const gap = gapNow(), tg = trueGap(gap, S.shift), vw = vetoWindow(S.w, S.noReturn), art = artefactShare(gap, S.shift);
    return { gap, tg, vw, art };
  };
  function drawVeto(): void {
    const { gap, tg, vw, art } = libetNums();
    $('vetoRead').innerHTML = tiles([[T.lib.tileMeasured, `${Math.round(gap)} ms`], [T.lib.tileTrue, `${Math.round(tg)} ms`], [T.lib.tileArtefact, pc(art)], [T.lib.tileVeto, `${vw} ms`], [T.lib.tileCan, vw > 0 ? T.lib.yes : T.lib.no]]);
  }
  function barLib(): void {
    const { gap, tg, vw, art } = libetNums();
    let say: string;
    if (S.view === 'sch') {
      const r = schRun();
      say = T.lib.saySch(r.onset ? ms(r.onset) : null, num(r.meanWait, 1));
    } else {
      say = T.lib.sayLibet(ms(RP_ONSET), ms(S.w), Math.round(gap), S.shift, Math.round(tg), vw);
    }
    setBar(say, [
      { label: T.lib.meterGap, text: `${Math.round(gap)} ms`, frac: gap / 900, color: 'var(--pfc)' },
      { label: T.lib.meterVeto, text: `${vw} ms`, frac: vw / 400, color: 'var(--dop)' },
      { label: T.lib.meterArt, text: pc(art), frac: art, color: 'var(--red)' },
    ]);
  }
  function drawLib(): void {
    const note = $('clockNote');
    note.textContent = NOTE[S.clock];
    saveBtn.disabled = S.clock !== 'done' || saved;
    goBtn.textContent = S.clock === 'idle' ? T.lib.start : S.clock === 'run' ? T.lib.moveNow : T.lib.retry;
    drawClock();
    const n = S.tries.length;
    $('tries').textContent = n ? T.lib.tries(n, ms(S.tries.reduce((a, b) => a + b, 0) / n)) : T.lib.noTries;
    viewHandles();
    const sch = S.view !== 'libet';
    schSl.hidden = !sch; schRow.hidden = !sch;
    drawRP(); drawVeto(); barLib();
  }

  /* =====================================================================
     2 · Çok etkenli tahmin
     ===================================================================== */
  const factsBox = $('facts');
  const factBtns = FACTORS.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn fbtn'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<i style="background:${FCOL[i]}"></i><span class="fn">${T.cok.factors[i].name}<small>${T.cok.factors[i].hint}</small></span><b></b>`;
    scope.on(b, 'click', () => { S.known[i] = !S.known[i]; dirty = true; });
    factsBox.appendChild(b);
    return b;
  });
  const geneSl = makeSlider($('geneSl'), {
    name: T.cok.geneName, hint: T.cok.geneHint, min: 0, max: 0.1, step: 0.01, val: S.gene, color: 'var(--pit)',
    fmt: (v) => pc(v), cb: (v) => { S.gene = v; },
  });
  scope.on($('reseedC'), 'click', () => { S.seedC++; dirty = true; });
  const stackSvg = $<SVGSVGElement>('stack'), gridSvg = $<SVGSVGElement>('grid');
  const ROWS = T.cok.rows;
  const cokNums = () => {
    const shares = defaultShares(S.gene), ev = evaluate(S.known, shares);
    return { shares, ev, k: S.known.filter(Boolean).length };
  };
  function drawCok(): void {
    const { shares, ev, k } = cokNums();
    factBtns.forEach((b, i) => {
      b.setAttribute('aria-pressed', String(S.known[i]));
      b.querySelector('b')!.textContent = `${S.known[i] ? '✓ ' : ''}${pc(shares[i])}`;
    });
    // yığılmış çubuk
    stackSvg.replaceChildren();
    const x0 = 16, W = 328, g = svg('g', {}, stackSvg);
    svg('rect', { class: 'rest', x: x0, y: 36, width: W, height: 26, rx: 3 }, g);
    let acc = 0;
    FACTORS.forEach((_, i) => {
      if (!S.known[i] || shares[i] <= 0) return;
      svg('rect', { x: x0 + acc * W, y: 36, width: shares[i] * W, height: 26, fill: FCOL[i], class: 'sg' }, g);
      acc += shares[i];
    });
    svg('line', { class: 'half', x1: x0 + W / 2, x2: x0 + W / 2, y1: 28, y2: 70 }, g);
    svgText(g, { class: 'ax', x: x0, y: 22, 'text-anchor': 'start' }, '0');
    svgText(g, { class: 'ax', x: x0 + W / 2, y: 22, 'text-anchor': 'middle' }, '%50');
    svgText(g, { class: 'ax', x: x0 + W, y: 22, 'text-anchor': 'end' }, `${pc(1)}: ${T.cok.certainty}`);
    svgText(g, { class: 'lb', x: x0, y: 86, 'text-anchor': 'start' }, T.cok.explainedLbl(pc(ev.r2)));
    svgText(g, { class: 'ax', x: x0 + W, y: 86, 'text-anchor': 'end' }, T.cok.unexplainedLbl(pc(ev.unknown)));
    stackSvg.setAttribute('aria-label', T.cok.stackLabel(k, pc(ev.r2), pc(ev.unknown)));
    // 100 kişi
    gridSvg.replaceChildren();
    const gg = svg('g', {}, gridSvg);
    const qs = quintiles(sample(S.known, shares, S.seedC, 100));
    for (let row = 0; row < 5; row++) {
      const q = qs[4 - row], y = 22 + row * 36;
      svgText(gg, { class: 'ax', x: 6, y: y + 3.5, 'text-anchor': 'start' }, ROWS[row]);
      for (let c = 0; c < q.size; c++) {
        const hit = c < q.hit, cx = 96 + c * 10.4;
        svg('circle', { class: hit ? 'pd hit' : 'pd', cx, cy: y, r: 4 }, gg);
      }
      svgText(gg, { class: 'lb', x: 354, y: y + 3.5, 'text-anchor': 'end' }, `${q.hit}/${q.size}`);
    }
    $('cokRead').innerHTML = tiles([[T.cok.tilePower, pc(ev.r2)], [T.cok.tileUnc, pc(ev.unknown)], [T.cok.tileTop, T.cok.showed(pc(ev.top))], [T.cok.tileBottom, T.cok.showed(pc(ev.bottom))]]);
    const say = k === 0 ? T.cok.say0 : T.cok.sayK(k, pc(ev.r2), pc(ev.unknown), pc(ev.top), pc(ev.bottom));
    setBar(say, [
      { label: T.cok.meterPower, text: pc(ev.r2), frac: ev.r2, color: 'var(--pit)' },
      { label: T.cok.meterUnc, text: pc(ev.unknown), frac: ev.unknown, color: 'var(--lesion)' },
      { label: T.cok.meterTop, text: pc(ev.top), frac: ev.top, color: 'var(--amy)' },
    ]);
  }

  /* =====================================================================
     3 · Ceza ve tatmin
     ===================================================================== */
  const scatSvg = $<SVGSVGElement>('scat'), quadSvg = $<SVGSVGElement>('quad');
  const punSl = $('punSl');
  const unfSl = makeSlider(punSl, { name: T.ceza.unfairName, hint: T.ceza.unfairHint, min: 0, max: 1, step: 0.05, val: S.unfair, fmt: pc, color: 'var(--amy)', cb: (v) => { S.unfair = v; S.focus = 'pun'; } });
  const costSl = makeSlider(punSl, { name: T.ceza.costName, hint: T.ceza.costHint, min: 0, max: 8, step: 0.5, val: S.cost, fmt: (v) => T.ceza.points(f2(v)), color: 'var(--ink)', cb: (v) => { S.cost = v; S.focus = 'pun'; } });
  const rewSl = makeSlider(punSl, { name: T.ceza.rewName, hint: T.ceza.rewHint, min: 0, max: 6, step: 0.5, val: S.wRew, fmt: f2, color: 'var(--dop)', cb: (v) => { S.wRew = v; S.focus = 'pun'; } });
  scope.on($('reseedP'), 'click', () => { S.seedP++; S.focus = 'pun'; dirty = true; });
  const SX = (c: number) => 40 + (c / 2) * 300, SY = (w: number) => 196 - (clamp(w, 0, 12) / 12) * 176;
  function drawPun(): void {
    const players = makePlayers(S.seedP), st = punishStats(players, S.unfair, S.wRew, S.cost);
    scatSvg.replaceChildren();
    const g = svg('g', {}, scatSvg);
    for (const v of [0, 4, 8, 12]) { svg('line', { class: 'grid', x1: 40, x2: 340, y1: SY(v), y2: SY(v) }, g); svgText(g, { class: 'ax', x: 34, y: SY(v) + 3.5, 'text-anchor': 'end' }, String(v)); }
    for (const v of [0, 1, 2]) svgText(g, { class: 'ax', x: SX(v), y: 212, 'text-anchor': 'middle' }, String(v));
    svgText(g, { class: 'ax', x: 190, y: 226, 'text-anchor': 'middle' }, T.ceza.xAxis);
    svgText(g, { class: 'ax', x: 40, y: 12, 'text-anchor': 'start' }, T.ceza.yAxis);
    const yc = SY(S.cost + 0.2);
    svg('line', { class: 'cost', x1: 40, x2: 340, y1: yc, y2: yc }, g);
    svgText(g, { class: 'lb', x: 338, y: yc - 4, 'text-anchor': 'end' }, T.ceza.costLine);
    for (const p of players) svg('circle', { class: punishes(p, S.unfair, S.wRew, S.cost) ? 'pd hit' : 'pd', cx: SX(p.caudate), cy: SY(wtp(p, S.unfair, S.wRew)), r: 4 }, g);
    $('punRead').innerHTML = tiles([[T.ceza.tilePun, `${st.count}/${st.total}`], [T.ceza.tilePaid, T.ceza.points(f2(st.paid))], [T.ceza.tileR, f2(st.r)]]);
    scatSvg.setAttribute('aria-label', T.ceza.scatLabelDyn(st.count, f2(st.r)));
    if (S.focus === 'pun') {
      const say = st.count === 0 ? T.ceza.sayNone : T.ceza.sayPun(st.total, st.count, f2(S.cost), f2(st.paid), f2(st.r), S.wRew === 0);
      setBar(say, [
        { label: T.ceza.meterPun, text: `${st.count}/${st.total}`, frac: st.count / st.total, color: 'var(--amy)' },
        { label: T.ceza.meterPaid, text: T.ceza.points(f2(st.paid)), frac: st.paid / 120, color: 'var(--ink)' },
        { label: T.ceza.meterLink, text: f2(st.r), frac: Math.max(0, st.r), color: 'var(--dop)' },
      ]);
    }
  }

  /* ---- Vakalar ---- */
  const caseHandles = toggles($('caseChips'), CASES.map((c, i) => ({ k: c.id, name: T.ceza.cases[i].short })), () => S.caseId, (k) => selectCase(k), 'chip');
  function selectCase(k: string): void {
    S.caseId = k; S.bio = curCase().bio; bioSl.set(Math.round(S.bio * 100)); syncRate(); S.focus = 'case';
  }
  const bioSl = makeSlider($('bioSl'), {
    name: T.ceza.bioName, hint: T.ceza.bioHint, min: 0, max: 100, step: 5, val: Math.round(S.bio * 100), color: 'var(--pit)',
    fmt: (v) => percent(String(v)), cb: (v) => { S.bio = v / 100; S.focus = 'case'; },
  });
  const dualSet = barRows($('dual'), [{ label: T.ceza.dualCold, color: 'var(--pfc)' }, { label: T.ceza.dualHot, color: 'var(--amy)' }]);
  const outSet = barRows($('outs'), [{ label: T.ceza.outSafety, color: 'var(--gld)' }, { label: T.ceza.outCause, color: 'var(--pfc)' }, { label: T.ceza.outSatisf, color: 'var(--amy)' }]);
  const rateSl = $('rateSl');
  const blameSl = makeSlider(rateSl, { name: T.ceza.blameName, hint: T.ceza.blameHint, min: 0, max: 100, step: 5, val: 50, fmt: T.ceza.outOf100, color: 'var(--amy)', cb: (v) => { const r = S.rates[S.caseId]; r.b = v; r.t = true; S.focus = 'case'; } });
  const dangerSl = makeSlider(rateSl, { name: T.ceza.dangerName, hint: T.ceza.dangerHint, min: 0, max: 100, step: 5, val: 50, fmt: T.ceza.outOf100, color: 'var(--gld)', cb: (v) => { const r = S.rates[S.caseId]; r.d = v; r.t = true; S.focus = 'case'; } });
  function syncRate(): void { const r = S.rates[S.caseId]; blameSl.set(r.b); dangerSl.set(r.d); }
  const respHandles = toggles($('resps'), RESPS.map((r, i) => ({ k: r.k, name: T.ceza.resps[i].name })), () => S.resp, (k) => { S.resp = k; S.focus = 'case'; });
  const ADV_TXT = T.ceza.adv, REC_TXT = T.ceza.rec;
  const QX = (b: number) => 40 + (b / 100) * 300, QY = (d: number) => 214 - (d / 100) * 190;
  function drawCase(): void {
    const c = curCase(), j = judgments(c, S.bio), o = outcome(c, S.bio, S.resp), r = S.rates[c.id];
    caseHandles(); respHandles();
    $('caseText').textContent = T.ceza.cases[CASES.indexOf(c)].text;
    dualSet[0](j.cold, pc(j.cold)); dualSet[1](j.hot, pc(j.hot));
    $('dualNote').textContent = S.bio >= 0.5 ? T.ceza.dualNoteHigh(pc(S.bio), pc(j.cold), pc(j.hot)) : T.ceza.dualNoteLow;
    outSet[0](o.safety, pc(o.safety)); outSet[1](o.cause, pc(o.cause)); outSet[2](o.satisf, pc(o.satisf));
    const q = quadrant(r.b, r.d), rec = recommend(r.d / 100, c.treat);
    $('advice').textContent = r.t ? `${REC_TXT[rec]} ${ADV_TXT[q]}` : T.ceza.advPrompt;
    // çeyrek grafiği
    quadSvg.replaceChildren();
    const g = svg('g', {}, quadSvg);
    svg('rect', { class: 'qbg', x: 40, y: 24, width: 300, height: 190 }, g);
    svg('line', { class: 'half', x1: QX(50), x2: QX(50), y1: 24, y2: 214 }, g);
    svg('line', { class: 'half', x1: 40, x2: 340, y1: QY(50), y2: QY(50) }, g);
    svgText(g, { class: 'ax', x: 46, y: 38, 'text-anchor': 'start' }, T.ceza.quadRepair);
    svgText(g, { class: 'ax', x: 46, y: 49, 'text-anchor': 'start' }, T.ceza.quadRepairSub);
    svgText(g, { class: 'ax', x: 334, y: 38, 'text-anchor': 'end' }, T.ceza.quadBoth);
    svgText(g, { class: 'ax', x: 334, y: 208, 'text-anchor': 'end' }, T.ceza.quadOnlyPun);
    svgText(g, { class: 'ax', x: 46, y: 208, 'text-anchor': 'start' }, T.ceza.quadNone);
    svgText(g, { class: 'ax', x: 190, y: 236, 'text-anchor': 'middle' }, T.ceza.quadX);
    svgText(g, { class: 'ax', x: 40, y: 14, 'text-anchor': 'start' }, T.ceza.quadY);
    CASES.forEach((cs, i) => {
      const rr = S.rates[cs.id];
      if (!rr.t) return;
      const sel = cs.id === S.caseId, cx = QX(rr.b), cy = QY(rr.d);
      svg('circle', { class: sel ? 'qp sel' : 'qp', cx, cy, r: 10 }, g);
      svgText(g, { class: sel ? 'qn sel' : 'qn', x: cx, y: cy + 4, 'text-anchor': 'middle' }, String(i + 1));
    });
    $('quadKey').innerHTML = `<p class="note">${CASES.map((_, i) => `${i + 1} ${T.ceza.cases[i].short}`).join(' · ')}</p>`;
    quadSvg.setAttribute('aria-label', T.ceza.quadLabel);
    if (S.focus === 'case') {
      const nm = T.ceza.resps[RESPS.findIndex((x) => x.k === S.resp)].lower;
      setBar(T.ceza.sayCase(T.ceza.cases[CASES.indexOf(c)].short, pc(j.cold), pc(j.hot), nm, pc(o.safety), pc(o.cause), pc(o.satisf)), [
        { label: T.ceza.meterResp, text: pc(j.cold), frac: j.cold, color: 'var(--pfc)' },
        { label: T.ceza.meterUrge, text: pc(j.hot), frac: j.hot, color: 'var(--amy)' },
        { label: T.ceza.meterSafety, text: pc(o.safety), frac: o.safety, color: 'var(--gld)' },
      ]);
    }
  }
  function drawCeza(): void { drawPun(); drawCase(); }

  /* ---------- Turlar ---------- */
  const setView = (v: View) => { S.view = v; };
  const setW0 = (w: number) => { S.w = w; wSl.set(w); };
  const tour1 = createTour(scope, [
    { ...T.tour1[0], apply: () => { setView('libet'); setW0(LIBET.wRef); S.shift = 0; S.noReturn = LIBET.noReturn; syncVeto(); dirty = true; } },
    { ...T.tour1[1], apply: () => { setView('libet'); setW0(LIBET.wRef); S.shift = 0; syncVeto(); dirty = true; } },
    { ...T.tour1[2], apply: () => { setView('libet'); setW0(LIBET.wRef); S.noReturn = LIBET.noReturn; syncVeto(); dirty = true; } },
    { ...T.tour1[3], apply: () => { setView('libet'); setW0(LIBET.wRef); S.shift = 300; syncVeto(); dirty = true; } },
    { ...T.tour1[4], apply: () => { setView('both'); S.shift = 0; syncVeto(); setW0(LIBET.wRef); dirty = true; } },
    { ...T.tour1[5], apply: () => { setView('both'); S.shift = 0; syncVeto(); dirty = true; } },
  ]);
  $('tour1').appendChild(tour1.el);
  function syncVeto(): void { noRetSl.set(S.noReturn); shiftSl.set(S.shift); }

  const setKnown = (...ix: number[]) => { S.known = FACTORS.map((_, i) => ix.includes(i)); };
  const tour2 = createTour(scope, [
    { ...T.tour2[0], apply: () => { setKnown(); geneSl.set(0.1); S.gene = 0.1; dirty = true; } },
    { ...T.tour2[1], apply: () => { setKnown(0); geneSl.set(0.1); S.gene = 0.1; dirty = true; } },
    { ...T.tour2[2], apply: () => { setKnown(0, 1, 2); geneSl.set(0.1); S.gene = 0.1; dirty = true; } },
    { ...T.tour2[3], apply: () => { setKnown(0, 1, 2, 3, 4, 5); geneSl.set(0.1); S.gene = 0.1; dirty = true; } },
    { ...T.tour2[4], apply: () => { setKnown(0, 1, 2, 3, 4, 5); geneSl.set(0); S.gene = 0; dirty = true; } },
  ]);
  $('tour2').appendChild(tour2.el);

  const tour3 = createTour(scope, [
    { ...T.tour3[0], apply: () => { S.unfair = 1; S.cost = 2; S.wRew = 3; syncPun(); S.focus = 'pun'; dirty = true; } },
    { ...T.tour3[1], apply: () => { S.unfair = 1; S.cost = 5; S.wRew = 3; syncPun(); S.focus = 'pun'; dirty = true; } },
    { ...T.tour3[2], apply: () => { S.unfair = 1; S.cost = 2; S.wRew = 0; syncPun(); S.focus = 'pun'; dirty = true; } },
    { ...T.tour3[3], apply: () => { selectCase('tumor'); S.bio = 0.9; bioSl.set(90); } },
    { ...T.tour3[4], apply: () => { selectCase('tumor'); const r = S.rates.tumor; r.b = 10; r.d = 70; r.t = true; syncRate(); S.resp = 'onarim'; } },
    { ...T.tour3[5], apply: () => { selectCase('bilinmez'); S.bio = 0.1; bioSl.set(10); } },
  ]);
  $('tour3').appendChild(tour3.el);
  function syncPun(): void { unfSl.set(S.unfair); costSl.set(S.cost); rewSl.set(S.wRew); }

  /* ---------- Başlangıç ---------- */
  const poke = scope.announcer($('live'), () => lastSay);
  function render(): void {
    if (S.tab === 'lib') drawLib();
    else if (S.tab === 'cok') drawCok();
    else drawCeza();
  }
  const onAction = (ev: Event) => {
    const card = (ev.target as Element | null)?.closest<HTMLElement>('[data-card]');
    if (card) S.focus = card.dataset.card as 'pun' | 'case';
    if (dirty) { dirty = false; render(); }
    poke();
  };
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);

  function frame(now: number): void {
    lastNow = now;
    if (S.tab === 'lib' && S.clock === 'run' && dotEl) {
      const [x, y] = pos(clockAngle(Math.max(0, now - S.t0)), R);
      dotEl.setAttribute('cx', x.toFixed(1)); dotEl.setAttribute('cy', y.toFixed(1));
    }
    if (dirty) { dirty = false; render(); }
  }
  render();
  scope.loop(frame, { root, onResume: () => { lastNow = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
