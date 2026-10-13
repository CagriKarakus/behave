import { mulberry32 } from '../rng';
import { lazyNotes, pc, f1, f2, slider } from '../ui';
import { decimalSep } from '../../i18n/locale';
import { percent } from '../../i18n/fmt';
import { L } from './text';
import '../sim.css';
import './view.css';
import { Scope, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  BIG_MARKET, BOOK, FACES, HADZA, MIXES, PG, PROFILES, SCENARIOS, N_AGENTS, antiFraction, avgContribution, avgPay, bestOf,
  bestOffer, clamp, describeDice, describePG, describeTrolley, dictatorOffer, dimsOf, expectedDist, expectedPay, honestShare,
  deviation, normMix, pReject, payOf, profile, rejectThreshold, sampleByType, scenarioP, simulate,
  systems, type Answers, type Dims, type Intent, type Market, type Mix, type Round, type ScenarioId, type Society,
} from './model';

type Tab = 'tro' | 'pg' | 'dice';
const N_DICE = 300;
const band = (b: [number, number] | null): string => (!b ? L().noNumber : b[0] === b[1] ? `~${pc(b[0])}` : percent(`${Math.round(b[0] * 100)}-${b[1] * 100}`));

const sv = (w: number, h: number, inner: string): string => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
const arrow = (c: string, dash: string): string => sv(26, 10, `<path d="M1 5H19" stroke="${c}" stroke-width="2.2"${dash}/><path d="M17 1L25 5L17 9z" fill="${c}"/>`);
const dotI = (c: string): string => `<i style="background:${c}"></i>`;
const key = (...a: [string, string][]): string => `<div class="legend">${a.map(([i, t]) => `<span>${i}${t}</span>`).join('')}</div>`;
const TEMPLATE = (id: string) => {
  const T = L();
  return `
<div class="sim sim-ahl">
  <p class="lede">${T.lede}</p>
  <div class="tabs" role="tablist" aria-label="${T.tabsLabel}">
    <button class="tab" role="tab" id="${id}-tab-tro" data-pane="tro" aria-controls="${id}-pane-tro" aria-selected="true" type="button">${T.tabs.tro}</button>
    <button class="tab" role="tab" id="${id}-tab-pg" data-pane="pg" aria-controls="${id}-pane-pg" aria-selected="false" tabindex="-1" type="button">${T.tabs.pg}</button>
    <button class="tab" role="tab" id="${id}-tab-dice" data-pane="dice" aria-controls="${id}-pane-dice" aria-selected="false" tabindex="-1" type="button">${T.tabs.dice}</button>
  </div>

  <div class="sim-bar" role="group" aria-label="${T.barLabel}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- ============ 1 · Trolley ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-tro" data-pane="tro" aria-labelledby="${id}-tab-tro">
    <div data-ref="tour1"></div>
    <div class="chips" role="group" aria-label="${T.scenariosLabel}" data-ref="scChips"></div>
    <section class="card" aria-label="${T.scenarioDecisionLabel}">
      <p class="sc-text" data-ref="scText"></p>
      <div class="row decide" role="group" data-ref="decide">
        <button class="btn btn-yes" type="button" data-ref="yes">${T.yes}</button>
        <button class="btn btn-no" type="button" data-ref="no">${T.no}</button>
      </div>
      <p class="sc-res" data-ref="scRes"></p>
    </section>

    <section aria-label="${T.systemsLabel}">
      <h3 class="sim-h">${T.systemsTitle}</h3>
      <div class="sys">
        <div class="sys-box cold">
          <p class="sys-t">${T.cold}</p><p class="sys-s">${T.coldSub}</p>
          <div class="track"><b data-ref="coldB"></b></div>
          <p class="sys-n" data-ref="coldT"></p>
        </div>
        <div class="sys-box hot">
          <p class="sys-t">${T.hot}</p><p class="sys-s">${T.hotSub}</p>
          <div class="track"><b data-ref="hotB"></b></div>
          <ul class="parts" data-ref="parts"></ul>
        </div>
      </div>
    </section>

    <section aria-label="${T.compareLabel}">
      <h3 class="sim-h">${T.compareTitle}</h3>
      <div class="stage">
        <svg viewBox="0 0 360 232" role="group" aria-label="${T.plotLabel}" data-ref="plot"></svg>
        ${key([sv(14, 12, '<circle cx="7" cy="6" r="4.5" fill="var(--ink)"/>'), T.legendModel], [sv(16, 12, '<rect x="1" y="2" width="14" height="8" rx="2" fill="var(--dop)" fill-opacity=".55" stroke="var(--dop)"/>'), T.legendBook], [sv(14, 12, '<path d="M7 1.5L12 6L7 10.5L2 6z" fill="none" stroke="var(--ink)" stroke-width="1.6"/>'), T.legendConsistent])}
      </div>
    </section>

    <section aria-label="${T.inputsLabel}">
      <h3 class="sim-h">${T.inputsTitle}</h3>
      <div class="dims" data-ref="dims"></div>
      <div class="sliders" data-ref="savedSl"></div>
    </section>


    <section class="card" aria-label="${T.resultLabel}">
      <h3 class="sim-h">${T.resultTitle}</h3>
      <ul class="res" data-ref="res"></ul>
      <p class="note" data-ref="prof"></p>
      <div class="seg" role="group" aria-label="${T.greeneLabel}">
        <button class="btn" type="button" aria-pressed="true" data-ref="gMe">${T.gMe}</button>
        <button class="btn" type="button" aria-pressed="false" data-ref="gThem">${T.gThem}</button>
      </div>
      <p class="note" data-ref="gText"></p>
    </section>

    <section class="card" aria-label="${T.knobeLabel}">
      <h3 class="sim-h">${T.knobeTitle}</h3>
      <div class="seg" role="group" aria-label="${T.knobeScenarioLabel}"><button class="btn" type="button" aria-pressed="true" data-ref="kHarm">${T.kHarm}</button><button class="btn" type="button" aria-pressed="false" data-ref="kHelp">${T.kHelp}</button></div>
      <p class="note" data-ref="kText"></p>
      <div class="row decide"><button class="btn" type="button" data-ref="kYes">${T.kYes}</button><button class="btn" type="button" data-ref="kNo">${T.kNo}</button></div>
      <div class="kn" data-ref="kRes" hidden></div>
    </section>

    <div class="notes" data-notes="tro"></div>
  </section>

  <!-- ============ 2 · Kamu malı ve ceza ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-pg" data-pane="pg" aria-labelledby="${id}-tab-pg" hidden>
    <div data-ref="tour2"></div>
    <section class="card" aria-label="${T.pgLabel}">
      <h3 class="sim-h">${T.pgTitle}</h3>
      <p class="note">${T.pgIntro(PG.rounds, PG.E)}</p>
      <div class="chips" role="group" aria-label="${T.societyLabel}" data-ref="socChips"></div>
      <div class="chips" role="group" aria-label="${T.punishLabel}" data-ref="punChips"></div>
      <div class="stage">
        <svg viewBox="0 0 360 306" role="img" aria-label="${T.groupsLabel}" data-ref="groups"></svg>
        ${key([sv(16, 14, '<circle cx="8" cy="7" r="6" fill="none" stroke="var(--pfc)" stroke-width="1.6"/><circle cx="8" cy="7" r="3" fill="var(--pfc)"/>'), T.legendNormal], [sv(16, 14, '<path d="M8 .8L15 7L8 13.2L1 7z" fill="none" stroke="var(--amy)" stroke-width="1.6"/><circle cx="8" cy="7" r="2.6" fill="var(--amy)"/>'), T.legendAnti], [arrow('var(--pfc)', ''), T.legendPro], [arrow('var(--amy)', ' stroke-dasharray="4 2"'), T.legendAntiArrow])}
      </div>
      <div class="row play"><button class="btn" type="button" data-ref="replay">${T.replay}</button><button class="btn" type="button" data-ref="reseed">${T.reseed}</button></div>
      <div class="sliders" data-ref="roundSl"></div>
      <div class="chart" aria-label="${T.chartContribLabel}"><h4 class="sim-h">${T.chartContribTitle}</h4>
        <svg viewBox="0 0 360 188" role="img" aria-label="${T.chartContribAria}" data-ref="chart1"></svg></div>
      <div class="chart" aria-label="${T.chartPunLabel}"><h4 class="sim-h">${T.chartPunTitle}</h4>
        <svg viewBox="0 0 360 150" role="img" aria-label="${T.chartPunAria}" data-ref="chart2"></svg></div>
      <div class="sliders" data-ref="socSl"></div>
    </section>

    <section class="card" aria-label="${T.fairnessLabel}">
      <h3 class="sim-h">${T.fairnessTitle}</h3>
      <div class="chips" role="group" aria-label="${T.communityLabel}" data-ref="mkChips"></div>
      <div class="chart"><svg viewBox="0 0 360 206" role="img" aria-label="${T.chart3Aria}" data-ref="chart3"></svg></div>
      <div class="readout" data-ref="mkRead"></div>
      <div class="sliders" data-ref="mkSl"></div>
    </section>


    <div class="notes" data-notes="pg"></div>
  </section>

  <!-- ============ 3 · Zar ve dürüstlük ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-dice" data-pane="dice" aria-labelledby="${id}-tab-dice" hidden>
    <div data-ref="tour3"></div>
    <section class="card" aria-label="${T.singleRollLabel}">
      <h3 class="sim-h">${T.singleRollTitle}</h3>
      <div class="row play"><button class="btn tour-next" type="button" data-ref="roll">${T.roll}</button></div>
      <div class="dice" data-ref="dice" role="group" aria-label="${T.rolledLabel}"></div>
      <ul class="res" data-ref="rollRes"></ul>
    </section>
    <section class="card" aria-label="${T.distLabel}">
      <h3 class="sim-h">${T.distTitle(N_DICE)}</h3>
      <div class="chips" role="group" aria-label="${T.societyLabel}" data-ref="mixChips"></div>
      <div class="stage">
        <svg viewBox="0 0 360 232" role="img" aria-label="${T.histAria}" data-ref="hist"></svg>
        ${key([dotI('var(--pfc)'), T.legHonest], [dotI('var(--dop)'), T.legJustified], [dotI('var(--amy)'), T.legLiar], [sv(24, 10, '<path d="M1 5H23" stroke="var(--ink)" stroke-width="1.6" stroke-dasharray="4 3"/>'), T.legFlat(pc(1 / 6))])}
      </div>
      <div class="readout" data-ref="diceRead"></div>
      <div class="sliders" data-ref="mixSl"></div>
      <div class="row play"><button class="btn" type="button" data-ref="rerun">${T.rerun}</button></div>
    </section>


    <div class="notes" data-notes="dice"></div>
  </section>

  <p class="foot">${T.foot}</p>
</div>`;
};

interface SliderHandle { inp: HTMLInputElement; set: (v: number) => void }

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('ahl');
  const T = L();
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let slN = 0;

  /* ---------- Durum ---------- */
  interface State {
    tab: Tab;
    dims: Dims; sel: ScenarioId | null; ans: Answers; g: 'me' | 'them'; knobe: 'zarar' | 'yarar'; kAns: boolean | null;
    seed: number; soc: Society; pun: boolean; rev: number; acc: number;
    mk: Market; offer: number;
    mix: Mix; dseed: number; roll: [number, number] | null; rollSeed: number;
  }
  const S: State = {
    tab: 'tro',
    dims: dimsOf(SCENARIOS[0]), sel: 'anahtar', ans: {}, g: 'me', knobe: 'zarar', kAns: null,
    seed: 3, soc: { ...PROFILES.yuksek }, pun: true, rev: PG.rounds, acc: 0,
    mk: { ...HADZA }, offer: 0.3,
    mix: { ...MIXES[2].mix }, dseed: 1, roll: null, rollSeed: 1,
  };
  let dirty = true;
  let lastSay = '';

  /* ---------- Yardımcılar ---------- */
  function makeSlider(parent: HTMLElement, o: { name: string; hint: string; min: number; max: number; step: number; val: number; fmt: (v: number) => string; cb: (v: number) => void; color?: string }): SliderHandle {
    const h = slider(scope, parent, { id: `${id}-s${++slN}`, name: o.name, hint: o.hint, min: o.min, max: o.max, step: o.step, value: o.val, fmt: o.fmt, color: o.color, cls: 'sl', onInput: o.cb });
    return { inp: h.inp, set: (v) => h.set(v) };
  }
  function toggles<T extends string>(parent: HTMLElement, items: { k: T; name: string }[], get: () => T | null, pick: (k: T) => void): () => void {
    const btns = items.map((it) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = parent.classList.contains('chips') ? 'chip' : 'btn'; b.textContent = it.name; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => { pick(it.k); dirty = true; });
      parent.appendChild(b);
      return b;
    });
    return () => items.forEach((it, i) => btns[i].setAttribute('aria-pressed', String(get() === it.k)));
  }
  const yGrid = (parent: Element, x0: number, x1: number, y: (v: number) => number, vals: number[], fmt: (v: number) => string): void => {
    for (const v of vals) { svg('line', { class: 'grid', x1: x0, x2: x1, y1: y(v), y2: y(v) }, parent); svgText(parent, { class: 'ax', x: x0 - 6, y: y(v) + 3.5, 'text-anchor': 'end' }, fmt(v)); }
  };
  const tiles = (xs: [string, string][]): string => xs.map(([l, v]) => `<div class="ro"><span>${l}</span><b>${v}</b></div>`).join('');
  const setW = (el: HTMLElement, frac: number) => { el.style.width = `${(clamp(frac) * 100).toFixed(1)}%`; };

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
    if (t === 'pg' && S.rev === 0) S.acc = 0;
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
  interface Meter { label: string; text: string; frac: number; color: string }
  const meterWrap = $('meters');
  const meterEls = [0, 1, 2].map(() => {
    const d = document.createElement('div');
    d.className = 'm';
    d.innerHTML = '<div class="m-top"><span></span><b></b></div><div class="track"><b></b></div>';
    meterWrap.appendChild(d);
    return { d, l: d.querySelector('span')!, t: d.querySelector<HTMLElement>('.m-top b')!, f: d.querySelector<HTMLElement>('.track b')! };
  });
  function setBar(say: string, ms: Meter[]): void {
    $('say').textContent = say;
    lastSay = say;
    ms.forEach((m, i) => {
      const e = meterEls[i];
      e.d.style.setProperty('--c', m.color);
      e.l.textContent = m.label; e.t.textContent = m.text; setW(e.f, m.frac);
    });
  }

  /* =====================================================================
     1 · Trolley
     ===================================================================== */
  const KNOBE_TXT = { zarar: T.knobeHarm, yarar: T.knobeHelp };
  const GREENE_TXT = { me: T.greeneMe, them: T.greeneThem };
  const scChips = $('scChips');
  const scBtns = SCENARIOS.map((sc) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = sc.short; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => selectScenario(sc.id));
    scChips.appendChild(b);
    return b;
  });
  function selectScenario(sid: ScenarioId, saved = 5): void {
    const sc = SCENARIOS.find((s) => s.id === sid)!;
    S.sel = sid; S.dims = dimsOf(sc, saved); dirty = true;
  }
  const INTENTS: { k: Intent; name: string }[] = [{ k: 'kaza', name: T.intentAccident }, { k: 'yan', name: T.intentSide }, { k: 'arac', name: T.intentMeans }];
  const dimsEl = $('dims');
  const mkGroup = (label: string): HTMLElement => {
    const g = document.createElement('div'); g.className = 'dg';
    g.innerHTML = `<p class="dg-l">${label}</p><div class="seg" role="group" aria-label="${label}"></div>`;
    dimsEl.appendChild(g);
    return g.querySelector('.seg')!;
  };
  const edit = (f: () => void) => { f(); S.sel = null; };
  const syncForce = toggles(mkGroup(T.dimForce), [{ k: '0', name: T.forceNone }, { k: '1', name: T.forceMuscle }], () => String(S.dims.force), (k) => edit(() => { S.dims = { ...S.dims, force: Number(k) as 0 | 1 }; }));
  const syncProx = toggles(mkGroup(T.dimProx), [{ k: '0', name: T.proxFar }, { k: '1', name: T.proxNear }], () => String(S.dims.prox), (k) => edit(() => { S.dims = { ...S.dims, prox: Number(k) as 0 | 1 }; }));
  const syncIntent = toggles(mkGroup(T.dimIntent), INTENTS, () => S.dims.intent, (k) => edit(() => { S.dims = { ...S.dims, intent: k }; }));
  const savedSl = makeSlider($('savedSl'), {
    name: T.savedName, hint: T.savedHint,
    min: 2, max: 30, step: 1, val: 5, fmt: (v) => String(v), cb: (v) => { S.dims = { ...S.dims, saved: v }; if (v !== 5) S.sel = null; dirty = true; }, color: 'var(--pfc)',
  });

  // Karşılaştırma grafiği
  const PL = { x0: 108, x1: 296, top: 26, row: 33 };
  const px = (p: number): number => PL.x0 + (PL.x1 - PL.x0) * p;
  const plot = $<SVGElement>('plot');
  for (const v of [0, 0.5, 1]) {
    svg('line', { class: 'grid', x1: px(v), x2: px(v), y1: PL.top - 8, y2: PL.top + 6 * PL.row - 14 }, plot);
    svgText(plot, { class: 'ax', x: px(v), y: 12, 'text-anchor': 'middle' }, pc(v));
  }
  interface PRow { g: SVGElement; hl: SVGElement; band: SVGElement; dot: SVGElement; dia: SVGElement; you: SVGElement }
  const rows: PRow[] = [...SCENARIOS.map((s) => s.short), T.customRow].map((name, i) => {
    const y = PL.top + i * PL.row;
    const custom = i === SCENARIOS.length;
    const g = svg('g', { class: 'prow' + (custom ? ' custom' : ''), ...(custom ? { role: 'img' } : { tabindex: '0', role: 'button', 'aria-pressed': 'false', 'aria-label': name }) }, plot);
    const hl = svg('rect', { class: 'hl', x: 2, y: y - 14, width: 356, height: 28, rx: 6 }, g);
    svgText(g, { class: 'rl', x: 6, y: y + 3.5 }, name);
    svg('line', { class: 'trk', x1: px(0), x2: px(1), y1: y, y2: y }, g);
    const band = svg('rect', { class: 'band', y: y - 6, height: 12, rx: 3, x: 0, width: 0 }, g);
    const dia = svg('path', { class: 'dia', d: `M0,-6 L6,0 L0,6 L-6,0 z`, transform: `translate(0,${y})`, opacity: 0 }, g);
    const dot = svg('circle', { class: 'mdot', r: 5.5, cx: px(0), cy: y }, g);
    const you = svgText(g, { class: 'you', x: 356, y: y + 3.5, 'text-anchor': 'end' }, '');
    if (!custom) {
      const sc = SCENARIOS[i];
      scope.on(g as unknown as HTMLElement, 'click', () => selectScenario(sc.id));
      scope.on(g as unknown as HTMLElement, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectScenario(sc.id); } });
    }
    return { g, hl, band, dot, dia, you };
  });
  const noNum = svgText(plot, { class: 'rl muted', x: px(0.5), y: PL.top + 3 * PL.row + 3.5 }, T.noNumberBook);

  const resEl = $('res');
  function drawTrolley(): void {
    const sy = systems(S.dims);
    const sc = S.sel ? SCENARIOS.find((s) => s.id === S.sel)! : null;
    scBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(S.sel === SCENARIOS[i].id)));
    $('scText').textContent = sc ? sc.text : T.customText;
    const ans = sc ? S.ans[sc.id] : undefined;
    const yes = $<HTMLButtonElement>('yes'), no = $<HTMLButtonElement>('no');
    yes.disabled = no.disabled = !sc;
    yes.setAttribute('aria-pressed', String(ans === true)); no.setAttribute('aria-pressed', String(ans === false));
    yes.textContent = T.yes; no.textContent = T.no;
    $('decide').setAttribute('aria-label', sc ? sc.ask : T.decision);
    const res = $('scRes');
    if (sc && ans !== undefined) {
      const mp = sy.pYes;
      res.textContent = T.scRes(ans, band(sc.book), pc(mp)) + (sc.id === 'dongu' ? T.scResLoop(pc(BOOK.loopLogical)) : '');
    } else res.textContent = sc ? sc.ask : '';
    // iki sistem
    setW($('coldB'), sy.cold / 3.6); setW($('hotB'), sy.hot / 3.6);
    $('coldT').textContent = T.coldNote(S.dims.saved, S.dims.saved - 1);
    const hp = sy.hotParts;
    $('parts').innerHTML =
      `<li><span>${T.parts.choice}</span><b>${hp.choice > 0 ? T.parts.choiceOn : T.parts.off}</b></li>` +
      `<li><span>${T.parts.force}</span><b>${hp.force > 0 ? T.parts.forceOn : T.parts.off}</b></li>` +
      `<li><span>${T.parts.prox}</span><b>${hp.prox > 0 ? T.parts.proxOn : T.parts.off}</b></li>`;
    // grafik
    SCENARIOS.forEach((s, i) => {
      const r = rows[i], p = scenarioP(s), cons = systems(dimsOf(s)).pConsistent;
      r.dot.setAttribute('cx', String(px(p)));
      if (s.book) {
        const [lo, hi] = s.book;
        const x0 = px(lo) - (hi === lo ? 3 : 0), w = hi === lo ? 6 : px(hi) - px(lo);
        r.band.setAttribute('x', String(x0)); r.band.setAttribute('width', String(w));
      } else r.band.setAttribute('width', '0');
      const showDia = Math.abs(cons - p) > 0.05;
      r.dia.setAttribute('opacity', showDia ? '1' : '0');
      if (showDia) r.dia.setAttribute('transform', `translate(${px(cons)},${PL.top + i * PL.row})`);
      const a = S.ans[s.id];
      r.you.textContent = a === undefined ? '' : T.youAnswer(a);
      r.g.classList.toggle('sel', S.sel === s.id);
      r.g.setAttribute('aria-pressed', String(S.sel === s.id));
      r.g.setAttribute('aria-label', T.rowAria(s.short, pc(p), band(s.book), a));
    });
    noNum.setAttribute('opacity', '1');
    rows[5].dot.setAttribute('cx', String(px(sy.pYes)));
    rows[5].you.textContent = pc(sy.pYes);
    rows[5].g.setAttribute('aria-label', T.customAria(pc(sy.pYes)));
    rows[5].g.classList.toggle('sel', S.sel === null);
    // girdiler
    syncForce(); syncProx(); syncIntent(); savedSl.set(S.dims.saved);
    // sonuç
    resEl.innerHTML = SCENARIOS.map((s) => {
      const a = S.ans[s.id];
      return `<li><span>${s.short}</span><span class="v">${a === undefined ? '—' : a ? T.resYes : T.resNo}</span><span class="v bk">${band(s.book)}${s.id === 'dongu' ? T.resLoop(pc(BOOK.loopLogical)) : ''}</span></li>`;
    }).join('');
    const pf = profile(S.ans);
    const gap = S.ans.anahtar === true && S.ans.kopru === false ? T.profGap : '';
    $('prof').textContent = pf === 'bekliyor'
      ? T.profWait
      : pf === 'faydaci' ? T.profUtil + gap
        : pf === 'deontolog' ? T.profDeon + gap
          : T.profMixed + gap;
    $('gMe').setAttribute('aria-pressed', String(S.g === 'me'));
    $('gThem').setAttribute('aria-pressed', String(S.g === 'them'));
    $('gText').textContent = GREENE_TXT[S.g];
    // Knobe
    $('kHarm').setAttribute('aria-pressed', String(S.knobe === 'zarar'));
    $('kHelp').setAttribute('aria-pressed', String(S.knobe === 'yarar'));
    $('kText').textContent = KNOBE_TXT[S.knobe];
    const kr = $('kRes');
    kr.hidden = S.kAns === null;
    if (S.kAns !== null) {
      const rate = S.knobe === 'zarar' ? BOOK.knobe.zarar : BOOK.knobe.yarar;
      kr.innerHTML = `<p>${T.kResult(S.kAns, S.knobe === 'zarar', pc(rate))}</p>` +
        `<div class="kb"><span>${T.kBarHarm}</span><div class="track" style="--c:var(--amy)"><b style="width:${BOOK.knobe.zarar * 100}%"></b></div><b>${pc(BOOK.knobe.zarar)}</b></div>` +
        `<div class="kb"><span>${T.kBarHelp}</span><div class="track" style="--c:var(--pfc)"><b style="width:${BOOK.knobe.yarar * 100}%"></b></div><b>${pc(BOOK.knobe.yarar)}</b></div>` +
        `<p>${T.kClosing}</p>`;
    }
  }
  const answer = (v: boolean) => { if (S.sel) { S.ans = { ...S.ans, [S.sel]: v }; dirty = true; } };
  scope.on($('yes'), 'click', () => answer(true));
  scope.on($('no'), 'click', () => answer(false));
  scope.on($('gMe'), 'click', () => { S.g = 'me'; dirty = true; });
  scope.on($('gThem'), 'click', () => { S.g = 'them'; dirty = true; });
  scope.on($('kHarm'), 'click', () => { S.knobe = 'zarar'; S.kAns = null; dirty = true; });
  scope.on($('kHelp'), 'click', () => { S.knobe = 'yarar'; S.kAns = null; dirty = true; });
  scope.on($('kYes'), 'click', () => { S.kAns = true; dirty = true; });
  scope.on($('kNo'), 'click', () => { S.kAns = false; dirty = true; });
  function barTrolley(): void {
    const sy = systems(S.dims);
    const word = (v: number) => (v < 0.9 ? T.levels.low : v < 1.8 ? T.levels.mid : T.levels.high);
    setBar(describeTrolley(S.dims), [
      { label: T.barYes, text: pc(sy.pYes), frac: sy.pYes, color: 'var(--ink)' },
      { label: T.barCold, text: word(sy.cold), frac: sy.cold / 3.6, color: 'var(--pfc)' },
      { label: T.barHot, text: word(sy.hot), frac: sy.hot / 3.6, color: 'var(--amy)' },
    ]);
  }

  /* =====================================================================
     2 · Kamu malı ve ceza
     ===================================================================== */
  let runNone = simulate(S.seed, S.soc, false);
  let runPun = simulate(S.seed, S.soc, true);
  const resim = () => { runNone = simulate(S.seed, S.soc, false); runPun = simulate(S.seed, S.soc, true); dirty = true; };
  const play = () => { S.rev = reduced ? PG.rounds : 0; S.acc = 0; dirty = true; };
  const socItems = [{ k: 'yuksek', name: T.socHigh }, { k: 'orta', name: T.socMid }, { k: 'dusuk', name: T.socLow }];
  const SOC: Record<string, Society> = { yuksek: PROFILES.yuksek, orta: { capital: 0.5, law: 0.5 }, dusuk: PROFILES.dusuk };
  const socKey = (): string | null => socItems.find((it) => SOC[it.k].capital === S.soc.capital && SOC[it.k].law === S.soc.law)?.k ?? null;
  const syncSoc = toggles($('socChips'), socItems, socKey, (k) => setSociety(SOC[k]));
  const syncPun = toggles($('punChips'), [{ k: 'on', name: T.punOn }, { k: 'off', name: T.punOff }], () => (S.pun ? 'on' : 'off'), (k) => { S.pun = k === 'on'; });
  let capSl: SliderHandle, lawSl: SliderHandle, roundSl: SliderHandle;
  function setSociety(s: Society): void { S.soc = { ...s }; capSl.set(Math.round(s.capital * 100)); lawSl.set(Math.round(s.law * 100)); resim(); play(); }
  capSl = makeSlider($('socSl'), { name: T.capName, hint: T.capHint, min: 0, max: 100, step: 5, val: 85, fmt: (v) => percent(String(v)), cb: (v) => { S.soc = { ...S.soc, capital: v / 100 }; resim(); play(); }, color: 'var(--pfc)' });
  lawSl = makeSlider($('socSl'), { name: T.lawName, hint: T.lawHint, min: 0, max: 100, step: 5, val: 85, fmt: (v) => percent(String(v)), cb: (v) => { S.soc = { ...S.soc, law: v / 100 }; resim(); play(); }, color: 'var(--pfc)' });
  roundSl = makeSlider($('roundSl'), { name: T.roundName, hint: T.roundHint, min: 1, max: PG.rounds, step: 1, val: PG.rounds, fmt: (v) => `${v} / ${PG.rounds}`, cb: (v) => { S.rev = v; S.acc = 0; dirty = true; } });
  scope.on($('replay'), 'click', play);
  scope.on($('reseed'), 'click', () => { S.seed++; resim(); play(); });

  // Grup sahnesi
  const gSvg = $<SVGElement>('groups');
  const defs = svg('defs', {}, gSvg);
  const mkMarker = (mid: string, cls: string) => {
    const m = svg('marker', { id: `${id}-${mid}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
    svg('path', { d: 'M0,1 L10,5 L0,9 z', class: cls }, m);
  };
  mkMarker('mp', 'mk-pro'); mkMarker('ma', 'mk-anti');
  const POS = [[48, 36], [132, 36], [48, 108], [132, 108]];
  const cellXY = (g: number): [number, number] => [(g % 2) * 180, Math.floor(g / 2) * 152];
  const agentXY = (i: number): [number, number] => { const [cx, cy] = cellXY(Math.floor(i / PG.groupSize)); const p = POS[i % PG.groupSize]; return [cx + p[0], cy + p[1]]; };
  const R_A = 17;
  const edgeLayer = svg('g', {}, gSvg);
  const agentEls = Array.from({ length: N_AGENTS }, (_, i) => {
    const [x, y] = agentXY(i);
    const g = svg('g', { transform: `translate(${x},${y})` }, gSvg);
    const ring = svg('circle', { class: 'a-ring', r: R_A }, g);
    const dia = svg('path', { class: 'a-dia', d: `M0,${-R_A - 3} L${R_A + 3},0 L0,${R_A + 3} L${-R_A - 3},0 z` }, g);
    const dot = svg('circle', { class: 'a-dot', r: 2 }, g);
    const t = svgText(g, { class: 'a-t', x: 0, y: R_A + 13, 'text-anchor': 'middle' }, '');
    return { ring, dia, dot, t };
  });
  for (let g = 0; g < PG.groups; g++) {
    const [cx, cy] = cellXY(g);
    svgText(gSvg, { class: 'ax', x: cx + 90, y: cy + 150 - 6, 'text-anchor': 'middle' }, T.group(g + 1));
  }
  function drawGroups(): void {
    const run = S.pun ? runPun : runNone;
    const r = run.rounds[Math.max(1, S.rev) - 1];
    run.agents.forEach((a, i) => {
      const e = agentEls[i];
      e.ring.setAttribute('class', 'a-ring' + (a.anti ? ' hide' : ''));
      e.dia.setAttribute('class', 'a-dia' + (a.anti ? '' : ' hide'));
      e.dot.setAttribute('r', (2 + 10 * Math.sqrt(r.c[i] / PG.E)).toFixed(1));
      e.dot.setAttribute('class', 'a-dot' + (a.anti ? ' anti' : ''));
      e.t.textContent = String(r.c[i]);
    });
    edgeLayer.replaceChildren();
    for (const p of r.pun) {
      const [x1, y1] = agentXY(p.from), [x2, y2] = agentXY(p.to);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const off = 5, ox = -uy * off, oy = ux * off;
      const a = R_A + 5, b = R_A + 7;
      svg('path', {
        class: 'ar' + (p.anti ? ' anti' : ''), 'stroke-width': (1.2 + p.pts * 0.4).toFixed(1),
        d: `M${(x1 + ux * a + ox).toFixed(1)},${(y1 + uy * a + oy).toFixed(1)} L${(x2 - ux * b + ox).toFixed(1)},${(y2 - uy * b + oy).toFixed(1)}`,
        'marker-end': `url(#${id}-${p.anti ? 'ma' : 'mp'})`,
      }, edgeLayer);
    }
    gSvg.setAttribute('aria-label', T.groupsAria(Math.max(1, S.rev), S.pun, f1(avgContribution(r)), r.pun.length));
  }

  // Zaman grafikleri
  const C1 = { x0: 34, x1: 346, top: 12, bot: 148 };
  const c1 = $<SVGElement>('chart1');
  const rx = (t: number, c = C1): number => c.x0 + ((c.x1 - c.x0) * (t - 1)) / (PG.rounds - 1);
  const c1y = (v: number): number => C1.bot - ((C1.bot - C1.top) * v) / PG.E;
  yGrid(c1, C1.x0, C1.x1, c1y, [0, 10, 20], String);
  for (let t = 1; t <= PG.rounds; t += t === 1 ? 2 : 2) svgText(c1, { class: 'ax', x: rx(t), y: C1.bot + 14, 'text-anchor': 'middle' }, String(t));
  svgText(c1, { class: 'ax', x: (C1.x0 + C1.x1) / 2, y: C1.bot + 28, 'text-anchor': 'middle' }, T.round);
  const lnNone = svg('polyline', { class: 'ln none', points: '' }, c1), lnPun = svg('polyline', { class: 'ln pun', points: '' }, c1);
  const lbNone = svgText(c1, { class: 'lb', x: 0, y: 0 }, T.noPun), lbPun = svgText(c1, { class: 'lb', x: 0, y: 0 }, T.withPun);
  const mkPts = (rs: Round[], upTo: number): string => rs.slice(0, upTo).map((r, i) => `${rx(i + 1).toFixed(1)},${c1y(avgContribution(r)).toFixed(1)}`).join(' ');

  const C2 = { x0: 34, x1: 346, top: 20, bot: 112 };
  const c2 = $<SVGElement>('chart2');
  const c2Grid = svg('g', {}, c2), c2Bars = svg('g', {}, c2);
  for (let t = 1; t <= PG.rounds; t += 2) svgText(c2, { class: 'ax', x: rx(t, C2), y: C2.bot + 14, 'text-anchor': 'middle' }, String(t));
  svgText(c2, { class: 'ax', x: (C2.x0 + C2.x1) / 2, y: C2.bot + 28, 'text-anchor': 'middle' }, T.round);
  const c2Leg = svgText(c2, { class: 'ax', x: C2.x0, y: 9 }, '');
  function drawCharts(): void {
    const n = Math.max(S.rev, 0);
    lnNone.setAttribute('points', mkPts(runNone.rounds, n)); lnPun.setAttribute('points', mkPts(runPun.rounds, n));
    lnNone.setAttribute('class', 'ln none' + (S.pun ? '' : ' act')); lnPun.setAttribute('class', 'ln pun' + (S.pun ? ' act' : ''));
    const last = Math.max(1, n);
    const yN = c1y(avgContribution(runNone.rounds[last - 1])), yP = c1y(avgContribution(runPun.rounds[last - 1]));
    const punUp = yP <= yN;
    for (const [el, y, up] of [[lbNone, yN, !punUp], [lbPun, yP, punUp]] as const) { el.setAttribute('x', String(C1.x1)); el.setAttribute('text-anchor', 'end'); el.setAttribute('y', String(up ? y - 6 : y + 14)); }
    lbNone.setAttribute('opacity', n ? '1' : '0'); lbPun.setAttribute('opacity', n ? '1' : '0');
    const mx = Math.max(20, ...runPun.rounds.map((r) => r.proSpend + r.antiSpend));
    const top = Math.ceil(mx / 20) * 20;
    c2Grid.replaceChildren(); c2Bars.replaceChildren();
    yGrid(c2Grid, C2.x0, C2.x1, (v) => C2.bot - ((C2.bot - C2.top) * v) / top, [0, top / 2, top], String);
    const bw = 18;
    runPun.rounds.slice(0, n).forEach((r, i) => {
      const x = rx(i + 1, C2) - bw / 2, h1 = ((C2.bot - C2.top) * r.proSpend) / top, h2 = ((C2.bot - C2.top) * r.antiSpend) / top;
      svg('rect', { class: 'b-pro', x, y: C2.bot - h1, width: bw, height: h1 }, c2Bars);
      svg('rect', { class: 'b-anti', x, y: C2.bot - h1 - h2, width: bw, height: h2 }, c2Bars);
    });
    c2Leg.textContent = T.punLegend;
  }

  // Henrich
  const mkItems = [{ k: 'hadza', name: T.mkHadza }, { k: 'big', name: T.mkBig }];
  const MK: Record<string, Market> = { hadza: HADZA, big: BIG_MARKET };
  const mkKey = (): string | null => mkItems.find((it) => { const m = MK[it.k]; return m.market === S.mk.market && m.size === S.mk.size && m.religion === S.mk.religion; })?.k ?? null;
  const syncMk = toggles($('mkChips'), mkItems, mkKey, (k) => setMarket(MK[k]));
  const sizeOf = (t: number): number => Math.round(Math.pow(10, 1 + 3 * t));
  const tOf = (size: number): number => (Math.log10(size) - 1) / 3;
  let mSl: SliderHandle, zSl: SliderHandle, rSl: SliderHandle;
  const fmtSize = (t: number): string => { const s = sizeOf(t); return s >= 1000 ? T.sizeThousand((Math.round(s / 100) / 10).toString().replace('.', decimalSep())) : T.sizePeople(s); };
  function setMarket(m: Market): void {
    S.mk = { ...m };
    mSl.set(Math.round(m.market * 100)); zSl.set(Math.round(tOf(m.size) * 100) / 100); rSl.set(Math.round(m.religion * 100)); dirty = true;
  }
  const mkSlH = $('mkSl');
  mSl = makeSlider(mkSlH, { name: T.marketName, hint: T.marketHint, min: 0, max: 90, step: 5, val: 0, fmt: (v) => percent(String(v)), cb: (v) => { S.mk = { ...S.mk, market: v / 100 }; dirty = true; }, color: 'var(--dop)' });
  zSl = makeSlider(mkSlH, { name: T.sizeName, hint: T.sizeHint, min: 0, max: 1, step: 0.01, val: tOf(40), fmt: fmtSize, cb: (v) => { S.mk = { ...S.mk, size: sizeOf(v) }; dirty = true; }, color: 'var(--dop)' });
  rSl = makeSlider(mkSlH, { name: T.religionName, hint: T.religionHint, min: 0, max: 100, step: 5, val: 0, fmt: (v) => percent(String(v)), cb: (v) => { S.mk = { ...S.mk, religion: v / 100 }; dirty = true; }, color: 'var(--dop)' });
  makeSlider(mkSlH, { name: T.offerName, hint: T.offerHint, min: 0, max: 50, step: 1, val: 30, fmt: (v) => percent(String(v)), cb: (v) => { S.offer = v / 100; dirty = true; }, color: 'var(--ink)' });

  const C3 = { x0: 34, x1: 346, top: 12, bot: 148 };
  const c3 = $<SVGElement>('chart3');
  const ox = (o: number): number => C3.x0 + ((C3.x1 - C3.x0) * o) / 0.5;
  const oy = (p: number): number => C3.bot - (C3.bot - C3.top) * p;
  yGrid(c3, C3.x0, C3.x1, oy, [0, 0.5, 1], pc);
  for (const v of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) svgText(c3, { class: 'ax', x: ox(v), y: C3.bot + 14, 'text-anchor': v === 0 ? 'start' : v === 0.5 ? 'end' : 'middle' }, pc(v));
  svgText(c3, { class: 'ax', x: (C3.x0 + C3.x1) / 2, y: C3.bot + 28, 'text-anchor': 'middle' }, T.offerAxis);
  const curve = (m: Market): string => Array.from({ length: 51 }, (_, i) => { const o = i / 100; return `${ox(o).toFixed(1)},${oy(pReject(o, m)).toFixed(1)}`; }).join(' ');
  svg('polyline', { class: 'ln ref1', points: curve(HADZA) }, c3);
  svg('polyline', { class: 'ln ref2', points: curve(BIG_MARKET) }, c3);
  const lnCur = svg('polyline', { class: 'ln cur', points: '' }, c3);
  const offLine = svg('line', { class: 'offline', y1: C3.top, y2: C3.bot }, c3);
  const offDot = svg('circle', { class: 'cur-dot', r: 4.5 }, c3);
  const lgY = 198;
  svg('line', { class: 'ln ref1', x1: C3.x0, x2: C3.x0 + 18, y1: lgY - 4, y2: lgY - 4 }, c3); svgText(c3, { class: 'ax lgt', x: C3.x0 + 23, y: lgY }, T.legHadza);
  svg('line', { class: 'ln ref2', x1: C3.x0 + 104, x2: C3.x0 + 122, y1: lgY - 4, y2: lgY - 4 }, c3); svgText(c3, { class: 'ax lgt', x: C3.x0 + 127, y: lgY }, T.legBig);
  svg('line', { class: 'ln cur', x1: C3.x0 + 232, x2: C3.x0 + 250, y1: lgY - 4, y2: lgY - 4 }, c3); svgText(c3, { class: 'ax lgt', x: C3.x0 + 255, y: lgY }, T.legSelected);
  function drawMarket(): void {
    lnCur.setAttribute('points', curve(S.mk));
    offLine.setAttribute('x1', String(ox(S.offer))); offLine.setAttribute('x2', String(ox(S.offer)));
    offDot.setAttribute('cx', String(ox(S.offer))); offDot.setAttribute('cy', String(oy(pReject(S.offer, S.mk))));
    $('mkRead').innerHTML = tiles([[T.tileDictator, pc(dictatorOffer(S.mk))], [T.tileThreshold, pc(rejectThreshold(S.mk))],
      [T.tileReject, pc(pReject(S.offer, S.mk))], [T.tileBest, pc(bestOffer(S.mk))]]);
    syncMk();
  }
  function barPG(): void {
    const run = S.pun ? runPun : runNone;
    const n = Math.max(1, S.rev);
    const r = run.rounds[n - 1];
    setBar(S.pun ? describePG(runNone, runPun, n, S.soc) : T.pgOff(n, Math.round(avgContribution(r)), PG.E), [
      { label: T.barAvgContrib, text: `${Math.round(avgContribution(r))}/${PG.E}`, frac: avgContribution(r) / PG.E, color: 'var(--pfc)' },
      { label: T.barAntiPun, text: S.pun ? pc(antiFraction(runPun, n)) : '—', frac: S.pun ? antiFraction(runPun, n) : 0, color: 'var(--amy)' },
      { label: T.barAvgPay, text: f1(avgPay(r)), frac: avgPay(r) / 32, color: 'var(--ink)' },
    ]);
  }

  /* =====================================================================
     3 · Zar ve dürüstlük
     ===================================================================== */
  const mixKey = (): string | null => MIXES.find((m) => Math.abs(m.mix.justified - S.mix.justified) < 1e-9 && Math.abs(m.mix.liar - S.mix.liar) < 1e-9)?.id ?? null;
  const syncMix = toggles($('mixChips'), MIXES.map((m) => ({ k: m.id, name: m.name })), mixKey, (k) => setMix(MIXES.find((m) => m.id === k)!.mix));
  let jSl: SliderHandle, lSl: SliderHandle;
  function setMix(m: Mix): void { S.mix = { ...m }; jSl.set(Math.round(m.justified * 100)); lSl.set(Math.round(m.liar * 100)); dirty = true; }
  jSl = makeSlider($('mixSl'), { name: T.jName, hint: T.jHint, min: 0, max: 100, step: 5, val: 65, fmt: (v) => percent(String(v)), cb: (v) => { S.mix = normMix({ ...S.mix, justified: v / 100 }); lSl.set(Math.round(S.mix.liar * 100)); dirty = true; }, color: 'var(--dop)' });
  lSl = makeSlider($('mixSl'), { name: T.lName, hint: T.lHint, min: 0, max: 100, step: 1, val: 5, fmt: (v) => percent(String(v)), cb: (v) => { S.mix = normMix({ ...S.mix, liar: v / 100 }); dirty = true; }, color: 'var(--amy)' });
  scope.on($('rerun'), 'click', () => { S.dseed++; dirty = true; });
  const H = { x0: 34, x1: 346, top: 18, bot: 172 };
  const hist = $<SVGElement>('hist');
  const hGrid = svg('g', {}, hist), hBars = svg('g', {}, hist);
  const hx = (f: number): number => H.x0 + ((H.x1 - H.x0) * (f - 0.5)) / 6;
  const hFlat = svg('line', { class: 'flat', x1: H.x0, x2: H.x1 }, hist);
  const hExp = svg('g', {}, hist);
  FACES.forEach((f) => {
    svgText(hist, { class: 'ax', x: hx(f), y: H.bot + 14, 'text-anchor': 'middle' }, String(f));
    svgText(hist, { class: 'ax', x: hx(f), y: H.bot + 27, 'text-anchor': 'middle' }, T.payout(payOf(f)));
  });
  const DICE_CLS = ['d0', 'd1', 'd2'];
  function drawHist(): void {
    const m = normMix(S.mix);
    const bt = sampleByType(S.dseed, N_DICE, m);
    const tot = FACES.map((_, i) => bt[0][i] + bt[1][i] + bt[2][i]);
    const exp = expectedDist(m);
    const ymax = [0.3, 0.6, 1].find((v) => v >= Math.max(...tot.map((x) => x / N_DICE), ...exp)) ?? 1;
    const y = (p: number) => H.bot - ((H.bot - H.top) * p) / ymax;
    hGrid.replaceChildren(); hBars.replaceChildren(); hExp.replaceChildren();
    yGrid(hGrid, H.x0, H.x1, y, [0, ymax / 2, ymax], pc);
    hFlat.setAttribute('y1', String(y(1 / 6))); hFlat.setAttribute('y2', String(y(1 / 6)));
    const bw = 32;
    FACES.forEach((f, i) => {
      let acc = 0;
      for (let t = 0; t < 3; t++) {
        const p = bt[t][i] / N_DICE;
        if (p <= 0) continue;
        svg('rect', { class: `hb ${DICE_CLS[t]}`, x: hx(f) - bw / 2, y: y(acc + p), width: bw, height: y(acc) - y(acc + p) }, hBars);
        acc += p;
      }
      svgText(hBars, { class: 'hv', x: hx(f), y: y(acc) - 4, 'text-anchor': 'middle' }, pc(acc));
      svg('line', { class: 'expt', x1: hx(f) - bw / 2 - 3, x2: hx(f) + bw / 2 + 3, y1: y(exp[i]), y2: y(exp[i]) }, hExp);
    });
    const e = expectedDist(m);
    $('diceRead').innerHTML = tiles([[T.tileExpPay, f2(expectedPay(e))], [T.tileWhenHonest, f2(2.5)],
      [T.tileDeviation, pc(deviation(e))], [T.tileHonestShare, pc(honestShare(m))]]);
    hist.setAttribute('aria-label', T.histAriaLive(FACES.map((f, i) => T.histItem(f, pc(tot[i] / N_DICE)))));
    syncMix();
  }
  const diceEl = $('dice');
  function drawRoll(): void {
    const rr = $('rollRes');
    if (!S.roll) { diceEl.innerHTML = `<p class="note">${T.rollHint}</p>`; rr.innerHTML = ''; return; }
    const [a, b] = S.roll, best = bestOf(a, b);
    diceEl.innerHTML = `<div class="die" role="img" aria-label="${T.firstRoll}: ${a}"><small>${T.firstRoll}</small><b>${a}</b></div><div class="die" role="img" aria-label="${T.secondRoll}: ${b}"><small>${T.secondRoll}</small><b>${b}</b></div>`;
    rr.innerHTML =
      `<li><span>${T.rowHonest}</span><span class="v">${T.reports(a)}</span><span class="v bk">${T.payout(payOf(a))}</span></li>` +
      `<li><span>${T.rowJustified}</span><span class="v">${T.reports(best)}</span><span class="v bk">${T.payout(payOf(best))}</span></li>` +
      `<li><span>${T.rowLiar}</span><span class="v">${T.reports(5)}</span><span class="v bk">${T.payout(5)}</span></li>`;
  }
  scope.on($('roll'), 'click', () => {
    const r = mulberry32(S.rollSeed++ * 97 + 11);
    S.roll = [1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6)];
    drawRoll();
    announce();
  });
  function barDice(): void {
    const m = normMix(S.mix), e = expectedDist(m);
    setBar(describeDice(m), [
      { label: T.barExpPay, text: f2(expectedPay(e)), frac: expectedPay(e) / 5, color: 'var(--ink)' },
      { label: T.barDeviation, text: pc(deviation(e)), frac: deviation(e), color: 'var(--dop)' },
      { label: T.barFive, text: pc(e[4]), frac: e[4], color: 'var(--amy)' },
    ]);
  }

  /* ---------- Rehberli turlar ---------- */
  const tour1 = createTour(scope, [
    { ...T.tour1[0], apply: () => selectScenario('anahtar') },
    { ...T.tour1[1], apply: () => selectScenario('kopru') },
    { ...T.tour1[2], apply: () => selectScenario('sopa') },
    { ...T.tour1[3], apply: () => selectScenario('dongu') },
    { ...T.tour1[4], apply: () => selectScenario('kopru', 30) },
    { ...T.tour1[5], apply: () => { selectScenario('anahtar'); S.g = 'them'; } },
  ]);
  $('tour1').appendChild(tour1.el);

  const tour2 = createTour(scope, [
    { ...T.tour2[0], apply: () => { S.pun = false; setSociety(PROFILES.yuksek); } },
    { ...T.tour2[1], apply: () => { S.pun = true; setSociety(PROFILES.yuksek); } },
    { ...T.tour2[2], apply: () => { S.pun = true; setSociety(PROFILES.dusuk); } },
    { ...T.tour2[3], apply: () => setMarket(HADZA) },
    { ...T.tour2[4], apply: () => setMarket(BIG_MARKET) },
  ]);
  $('tour2').appendChild(tour2.el);

  const tour3 = createTour(scope, [
    { ...T.tour3[0], apply: () => setMix(MIXES[0].mix) },
    { ...T.tour3[1], apply: () => setMix({ justified: 1, liar: 0 }) },
    { ...T.tour3[2], apply: () => setMix(MIXES[2].mix) },
    { ...T.tour3[3], apply: () => setMix({ justified: 0.65, liar: 0.05 }) },
  ]);
  $('tour3').appendChild(tour3.el);

  /* ---------- Başlangıç ---------- */
  S.rev = PG.rounds;
  roundSl.set(S.rev);
  drawRoll();
  const poke = scope.announcer($('live'), () => lastSay);
  const onAction = () => { if (dirty) { dirty = false; render(); } poke(); };
  function announce(): void { poke(); }
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);

  let last = performance.now();
  function render(): void {
    if (S.tab === 'tro') { drawTrolley(); barTrolley(); }
    else if (S.tab === 'pg') { drawGroups(); drawCharts(); drawMarket(); syncSoc(); syncPun(); roundSl.set(Math.max(1, S.rev)); barPG(); }
    else { drawHist(); barDice(); }
  }
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (S.tab === 'pg' && S.rev < PG.rounds) {
      S.acc += dt;
      if (S.acc >= 0.55) { S.acc = 0; S.rev++; dirty = true; }
    }
    if (dirty) { dirty = false; render(); }
  }
  render();
  // Sayfa altı notları (nasıl çalışıyor + Kitapta) ayrı parçadan gelir; etkileşimli kısım daha küçük açılır.
  lazyNotes(scope, root, () => import('./notes').then((m) => m.default()));
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
