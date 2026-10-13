import { slider, type SliderHandle } from '../ui';
import '../sim.css';
import './view.css';
import { Scope, pct, ref, svg, svgText, uid } from '../kit';
import { L } from './text';
import {
  U0, hormAt, msOfLog, MS, neuroAt, organ, receptor, settleAxis, stepAxis, describeAxis,
  type AxisInputs, type AxisKey, type AxisState, type ReceptorParams,
} from './model';

type Tab = 'axis' | 'rec' | 'time';

interface StageDef { t: string; h: string; c: string }
interface StructDef { chip: string; stages: StageDef[]; note: string; drive?: [string, string]; pulse: string; series: string[] }

// Yapı (renk) burada; metin okuma anında `L()` ile gelir. Alanlar getter olduğu için dil değişince bayat kalmaz.
const AXC: Record<AxisKey, string[]> = {
  hpa: ['--hyp', '--pit', '--gld'],
  hpg: ['--hyp', '--pit', '--gld'],
  two: ['--hyp', '--pit'],
  glu: ['--red', '--gld'],
};
const mkStruct = (k: AxisKey): StructDef => ({
  get chip() { return L().axes[k].chip; },
  get stages() { return L().axes[k].stages.map((s, i) => ({ t: s.t, h: s.h, c: AXC[k][i] })); },
  get note() { return L().axes[k].note; },
  get drive() { return k === 'glu' ? undefined : (L().drive[k] as [string, string]); },
  get pulse() { return L().axes[k].pulse; },
  get series() { return L().axes[k].series; },
});
export const STRUCT: Record<AxisKey, StructDef> = { hpa: mkStruct('hpa'), hpg: mkStruct('hpg'), two: mkStruct('two'), glu: mkStruct('glu') };
const mkFoot = (): Record<AxisKey, string> => ({
  get hpa() { return L().axes.hpa.foot; },
  get hpg() { return L().axes.hpg.foot; },
  get two() { return L().axes.two.foot; },
  get glu() { return L().axes.glu.foot; },
});
export const FOOT: Record<AxisKey, string> = mkFoot();

const RV: ReceptorParams[] = [
  { hormone: 0.5, number: 0.6, affinity: 0.5, specificity: 1, other: 0 },
  { hormone: 0.9, number: 0, affinity: 0.5, specificity: 1, other: 0 },
  { hormone: 0.15, number: 1, affinity: 0.9, specificity: 1, other: 0 },
  { hormone: 0.95, number: 0.15, affinity: 0.5, specificity: 1, other: 0 },
  { hormone: 0.4, number: 0.6, affinity: 0.5, specificity: 0.15, other: 0.8 },
];
export const RPRE: { n: string; v: ReceptorParams }[] = RV.map((v, i) => ({ get n() { return L().presets[i]; }, v }));
const RC_KEYS: [keyof ReceptorParams, string][] = [['hormone', 'var(--hyp)'], ['number', 'var(--eff)'], ['affinity', 'var(--eff)'], ['specificity', 'var(--gld)'], ['other', 'var(--red)']];

const TEMPLATE = (id: string) => {
  const T = L();
  return `
<div class="sim sim-endo">
  <p class="lede">${T.lede}</p>

  <div class="tabs" role="tablist" aria-label="${T.tabsLabel}">
    <button class="tab" role="tab" id="${id}-tab-axis" data-pane="axis" aria-controls="${id}-pane-axis" aria-selected="true" type="button">${T.tabs.axis}</button>
    <button class="tab" role="tab" id="${id}-tab-rec" data-pane="rec" aria-controls="${id}-pane-rec" aria-selected="false" tabindex="-1" type="button">${T.tabs.rec}</button>
    <button class="tab" role="tab" id="${id}-tab-time" data-pane="time" aria-controls="${id}-pane-time" aria-selected="false" tabindex="-1" type="button">${T.tabs.time}</button>
  </div>

  <div class="sim-bar" role="group" aria-label="${T.sayLabel}" data-ref="bar"><div class="sim-bar-in"><p class="say" data-ref="say"></p></div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section class="pane" role="tabpanel" id="${id}-pane-axis" data-pane="axis" aria-labelledby="${id}-tab-axis">
    <div class="chips" data-ref="axChips" role="group" aria-label="${T.chipsLabel}"></div>
    <p class="note" data-ref="axNote"></p>
    <div class="stage"><svg data-ref="axSvg" role="group" aria-label="${T.diagramLabel}"></svg></div>
    <div class="row">
      <button class="btn" data-ref="axPulse" type="button"></button>
      <button class="btn" data-ref="axFb" type="button" aria-pressed="true">${T.fbOn}</button>
      <button class="btn" data-ref="axPause" type="button" aria-pressed="false">${T.pause}</button>
      <button class="btn" data-ref="axSpeed" type="button">${T.speed(1)}</button>
      <button class="btn" data-ref="axReset" type="button">${T.reset}</button>
    </div>
    <section class="chart" aria-label="${T.chartSec}">
      <h3 class="sim-h">${T.chartH}</h3>
      <svg data-ref="axChart" viewBox="0 0 360 160" role="img" aria-label="${T.chartLabel}"></svg>
    </section>
    <section aria-label="${T.inputsSec}"><h3 class="sim-h">${T.inputsH}</h3><div class="sliders" data-ref="axSliders"></div></section>
    <p class="foot" data-ref="axFoot"></p>
  </section>

  <section class="pane" role="tabpanel" id="${id}-pane-rec" data-pane="rec" aria-labelledby="${id}-tab-rec" hidden>
    <p class="note">${T.rcNote}</p>
    <div class="chips" data-ref="rcChips" role="group" aria-label="${T.rcChipsLabel}"></div>
    <div class="stage"><svg data-ref="rcSvg" viewBox="0 0 360 250" role="img" aria-label="${T.rcSvgLabel}"></svg>
      <div class="legend">
        <span><i style="background:var(--hyp)"></i>${T.legendMain}</span>
        <span><i style="background:var(--red)"></i>${T.legendOther}</span>
      </div>
    </div>
    <div class="meters card" data-ref="rcMeters"></div>
    <section aria-label="${T.rcInputsSec}"><h3 class="sim-h">${T.inputsH}</h3><div class="sliders" data-ref="rcSliders"></div></section>
    <p class="foot">${T.rcFoot}</p>
  </section>

  <section class="pane" role="tabpanel" id="${id}-pane-time" data-pane="time" aria-labelledby="${id}-tab-time" hidden>
    <div class="card">
      <h3 class="sim-h">${T.scopeH}</h3>
      <p class="note">${T.scopeNote}</p>
      <svg data-ref="tmSvg" viewBox="0 0 360 170" role="img" aria-label="${T.timeLabel}" style="display:block;width:100%;height:auto"></svg>
      <div class="sliders"><div>
        <div class="sl-top"><label class="sl-name" for="${id}-tmSl">${T.timeSlider}</label><span class="sl-val" data-ref="tmVal"></span></div>
        <input type="range" id="${id}-tmSl" data-ref="tmSl" min="0" max="894" step="1" value="40">
      </div></div>
      <div class="readout" data-ref="tmRead"></div>
    </div>

    <div class="card">
      <h3 class="sim-h">${T.orgH}</h3>
      <p class="note">${T.orgNote}</p>
      <div class="sliders" data-ref="orSliders"></div>
      <div class="meters" data-ref="orMeters"></div>
      <div class="row"><button class="btn" data-ref="orCut" type="button">${T.orgCut}</button></div>
    </div>
    <p class="foot">${T.timeFoot}</p>
  </section>
</div>`;
};

export function mount(container: HTMLElement): () => void {
  const T = L();
  const scope = new Scope();
  const id = uid('endo');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  /* ---------- Sekmeler ---------- */
  let tab: Tab = 'axis';
  const SAY: Partial<Record<Tab, () => string>> = {};
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  const sayEl = $('say');
  // Duraklatılmışken ve girdi değişmemişken eksen yeniden çizilmez; her kullanıcı eylemi işaretler.
  let dirty = true;
  function showTab(t: Tab, focus = false): void {
    tab = t;
    dirty = true;
    for (const b of tabBtns) {
      const on = b.dataset.pane === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const p of panes) p.hidden = p.dataset.pane !== t;
    say();
  }
  for (const b of tabBtns) {
    scope.on(b, 'click', () => showTab(b.dataset.pane as Tab));
    scope.on(b, 'keydown', (ev) => {
      const i = tabBtns.indexOf(b);
      const j = ev.key === 'ArrowRight' ? (i + 1) % tabBtns.length : ev.key === 'ArrowLeft' ? (i + tabBtns.length - 1) % tabBtns.length : -1;
      if (j >= 0) { ev.preventDefault(); showTab(tabBtns[j].dataset.pane as Tab, true); }
    });
  }
  let lastSay = '';
  function say(): void { const t = SAY[tab]?.() || ''; if (t !== lastSay) { lastSay = t; sayEl.textContent = t; } }

  /* ---------- Ortak kaydırıcı ---------- */
  function makeSlider(parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, val: number,
    cb: (v: number) => void, valFmt: ((v: number) => string) | null, color: string, sc: Scope = scope): SliderHandle {
    return slider(sc, parent, { id: `${id}-sl-${key}`, name, hint, min, max, value: val, fmt: valFmt ?? ((v) => `${v}%`), color, onInput: cb });
  }

  /* =====================================================
     EKSEN
     ===================================================== */
  interface AxisState2 { axis: AxisKey; x: AxisState; t: number; hist: Array<{ t: number; x: AxisState }>; lastSample: number; pulseUntil: number; paused: boolean; speed: number; u: AxisInputs }
  const A: AxisState2 = { axis: 'hpa', x: { s: [0, 0, 0], e: 0 }, t: 0, hist: [], lastSample: 0, pulseUntil: -1, paused: false, speed: 1, u: { ...U0 } };
  const cfg = () => STRUCT[A.axis];
  const effU = (): AxisInputs => {
    const pulsing = A.t < A.pulseUntil;
    if (A.axis === 'glu') return { ...A.u, meal: pulsing ? 1 : A.u.meal };
    return { ...A.u, drive: pulsing ? 1 : A.u.drive };
  };
  const resettle = () => { A.x = settleAxis(A.axis, { ...A.u }, 900); A.hist = []; A.t = 0; A.lastSample = 0; A.pulseUntil = -1; };

  const axSliders = $('axSliders');
  const axSl: Record<string, SliderHandle> = {};
  // Eksen değişince kaydırıcılar yeniden kurulur; eski dinleyiciler ayrı bir kapsamda bırakılır.
  let axScope = new Scope();
  scope.onDispose(() => axScope.dispose());
  function buildAxSliders(): void {
    axScope.dispose(); axScope = new Scope();
    axSliders.innerHTML = '';
    for (const k in axSl) delete axSl[k];
    if (A.axis === 'glu') {
      axSl.meal = makeSlider(axSliders, 'meal', T.meal[0], T.meal[1], 0, 100, pct(A.u.meal), (v) => { A.u.meal = v / 100; }, null, 'var(--red)', axScope);
      axSl.brain = makeSlider(axSliders, 'brain', T.brainSupport[0], T.brainSupport[1], 0, 100, pct(A.u.brain), (v) => { A.u.brain = v / 100; }, null, 'var(--hyp)', axScope);
    } else {
      const [nm, ht] = T.drive[A.axis];
      axSl.drive = makeSlider(axSliders, 'drive', nm, ht, 0, 100, pct(A.u.drive), (v) => { A.u.drive = v / 100; }, null, 'var(--hyp)', axScope);
      axSl.other = makeSlider(axSliders, 'other', T.otherName, T.otherHint[A.axis], -100, 100, Math.round(A.u.other * 100), (v) => { A.u.other = v / 100; }, (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%', 'var(--pit)', axScope);
    }
  }

  // ---- Diyagram ----
  interface Diagram {
    stages: { fill: SVGElement; pc: SVGElement }[]; arrows: SVGElement[]; fbs: SVGElement[];
    blood: SVGElement; cellA: SVGElement; cellAp: SVGElement; brain?: SVGElement;
  }
  let D: Diagram | null = null;
  const BX = 18, BW = 216, BH = 64, GAP = 36, Y0 = 10;
  const axSvg = $<SVGElement>('axSvg');
  function buildDiagram(): void {
    const sv = axSvg;
    sv.innerHTML = '';
    const c = cfg(), n = c.stages.length;
    const bloodY = Y0 + (n - 1) * (BH + GAP) + BH + 28;
    const cellY = bloodY + 34 + 52;
    const H = cellY + 26 + 30;
    sv.setAttribute('viewBox', `0 0 360 ${H}`);
    const defs = svg('defs', {}, sv);
    const m1 = svg('marker', { id: `${id}-ma`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
    svg('path', { class: 'mk', d: 'M0,1 L10,5 L0,9 z' }, m1);
    const m2 = svg('marker', { id: `${id}-mb`, viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 10, markerHeight: 10, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
    svg('path', { class: 'mk-bar', d: 'M5,0 L5,10' }, m2);
    const d: Diagram = { stages: [], arrows: [], fbs: [], blood: null as unknown as SVGElement, cellA: null as unknown as SVGElement, cellAp: null as unknown as SVGElement };

    const stageY = (i: number) => Y0 + i * (BH + GAP);
    c.stages.forEach((s, i) => {
      const y = stageY(i);
      const g = svg('g', {}, sv);
      svg('rect', { class: 'box', x: BX, y, width: BW, height: BH, rx: 10 }, g);
      svg('rect', { x: BX, y: y + 12, width: 4, height: BH - 24, rx: 2, fill: `var(${s.c})` }, g);
      svgText(g, { class: 't-title', x: BX + 14, y: y + 20 }, s.t);
      const hs = s.h.length > 30 ? s.h.slice(0, 29) + '…' : s.h; // kutuya sığar (10,5 px mono ≈ 6,3 px/karakter)
      svgText(g, { class: 't-hor', x: BX + 14, y: y + 35 }, hs);
      svg('rect', { class: 'trk', x: BX + 14, y: y + 46, width: 150, height: 7, rx: 3.5 }, g);
      const fill = svg('rect', { x: BX + 14, y: y + 46, width: 0, height: 7, rx: 3.5, fill: `var(${s.c})` }, g);
      const pc = svgText(g, { class: 't-pct', x: BX + BW - 12, y: y + 53 }, '0%');
      d.stages.push({ fill, pc });
      if (i < n - 1) {
        const x = BX + BW / 2;
        d.arrows.push(svg('path', { class: 'arrow', d: `M${x},${y + BH + 3} L${x},${y + BH + GAP - 4}`, 'marker-end': `url(#${id}-ma)` }, sv));
      }
    });
    if (A.axis === 'glu') { // beyin desteği etiketi
      const y = stageY(1);
      d.brain = svgText(sv, { class: 't-hor', x: BX + BW + 12, y: y + 56, style: 'fill:var(--hyp)' }, '');
    }
    // geri bildirim: son basamaktan öncekilere
    const lastC = stageY(n - 1) + BH / 2;
    const targets = A.axis === 'hpa' || A.axis === 'hpg' ? [0, 1] : [0];
    targets.forEach((j, k) => {
      const yj = stageY(j) + BH / 2, bx = 276 + k * 26;
      d.fbs.push(svg('path', { class: 'fbk', d: `M${BX + BW + 2},${lastC + (k ? 10 : -4)} C${bx + 40},${lastC + (k ? 10 : -4)} ${bx + 40},${yj} ${BX + BW + 6},${yj}`, 'marker-end': `url(#${id}-mb)` }, sv));
    });
    svgText(sv, { class: 't-hor', x: BX + BW + 10, y: stageY(n - 1) + BH + 18 }, T.feedbackLabel);
    // kan dolaşımı
    const lastBottom = stageY(n - 1) + BH;
    svg('path', { class: 'arrow', d: `M${BX + BW / 2},${lastBottom + 3} L${BX + BW / 2},${bloodY - 4}`, 'marker-end': `url(#${id}-ma)` }, sv);
    svg('rect', { class: 'trk', x: BX, y: bloodY, width: 324, height: 28, rx: 14 }, sv);
    d.blood = svg('rect', { x: BX, y: bloodY, width: 0, height: 28, rx: 14, fill: `var(${c.stages[n - 1].c})`, opacity: 0.85 }, sv);
    svgText(sv, { class: 't-title', x: BX + 162, y: bloodY + 18, 'text-anchor': 'middle', fill: 'var(--ink)', style: 'paint-order:stroke;stroke:var(--panel);stroke-width:3px;stroke-linejoin:round' }, T.blood);
    // hedef hücreler
    const cx1 = 100, cx2 = 260;
    for (const cx of [cx1, cx2]) svg('path', { class: 'arrow', d: `M${cx},${bloodY + 32} L${cx},${cellY - 32}`, 'marker-end': `url(#${id}-ma)` }, sv);
    d.cellA = svg('circle', { cx: cx1, cy: cellY, r: 26, fill: 'var(--eff)', 'fill-opacity': 0.1, stroke: 'var(--eff)', 'stroke-width': 2 }, sv);
    for (let k = 0; k < 6; k++) { // reseptör çentikleri
      const a = (k / 6) * Math.PI * 2;
      svg('rect', { x: cx1 - 3, y: cellY - 26 - 6, width: 6, height: 6, rx: 1.5, fill: 'var(--eff)', transform: `rotate(${(a * 180) / Math.PI} ${cx1} ${cellY})` }, sv);
    }
    d.cellAp = svgText(sv, { class: 't-pct', x: cx1, y: cellY + 4, style: 'text-anchor:middle' }, '0%');
    svgText(sv, { class: 't-cap', x: cx1, y: cellY + 46 }, T.cellWith);
    svg('circle', { cx: cx2, cy: cellY, r: 26, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.6, 'stroke-dasharray': '4 4' }, sv);
    svgText(sv, { class: 't-pct', x: cx2, y: cellY + 4, style: 'text-anchor:middle;fill:var(--muted)' }, '0%');
    svgText(sv, { class: 't-cap', x: cx2, y: cellY + 46 }, T.cellWithout);
    D = d;
  }

  function drawDiagram(): void {
    if (!D) return;
    const s = A.x.s;
    s.forEach((v, i) => { D!.stages[i].fill.setAttribute('width', (150 * v).toFixed(1)); D!.stages[i].pc.textContent = pct(v) + '%'; });
    D.arrows.forEach((a, i) => { const v = s[i]; a.style.strokeWidth = (1 + 2.6 * v).toFixed(2); a.style.opacity = (0.25 + 0.7 * v).toFixed(2); });
    const last = s[s.length - 1], on = A.axis === 'glu' || A.u.feedback;
    D.fbs.forEach((f) => { f.style.strokeWidth = (1 + 2.4 * last).toFixed(2); f.style.opacity = on ? (0.2 + 0.7 * last).toFixed(2) : '0.12'; });
    D.blood.setAttribute('width', (324 * last).toFixed(1));
    D.cellA.setAttribute('fill-opacity', (0.08 + 0.92 * A.x.e).toFixed(2));
    D.cellAp.textContent = pct(A.x.e) + '%';
    if (D.brain) D.brain.textContent = A.u.brain > 0.02 ? T.brainTag(pct(A.u.brain)) : '';
  }

  // ---- Grafik ----
  const CH = { x0: 34, x1: 350, top: 10, bot: 108, span: 360 };
  const yOf = (v: number) => CH.bot - (CH.bot - CH.top) * v;
  interface Series { name: string; color: string; get: (x: AxisState) => number; dash?: string; line: SVGElement; dot: SVGElement }
  let chartSeries: Series[] = [];
  const axChart = $<SVGElement>('axChart');
  function buildChart(): void {
    const sv = axChart;
    sv.innerHTML = '';
    for (const v of [0, 0.5, 1]) { svg('line', { class: 'grid', x1: CH.x0, x2: CH.x1, y1: yOf(v), y2: yOf(v) }, sv); svgText(sv, { x: CH.x0 - 6, y: yOf(v) + 3.5, 'text-anchor': 'end' }, String(pct(v))); }
    svgText(sv, { x: CH.x0, y: 124 }, T.chartAgo); svgText(sv, { x: CH.x1, y: 124, 'text-anchor': 'end' }, T.chartNow);
    const c = cfg();
    const defs: { name: string; color: string; get: (x: AxisState) => number; dash?: string }[] =
      c.stages.map((s, i) => ({ name: c.series[i], color: `var(${s.c})`, get: (x: AxisState) => x.s[i] }));
    defs.push({ name: T.targetResp, color: 'var(--eff)', get: (x) => x.e, dash: '5 3' });
    chartSeries = [];
    let lx = CH.x0, ly = 138;
    for (const s of defs) {
      const w = 14 + s.name.length * 6.1 + 10;
      if (lx + w > CH.x1 + 4) { lx = CH.x0; ly += 14; }
      svg('rect', { x: lx, y: ly - 8, width: 9, height: 9, rx: 2, fill: s.color }, sv);
      svgText(sv, { x: lx + 14, y: ly }, s.name);
      lx += w;
      const attrs: Record<string, string> = { class: 'ln', stroke: s.color, points: '' };
      if (s.dash) attrs['stroke-dasharray'] = s.dash;
      chartSeries.push({ ...s, line: svg('polyline', attrs, sv), dot: svg('circle', { r: 3.4, fill: s.color, cx: CH.x1, cy: CH.bot }, sv) });
    }
    sv.setAttribute('viewBox', `0 0 360 ${ly + 8}`);
  }
  function drawChart(): void {
    for (const s of chartSeries) {
      const pts = A.hist.map((h) => `${(CH.x1 - ((A.t - h.t) / CH.span) * (CH.x1 - CH.x0)).toFixed(1)},${yOf(s.get(h.x)).toFixed(1)}`);
      s.line.setAttribute('points', pts.join(' '));
      const last = A.hist[A.hist.length - 1];
      if (last) s.dot.setAttribute('cy', yOf(s.get(last.x)).toFixed(1));
    }
  }

  // ---- Eksen kontrolleri ----
  const axFb = $('axFb'), axPause = $('axPause'), axSpeed = $('axSpeed'), axChips = $('axChips');
  function sampleAx(): void { A.hist.push({ t: A.t, x: A.x }); while (A.hist.length && A.t - A.hist[0].t > CH.span) A.hist.shift(); }
  function setAxis(key: AxisKey): void {
    A.axis = key;
    for (const b of Array.from(axChips.children)) b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.k === key));
    $('axNote').textContent = T.axes[key].note;
    $('axFoot').textContent = T.axes[key].foot;
    $('axPulse').textContent = T.axes[key].pulse;
    axFb.hidden = key === 'glu';
    axFb.setAttribute('aria-pressed', String(!!A.u.feedback));
    axFb.textContent = A.u.feedback ? T.fbOn : T.fbOff;
    resettle();
    buildAxSliders(); buildDiagram(); buildChart();
    sampleAx();
  }
  for (const k of Object.keys(STRUCT) as AxisKey[]) {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.dataset.k = k; b.textContent = T.axes[k].chip; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => setAxis(k));
    axChips.appendChild(b);
  }
  scope.on($('axPulse'), 'click', () => { A.pulseUntil = A.t + 30; });
  scope.on(axFb, 'click', () => { A.u.feedback = A.u.feedback ? 0 : 1; axFb.setAttribute('aria-pressed', String(!!A.u.feedback)); axFb.textContent = A.u.feedback ? T.fbOn : T.fbOff; });
  scope.on(axPause, 'click', () => { A.paused = !A.paused; axPause.setAttribute('aria-pressed', String(A.paused)); axPause.textContent = A.paused ? T.resume : T.pause; });
  const SPEEDS = [1, 3, 10];
  scope.on(axSpeed, 'click', () => { A.speed = SPEEDS[(SPEEDS.indexOf(A.speed) + 1) % SPEEDS.length]; axSpeed.textContent = T.speed(A.speed); });
  scope.on($('axReset'), 'click', () => { A.u = { ...U0 }; setAxis(A.axis); });
  SAY.axis = () => describeAxis(A.axis, A.x, effU(), A.t < A.pulseUntil);

  /* =====================================================
     RESEPTÖR
     ===================================================== */
  const RC: ReceptorParams = { hormone: 0.5, number: 0.6, affinity: 0.5, specificity: 1, other: 0 };
  const rcSl = {} as Record<keyof ReceptorParams, SliderHandle>;
  const rcChips = $('rcChips');
  function setRcChip(i: number | null): void { for (const b of Array.from(rcChips.children)) b.setAttribute('aria-pressed', String(Number((b as HTMLElement).dataset.i) === i)); }
  for (const [k, col] of RC_KEYS) rcSl[k] = makeSlider($('rcSliders'), 'rc-' + k, T.rcSliders[k][0], T.rcSliders[k][1], 0, 100, pct(RC[k]), (v) => { RC[k] = v / 100; setRcChip(null); drawReceptor(); }, null, col);
  RV.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.dataset.i = String(i); b.textContent = T.presets[i]; b.setAttribute('aria-pressed', String(i === 0));
    scope.on(b, 'click', () => { Object.assign(RC, v); for (const [k] of RC_KEYS) rcSl[k].set(pct(RC[k])); setRcChip(i); drawReceptor(); });
    rcChips.appendChild(b);
  });
  $('rcMeters').innerHTML = ([[T.rcMeters[0], 'occ', 'var(--hyp)'], [T.rcMeters[1], 'resp', 'var(--eff)'], [T.rcMeters[2], 'wrong', 'var(--red)']] as const)
    .map(([n, k, c]) => `<div style="--c:${c}"><div class="m-top"><span>${n}</span><b data-ref="rm-${k}">0%</b></div><div class="track"><b data-ref="rb-${k}"></b></div></div>`).join('');
  const SLOTS = 24;
  const rcSvg = $<SVGElement>('rcSvg'), CX = 180, CY = 120, CR = 62;
  const rcCell = svg('circle', { cx: CX, cy: CY, r: CR, fill: 'var(--eff)', 'fill-opacity': 0.1, stroke: 'var(--eff)', 'stroke-width': 2 }, rcSvg);
  const rcRecG = svg('g', {}, rcSvg);
  const rcCenter = svgText(rcSvg, { x: CX, y: CY - 2, 'text-anchor': 'middle', style: 'font:500 22px var(--f-mono);fill:var(--ink);paint-order:stroke;stroke:var(--panel);stroke-width:4px;stroke-linejoin:round' }, '0%');
  svgText(rcSvg, { x: CX, y: CY + 16, 'text-anchor': 'middle', style: 'font:400 11px var(--f-body);fill:var(--ink);paint-order:stroke;stroke:var(--panel);stroke-width:3px;stroke-linejoin:round' }, T.cellResp);
  function drawReceptor(): void {
    const r = receptor(RC), count = Math.round(RC.number * SLOTS);
    rcCell.setAttribute('fill-opacity', (0.06 + 0.94 * r.response).toFixed(2));
    rcCell.setAttribute('stroke-dasharray', count === 0 ? '5 4' : '');
    rcRecG.innerHTML = '';
    let accT = 0, accW = 0;
    const w = r.occ > 0 ? r.occO / r.occ : 0;
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * 360;
      const g = svg('g', { transform: `rotate(${ang} ${CX} ${CY})` }, rcRecG);
      svg('rect', { x: CX - 5, y: CY - CR - 10, width: 10, height: 11, rx: 2.5, fill: 'var(--eff)' }, g);
      svg('rect', { x: CX - 2.5, y: CY - CR - 10, width: 5, height: 4, fill: 'var(--panel)' }, g); // kilit çentiği
      accT += r.occ;
      if (accT >= 1) { // bu yuva dolu
        accT -= 1; accW += w;
        const wrong = accW >= 1; if (wrong) accW -= 1;
        svg('circle', { cx: CX, cy: CY - CR - 22, r: 6, fill: wrong ? 'var(--red)' : 'var(--hyp)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, g);
      }
    }
    rcCenter.textContent = pct(r.response) + '%';
    const set = (k: string, v: number) => { $('rm-' + k).textContent = pct(v) + '%'; $('rb-' + k).style.width = pct(v) + '%'; };
    set('occ', r.occ); set('resp', r.response); set('wrong', r.wrongShare);
  }
  SAY.rec = () => {
    const r = receptor(RC);
    const S = L().rcSay;
    if (RC.number === 0) return S.none;
    if (r.wrongShare > 0.3) return S.wrong;
    if (r.response < 0.12 && RC.hormone > 0.7) return S.weak;
    if (r.response > 0.5 && RC.hormone < 0.25) return S.strong;
    return S.base;
  };

  /* =====================================================
     SÜRE
     ===================================================== */
  const TM = { x0: 30, x1: 350, top: 12, bot: 124, max: 8.94 };
  const tx = (lv: number) => TM.x0 + (lv / TM.max) * (TM.x1 - TM.x0);
  const ty = (v: number) => TM.bot - (TM.bot - TM.top) * v;
  const tmSvg = $<SVGElement>('tmSvg');
  for (const v of [0, 0.5, 1]) svg('line', { x1: TM.x0, x2: TM.x1, y1: ty(v), y2: ty(v), stroke: 'var(--line)', 'stroke-width': 1 }, tmSvg);
  for (const [lv, lb] of [[0, T.ticks[0]], [3, T.ticks[1]], [4.78, T.ticks[2]], [6.56, T.ticks[3]], [7.94, T.ticks[4]], [8.94, T.ticks[5]]] as [number, string][]) {
    svg('line', { x1: tx(lv), x2: tx(lv), y1: TM.bot, y2: TM.bot + 4, stroke: 'var(--muted)' }, tmSvg);
    svgText(tmSvg, { x: Math.min(tx(lv), 346), y: TM.bot + 15, 'text-anchor': lv === 0 ? 'start' : lv >= 8.9 ? 'end' : 'middle', style: 'font:400 10px var(--f-mono);fill:var(--muted)' }, lb);
  }
  const curve = (fn: (ms: number) => number, color: string) => {
    const pts: string[] = [];
    for (let i = 0; i <= 150; i++) { const lv = (i / 150) * TM.max; pts.push(`${tx(lv).toFixed(1)},${ty(fn(msOfLog(lv))).toFixed(1)}`); }
    svg('polyline', { points: pts.join(' '), fill: 'none', stroke: color, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, tmSvg);
  };
  curve(neuroAt, 'var(--hyp)'); curve(hormAt, 'var(--eff)');
  svgText(tmSvg, { x: tx(0.9), y: 24, style: 'font:500 10.5px var(--f-body);fill:var(--hyp)' }, T.neuro);
  svgText(tmSvg, { x: tx(5.4), y: 24, style: 'font:500 10.5px var(--f-body);fill:var(--eff-text)' }, T.horm);
  const tmCur = svg('line', { y1: TM.top - 4, y2: TM.bot, stroke: 'var(--ink)', 'stroke-width': 1.4 }, tmSvg);
  const tmDotN = svg('circle', { r: 4, fill: 'var(--hyp)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, tmSvg);
  const tmDotH = svg('circle', { r: 4, fill: 'var(--eff)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, tmSvg);
  function fmtMs(ms: number): string {
    const U = L().units;
    if (ms < 1000) return (ms < 10 ? ms.toFixed(1) : Math.round(ms)) + U.ms;
    if (ms < MS.min) return (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + U.s;
    if (ms < MS.h) return Math.round(ms / MS.min) + U.min;
    if (ms < MS.day) return (ms / MS.h).toFixed(1).replace('.0', '') + U.h;
    return (ms / MS.day).toFixed(1).replace('.0', '') + U.day;
  }
  const tmSl = $<HTMLInputElement>('tmSl');
  function drawTime(): void {
    const lv = Number(tmSl.value) / 100, ms = msOfLog(lv), n = neuroAt(ms), h = hormAt(ms);
    $('tmVal').textContent = fmtMs(ms);
    tmSl.setAttribute('aria-valuetext', fmtMs(ms));
    tmCur.setAttribute('x1', String(tx(lv))); tmCur.setAttribute('x2', String(tx(lv)));
    tmDotN.setAttribute('cx', String(tx(lv))); tmDotN.setAttribute('cy', String(ty(n)));
    tmDotH.setAttribute('cx', String(tx(lv))); tmDotH.setAttribute('cy', String(ty(h)));
    $('tmRead').innerHTML =
      `<div class="ro"><span class="k" style="color:var(--hyp)">${T.neuro}</span><span class="v">${T.effect(pct(n))}</span><span class="k">${T.reachNeuro}</span></div>` +
      `<div class="ro"><span class="k" style="color:var(--eff-text)">${T.horm}</span><span class="v">${T.effect(pct(h))}</span><span class="k">${T.reachHorm}</span></div>`;
  }
  scope.on(tmSl, 'input', drawTime);
  SAY.time = () => {
    const ms = msOfLog(Number(tmSl.value) / 100);
    const S = L().timeSay;
    if (neuroAt(ms) > 0.3 && hormAt(ms) < 0.05) return S.ms;
    if (neuroAt(ms) < 0.02 && ms < MS.h) return S.early;
    if (neuroAt(ms) < 0.02 && hormAt(ms) > 0.3) return S.hours;
    if (hormAt(ms) > 0.02 && ms > MS.day) return S.days;
    return S.base;
  };

  const OR = { fetal: 0.5, adult: 0.6 };
  const orSl = {} as Record<'fetal' | 'adult', SliderHandle>;
  orSl.fetal = makeSlider($('orSliders'), 'or-fetal', T.orgFetal[0], T.orgFetal[1], 0, 100, 50, (v) => { OR.fetal = v / 100; drawOrgan(); }, null, 'var(--pit)');
  orSl.adult = makeSlider($('orSliders'), 'or-adult', T.orgAdult[0], T.orgAdult[1], 0, 100, 60, (v) => { OR.adult = v / 100; drawOrgan(); }, null, 'var(--eff)');
  $('orMeters').innerHTML = ([[T.orgMeters[0], 'st', 'var(--pit)'], [T.orgMeters[1], 'ef', 'var(--eff)']] as const)
    .map(([n, k, c]) => `<div style="--c:${c}"><div class="m-top"><span>${n}</span><b data-ref="om-${k}">0%</b></div><div class="track"><b data-ref="ob-${k}"></b></div></div>`).join('');
  function drawOrgan(): void {
    const o = organ(OR.fetal, OR.adult);
    $('om-st').textContent = pct(o.structure) + '%'; $('ob-st').style.width = pct(o.structure) + '%';
    $('om-ef').textContent = pct(o.effect) + '%'; $('ob-ef').style.width = pct(o.effect) + '%';
  }
  scope.on($('orCut'), 'click', () => { OR.adult = 0; orSl.adult.set(0); drawOrgan(); });

  /* ---------- Döngü ---------- */
  let last = performance.now(), acc = 0, tSay = 0;
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (tab === 'axis' && !A.paused) {
      acc += dt * 6 * A.speed; // 1 sn gerçek = 6 dk sim (×1)
      while (acc >= 1) {
        A.x = stepAxis(A.axis, A.x, effU(), 1);
        A.t += 1; acc -= 1;
        if (A.t - A.lastSample >= 2) { A.lastSample = A.t; sampleAx(); }
      }
    }
    if (tab === 'axis' && (!A.paused || dirty)) { dirty = false; drawDiagram(); drawChart(); }
    // Reseptör sekmesi yalnızca girdi değişince (kaydırıcı/çip) çizilir; her karede yeniden kurulmaz.
    tSay += dt;
    if (tSay > 0.25) { tSay = 0; say(); }
  }

  setAxis('hpa');
  drawReceptor(); drawTime(); drawOrgan();
  showTab('axis');
  // Görünür metin kendiliğinden değişir; ekran okuyucuya yalnızca kullanıcı eyleminden sonra duyurulur.
  const poke = scope.announcer($('live'), () => lastSay);
  const onAction = () => { dirty = true; poke(); };
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);
  // Ekran dışındayken döngü durur; dönünce zaman sıçramasın diye `last` sıfırlanır.
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}

