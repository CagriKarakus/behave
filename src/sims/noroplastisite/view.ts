import { lazyNotes } from '../ui';
import '../sim.css';
import './view.css';
import { Scope, ref, svg, uid } from '../kit';
import { createTour } from '../tour';
import { pct, percent } from '../../i18n/fmt';
import { L } from './text';
import type { Strings } from './text.tr';
import {
  caPos, clamp, minutesOfSlider, practiceAt, simulatePractice, simulateStress, stressAt,
  synapse, synDelta, synWeight, SYN, effort,
  type PracticeInputs, type PracticeSeries, type StressInputs, type StressKind, type StressSeries, type SynResult,
} from './model';
import { buildTree, type Tree } from './dendrite';
import {
  Meters, fmtDays, fmtHz, fmtMin, fmtSec, logPos, logVal, makeSlider, niceDays, niceFreq, niceSec, pctOf, signed,
  type SliderHandle,
} from './ui';

type Tab = 'syn' | 'prac' | 'str';

/* ---------- Sabit parametreler (metinler text.tr.ts / text.en.ts içinde) ---------- */
const SYN_PRESETS = [
  { f: 1, d: 900, post: 0 },
  { f: 5, d: 300, post: 0 },
  { f: 100, d: 1, post: 0 },
  { f: 1, d: 900, post: 1 },
];
const PRAC_PRESETS: Array<{ p: PracticeInputs }> = [
  { p: { minutes: 120, mental: 0, days: 5 } },
  { p: { minutes: 120, mental: 1, days: 5 } },
  { p: { minutes: 120, mental: 0, days: 28 } },
  { p: { minutes: 60, mental: 0, days: 90 } },
  { p: { minutes: 120, mental: 0, days: 1200 } },
  { p: { minutes: 120, mental: 0, days: 120 } },
];
const STRESS_KINDS: Array<{ k: StressKind }> = [{ k: 'kronik' }, { k: 'tek' }, { k: 'kosu' }];

const TEMPLATE = (id: string, s: Strings): string => `
<div class="sim sim-nrp">
  <p class="lede">${s.lede}</p>
  <div data-ref="tourHost"></div>

  <div class="tabs" role="tablist" aria-label="${s.tabsAria}">
    <button class="tab" role="tab" id="${id}-tab-syn" data-pane="syn" aria-controls="${id}-pane-syn" aria-selected="true" type="button">${s.tabs.syn}</button>
    <button class="tab" role="tab" id="${id}-tab-prac" data-pane="prac" aria-controls="${id}-pane-prac" aria-selected="false" tabindex="-1" type="button">${s.tabs.prac}</button>
    <button class="tab" role="tab" id="${id}-tab-str" data-pane="str" aria-controls="${id}-pane-str" aria-selected="false" tabindex="-1" type="button">${s.tabs.str}</button>
  </div>

  <div class="sim-bar" role="group" aria-label="${s.sayAria}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section class="pane" role="tabpanel" id="${id}-pane-syn" data-pane="syn" aria-labelledby="${id}-tab-syn">
    <p class="note">${s.synNote}</p>
    <div class="chips" data-ref="synChips" role="group" aria-label="${s.synChipsAria}"></div>
    <div class="stage">
      <svg data-ref="synSvg" viewBox="0 0 360 300" role="img" aria-label="${s.synSvgAria}"></svg>
      <div class="legend">
        <span><i style="background:var(--dop)"></i>${s.synLegend.glu}</span>
        <span><i class="sq" style="background:var(--pfc)"></i>${s.synLegend.ampa}</span>
        <span><i class="sq" style="background:var(--pit)"></i>${s.synLegend.nmda}</span>
        <span><i style="background:var(--lesion)"></i>${s.synLegend.mg}</span>
        <span><i style="background:var(--gld)"></i>${s.synLegend.ca}</span>
      </div>
    </div>
    <p class="hebb" data-ref="hebb"></p>
    <div class="row"><button class="btn" data-ref="synRun" type="button">${s.synRun}</button></div>
    <section class="chart" aria-label="${s.synChartAria}">
      <h3 class="sim-h">${s.synChartH}</h3>
      <svg data-ref="synChart" viewBox="0 0 360 172" role="img" aria-label="${s.synChartSvgAria}"></svg>
    </section>
    <section aria-label="${s.synInputsAria}"><h3 class="sim-h">${s.inputs}</h3><div class="sliders" data-ref="synSliders"></div></section>
    <div class="notes" data-notes="syn"></div>
  </section>

  <section class="pane" role="tabpanel" id="${id}-pane-prac" data-pane="prac" aria-labelledby="${id}-tab-prac" hidden>
    <p class="note">${s.pracNote}</p>
    <div class="chips" data-ref="pcChips" role="group" aria-label="${s.pcChipsAria}"></div>
    <p class="note pnote" data-ref="pcNote"></p>
    <div class="stage">
      <svg data-ref="pcSvg" viewBox="0 0 360 232" role="img" aria-label="${s.pcSvgAria}"></svg>
      <div class="legend">
        <span><i class="sq" style="background:var(--pfc)"></i>${s.pcLegend.base}</span>
        <span><i class="sq" style="background:var(--pit)"></i>${s.pcLegend.slow}</span>
        <span><i class="sq" style="background:var(--dop)"></i>${s.pcLegend.fast}</span>
      </div>
    </div>
    <div class="row">
      <button class="btn" data-ref="pcPlay" type="button">${s.pcPlay.pause}</button>
      <button class="btn" data-ref="pcStop" type="button">${s.pcStop}</button>
      <button class="btn" data-ref="pcReset" type="button">${s.pcReset}</button>
    </div>
    <section class="chart" aria-label="${s.pcChartAria}">
      <h3 class="sim-h">${s.pcChartH}</h3>
      <svg data-ref="pcChart" viewBox="0 0 360 172" role="img" aria-label="${s.pcChartSvgAria}"></svg>
    </section>
    <section aria-label="${s.pcInputsAria}"><h3 class="sim-h">${s.inputs}</h3><div class="sliders" data-ref="pcSliders"></div></section>
    <div class="notes" data-notes="prac"></div>
  </section>

  <section class="pane" role="tabpanel" id="${id}-pane-str" data-pane="str" aria-labelledby="${id}-tab-str" hidden>
    <p class="note">${s.strNote}</p>
    <div class="chips" data-ref="stChips" role="group" aria-label="${s.stChipsAria}"></div>
    <p class="note pnote" data-ref="stNote"></p>
    <div class="stage">
      <svg data-ref="stSvg" viewBox="0 0 360 250" role="img" aria-label="${s.stSvgAria}"></svg>
      <div class="legend">
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--hyp)" stroke-width="2.4" stroke-linecap="round"/></svg>${s.stLegend.hip}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--amy)" stroke-width="2.4" stroke-linecap="round"/></svg>${s.stLegend.amy}</span>
        <span><i style="background:var(--muted)"></i>${s.stLegend.spine}</span>
      </div>
    </div>
    <div class="row">
      <button class="btn" data-ref="stPlay" type="button">${s.pcPlay.pause}</button>
      <button class="btn" data-ref="stReset" type="button">${s.pcReset}</button>
    </div>
    <section class="chart" aria-label="${s.stChartAria}">
      <h3 class="sim-h">${s.stChartH}</h3>
      <svg data-ref="stChart" viewBox="0 0 360 172" role="img" aria-label="${s.stChartSvgAria}"></svg>
    </section>
    <section aria-label="${s.stInputsAria}"><h3 class="sim-h">${s.inputs}</h3><div class="sliders" data-ref="stSliders"></div></section>
    <div class="notes" data-notes="str"></div>
  </section>
</div>`;

/* ---------- Yardımcılar ---------- */
const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Oynatma zamanı çarpıtması: etkinlik sürerken sabit hız, bitince hızlanan (üstel) hız. */
function warpSpeed(t: number, stopAt: number): number {
  return t < stopAt ? clamp(stopAt / 5, 1, 100) : 1 + 0.6 * (t - stopAt);
}

function niceStep(total: number): number {
  for (const s of [1, 5, 10, 30, 60, 90, 180, 360, 720]) if (total / s <= 6) return s;
  return 720;
}

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('nrp');
  const S = L();
  container.innerHTML = TEMPLATE(id, S);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduce = reducedMotion();

  /* ---------- Sekmeler ---------- */
  let tab: Tab = 'syn';
  let dirty = true;
  const SAY: Record<Tab, () => string> = { syn: () => '', prac: () => '', str: () => '' };
  const METERS: Record<Tab, () => Parameters<Meters['set']>[0]> = { syn: () => [], prac: () => [], str: () => [] };
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  const sayEl = $('say');
  const meters = new Meters($('meters'));
  let lastSay = '';
  function say(): void {
    const t = SAY[tab]();
    if (t !== lastSay) { lastSay = t; sayEl.textContent = t; }
    meters.set(METERS[tab]());
  }
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

  function makeChips(host: HTMLElement, labels: string[], onPick: (i: number) => void): (i: number) => void {
    const btns = labels.map((l, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = l; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => onPick(i));
      host.appendChild(b);
      return b;
    });
    return (i) => btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  }

  /* =====================================================================
     1) SİNAPS
     ===================================================================== */
  const SY = {
    f: 1, d: 900, post: 0, after: 0,
    run: 1,
    res: synapse({ freq: 1, dur: 900, post: 0 }) as SynResult,
    lvl: 0, plug: 0, wShown: -1, nRec: -1, headW: -9,
    preset: -1,
  };
  const synInp = () => ({ freq: SY.f, dur: SY.d, post: SY.post });
  const recompute = () => { SY.res = synapse(synInp()); };

  const synSvg = $<SVGElement>('synSvg');
  const clipId = `${id}-head`;
  const TOPY = 136, VBOT = 238;
  synSvg.innerHTML =
    `<defs><clipPath id="${clipId}"><path data-ref="synClip"/></clipPath></defs>` +
    '<path class="axon" data-ref="axon" d="M110,0 L110,34 M250,0 L250,34"/>' +
    '<path class="cell" d="M110,0 L110,30 C70,38 66,64 70,76 C74,96 100,100 120,100 L240,100 C260,100 286,96 290,76 C294,64 290,38 250,30 L250,0"/>' +
    '<g data-ref="ves"></g>' +
    '<path class="cell" data-ref="spine"/>' +
    '<rect class="fill-ca" data-ref="caFill" x="60" width="240" y="238" height="3" clip-path="url(#' + clipId + ')"/>' +
    '<g data-ref="thr"></g>' +
    '<g data-ref="recs"></g>' +
    '<rect class="nmda" x="166" y="132" width="28" height="12" rx="3"/>' +
    '<circle class="mg" data-ref="plug" cx="180" cy="128" r="6"/>' +
    '<g data-ref="gluG"></g><g data-ref="caG"></g>' +
    '<rect class="flash" data-ref="flash" x="0" y="252" width="360" height="48"/>' +
    `<text class="lab" x="5" y="52">${S.synLab.pre1}</text><text class="lab" x="5" y="64">${S.synLab.pre2}</text>` +
    `<text class="lab" x="294" y="112">${S.synLab.cleft1}</text><text class="lab" x="294" y="124">${S.synLab.cleft2}</text>` +
    `<text class="lab" x="3" y="196">${S.synLab.spine1}</text><text class="lab" x="3" y="208">${S.synLab.spine2}</text>` +
    `<text class="lab" x="52" y="119">${S.synLab.ampa}</text><line class="lead" x1="80" y1="116" x2="114" y2="127"/>` +
    `<text class="lab" x="262" y="150">${S.synLab.nmda}</text><line class="lead" x1="196" y1="140" x2="258" y2="147"/>` +
    `<text class="lab" x="214" y="114">${S.synLab.mg}</text><line class="lead" x1="212" y1="112" x2="187" y2="124"/><text class="lab" data-ref="post" x="180" y="290" text-anchor="middle">${S.synLab.dend}</text>` +
    `<text class="lab eff" x="12" y="14">${S.synLab.release}</text>`;

  // Titreşim: vezikül konumları
  const vesEls: SVGElement[] = [];
  [[118, 84], [144, 90], [170, 85], [196, 90], [222, 84], [246, 88]].forEach(([x, y]) => {
    vesEls.push(svg('circle', { class: 'ves', cx: x, cy: y, r: 8 }, $('ves')));
  });
  const vesT: number[] = vesEls.map(() => 0);
  // AMPA yuvaları (merkezden dışa doğru dolar)
  const slotX: number[] = [];
  for (let i = 0; i < 9; i++) { slotX.push(158 - i * 5.8); slotX.push(202 + i * 5.8); }
  slotX.sort((a, b) => Math.abs(a - 180) - Math.abs(b - 180));
  const recEls = slotX.map((x) => svg('rect', { class: 'rec', x: x - 2, y: 124, width: 4, height: 12, rx: 1.5 }, $('recs')));
  // eşik çizgileri
  const yOfPos = (p: number) => VBOT - p * (VBOT - TOPY - 4);
  const thr = $('thr');
  for (const [v, label] of [[SYN.thD, S.synLab.thrD], [SYN.thP, S.synLab.thrP]] as const) {
    const y = yOfPos(caPos(v));
    svg('line', { class: 'thr', x1: 96, x2: 264, y1: y, y2: y }, thr);
    const t = svg('text', { class: 'lab', x: 268, y: y + 3 }, thr);
    t.textContent = label;
  }
  // parçacıklar
  interface Part { el: SVGElement; x: number; y: number; vx: number; vy: number; on: boolean }
  const mkParts = (host: SVGElement, cls: string, r: number, n: number): Part[] =>
    Array.from({ length: n }, () => ({ el: svg('circle', { class: cls, r, display: 'none' }, host), x: 0, y: 0, vx: 0, vy: 0, on: false }));
  const glu = mkParts($('gluG') as unknown as SVGElement, 'glu', 2.8, 26);
  const cap = mkParts($('caG') as unknown as SVGElement, 'ca', 2.6, 26);
  const freeP = (a: Part[]) => a.find((p) => !p.on);
  const showP = (p: Part) => { p.on = true; p.el.setAttribute('display', 'inline'); };
  const hideP = (p: Part) => { p.on = false; p.el.setAttribute('display', 'none'); };
  // rastgelelik yalnızca görsel (parçacık konumu): sonuçları etkilemez
  const rnd = () => Math.random();

  function headPath(w: number): string {
    const k = clamp(w - 1, -0.6, 1.2);
    const mid = 176 + 10 * k, bot = 230 + 12 * k;
    return `M85,${mid} C85,150 108,${TOPY} 126,${TOPY} L234,${TOPY} C252,${TOPY} 275,150 275,${mid} C275,${bot - 14} 232,${bot - 6} 212,${bot} L212,254 L360,254 L360,300 L0,300 L0,254 L148,254 L148,${bot} C128,${bot - 6} 85,${bot - 14} 85,${mid} Z`;
  }
  const wNow = (): number => (SY.run < 1 ? 1 + synDelta(synInp(), SY.run) : synWeight(SY.res.delta, minutesOfSlider(SY.after)));

  function applySyn(): void {
    const w = wNow();
    if (Math.abs(w - SY.headW) > 0.015) {
      SY.headW = w;
      const d = headPath(w);
      $('spine').setAttribute('d', d);
      $('synClip').setAttribute('d', d);
    }
    const n = clamp(Math.round(8 * w), 2, 18);
    if (n !== SY.nRec) {
      SY.nRec = n;
      recEls.forEach((e, i) => e.setAttribute('class', i < n ? 'rec on' : 'rec'));
    }
    SY.wShown = w;
  }

  let nextSpike = 0.2, postT = 0, apT = 0, flashA = 0;
  const visRate = () => 1 + 4.5 * Math.log10(1 + SY.f);
  function spike(): void {
    const k = Math.min(5, 1 + Math.floor(SY.f / 14));
    const vi = Math.floor(rnd() * vesEls.length);
    vesT[vi] = 0.22; apT = 0.2;
    for (let i = 0; i < k; i++) {
      const p = freeP(glu); if (!p) break;
      p.x = 100 + rnd() * 160; p.y = 88 + rnd() * 6; p.vx = (rnd() - 0.5) * 10; p.vy = 46 + rnd() * 26;
      showP(p);
    }
  }
  function frameSyn(dt: number): void {
    if (SY.run < 1) {
      SY.run = Math.min(1, SY.run + dt / 6);
      dirty = true;
    }
    if (!reduce) {
      nextSpike -= dt;
      if (nextSpike <= 0) { spike(); nextSpike += 1 / visRate(); if (nextSpike < 0) nextSpike = 0.05; }
      if (SY.post > 0) {
        postT -= dt;
        if (postT <= 0) { flashA = 0.7; postT = 1 / (0.6 + 3.2 * SY.post); }
      }
    }
    const unb = SY.res.unblock;
    for (const p of glu) {
      if (!p.on) continue;
      p.y += p.vy * dt; p.x += p.vx * dt;
      if (p.y >= 125) {
        hideP(p);
        if (rnd() < clamp(Math.pow(unb, 0.8) * 1.3 + 0.04, 0, 1)) {
          const c = freeP(cap);
          if (c) { c.x = 180 + (rnd() - 0.5) * 12; c.y = 146; c.vx = (rnd() - 0.5) * 22; c.vy = 26 + rnd() * 20; showP(c); }
        }
      } else { p.el.setAttribute('cx', p.x.toFixed(1)); p.el.setAttribute('cy', p.y.toFixed(1)); }
    }
    for (const p of cap) {
      if (!p.on) continue;
      p.y += p.vy * dt; p.x += p.vx * dt;
      if (p.y >= 205 || p.x < 100 || p.x > 260) hideP(p);
      else { p.el.setAttribute('cx', p.x.toFixed(1)); p.el.setAttribute('cy', p.y.toFixed(1)); }
    }
    // Ca2+ seviyesi ve Mg2+ tıkacı hedefe doğru akar
    const target = caPos(SY.res.c);
    SY.lvl += (target - SY.lvl) * Math.min(1, dt * 5);
    const pg = Math.pow(unb, 0.6);
    SY.plug += (pg - SY.plug) * Math.min(1, dt * 6);
    const y = yOfPos(SY.lvl);
    $('caFill').setAttribute('y', y.toFixed(1));
    $('caFill').setAttribute('height', Math.max(0, 242 - y).toFixed(1));
    $('plug').setAttribute('cx', (180 + SY.plug * 30).toFixed(1));
    $('plug').setAttribute('cy', (128 - SY.plug * 16).toFixed(1));
    $('plug').setAttribute('opacity', (1 - 0.45 * SY.plug).toFixed(2));
    vesEls.forEach((e, i) => { if (vesT[i] > 0) vesT[i] = Math.max(0, vesT[i] - dt); e.setAttribute('opacity', vesT[i] > 0 ? '0.25' : '1'); });
    apT = Math.max(0, apT - dt);
    $('axon').setAttribute('class', apT > 0 ? 'axon hot' : 'axon');
    flashA = Math.max(0, flashA - dt * 2.5);
    $('flash').setAttribute('opacity', (SY.post > 0 ? flashA * SY.post : 0).toFixed(2));
    ($('post') as unknown as SVGElement).textContent = SY.post > 0 ? S.synLab.dendFiring(pct(SY.post)) : S.synLab.dendPlain;
    if (dirty || SY.run < 1) applySyn();
  }

  // ---- Sinaps zaman grafiği ----
  const GX0 = 40, GX1 = 340, GXS = 92, GY0 = 12, GY1 = 138, WMIN = 0.4, WMAX = 2.4;
  const gy = (w: number) => GY1 - ((clamp(w, WMIN, WMAX) - WMIN) / (WMAX - WMIN)) * (GY1 - GY0);
  const gxm = (m: number) => (m <= 0 ? GXS : GXS + (Math.log10(Math.max(m, 1)) / 4) * (GX1 - GXS));
  function drawSynChart(): void {
    const r = SY.res, inp = synInp();
    const col = r.zone === 'ltp' ? 'var(--dop)' : r.zone === 'ltd' ? 'var(--pit)' : 'var(--muted)';
    const pts: string[] = [];
    const running = SY.run < 1;
    const pmax = running ? SY.run : 1;
    for (let i = 0; i <= 24; i++) {
      const p = (i / 24) * pmax;
      pts.push(`${(GX0 + (GXS - GX0) * p).toFixed(1)},${gy(1 + synDelta(inp, p)).toFixed(1)}`);
    }
    if (!running) {
      for (let v = 0; v <= 100; v += 2) {
        const m = minutesOfSlider(v);
        pts.push(`${gxm(m).toFixed(1)},${gy(synWeight(r.delta, m)).toFixed(1)}`);
      }
    }
    const cm = minutesOfSlider(SY.after);
    const cx = running ? GX0 + (GXS - GX0) * SY.run : gxm(cm);
    const cy = gy(wNow());
    let s = '';
    for (const w of [0.5, 1, 1.5, 2]) {
      s += `<line class="${w === 1 ? 'base' : 'grid'}" x1="${GX0}" x2="${GX1}" y1="${gy(w)}" y2="${gy(w)}"/><text x="${GX0 - 4}" y="${gy(w) + 3}" text-anchor="end">${percent(String(w * 100))}</text>`;
    }
    s += `<line class="grid dash" x1="${GXS}" x2="${GXS}" y1="${GY0}" y2="${GY1}"/><text x="${(GX0 + GXS) / 2}" y="${GY1 + 14}" text-anchor="middle">${S.synChart.stim}</text>`;
    for (const [m, l] of ([[10, S.synChart.ticks[0]], [60, S.synChart.ticks[1]], [1440, S.synChart.ticks[2]], [10080, S.synChart.ticks[3]]] as const)) {
      s += `<line class="grid" x1="${gxm(m)}" x2="${gxm(m)}" y1="${GY1}" y2="${GY1 + 4}"/><text x="${gxm(m)}" y="${GY1 + 14}" text-anchor="middle">${l}</text>`;
    }
    s += `<text x="${GX1}" y="${GY1 + 28}" text-anchor="end">${S.synChart.axis}</text>`;
    s += `<polyline class="ln" points="${pts.join(' ')}" style="stroke:${col}"/>`;
    s += `<line class="cur" x1="${cx}" x2="${cx}" y1="${GY0}" y2="${GY1}"/><circle cx="${cx}" cy="${cy}" r="4.5" fill="${col}" stroke="var(--panel)" stroke-width="1.5"/>`;
    const lab = r.zone === 'ltp' ? S.synChart.ltp : r.zone === 'ltd' ? S.synChart.ltd : S.synChart.none;
    const lcol = r.zone === 'ltp' ? 'var(--eff-text)' : r.zone === 'ltd' ? 'var(--pit)' : 'var(--muted)';
    s += `<text x="${GX1 - 2}" y="${GY0 + 10}" text-anchor="end" style="fill:${lcol};font-weight:600">${lab}</text>`;
    $('synChart').innerHTML = s;
  }

  const afterText = (v: number): string => fmtMin(minutesOfSlider(v));
  let slF: SliderHandle, slD: SliderHandle, slP: SliderHandle, slA: SliderHandle;
  const setPresetChip = makeChips($('synChips'), S.synPresets, (i) => { const p = SYN_PRESETS[i]; setSyn(p.f, p.d, p.post, true); SY.preset = i; setPresetChip(i); });
  function setSyn(f: number, d: number, post: number, run: boolean): void {
    SY.f = f; SY.d = d; SY.post = post; SY.after = 0; SY.preset = -1;
    slF.set(logPos(f, 0.5, 100), fmtHz(f)); slD.set(logPos(d, 1, 900), fmtSec(d)); slP.set(Math.round(post * 100), pct(post)); slA.set(0);
    recompute();
    if (run) SY.run = 0;
    setPresetChip(-1);
    dirty = true;
  }
  const onSyn = () => { recompute(); SY.run = 1; setPresetChip(-1); dirty = true; };
  const synSl = $('synSliders');
  slF = makeSlider(scope, synSl, `${id}-f`, { name: S.synSliders.f.name, hint: S.synSliders.f.hint, min: 0, max: 100, step: 1, value: logPos(1, 0.5, 100), fmt: (v) => fmtHz(niceFreq(logVal(v, 0.5, 100))), color: 'var(--dop)' },
    (v) => { SY.f = niceFreq(logVal(v, 0.5, 100)); onSyn(); });
  slD = makeSlider(scope, synSl, `${id}-d`, { name: S.synSliders.d.name, hint: S.synSliders.d.hint, min: 0, max: 100, step: 1, value: logPos(900, 1, 900), fmt: (v) => fmtSec(niceSec(logVal(v, 1, 900))), color: 'var(--dop)' },
    (v) => { SY.d = niceSec(logVal(v, 1, 900)); onSyn(); });
  slP = makeSlider(scope, synSl, `${id}-p`, { name: S.synSliders.p.name, hint: S.synSliders.p.hint, min: 0, max: 100, step: 5, value: 0, fmt: (v) => percent(String(v)), color: 'var(--pit)' },
    (v) => { SY.post = v / 100; onSyn(); });
  slA = makeSlider(scope, synSl, `${id}-a`, { name: S.synSliders.a.name, hint: S.synSliders.a.hint, min: 0, max: 100, step: 1, value: 0, fmt: afterText, color: 'var(--ink)' },
    (v) => { SY.after = v; SY.run = 1; dirty = true; });
  scope.on($('synRun'), 'click', () => { SY.run = 0; SY.after = 0; slA.set(0); dirty = true; });

  const zoneText = (z: string) => (z === 'ltp' ? S.zoneText.ltp : z === 'ltd' ? S.zoneText.ltd : S.zoneText.yok);
  SAY.syn = () => {
    const r = SY.res;
    const head = S.synHead(fmtHz(SY.f), fmtSec(SY.d), r.pulses, SY.post > 0 ? pct(SY.post) : '', pct(r.unblock), zoneText(r.zone));
    if (SY.run < 1) return `${head} ${S.synRunning}`;
    const w = pct(synWeight(r.delta, minutesOfSlider(SY.after)));
    if (Math.abs(r.delta) < 0.04) return `${head} ${S.synNoChange}`;
    const tail = r.late > 0.5 ? S.synTail.stays : r.late < 0.2 ? S.synTail.fades : S.synTail.part;
    const change = (r.delta > 0 ? S.synUp : S.synDown)(pct(1), pct(1 + r.delta), minutesOfSlider(SY.after) > 0 ? w : '');
    return `${head} ${change} ${tail}`;
  };
  METERS.syn = () => {
    const r = SY.res, w = wNow();
    return [
      { label: S.synMeters.unblock, text: pct(r.unblock), frac: r.unblock, color: 'var(--pit)' },
      { label: S.synMeters.ca, text: r.zone === 'ltp' ? S.synMeters.ltp : r.zone === 'ltd' ? S.synMeters.ltd : S.synMeters.sub, frac: caPos(r.c), color: 'var(--gld)', mark: caPos(SYN.thP) },
      { label: S.synMeters.w, text: pct(w), frac: w / 2.4, color: w >= 1.04 ? 'var(--dop)' : w <= 0.96 ? 'var(--pit)' : 'var(--muted)', mark: 1 / 2.4 },
    ];
  };
  const hebbEl = $('hebb');
  const updateHebb = () => {
    const r = SY.res;
    let t = S.hebb.base;
    if (r.zone === 'ltp' && SY.post >= 0.6) t = S.hebb.ltpPost;
    else if (r.zone === 'ltp') t = S.hebb.ltpFreq;
    else if (r.zone === 'ltd') t = S.hebb.ltd;
    else if (SY.post > 0) t = S.hebb.postOnly;
    if (hebbEl.textContent !== t) hebbEl.textContent = t;
  };

  /* =====================================================================
     2) PRATİK VE KORTİKAL HARİTA
     ===================================================================== */
  const PC = {
    inp: { minutes: 120, mental: 0, days: 5 } as PracticeInputs,
    ser: null as unknown as PracticeSeries,
    t: 0, playing: true, preset: -1,
  };
  const pcSim = () => { PC.ser = simulatePractice(PC.inp); };
  pcSim();
  const pcSvg = $<SVGElement>('pcSvg');
  const TERR = [{ n: S.terr[0], w: 50 }, { n: S.terr[1], w: 70 }, { n: S.terr[2], w: 40 }, { n: S.terr[3], w: 70 }, { n: S.terr[4], w: 90 }];

  function drawMap(): void {
    const a = practiceAt(PC.ser, PC.t);
    const base = 70, tw = base * a.area, others = TERR.reduce((s, t, i) => s + (i === 3 ? 0 : t.w), 0);
    const k = (320 - tw) / others;
    let x = 20, s = `<text class="lab ctr" x="180" y="16">${S.map.title}</text>`;
    let tx = 0;
    TERR.forEach((t, i) => {
      if (i === 3) {
        tx = x;
        s += `<rect class="b-base" x="${x}" y="52" width="${base}" height="60"/>`;
        s += `<rect class="b-slow" x="${x + base}" y="52" width="${(base * a.slow).toFixed(1)}" height="60"/>`;
        s += `<rect class="b-fast" x="${x + base + base * a.slow}" y="52" width="${(base * a.fast).toFixed(1)}" height="60"/>`;
        s += `<rect class="terr tgt" x="${x}" y="52" width="${tw.toFixed(1)}" height="60" rx="6"/>`;
        s += `<text class="lab ctr strong" x="${x + base / 2}" y="86">${t.n}</text>`;
        x += tw;
      } else {
        const w = t.w * k;
        s += `<rect class="terr" x="${x.toFixed(1)}" y="52" width="${w.toFixed(1)}" height="60" rx="6"/><text class="lab ctr" x="${(x + w / 2).toFixed(1)}" y="86">${t.n}</text>`;
        x += w;
      }
    });
    const cx = tx + tw / 2;
    s += `<path class="brk" d="M${cx - 35},44 v-5 h70 v5"/><text class="lab ctr" x="${cx}" y="34">${S.map.baseSize}</text>`;
    s += `<path class="brk" d="M${tx},120 v5 h${tw.toFixed(1)} v-5"/><text class="val ctr" x="${cx}" y="141">${S.map.area(signed(Math.round((a.area - 1) * 100)))}</text>`;
    // parmaklar: fiziksel pratikte oynar, hayal ederken kesik çizgili düşünce balonu belirir
    const active = PC.t < PC.inp.days && PC.inp.minutes > 0;
    const phys = active ? 1 - PC.inp.mental : 0;
    const hs = [22, 30, 34, 30, 22];
    for (let i = 0; i < 5; i++) {
      const bob = reduce ? 0 : Math.max(0, Math.sin(PC.t * 7 + i * 1.3)) * 7 * phys;
      s += `<rect class="fing${active ? ' act' : ''}" x="${cx - 36 + i * 15}" y="${186 - hs[i] - bob}" width="10" height="${hs[i]}" rx="5"/>`;
    }
    s += `<rect class="palm" x="${cx - 40}" y="186" width="80" height="14" rx="6"/>`;
    if (active && PC.inp.mental > 0) s += `<ellipse class="thought" cx="${cx + 66}" cy="156" rx="30" ry="14"/><text class="lab ctr" x="${cx + 66}" y="159">${S.map.imagine}</text><circle class="thought" cx="${cx + 38}" cy="176" r="3"/><circle class="thought" cx="${cx + 31}" cy="184" r="1.8"/>`;
    const st = PC.t < PC.inp.days
      ? S.map.ongoing(Math.floor(PC.t) + 1, PC.inp.days)
      : S.map.stopped(Math.floor(PC.t - PC.inp.days));
    s += `<text class="lab ctr strong" x="180" y="222">${PC.inp.minutes === 0 ? S.map.none : st}</text>`;
    pcSvg.innerHTML = s;
  }

  const pcChart = $<SVGElement>('pcChart');
  function drawPcChart(): void {
    const ser = PC.ser, H = ser.horizon, n = ser.area.length;
    const amax = Math.max(1.2, ...ser.area) * 1.04;
    const x = (d: number) => GX0 + (d / H) * (GX1 - GX0);
    const y = (v: number) => GY1 - ((v - 1) / (amax - 1)) * (GY1 - GY0);
    let s = '';
    const stepY = amax - 1 > 0.5 ? 0.2 : 0.1;
    for (let v = 1; v <= amax; v += stepY) s += `<line class="${v === 1 ? 'base' : 'grid'}" x1="${GX0}" x2="${GX1}" y1="${y(v)}" y2="${y(v)}"/><text x="${GX0 - 4}" y="${y(v) + 3}" text-anchor="end">${signed(Math.round((v - 1) * 100))}%</text>`;
    s += `<rect class="shade" x="${GX0}" y="${GY0}" width="${Math.max(0, x(PC.inp.days) - GX0)}" height="${GY1 - GY0}"/>`;
    s += `<text x="${GX0 + 3}" y="${GY0 + 9}">${S.pcChart.practice}</text>`;
    const stp = niceStep(H);
    for (let d = 0; d <= H; d += stp) s += `<line class="grid" x1="${x(d)}" x2="${x(d)}" y1="${GY1}" y2="${GY1 + 4}"/><text x="${x(d)}" y="${GY1 + 14}" text-anchor="middle">${d}</text>`;
    s += `<text x="${GX1}" y="${GY1 + 28}" text-anchor="end">${S.pcChart.days}</text>`;
    const every = Math.max(1, Math.floor(n / 160));
    const line = (arr: number[]) => arr.map((v, i) => [i, v] as const).filter(([i]) => i % every === 0 || i === n - 1).map(([i, v]) => `${x(i * ser.dt).toFixed(1)},${y(1 + v).toFixed(1)}`).join(' ');
    s += `<polyline class="ln" points="${line(ser.slow)}" style="stroke:var(--pit);stroke-width:1.6"/>`;
    s += `<polyline class="ln" points="${line(ser.area.map((v) => v - 1))}" style="stroke:var(--ink)"/>`;
    const a = practiceAt(ser, PC.t), cx = x(PC.t);
    s += `<line class="cur" x1="${cx}" x2="${cx}" y1="${GY0}" y2="${GY1}"/><circle cx="${cx}" cy="${y(a.area)}" r="4.5" fill="var(--ink)" stroke="var(--panel)" stroke-width="1.5"/>`;
    s += `<g class="key"><line x1="${GX1 - 150}" x2="${GX1 - 134}" y1="${GY0 + 6}" y2="${GY0 + 6}" stroke="var(--ink)" stroke-width="2.2"/><text x="${GX1 - 130}" y="${GY0 + 9}">${S.pcChart.total}</text><line x1="${GX1 - 80}" x2="${GX1 - 64}" y1="${GY0 + 6}" y2="${GY0 + 6}" stroke="var(--pit)" stroke-width="2"/><text x="${GX1 - 60}" y="${GY0 + 9}">${S.pcChart.slow}</text></g>`;
    pcChart.innerHTML = s;
  }

  const setPcChip = makeChips($('pcChips'), S.pracPresets.map((p) => p.n), (i) => { setPrac(PRAC_PRESETS[i].p, true); PC.preset = i; setPcChip(i); $('pcNote').textContent = S.pracPresets[i].note; });
  let slPm: SliderHandle, slPx: SliderHandle, slPd: SliderHandle, slPt: SliderHandle;
  function setPrac(p: PracticeInputs, replay: boolean): void {
    PC.inp = { ...p };
    slPm.set(p.minutes); slPd.set(logPos(p.days, 1, 1200), fmtDays(p.days)); slPx.set(Math.round(p.mental * 100), pct(p.mental));
    pcSim();
    syncPcT();
    if (replay) { PC.t = 0; PC.playing = true; }
    PC.preset = -1; setPcChip(-1); $('pcNote').textContent = '';
    dirty = true;
  }
  const syncPcT = () => { slPt.inp.max = String(PC.ser.horizon); slPt.set(Math.min(PC.t, PC.ser.horizon), S.fmt.dayN(Math.round(PC.t))); };
  const onPrac = () => { pcSim(); PC.t = Math.min(PC.t, PC.ser.horizon); syncPcT(); PC.preset = -1; setPcChip(-1); $('pcNote').textContent = ''; dirty = true; };
  const pcSl = $('pcSliders');
  slPm = makeSlider(scope, pcSl, `${id}-pm`, { name: S.pcSliders.m.name, hint: S.pcSliders.m.hint, min: 0, max: 240, step: 5, value: 120, fmt: (v) => S.fmt.min(String(v)), color: 'var(--dop)' },
    (v) => { PC.inp.minutes = v; onPrac(); });
  slPx = makeSlider(scope, pcSl, `${id}-px`, { name: S.pcSliders.x.name, hint: S.pcSliders.x.hint, min: 0, max: 100, step: 5, value: 0, fmt: (v) => percent(String(v)), color: 'var(--pit)' },
    (v) => { PC.inp.mental = v / 100; onPrac(); });
  slPd = makeSlider(scope, pcSl, `${id}-pd`, { name: S.pcSliders.d.name, hint: S.pcSliders.d.hint, min: 0, max: 100, step: 1, value: logPos(5, 1, 1200), fmt: (v) => fmtDays(niceDays(logVal(v, 1, 1200))), color: 'var(--dop)' },
    (v) => { PC.inp.days = niceDays(logVal(v, 1, 1200)); onPrac(); });
  slPt = makeSlider(scope, pcSl, `${id}-pt`, { name: S.pcSliders.t.name, hint: S.pcSliders.t.hint, min: 0, max: PC.ser.horizon, step: 0.25, value: 0, fmt: (v) => S.fmt.dayN(Math.round(v)), color: 'var(--ink)' },
    (v) => { PC.t = v; PC.playing = false; dirty = true; });
  scope.on($('pcPlay'), 'click', () => { if (PC.t >= PC.ser.horizon) PC.t = 0; PC.playing = !PC.playing; dirty = true; });
  scope.on($('pcReset'), 'click', () => { PC.t = 0; PC.playing = true; dirty = true; });
  scope.on($('pcStop'), 'click', () => {
    if (PC.t < PC.inp.days) {
      PC.inp.days = Math.max(1, Math.ceil(PC.t));
      slPd.set(logPos(PC.inp.days, 1, 1200), fmtDays(PC.inp.days));
      const t = PC.t; pcSim(); PC.t = t; syncPcT(); PC.playing = true; PC.preset = -1; setPcChip(-1); dirty = true;
    }
  });

  SAY.prac = () => {
    const a = practiceAt(PC.ser, PC.t);
    const gain = Math.round((a.area - 1) * 100), slowP = Math.round(a.slow * 100);
    const state = PC.inp.minutes === 0 ? S.pracSay.none : PC.t < PC.inp.days ? S.pracSay.ongoing(PC.inp.mental > 0 ? pct(PC.inp.mental) : '') : S.pracSay.stopped(Math.floor(PC.t - PC.inp.days));
    return S.pracSay.line(Math.round(PC.t), signed(gain), signed(slowP), state);
  };
  METERS.prac = () => {
    const a = practiceAt(PC.ser, PC.t);
    return [
      { label: S.pracMeters.area, text: `${signed(Math.round((a.area - 1) * 100))}%`, frac: (a.area - 1) / 0.6, color: 'var(--dop)' },
      { label: S.pracMeters.slow, text: `${signed(Math.round(a.slow * 100))}%`, frac: a.slow / 0.6, color: 'var(--pit)' },
      { label: S.pracMeters.dose, text: S.fmt.min(String(Math.round(effort(PC.inp)))), frac: effort(PC.inp) / 240, color: 'var(--ink)' },
    ];
  };

  /* =====================================================================
     3) STRES VE YAPI
     ===================================================================== */
  const ST = {
    inp: { kind: 'kronik', days: 28, recover: 84 } as StressInputs,
    ser: null as unknown as StressSeries,
    t: 0, playing: true,
  };
  const stSim = () => { ST.ser = simulateStress(ST.inp); };
  stSim();
  const stSvg = $<SVGElement>('stSvg');
  svg('rect', { class: 'pnl', x: 2, y: 2, width: 176, height: 246, rx: 12 }, stSvg);
  svg('rect', { class: 'pnl', x: 182, y: 2, width: 176, height: 246, rx: 12 }, stSvg);
  const mkT = (x: number, y: number, s: string, cls = 'lab') => { const t = svg('text', { class: cls, x, y }, stSvg); t.textContent = s; return t; };
  mkT(90, 20, S.stNeurons.hip, 'lab ctr strong');
  mkT(270, 20, S.stNeurons.amy, 'lab ctr strong');
  const treeHip: Tree = buildTree(stSvg, { seed: 11, x: 90, y: 214, roots: [-1.571, -2.2, -0.95], lens: [28, 23, 18, 13, 10.5], spread: 0.55, w: [0.25, 0.5, 0.9, 1.3, 1.6], color: 'var(--hyp)', spinesPer: 5, somaR: 8 });
  const treeAmy: Tree = buildTree(stSvg, { seed: 23, x: 270, y: 132, roots: [0, 1.05, 2.1, 3.14, 4.2, 5.24], lens: [19, 17, 14, 12], spread: 0.6, w: [0.4, 0.9, 1.4, 1.8], color: 'var(--amy)', spinesPer: 0, somaR: 8 });
  const stTxtH = mkT(90, 240, '', 'val ctr');
  const stTxtA = mkT(270, 240, '', 'val ctr');

  function drawStress(): void {
    const e = stressAt(ST.ser, ST.t);
    treeHip.update(e.hip, e.spine);
    treeAmy.update(e.amy, 1);
    stTxtH.textContent = S.stTxtH(pct(e.hip), pct(e.spine));
    stTxtA.textContent = S.stTxtA(pct(e.amy));
  }
  const stChart = $<SVGElement>('stChart');
  const SYMIN = 0.55, SYMAX = 1.5;
  function drawStChart(): void {
    const ser = ST.ser, H = Math.max(1, ser.total), n = ser.hip.length;
    const x = (d: number) => GX0 + (d / H) * (GX1 - GX0);
    const y = (v: number) => GY1 - ((clamp(v, SYMIN, SYMAX) - SYMIN) / (SYMAX - SYMIN)) * (GY1 - GY0);
    let s = '';
    for (const v of [0.6, 0.8, 1, 1.2, 1.4]) s += `<line class="${v === 1 ? 'base' : 'grid'}" x1="${GX0}" x2="${GX1}" y1="${y(v)}" y2="${y(v)}"/><text x="${GX0 - 4}" y="${y(v) + 3}" text-anchor="end">${percent(String(Math.round(v * 100)))}</text>`;
    s += `<rect class="shade" x="${GX0}" y="${GY0}" width="${Math.max(0, x(ser.stressEnd) - GX0)}" height="${GY1 - GY0}"/><text x="${GX0 + 3}" y="${GY0 + 9}">${ST.inp.kind === 'kosu' ? S.stChart.run : S.stChart.stress}</text>`;
    const stp = niceStep(H);
    for (let d = 0; d <= H; d += stp) s += `<line class="grid" x1="${x(d)}" x2="${x(d)}" y1="${GY1}" y2="${GY1 + 4}"/><text x="${x(d)}" y="${GY1 + 14}" text-anchor="middle">${d}</text>`;
    s += `<text x="${GX1}" y="${GY1 + 28}" text-anchor="end">${S.pcChart.days}</text>`;
    const every = Math.max(1, Math.floor(n / 160));
    const line = (arr: number[]) => arr.map((v, i) => [i, v] as const).filter(([i]) => i % every === 0 || i === n - 1).map(([i, v]) => `${x(i * ser.dt).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    s += `<polyline class="ln" points="${line(ser.spine)}" style="stroke:var(--hyp);stroke-width:1.4;stroke-dasharray:4 3"/>`;
    s += `<polyline class="ln" points="${line(ser.hip)}" style="stroke:var(--hyp)"/>`;
    s += `<polyline class="ln" points="${line(ser.amy)}" style="stroke:var(--amy)"/>`;
    const e = stressAt(ser, ST.t), cx = x(ST.t);
    s += `<line class="cur" x1="${cx}" x2="${cx}" y1="${GY0}" y2="${GY1}"/><circle cx="${cx}" cy="${y(e.hip)}" r="4" fill="var(--hyp)" stroke="var(--panel)" stroke-width="1.5"/><circle cx="${cx}" cy="${y(e.amy)}" r="4" fill="var(--amy)" stroke="var(--panel)" stroke-width="1.5"/>`;
    s += `<text x="${GX1 - 2}" y="${GY0 + 10}" text-anchor="end" style="fill:var(--red-text);font-weight:600">${S.stChart.amy}</text><text x="${GX1 - 2}" y="${GY1 - 5}" text-anchor="end" style="fill:var(--hyp);font-weight:600">${S.stChart.hip}</text>`;
    stChart.innerHTML = s;
  }

  const setStChip = makeChips($('stChips'), S.stressKinds.map((k) => k.n), (i) => { ST.inp.kind = STRESS_KINDS[i].k; onStress(true); });
  let slSd: SliderHandle, slSr: SliderHandle, slSt: SliderHandle;
  const stNote = $('stNote');
  const syncStT = () => { slSt.inp.max = String(Math.round(ST.ser.total)); slSt.set(Math.min(ST.t, ST.ser.total), S.fmt.dayN(Math.round(ST.t))); };
  function onStress(replay: boolean): void {
    stSim();
    const i = STRESS_KINDS.findIndex((k) => k.k === ST.inp.kind);
    setStChip(i); stNote.textContent = S.stressKinds[i].note;
    slSd.setDisabled(ST.inp.kind === 'tek');
    ST.t = replay ? 0 : Math.min(ST.t, ST.ser.total);
    if (replay) ST.playing = true;
    syncStT(); dirty = true;
  }
  function setStress(inp: StressInputs): void {
    ST.inp = { ...inp };
    slSd.set(inp.days); slSr.set(inp.recover);
    onStress(true);
  }
  const stSl = $('stSliders');
  slSd = makeSlider(scope, stSl, `${id}-sd`, { name: S.stSliders.d.name, hint: S.stSliders.d.hint, min: 1, max: 60, step: 1, value: 28, fmt: (v) => S.fmt.days(v), color: 'var(--red)' },
    (v) => { ST.inp.days = v; onStress(false); });
  slSr = makeSlider(scope, stSl, `${id}-sr`, { name: S.stSliders.r.name, hint: S.stSliders.r.hint, min: 0, max: 180, step: 1, value: 84, fmt: (v) => S.fmt.days(v), color: 'var(--gld)' },
    (v) => { ST.inp.recover = v; onStress(false); });
  slSt = makeSlider(scope, stSl, `${id}-st`, { name: S.stSliders.t.name, hint: S.stSliders.t.hint, min: 0, max: Math.round(ST.ser.total), step: 1, value: 0, fmt: (v) => S.fmt.dayN(Math.round(v)), color: 'var(--ink)' },
    (v) => { ST.t = v; ST.playing = false; dirty = true; });
  scope.on($('stPlay'), 'click', () => { if (ST.t >= ST.ser.total) ST.t = 0; ST.playing = !ST.playing; dirty = true; });
  scope.on($('stReset'), 'click', () => { ST.t = 0; ST.playing = true; dirty = true; });

  SAY.str = () => {
    const e = stressAt(ST.ser, ST.t);
    const phase = ST.inp.kind === 'kosu'
      ? (ST.t < ST.ser.stressEnd ? S.strSay.runOn : S.strSay.runOff(Math.floor(ST.t - ST.ser.stressEnd)))
      : (ST.t < ST.ser.stressEnd ? S.strSay.stOn : S.strSay.stOff(Math.floor(ST.t - ST.ser.stressEnd)));
    const lostH = Math.round((1 - e.hip) * 100), gainA = Math.round((e.amy - 1) * 100);
    return S.strSay.line(Math.round(ST.t), phase, percent(String(lostH >= 0 ? lostH : -lostH)), lostH >= 0, percent(String(gainA)), gainA >= 0);
  };
  METERS.str = () => {
    const e = stressAt(ST.ser, ST.t);
    return [
      { label: S.strMeters.hip, text: pct(e.hip), frac: e.hip / 1.5, color: 'var(--hyp)', mark: 1 / 1.5 },
      { label: S.strMeters.spine, text: pct(e.spine), frac: e.spine / 1.5, color: 'var(--hyp)', mark: 1 / 1.5 },
      { label: S.strMeters.amy, text: pct(e.amy), frac: e.amy / 1.5, color: 'var(--amy)', mark: 1 / 1.5 },
    ];
  };

  /* =====================================================================
     REHBERLİ TUR
     ===================================================================== */
  const applies: Array<() => void> = [
    () => { showTab('syn'); setSyn(1, 900, 0, true); },
    () => { showTab('syn'); setSyn(5, 300, 0, true); },
    () => { showTab('syn'); setSyn(100, 1, 0, true); },
    () => { showTab('syn'); setSyn(1, 900, 1, true); },
    () => { showTab('prac'); setPrac(PRAC_PRESETS[0].p, true); PC.preset = 0; setPcChip(0); $('pcNote').textContent = S.pracPresets[0].note; },
    () => { showTab('str'); setStress({ kind: 'kronik', days: 28, recover: 84 }); },
  ];
  const tour = createTour(scope, S.tour.map((st, i) => ({ ...st, apply: applies[i] })));
  $('tourHost').appendChild(tour.el);

  /* ---------- Döngü ---------- */
  let last = performance.now(), tSay = 0, drawnSyn = false;
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (tab === 'syn') {
      frameSyn(dt);
      if (dirty || SY.run < 1) { drawSynChart(); updateHebb(); drawnSyn = true; }
    } else if (tab === 'prac') {
      if (PC.playing) {
        PC.t += dt * warpSpeed(PC.t, PC.inp.days);
        if (PC.t >= PC.ser.horizon) { PC.t = PC.ser.horizon; PC.playing = false; }
        slPt.set(PC.t, S.fmt.dayN(Math.round(PC.t)));
        dirty = true;
      }
      if (dirty) { drawMap(); drawPcChart(); }
      $('pcPlay').textContent = PC.playing ? S.pcPlay.pause : PC.t >= PC.ser.horizon ? S.pcPlay.replay : S.pcPlay.play;
      ($('pcStop') as HTMLButtonElement).disabled = !(PC.t < PC.inp.days);
    } else {
      if (ST.playing) {
        ST.t += dt * warpSpeed(ST.t, ST.ser.stressEnd);
        if (ST.t >= ST.ser.total) { ST.t = ST.ser.total; ST.playing = false; }
        slSt.set(ST.t, S.fmt.dayN(Math.round(ST.t)));
        dirty = true;
      }
      if (dirty) { drawStress(); drawStChart(); }
      $('stPlay').textContent = ST.playing ? S.pcPlay.pause : ST.t >= ST.ser.total ? S.pcPlay.replay : S.pcPlay.play;
    }
    if (dirty && tab === 'syn' && drawnSyn) $('synRun').textContent = SY.run < 1 ? S.synRunning : S.synRun;
    dirty = false;
    tSay += dt;
    if (tSay > 0.25) { tSay = 0; say(); }
  }

  // Başlangıç durumu
  syncPcT(); syncStT();
  const i0 = STRESS_KINDS.findIndex((k) => k.k === ST.inp.kind);
  setStChip(i0); stNote.textContent = STRESS_KINDS[i0].note;
  applySyn();
  showTab('syn');
  const poke = scope.announcer($('live'), () => lastSay);
  const onAction = () => { dirty = true; poke(); };
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);
  // Sayfa altı notları (nasıl çalışıyor + Kitapta + dipnot) ayrı parçadan gelir.
  lazyNotes(scope, root, () => import('./notes').then((m) => m.notes()));
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
