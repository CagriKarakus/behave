import '../sim.css';
import './view.css';
import { Scope, pct, ref, svg, svgText, uid } from '../kit';
import {
  EDGES, NODES, REST, controlOf, describe, netInput, settle, step,
  type Activity, type Inputs, type Lesion, type RegionId,
} from './model';
import { L } from './text';
import { TR, type Strings } from './text.tr';

const R = 25;
const byId = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<RegionId, (typeof NODES)[number]>;

// Yalnızca testlerin (constants.test.ts) Türkçe orijinalle karşılaştırması için; ekran metni her zaman L() ile okunur.
export const INFO: Record<RegionId, [string, string]> = TR.info;

export interface Scenario { id: string; name: string; u: Partial<Inputs>; lesion?: RegionId[] }
const SCEN_DEF: Array<Omit<Scenario, 'name'>> = [
  { id: 'rest',   u: {} },
  { id: 'threat', u: { threat: 0.9 } },
  { id: 'calm',   u: { threat: 0.5 } },
  { id: 'weak',   u: { threat: 0.5, frontal: 0.3 } },
  { id: 'look',   u: { cue: 0.8, prob: 0.5 } },
  { id: 'press',  u: { cue: 0.8, prob: 0.5, effort: 0.9 } },
  { id: 'sure',   u: { cue: 0.8, prob: 1 } },
  { id: 'stress', u: { threat: 0.4, stress: 0.9, frontal: 0.5 } },
  { id: 'teen',   u: { threat: 0.3, cue: 0.8, prob: 0.5, frontal: 0.4 } },
  { id: 'amyL',   u: { threat: 0.9 }, lesion: ['bla', 'cea'] },
  { id: 'vmL',    u: { threat: 0.5 }, lesion: ['vmpfc'] },
];
const scenarios = (T: Strings): Scenario[] => SCEN_DEF.map((s) => ({ ...s, name: T.scen[s.id] }));
export const SCEN: Scenario[] = scenarios(TR);

type SliderKey = keyof typeof TR.sliders;
const SLIDER_DEF: { key: SliderKey; cls: string }[] = [
  { key: 'threat', cls: 'sl-amy' },
  { key: 'cue', cls: 'sl-dop' },
  { key: 'prob', cls: 'sl-dop' },
  { key: 'effort', cls: 'sl-dop' },
  { key: 'frontal', cls: 'sl-pfc' },
  { key: 'stress', cls: 'sl-amy' },
];
const sliderDefs = (T: Strings): { key: keyof Inputs; name: string; hint: string; cls: string }[] =>
  SLIDER_DEF.map((s) => ({ key: s.key, name: T.sliders[s.key].name, hint: T.sliders[s.key].hint, cls: s.cls }));
export const SLIDERS = sliderDefs(TR);

const TEMPLATE = (id: string, T: Strings) => `
<div class="sim sim-bso">
  <p class="lede">${T.lede}</p>
  <div class="chips" data-ref="chips" role="group" aria-label="${T.chipsAria}"></div>

  <div class="sim-bar" role="group" aria-label="${T.barAria}" data-ref="bar">
    <div class="sim-bar-in">
      <p class="say" data-ref="say"></p>
      <div class="meters">
        <div class="m" style="--c: var(--amy)"><div class="m-top"><span>${T.meterFear}</span><b data-ref="m-cea">0%</b></div><div class="track"><b data-ref="b-cea"></b></div></div>
        <div class="m" style="--c: var(--dop)"><div class="m-top"><span>${T.meterWant}</span><b data-ref="m-nacc">0%</b></div><div class="track"><b data-ref="b-nacc"></b></div></div>
        <div class="m" style="--c: var(--pfc)"><div class="m-top"><span>${T.meterCtl}</span><b data-ref="m-ctl">0%</b></div><div class="track"><b data-ref="b-ctl"></b></div></div>
      </div>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section aria-label="${T.circuitAria}">
    <div class="stage">
      <svg viewBox="0 0 360 475" role="group" aria-label="${T.netAria}" data-ref="net">
        <defs>
          <marker id="${id}-mx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path class="mk" d="M0,1 L10,5 L0,9 z"/></marker>
          <marker id="${id}-mi" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path class="mk-bar" d="M5,0 L5,10"/></marker>
        </defs>
        <g data-ref="edges"></g>
        <g data-ref="nodes"></g>
      </svg>
      <div class="legend">
        <span><i style="background:var(--pfc)"></i>${T.legendPfc}</span>
        <span><i style="background:var(--amy)"></i>${T.legendAmy}</span>
        <span><i style="background:var(--dop)"></i>${T.legendDop}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="20" y2="5" stroke="var(--edge)" stroke-width="2"/><path d="M17,1 L25,5 L17,9 z" fill="var(--edge)"/></svg>${T.legendExcite}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="22" y2="5" stroke="var(--edge)" stroke-width="2" stroke-dasharray="5 3"/><line x1="23" y1="0" x2="23" y2="10" stroke="var(--edge)" stroke-width="2.4"/></svg>${T.legendInhibit}</span>
      </div>
    </div>
  </section>

  <section class="detail" data-ref="detail"></section>

  <div class="row">
    <button class="btn" data-ref="pulse" type="button">${T.pulse}</button>
    <button class="btn" data-ref="pause" type="button" aria-pressed="false">${T.pause}</button>
    <button class="btn" data-ref="reset" type="button">${T.reset}</button>
  </div>

  <section class="chart" aria-label="${T.chartAria}">
    <h3 class="sim-h">${T.chartH}</h3>
    <svg viewBox="0 0 360 140" role="img" aria-label="${T.chartLabel}" data-ref="chart"></svg>
  </section>

  <section aria-label="${T.inputsAria}">
    <h3 class="sim-h">${T.inputsH}</h3>
    <div class="sliders" data-ref="sliders"></div>
  </section>

  <p class="foot">${T.foot}</p>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('bso');
  const T = L();
  container.innerHTML = TEMPLATE(id, T);
  const SCEN = scenarios(T), SLIDERS = sliderDefs(T);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  interface State {
    u: Inputs; lesion: Lesion; x: Activity; t: number; pulseUntil: number; paused: boolean;
    sel: RegionId | null; scen: string | null; hist: Array<Record<string, number>>; lastSample: number;
  }
  const S: State = { u: { ...REST }, lesion: {}, x: settle(REST, {}, 12), t: 0, pulseUntil: -1, paused: false, sel: null, scen: 'rest', hist: [], lastSample: 0 };
  // Duraklatılmışken ve girdi değişmemişken yeniden çizmeye gerek yok: kullanıcı eylemleri bunu işaretler.
  let dirty = true;
  const eff = (): Inputs => (S.t < S.pulseUntil ? { ...S.u, threat: Math.min(1, S.u.threat + 0.8) } : S.u);

  // ---- Ağ diyagramı ----
  function edgePath(e: (typeof EDGES)[number]): string {
    const a = byId[e.from], b = byId[e.to];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const cx = (a.x + b.x) / 2 + (-dy / len) * e.bend;
    const cy = (a.y + b.y) / 2 + (dx / len) * e.bend;
    const unit = (x1: number, y1: number, x2: number, y2: number) => { const l = Math.hypot(x2 - x1, y2 - y1); return [(x2 - x1) / l, (y2 - y1) / l]; };
    const [sx, sy] = unit(a.x, a.y, cx, cy);
    const [ex, ey] = unit(b.x, b.y, cx, cy);
    const f = (n: number) => n.toFixed(1);
    return `M${f(a.x + sx * (R + 2))},${f(a.y + sy * (R + 2))} Q${f(cx)},${f(cy)} ${f(b.x + ex * (R + 3))},${f(b.y + ey * (R + 3))}`;
  }

  const edgesG = $('edges'), nodesG = $('nodes');
  const edgeEls = EDGES.map((e) => ({
    e,
    p: svg('path', { class: 'edge' + (e.w < 0 ? ' inh' : ''), d: edgePath(e), 'marker-end': e.w < 0 ? `url(#${id}-mi)` : `url(#${id}-mx)` }, edgesG),
  }));

  const nodeEls = {} as Record<RegionId, { g: SVGElement; fill: SVGElement; slash: SVGElement; pc: SVGElement }>;
  for (const n of NODES) {
    const g = svg('g', { class: 'node grp-' + n.grp, tabindex: '0', role: 'button', 'aria-pressed': 'false', 'aria-label': T.info[n.id][0], transform: `translate(${n.x},${n.y})` }, nodesG);
    svg('circle', { r: R + 10, fill: 'transparent' }, g);
    svg('circle', { class: 'ring', r: R + 5 }, g);
    svg('circle', { class: 'base', r: R }, g);
    const fill = svg('circle', { class: 'fill', r: R - 0.8, 'fill-opacity': 0 }, g);
    const slash = svg('line', { class: 'slash', x1: -R * 0.7, y1: R * 0.7, x2: R * 0.7, y2: -R * 0.7, opacity: 0 }, g);
    svgText(g, { class: 'ab', y: -2 }, n.ab);
    const pc = svgText(g, { class: 'pct', y: 10 }, '');
    svgText(g, { class: 'cap', y: R + 14 }, T.caps[n.id]);
    scope.on(g as unknown as HTMLElement, 'click', () => select(n.id));
    scope.on(g as unknown as HTMLElement, 'keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(n.id); } });
    nodeEls[n.id] = { g, fill, slash, pc };
  }

  function drawNet(): void {
    for (const { e, p } of edgeEls) {
      const mag = Math.min(1, (S.x[e.from] * Math.abs(e.w)) / 0.8);
      p.style.strokeWidth = (1 + 2.2 * mag).toFixed(2);
      p.style.opacity = (0.12 + 0.78 * mag).toFixed(2);
    }
    for (const n of NODES) {
      const o = nodeEls[n.id];
      const les = !!S.lesion[n.id];
      o.fill.setAttribute('fill-opacity', les ? '0' : (0.08 + 0.92 * S.x[n.id]).toFixed(2));
      o.slash.setAttribute('opacity', les ? '1' : '0');
      o.g.classList.toggle('les', les);
      o.g.classList.toggle('sel', S.sel === n.id);
      o.pc.textContent = les ? '' : pct(S.x[n.id]) + '%';
    }
  }

  // ---- Ayrıntı paneli ----
  const detail = $('detail');
  function buildDetail(): void {
    if (!S.sel) {
      detail.innerHTML = `<p class="hint">${T.hint}</p>`;
      return;
    }
    const n = byId[S.sel];
    detail.innerHTML =
      `<div class="d-head grp-${n.grp}"><span class="d-name">${T.info[n.id][0]}</span><span class="d-pct" data-ref="dPct">0%</span></div>` +
      `<div class="track grp-${n.grp}"><b data-ref="dFill"></b></div>` +
      `<p>${T.info[n.id][1]}</p>` +
      `<ul class="d-list" data-ref="dList"></ul>` +
      `<div class="row"><button class="btn" data-ref="dLes" type="button" aria-pressed="${!!S.lesion[n.id]}">${S.lesion[n.id] ? T.lesionOff : T.lesionOn}</button></div>`;
    updateDetail();
  }
  // Ayrıntı paneli sık yeniden kurulduğu için tıklama kapsayıcıda dinlenir.
  scope.on(detail, 'click', (ev) => {
    if (!S.sel || !(ev.target as Element).closest('[data-ref="dLes"]')) return;
    const k = S.sel;
    S.lesion[k] = !S.lesion[k];
    if (!S.lesion[k]) delete S.lesion[k];
    setScenario(null);
    buildDetail();
  });
  function updateDetail(): void {
    if (!S.sel) return;
    const n = byId[S.sel];
    const les = !!S.lesion[n.id];
    ref(detail, 'dPct').textContent = les ? T.lesionTag : pct(S.x[n.id]) + '%';
    ref(detail, 'dFill').style.width = (les ? 0 : pct(S.x[n.id])) + '%';
    const { parts } = netInput(n.id, S.x, eff(), S.lesion);
    const rows = parts
      .filter((p) => Math.abs(p.v) >= 0.02)
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
      .slice(0, 5)
      .map((p) => {
        const nm = p.from === 'dış girdi' ? T.extInput : byId[p.from].ab;
        return `<li><span>${nm} ${p.v < 0 ? T.inhibits : T.excites}</span><span class="v">${p.v < 0 ? '−' : '+'}${Math.abs(p.v).toFixed(2)}</span></li>`;
      });
    ref(detail, 'dList').innerHTML = les ? `<li><span>${T.regionOff}</span></li>` : (rows.join('') || `<li><span>${T.noInput}</span></li>`);
  }
  function select(rid: RegionId): void {
    dirty = true;
    S.sel = S.sel === rid ? null : rid;
    for (const n of NODES) nodeEls[n.id].g.setAttribute('aria-pressed', String(S.sel === n.id));
    buildDetail();
  }

  // ---- Senaryolar ve kaydırıcılar ----
  const chips = $('chips');
  for (const sc of SCEN) {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = sc.name; b.dataset.id = sc.id; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => applyScenario(sc));
    chips.appendChild(b);
  }
  function setScenario(sid: string | null): void {
    dirty = true;
    S.scen = sid;
    for (const b of Array.from(chips.children)) b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.id === sid));
  }

  const sliderEls = {} as Record<keyof Inputs, HTMLInputElement>;
  const valEls = {} as Record<keyof Inputs, HTMLElement>;
  for (const s of SLIDERS) {
    const w = document.createElement('div');
    w.className = s.cls;
    w.innerHTML = `<div class="sl-top"><label class="sl-name" for="${id}-s-${s.key}">${s.name}</label><span class="sl-val" data-ref="v"></span></div>` +
      `<input type="range" id="${id}-s-${s.key}" min="0" max="100" step="1"><p class="sl-hint">${s.hint}</p>`;
    $('sliders').appendChild(w);
    const inp = w.querySelector('input') as HTMLInputElement;
    valEls[s.key] = w.querySelector('[data-ref="v"]') as HTMLElement;
    scope.on(inp, 'input', () => { S.u[s.key] = Number(inp.value) / 100; setScenario(null); syncSliders(); });
    sliderEls[s.key] = inp;
  }
  function syncSliders(): void {
    for (const s of SLIDERS) {
      sliderEls[s.key].value = String(Math.round(S.u[s.key] * 100));
      sliderEls[s.key].setAttribute('aria-valuetext', pct(S.u[s.key]) + '%');
      valEls[s.key].textContent = pct(S.u[s.key]) + '%';
    }
  }
  function applyScenario(sc: Scenario): void {
    S.u = { ...REST, ...sc.u };
    S.lesion = Object.fromEntries((sc.lesion || []).map((k) => [k, true]));
    S.pulseUntil = -1;
    setScenario(sc.id);
    syncSliders();
    buildDetail();
  }

  const pauseBtn = $('pause');
  scope.on($('pulse'), 'click', () => { S.pulseUntil = S.t + 1; dirty = true; });
  scope.on(pauseBtn, 'click', () => {
    S.paused = !S.paused;
    dirty = true;
    pauseBtn.setAttribute('aria-pressed', String(S.paused));
    pauseBtn.textContent = S.paused ? T.resume : T.pause;
  });
  scope.on($('reset'), 'click', () => applyScenario(SCEN[0]));

  // ---- Zaman grafiği ----
  const CH = { x0: 36, x1: 348, top: 10, bot: 100, span: 12 };
  const chart = $<SVGElement>('chart');
  const yOf = (v: number) => CH.bot - (CH.bot - CH.top) * v;
  for (const v of [0, 0.5, 1]) {
    svg('line', { class: 'grid', x1: CH.x0, x2: CH.x1, y1: yOf(v), y2: yOf(v) }, chart);
    svgText(chart, { x: CH.x0 - 6, y: yOf(v) + 3.5, 'text-anchor': 'end' }, String(pct(v)));
  }
  svgText(chart, { x: CH.x0, y: 116 }, T.axisStart);
  svgText(chart, { x: CH.x1, y: 116, 'text-anchor': 'end' }, T.axisNow);
  const SERIES: { key: string; color: string; name: string; get: (x: Activity) => number; line?: SVGElement; dot?: SVGElement }[] = [
    { key: 'cea', color: 'var(--amy)', name: T.serFear, get: (x) => x.cea },
    { key: 'nacc', color: 'var(--dop)', name: T.serWant, get: (x) => x.nacc },
    { key: 'ctl', color: 'var(--pfc)', name: T.serCtl, get: (x) => controlOf(x) },
  ];
  let lx = CH.x0;
  for (const s of SERIES) {
    svg('rect', { x: lx, y: 126, width: 9, height: 9, rx: 2, fill: s.color }, chart);
    svgText(chart, { x: lx + 14, y: 134 }, s.name);
    lx += 14 + s.name.length * 6.2 + 12;
    s.line = svg('polyline', { class: 'ln', stroke: s.color, points: '' }, chart);
    s.dot = svg('circle', { r: 3.5, fill: s.color, cx: CH.x1, cy: CH.bot }, chart);
  }
  function drawChart(): void {
    for (const s of SERIES) {
      const pts = S.hist.map((h) => `${(CH.x1 - ((S.t - h.t) / CH.span) * (CH.x1 - CH.x0)).toFixed(1)},${yOf(h[s.key]).toFixed(1)}`);
      s.line!.setAttribute('points', pts.join(' '));
      const last = S.hist[S.hist.length - 1];
      if (last) { s.dot!.setAttribute('cx', String(CH.x1)); s.dot!.setAttribute('cy', yOf(last[s.key]).toFixed(1)); }
    }
  }
  function sample(): void {
    const h: Record<string, number> = { t: S.t };
    for (const s of SERIES) h[s.key] = s.get(S.x);
    S.hist.push(h);
    while (S.hist.length && S.t - S.hist[0].t > CH.span) S.hist.shift();
  }

  // ---- Alt çubuk ----
  let sayText = '';
  const meters = (['cea', 'nacc', 'ctl'] as const).map((k) => ({ k, val: $(`m-${k}`), bar: $(`b-${k}`) }));
  function drawBar(): void {
    const v = { cea: S.x.cea, nacc: S.x.nacc, ctl: controlOf(S.x) };
    for (const m of meters) { m.val.textContent = pct(v[m.k]) + '%'; m.bar.style.width = pct(v[m.k]) + '%'; }
  }
  const sayEl = $('say');
  function drawSay(): void {
    const t = describe(S.x, eff(), S.lesion);
    if (t !== sayText) { sayText = t; sayEl.textContent = t; }
  }

  // ---- Döngü ----
  const DT = 0.02;
  let last = performance.now(), acc = 0, tSay = 0, tDet = 0;
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (!S.paused) {
      acc += dt;
      while (acc >= DT) {
        S.x = step(S.x, eff(), S.lesion, DT);
        S.t += DT; acc -= DT;
        if (S.t - S.lastSample >= 0.1) { S.lastSample = S.t; sample(); }
      }
    }
    if (S.paused && !dirty) return;
    const force = S.paused; // duraklatılmışken yalnızca eylemden sonra, tek seferde tam çizim
    dirty = false;
    drawNet(); drawBar(); drawChart();
    tSay += dt; tDet += dt;
    if (force || tSay > 0.25) { tSay = 0; drawSay(); }
    if (force || tDet > 0.15) { tDet = 0; updateDetail(); }
  }

  syncSliders();
  setScenario('rest');
  buildDetail();
  sample();
  drawSay();
  // Ekran okuyucu: görünür metin sürekli değişir; yalnızca kullanıcı eyleminden sonra duyurulur.
  const poke = scope.announcer($('live'), () => sayEl.textContent ?? '');
  scope.on(root, 'click', poke);
  scope.on(root, 'input', poke);
  // Ekran dışındayken döngü durur; dönünce zaman sıçramasın diye `last` sıfırlanır.
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}

