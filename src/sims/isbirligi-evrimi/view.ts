import { mulberry32 } from '../rng';
import { slider, f2, type SliderHandle } from '../ui';
import { percent, pct as pctS } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { L } from './text';
import '../sim.css';
import './view.css';
import { Scope, pct, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  INFO, KINS, MIXES, NICE, STRATS, criticalR, describeEvolution, describeKin, describeMatch, expectedKin, finitePopulation,
  matchStats, normalize, payoffMatrix, playMatch, replicateKin, type Kin, type Match, type Matrix, type StratId,
} from './model';

type Tab = 'tour' | 'kin';

/** Strateji renkleri (yalnızca ortak jetonlar). Rastgele ayrıca çizgili desenle ayrılır. */
export const COLOR: Record<StratId, string> = {
  allc: '--edge', alld: '--amy', tft: '--pfc', gtft: '--gld', ctft: '--pit', pavlov: '--dop', random: '--lesion',
};
/** Yığılmış alanda alttan üste sıra. */
const STACK: StratId[] = ['alld', 'random', 'allc', 'pavlov', 'ctft', 'gtft', 'tft'];

const GENS = 80, POP = 400, KIN_GENS = 120, KIN_RUNS = 6, KIN_POP = 400, MAX_SHOWN = 60;
const roundsOf = (v: number): number => Math.max(1, Math.round(Math.pow(200, v / 100)));
const sliderOf = (n: number): number => Math.round((100 * Math.log(n)) / Math.log(200));

const BOOK_LINK = (id: string, label: string) => `<a href="#/bolum/ch10?deney=${id}">${label}</a>`;

const TEMPLATE = (id: string): string => {
  const T = L();
  const rep = (k: 'sağlam' | 'karışık' | 'tartışmalı' | 'bilinmiyor'): string => t(`repl.${k}` as const);
  return `
<div class="sim sim-iso">
  <p class="lede">${T.lede}</p>

  <div class="tabs" role="tablist" aria-label="${T.tabsLabel}">
    <button class="tab" role="tab" id="${id}-tab-tour" data-pane="tour" aria-controls="${id}-pane-tour" aria-selected="true" type="button">${T.tabTour}</button>
    <button class="tab" role="tab" id="${id}-tab-kin" data-pane="kin" aria-controls="${id}-pane-kin" aria-selected="false" tabindex="-1" type="button">${T.tabKin}</button>
  </div>

  <div class="sim-bar" role="group" aria-label="${T.barLabel}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section class="pane" role="tabpanel" id="${id}-pane-tour" data-pane="tour" aria-labelledby="${id}-tab-tour">
    <div data-ref="tourSlot1"></div>

    <div class="card" data-sec="match">
      <h3 class="sim-h">${T.matchTitle}</h3>
      <p class="note">${T.matchNote}</p>
      <div class="stage"><svg data-ref="mSvg" viewBox="0 0 360 100" role="img" aria-label="${T.matchSvgLabel}"></svg>
        <div class="legend">
          <span><svg viewBox="0 0 12 12" aria-hidden="true"><rect width="12" height="12" rx="2" fill="var(--pfc)"/></svg>${T.legCoop}</span>
          <span><svg viewBox="0 0 12 12" aria-hidden="true"><rect width="12" height="12" rx="2" fill="var(--amy)"/><path d="M3 3L9 9M9 3L3 9" stroke="var(--panel)" stroke-width="1.6"/></svg>${T.legDefect}</span>
          <span><svg viewBox="0 0 12 12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="2" fill="none" stroke="var(--ink)" stroke-width="2"/></svg>${T.legError}</span>
        </div>
      </div>
      <div class="readout" data-ref="mRead"></div>
      <div class="pick">
        <label class="pk"><span>${T.playerA}</span><select data-ref="selA"></select></label>
        <label class="pk"><span>${T.playerB}</span><select data-ref="selB"></select></label>
      </div>
      <p class="note" data-ref="rules"></p>
      <div class="sliders" data-ref="gameSliders" aria-label="${T.gameSlidersLabel}"></div>
      <p class="note">${T.noiseRoundsNote}</p>
      <div class="row"><button class="btn" data-ref="rerun1" type="button">${T.rerun}</button><span class="seed" data-ref="seed1"></span></div>
    </div>

    <div class="card" data-sec="evo">
      <h3 class="sim-h">${T.evoTitle}</h3>
      <p class="note">${T.evoNote}</p>
      <div class="chips" data-ref="mixChips" role="group" aria-label="${T.mixChipsLabel}"></div>
      <details class="det" open><summary>${T.mixDetails}</summary><div class="sliders" data-ref="mixSliders"></div></details>
      <div class="stage"><svg data-ref="eSvg" viewBox="0 0 360 196" role="img" aria-label="${T.evoSvgLabel}"></svg>
        <div class="legend" data-ref="eLegend"></div>
      </div>
      <div class="readout" data-ref="eRead"></div>
      <div class="row"><button class="btn" data-ref="rerun2" type="button">${T.rerun}</button><span class="seed" data-ref="seed2"></span></div>
    </div>

    <details class="det"><summary>${t('sim.how')}</summary>
      <div class="det-in">
        <p>${T.howPayoffs}</p>
        <p>${T.howNoise}</p>
        <p>${T.howEvolution}</p>
        <ul class="rules" data-ref="ruleList"></ul>
      </div>
    </details>

    <aside class="book" aria-label="${t('sim.book')}">
      <h3 class="sim-h">${t('sim.book')}</h3>
      <ul>
        <li>${T.bookE6(BOOK_LINK('ch10-e6', T.bookE6Label), rep('karışık'))}</li>
        <li>${T.bookE7(BOOK_LINK('ch10-e7', T.bookE7Label), rep('tartışmalı'))}</li>
      </ul>
    </aside>
    <p class="foot">${T.footTour}</p>
  </section>

  <section class="pane" role="tabpanel" id="${id}-pane-kin" data-pane="kin" aria-labelledby="${id}-tab-kin" hidden>
    <div data-ref="tourSlot2"></div>

    <div class="formula" role="note"><span class="fm">r · B &gt; C</span><span class="fm-t">${T.formulaText}</span></div>

    <section aria-label="${T.kinDegreeLabel}"><h3 class="sim-h">${T.kinWho}</h3>
      <div class="ktab" role="group" aria-label="${T.kinDegreeLabel}" data-ref="kinTable"></div>
      <p class="note kn">${T.kinSurveyNote}</p>
    </section>

    <section aria-label="${T.kinBenefitCost}"><h3 class="sim-h">${T.kinBenefitCost}</h3>
      <div class="sliders" data-ref="kinSliders"></div></section>

    <div class="card" data-sec="kin">
      <h3 class="sim-h">${T.kinSpreadTitle}</h3>
      <p class="note">${T.kinSpreadNote}</p>
      <div class="stage"><svg data-ref="kDots" viewBox="0 0 360 100" role="img" aria-label="${T.dotsSvgLabel}"></svg>
        <div class="legend"><span><i class="dot-on"></i>${T.legCarries}</span><span><i class="dot-off"></i>${T.legNotCarries}</span></div>
      </div>
      <div class="stage"><svg data-ref="kChart" viewBox="0 0 360 172" role="img" aria-label="${T.kinChartLabel}"></svg>
        <div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M0 5H26" stroke="var(--gld)" stroke-width="2"/></svg>${T.legRuns}</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M0 5H26" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 3"/></svg>${T.legExpected}</span></div>
      </div>
      <div class="readout" data-ref="kRead"></div>
      <div class="row"><button class="btn" data-ref="rerun3" type="button">${T.rerun}</button><span class="seed" data-ref="seed3"></span></div>
    </div>

    <details class="det"><summary>${t('sim.how')}</summary>
      <div class="det-in">
        <p>${T.howKin1}</p>
        <p>${T.howKin2}</p>
      </div>
    </details>

    <aside class="book" aria-label="${t('sim.book')}">
      <h3 class="sim-h">${t('sim.book')}</h3>
      <ul>
        <li>${T.bookKinHamilton}</li>
        <li>${T.bookE10(BOOK_LINK('ch10-e10', T.bookE10Label), rep('bilinmiyor'), percent('1'), percent('2'), percent('16'), percent('26'))}</li>
        <li>${T.bookE11(BOOK_LINK('ch10-e11', T.bookE11Label), rep('sağlam'), percent('40'))}</li>
      </ul>
    </aside>
    <p class="foot">${T.footKin}</p>
  </section>
</div>`;
};

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('iso');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const T = L();
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Durum ---------- */
  const S = {
    a: 'tft' as StratId, b: 'alld' as StratId, noise: 0, rounds: 20, seed: 1,
    mix: MIXES[0].x.slice(), focus: 'match' as 'match' | 'evo',
    kin: KINS[0] as Kin, B: 0.8, C: 0.3, kseed: 1,
  };
  let tab: Tab = 'tour';
  let dirty = true;

  /* ---------- Sekmeler ---------- */
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  function showTab(t: Tab, focus = false): void {
    tab = t; dirty = true;
    for (const b of tabBtns) {
      const on = b.dataset.pane === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const p of panes) p.hidden = p.dataset.pane !== t;
    updateBar(true);
  }
  for (const b of tabBtns) {
    scope.on(b, 'click', () => showTab(b.dataset.pane as Tab));
    scope.on(b, 'keydown', (ev) => {
      const i = tabBtns.indexOf(b);
      const j = ev.key === 'ArrowRight' ? (i + 1) % tabBtns.length : ev.key === 'ArrowLeft' ? (i + tabBtns.length - 1) % tabBtns.length : -1;
      if (j >= 0) { ev.preventDefault(); showTab(tabBtns[j].dataset.pane as Tab, true); }
    });
  }

  /* ---------- Kaydırıcı ---------- */
  function makeSlider(parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, val: number,
    cb: (v: number) => void, fmt: (v: number) => string, color: string): SliderHandle {
    return slider(scope, parent, { id: `${id}-sl-${key}`, name, hint, min, max, value: val, fmt, color, onInput: cb });
  }

  /* =====================================================
     TURNUVA: tek eşleşme
     ===================================================== */
  const mSvg = $<SVGElement>('mSvg');
  const selA = $<HTMLSelectElement>('selA'), selB = $<HTMLSelectElement>('selB');
  for (const s of STRATS) for (const sel of [selA, selB]) {
    const o = document.createElement('option'); o.value = s; o.textContent = INFO[s].short; sel.appendChild(o);
  }
  let match: Match = playMatch(S.a, S.b, S.rounds, S.noise, mulberry32(S.seed));
  let shown = 0, drawnCells = 0;
  const SH = (): number => Math.min(match.rounds, MAX_SHOWN);

  const CELL = 11, X0 = 22;
  function buildMatchFrame(): void {
    mSvg.innerHTML = '';
    drawnCells = 0;
    const blocks = Math.ceil(SH() / 30);
    const H = 8 + blocks * 58;
    mSvg.setAttribute('viewBox', `0 0 360 ${H}`);
    for (let b = 0; b < blocks; b++) {
      const y = 8 + b * 58;
      svgText(mSvg, { x: 6, y: y + 9, class: 't-row' }, 'A');
      svgText(mSvg, { x: 6, y: y + 9 + CELL + 3, class: 't-row' }, 'B');
      const last = Math.min(SH(), (b + 1) * 30);
      for (let k = b * 30 + 1; k <= last; k++) if (k === 1 || k % 10 === 0) svgText(mSvg, { x: X0 + ((k - 1) % 30) * CELL + CELL / 2, y: y + 2 * CELL + 16, class: 't-tick', 'text-anchor': 'middle' }, String(k));
    }
    if (match.rounds > MAX_SHOWN) svgText(mSvg, { x: 354, y: H - 2, class: 't-tick', 'text-anchor': 'end' }, T.firstRoundsShown(MAX_SHOWN, match.rounds));
  }
  function drawCell(who: 0 | 1, t: number): void {
    const b = Math.floor(t / 30), y = 8 + b * 58 + (who ? CELL + 3 : 0) - 0;
    const x = X0 + (t % 30) * CELL;
    const coop = (who ? match.mb : match.ma)[t], err = (who ? match.eb : match.ea)[t];
    const g = svg('g', {}, mSvg);
    svg('rect', { x, y: y, width: CELL - 1.5, height: CELL - 1.5, rx: 2, fill: coop ? 'var(--pfc)' : 'var(--amy)' }, g);
    if (!coop) svg('path', { d: `M${x + 2.5},${y + 2.5} L${x + CELL - 4},${y + CELL - 4} M${x + CELL - 4},${y + 2.5} L${x + 2.5},${y + CELL - 4}`, stroke: 'var(--panel)', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, g);
    if (err) svg('rect', { x: x - 1, y: y - 1, width: CELL + 0.5, height: CELL + 0.5, rx: 3, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.8 }, g);
  }
  function drawMatch(): void {
    while (drawnCells < Math.min(shown, SH())) { drawCell(0, drawnCells); drawCell(1, drawnCells); drawnCells++; }
  }
  function matchReadout(): void {
    const st = matchStats(match);
    $('mRead').innerHTML =
      `<div class="ro"><span class="k" style="color:var(${COLOR[match.a] === '--lesion' ? '--muted' : COLOR[match.a]})">${T.playerLabel('A', INFO[match.a].short)}</span><span class="v">${T.points(match.scoreA)}</span><span class="k">${T.perRound(f2(st.avgA))}</span></div>` +
      `<div class="ro"><span class="k">${T.playerLabel('B', INFO[match.b].short)}</span><span class="v">${T.points(match.scoreB)}</span><span class="k">${T.perRound(f2(st.avgB))}</span></div>`;
    $('rules').textContent = T.rules(INFO[match.a].rule, INFO[match.b].rule);
  }
  function runMatch(): void {
    match = playMatch(S.a, S.b, S.rounds, S.noise, mulberry32(S.seed));
    shown = reduced ? SH() : 0;
    buildMatchFrame();
    drawMatch();
    matchReadout();
    $('seed1').textContent = T.seed(S.seed);
    dirty = true;
  }

  /* =====================================================
     TURNUVA: evrimsel dinamik
     ===================================================== */
  const eSvg = $<SVGElement>('eSvg');
  const PL = { x0: 30, x1: 298, top: 10, bot: 164 };
  const xOf = (g: number) => PL.x0 + ((PL.x1 - PL.x0) * g) / GENS;
  const yOf = (v: number) => PL.bot - (PL.bot - PL.top) * v;
  const memo = new Map<string, Matrix>();
  const matrix = (): Matrix => {
    const k = `${S.rounds}|${S.noise}`;
    let m = memo.get(k);
    if (!m) { m = payoffMatrix(S.rounds, S.noise); if (memo.size > 40) memo.clear(); memo.set(k, m); }
    return m;
  };
  let traj: number[][] = [];
  let evoCur = 0, evoDrawn = -1;
  const bands = {} as Record<StratId, SVGElement>;
  const bandLabels: SVGElement[] = [];
  const patId = `${id}-hatch`;
  function buildEvoFrame(): void {
    eSvg.innerHTML = '';
    const defs = svg('defs', {}, eSvg);
    const pat = svg('pattern', { id: patId, width: 5, height: 5, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    svg('rect', { width: 5, height: 5, fill: 'var(--panel)' }, pat);
    svg('rect', { width: 2.2, height: 5, fill: 'var(--lesion)' }, pat);
    for (const v of [0, 0.5, 1]) {
      svg('line', { class: 'grid', x1: PL.x0, x2: PL.x1, y1: yOf(v), y2: yOf(v) }, eSvg);
      svgText(eSvg, { x: PL.x0 - 5, y: yOf(v) + 3.5, 'text-anchor': 'end' }, pct(v) + '%');
    }
    for (let g = 0; g <= GENS; g += 20) svgText(eSvg, { x: xOf(g), y: PL.bot + 14, 'text-anchor': g === 0 ? 'start' : g === GENS ? 'end' : 'middle' }, String(g));
    svgText(eSvg, { x: (PL.x0 + PL.x1) / 2, y: PL.bot + 28, 'text-anchor': 'middle' }, T.axisGen);
    for (const s of STACK) bands[s] = svg('path', { class: 'band', fill: s === 'random' ? `url(#${patId})` : `var(${COLOR[s]})`, stroke: s === 'random' ? 'var(--lesion)' : 'var(--panel)' }, eSvg);
    bandLabels.length = 0;
  }
  function drawEvo(): void {
    const g = Math.min(GENS, Math.floor(evoCur));
    evoDrawn = g;
    const base = new Array(g + 1).fill(0);
    for (const s of STACK) {
      const i = STRATS.indexOf(s);
      const lo = base.slice();
      const hi = lo.map((v, k) => v + traj[k][i]);
      hi.forEach((v, k) => { base[k] = v; });
      let d = `M${xOf(0)},${yOf(hi[0])}`;
      for (let k = 1; k <= g; k++) d += ` L${xOf(k).toFixed(1)},${yOf(hi[k]).toFixed(1)}`;
      for (let k = g; k >= 0; k--) d += ` L${xOf(k).toFixed(1)},${yOf(lo[k]).toFixed(1)}`;
      bands[s].setAttribute('d', d + 'Z');
    }
    for (const l of bandLabels) l.remove();
    bandLabels.length = 0;
    let acc = 0;
    for (const s of STACK) {
      const v = traj[g][STRATS.indexOf(s)];
      if (v >= 0.07) bandLabels.push(svgText(eSvg, { x: xOf(g) + 4, y: yOf(acc + v / 2) + 3.5, class: 't-band' }, INFO[s].short));
      acc += v;
    }
    bandLabels.push(svgText(eSvg, { x: PL.x1, y: PL.top - 1, 'text-anchor': 'end', class: 't-gen' }, T.genLabel(g)));
  }
  function runEvo(): void {
    traj = finitePopulation(matrix(), normalize(S.mix), GENS, POP, mulberry32(S.seed + 1000));
    evoCur = reduced ? GENS : 0;
    buildEvoFrame();
    drawEvo();
    $('seed2').textContent = T.seed(S.seed);
    evoReadout();
    dirty = true;
  }
  const evoNow = (): number[] => traj[Math.min(GENS, evoDrawn < 0 ? 0 : evoDrawn)];
  function evoReadout(): void {
    const x = evoNow();
    const nice = NICE.reduce((s, k) => s + x[STRATS.indexOf(k)], 0);
    $('eRead').innerHTML =
      `<div class="ro"><span class="k">${T.recipRow}</span><span class="v">${pctS(nice)}</span><span class="k">${T.recipSub}</span></div>` +
      `<div class="ro"><span class="k" style="color:var(--red-text)">${T.alldRow}</span><span class="v">${pctS(x[STRATS.indexOf('alld')])}</span><span class="k">${T.startedAt(pctS(traj[0][STRATS.indexOf('alld')]))}</span></div>`;
  }
  const lg = $('eLegend');
  for (const s of STRATS) {
    const sp = document.createElement('span');
    sp.innerHTML = `<i class="${s === 'random' ? 'hatch' : ''}" style="background:var(${COLOR[s]})"></i>${INFO[s].short}`;
    lg.appendChild(sp);
  }

  /* ---------- Oyun ayarları ve karışım kontrolleri ---------- */
  const gameSl = $('gameSliders');
  const noiseSl = makeSlider(gameSl, 'noise', T.noiseName, T.noiseHint, 0, 20, 0,
    (v) => { S.noise = v / 100; runMatch(); runEvo(); }, (v) => percent(String(v)), 'var(--red)');
  const roundsSl = makeSlider(gameSl, 'rounds', T.roundsName, T.roundsHint, 0, 100, sliderOf(S.rounds),
    (v) => { S.rounds = roundsOf(v); runMatch(); runEvo(); }, (v) => T.roundsFmt(roundsOf(v)), 'var(--pfc)');
  scope.on(selA, 'change', () => { S.a = selA.value as StratId; S.focus = 'match'; runMatch(); });
  scope.on(selB, 'change', () => { S.b = selB.value as StratId; S.focus = 'match'; runMatch(); });
  scope.on($('rerun1'), 'click', () => { S.seed++; S.focus = 'match'; runMatch(); runEvo(); });
  scope.on($('rerun2'), 'click', () => { S.seed++; S.focus = 'evo'; runMatch(); runEvo(); });

  const mixChips = $('mixChips');
  const mixSl: SliderHandle[] = [];
  const mixShare = (i: number): number => normalize(S.mix)[i];
  function refreshMixLabels(): void { STRATS.forEach((_, i) => { mixSl[i].set(S.mix[i]); }); }
  function markMix(): void {
    const n = normalize(S.mix);
    Array.from(mixChips.children).forEach((b, i) => {
      const m = normalize(MIXES[i].x);
      b.setAttribute('aria-pressed', String(m.every((v, k) => Math.abs(v - n[k]) < 0.015)));
    });
  }
  STRATS.forEach((s, i) => {
    mixSl.push(makeSlider($('mixSliders'), 'mix-' + s, INFO[s].short, '', 0, 100, S.mix[i],
      (v) => { S.mix[i] = v; S.focus = 'evo'; markMix(); runEvo(); }, () => pctS(mixShare(i)), `var(${COLOR[s] === '--lesion' ? '--muted' : COLOR[s]})`));
  });
  // Kaydırıcı yüzdeleri toplamın yeniden normalizasyonunu gösterir; her değişiklikte tazele.
  const relabel = () => root.querySelectorAll<HTMLElement>('[data-ref="mixSliders"] .sl-val').forEach((el, i) => { el.textContent = pctS(mixShare(i)); });
  scope.on($('mixSliders'), 'input', relabel);
  MIXES.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = m.name; b.setAttribute('aria-pressed', String(i === 0));
    scope.on(b, 'click', () => { S.mix = m.x.slice(); S.focus = 'evo'; refreshMixLabels(); relabel(); markMix(); runEvo(); });
    mixChips.appendChild(b);
  });
  relabel();
  $('ruleList').innerHTML = STRATS.map((s) => `<li><b>${INFO[s].name}:</b> ${INFO[s].rule}</li>`).join('');

  /* =====================================================
     AKRABA SEÇİLİMİ
     ===================================================== */
  const kDots = $<SVGElement>('kDots'), kChart = $<SVGElement>('kChart');
  const KC = { x0: 30, x1: 350, top: 10, bot: 138 };
  const kx = (g: number) => KC.x0 + ((KC.x1 - KC.x0) * g) / KIN_GENS;
  const ky = (v: number) => KC.bot - (KC.bot - KC.top) * v;
  let runs: ReturnType<typeof replicateKin> = [];
  let theory: number[] = [];
  let kinCur = 0, kinDrawn = -1;
  let dots: SVGElement[] = [];
  let dotCount = 0;
  let kLines: SVGElement[] = [];
  let kTheory: SVGElement | null = null;
  let kLabel: SVGElement | null = null;

  function buildKinFrame(): void {
    kDots.innerHTML = '';
    dots = [];
    dotCount = 0;
    const cols = 40, rows = KIN_POP / cols, sp = 8.6;
    kDots.setAttribute('viewBox', `0 0 360 ${rows * sp + 8}`);
    const rng = mulberry32(99);
    const order = Array.from({ length: KIN_POP }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const cells: SVGElement[] = new Array(KIN_POP);
    for (let i = 0; i < KIN_POP; i++) cells[i] = svg('circle', { class: 'dot', cx: 6 + (i % cols) * sp + 4, cy: 4 + Math.floor(i / cols) * sp + 4, r: 3 }, kDots);
    dots = order.map((p) => cells[p]);
    kChart.innerHTML = '';
    for (const v of [0, 0.5, 1]) {
      svg('line', { class: 'grid', x1: KC.x0, x2: KC.x1, y1: ky(v), y2: ky(v) }, kChart);
      svgText(kChart, { x: KC.x0 - 5, y: ky(v) + 3.5, 'text-anchor': 'end' }, pct(v) + '%');
    }
    for (let g = 0; g <= KIN_GENS; g += 30) svgText(kChart, { x: kx(g), y: KC.bot + 14, 'text-anchor': g === 0 ? 'start' : g === KIN_GENS ? 'end' : 'middle' }, String(g));
    svgText(kChart, { x: (KC.x0 + KC.x1) / 2, y: KC.bot + 28, 'text-anchor': 'middle' }, T.axisKinGen);
    kLines = runs.map(() => svg('polyline', { class: 'ln kl', points: '' }, kChart));
    kTheory = svg('polyline', { class: 'ln kt', points: '' }, kChart);
    kLabel = svgText(kChart, { x: KC.x1, y: KC.top - 1, 'text-anchor': 'end', class: 't-gen' }, '');
  }
  const meanAt = (g: number): number => runs.reduce((s, r) => s + r.freq[g], 0) / runs.length;
  function drawKin(): void {
    const g = Math.min(KIN_GENS, Math.floor(kinCur));
    kinDrawn = g;
    runs.forEach((r, i) => {
      let pts = '';
      for (let k = 0; k <= g; k++) pts += `${kx(k).toFixed(1)},${ky(r.freq[k]).toFixed(1)} `;
      kLines[i].setAttribute('points', pts);
    });
    let tp = '';
    for (let k = 0; k <= g; k++) tp += `${kx(k).toFixed(1)},${ky(theory[k]).toFixed(1)} `;
    kTheory!.setAttribute('points', tp);
    kLabel!.textContent = T.kinGenLabel(g);
    const want = Math.round(runs[0].freq[g] * KIN_POP);
    while (dotCount < want) dots[dotCount++].classList.add('on');
    while (dotCount > want) dots[--dotCount].classList.remove('on');
  }
  function kinReadout(): void {
    const g = Math.max(0, kinDrawn);
    const lhs = S.kin.r * S.B;
    $('kRead').innerHTML =
      `<div class="ro"><span class="k">${T.rbRow}</span><span class="v">${f2(lhs)}</span><span class="k">${T.rbSub(S.kin.frac, f2(S.B))}</span></div>` +
      `<div class="ro"><span class="k">${T.costRow}</span><span class="v">${f2(S.C)}</span><span class="k">${T.criticalSub(S.B > 0 ? f2(criticalR(S.B, S.C)) : '—')}</span></div>` +
      `<div class="ro wide"><span class="k">${T.geneRow}</span><span class="v">${pctS(meanAt(g))}</span><span class="k">${T.expectedSub(pctS(theory[g]))}</span></div>`;
  }
  function runKin(): void {
    const P = { r: S.kin.r, B: S.B, C: S.C, p0: 0.1, size: KIN_POP, gens: KIN_GENS };
    runs = replicateKin(P, S.kseed, KIN_RUNS);
    theory = expectedKin(P);
    kinCur = reduced ? KIN_GENS : 0;
    buildKinFrame();
    drawKin();
    kinReadout();
    $('seed3').textContent = `Tohum: ${S.kseed}`;
    renderKinTable();
    dirty = true;
  }
  function verdict(r: number): 'yes' | 'no' | 'eq' {
    const d = r * S.B - S.C;
    return d > 1e-9 ? 'yes' : d < -1e-9 ? 'no' : 'eq';
  }
  const kinTable = $('kinTable');
    function renderKinTable(): void {
    kinTable.innerHTML = `<div class="kr kh" aria-hidden="true">${T.kinTableHead.map((h) => `<span>${h}</span>`).join('')}</div>` +
      KINS.map((k) => {
        const v = verdict(k.r);
        return `<button type="button" class="kr v-${v}" data-k="${k.id}" aria-pressed="${k.id === S.kin.id}"><span class="kn">${k.name}</span><span>${k.frac}</span><span>${f2(k.r * S.B)}</span><span class="vd">${{ yes: T.verdictYes, no: T.verdictNo, eq: T.verdictEq }[v]}</span><span>${k.dogPct != null ? percent(String(k.dogPct)) : '–'}</span></button>`;
      }).join('');
  }
  scope.on(kinTable, 'click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-k]');
    if (!b) return;
    S.kin = KINS.find((k) => k.id === b.dataset.k)!;
    runKin();
  });
  const kinSl = {
    B: makeSlider($('kinSliders'), 'B', T.benefitName, T.benefitHint, 0, 100, Math.round(S.B * 100),
      (v) => { S.B = v / 100; runKin(); }, (v) => f2(v / 100), 'var(--gld)'),
    C: makeSlider($('kinSliders'), 'C', T.costName, T.costHint, 0, 80, Math.round(S.C * 100),
      (v) => { S.C = v / 100; runKin(); }, (v) => f2(v / 100), 'var(--red)'),
  };
  scope.on($('rerun3'), 'click', () => { S.kseed++; runKin(); });

  /* =====================================================
     Çubuk (anlık açıklama + göstergeler)
     ===================================================== */
  const sayEl = $('say'), metersEl = $('meters');
  let lastSay = '', lastMeters = '';
  function meterHtml(items: Array<[string, number, string, string]>): string {
    return items.map(([name, v, txt, col]) => `<div style="--c:${col}"><div class="m-top"><span>${name}</span><b>${txt}</b></div><div class="track"><b style="width:${pct(Math.max(0, Math.min(1, v)))}%"></b></div></div>`).join('');
  }
  function currentSay(): string {
    if (tab === 'kin') {
      const g = Math.max(0, kinDrawn);
      return describeKin(S.kin, S.B, S.C, meanAt(g), 0.1);
    }
    if (S.focus === 'match') return describeMatch(match);
    return describeEvolution(traj[0], evoNow(), Math.max(0, evoDrawn));
  }
  function updateBar(force = false): void {
    const t = currentSay();
    if (force || t !== lastSay) { lastSay = t; sayEl.textContent = t; }
    let m: string;
    if (tab === 'kin') {
      m = meterHtml([
        [T.mKin[0], S.kin.r * S.B, f2(S.kin.r * S.B), 'var(--gld)'],
        [T.mKin[1], S.C, f2(S.C), 'var(--red)'],
        [T.mKin[2], meanAt(Math.max(0, kinDrawn)), pctS(meanAt(Math.max(0, kinDrawn))), 'var(--pfc)'],
      ]);
    } else if (S.focus === 'match') {
      const st = matchStats(match);
      m = meterHtml([
        [T.mMatch[0], st.mutualCoop / match.rounds, pctS(st.mutualCoop / match.rounds), 'var(--pfc)'],
        [T.mMatch[1], st.avgA / 5, f2(st.avgA), `var(${COLOR[match.a] === '--lesion' ? '--muted' : COLOR[match.a]})`],
        [T.mMatch[2], st.avgB / 5, f2(st.avgB), `var(${COLOR[match.b] === '--lesion' ? '--muted' : COLOR[match.b]})`],
      ]);
    } else {
      const x = evoNow();
      const nice = NICE.reduce((s, k) => s + x[STRATS.indexOf(k)], 0);
      m = meterHtml([
        [T.mEvo[0], nice, pctS(nice), 'var(--pfc)'],
        [T.mEvo[1], x[STRATS.indexOf('alld')], pctS(x[STRATS.indexOf('alld')]), 'var(--amy)'],
        [T.mEvo[2], x[STRATS.indexOf('tft')], pctS(x[STRATS.indexOf('tft')]), 'var(--pfc)'],
      ]);
    }
    if (force || m !== lastMeters) { lastMeters = m; metersEl.innerHTML = m; }
  }

  /* =====================================================
     Döngü
     ===================================================== */
  let last = performance.now(), tBar = 0;
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    let moved = false;
    if (tab === 'tour') {
      if (shown < SH()) { shown = Math.min(SH(), shown + dt * 30); drawMatch(); moved = true; }
      if (evoCur < GENS) { evoCur = Math.min(GENS, evoCur + dt * 16); if (Math.floor(evoCur) !== evoDrawn) { drawEvo(); evoReadout(); } moved = true; }
    } else if (kinCur < KIN_GENS) {
      kinCur = Math.min(KIN_GENS, kinCur + dt * 24);
      if (Math.floor(kinCur) !== kinDrawn) { drawKin(); kinReadout(); }
      moved = true;
    }
    tBar += dt;
    if (dirty || (moved && tBar > 0.25)) { dirty = false; tBar = 0; updateBar(); }
  }

  /* ---------- Rehberli turlar ---------- */
  const setGame = (noise: number, rounds: number) => {
    S.noise = noise; S.rounds = rounds;
    noiseSl.set(Math.round(noise * 100)); roundsSl.set(sliderOf(rounds));
  };
  const setPair = (a: StratId, b: StratId) => { S.a = a; S.b = b; selA.value = a; selB.value = b; };
  const setMix = (x: number[]) => { S.mix = x.slice(); refreshMixLabels(); relabel(); markMix(); };
  // Tur adımı değişince ilgili görsel ekrana getirilir (ilk kurulumda kaydırma yok).
  let ready = false;
  const reveal = (el: Element) => { if (ready && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); };
  const playBoth = (focus: 'match' | 'evo') => { S.focus = focus; runMatch(); runEvo(); reveal(focus === 'evo' ? eSvg : mSvg); };

  const tour1 = createTour(scope, [
    { ...T.tour1[0], apply: () => { setGame(0, 20); setPair('tft', 'alld'); S.seed = 1; playBoth('match'); } },
    { ...T.tour1[1], apply: () => { setGame(0.04, 40); setPair('tft', 'tft'); S.seed = 16; playBoth('match'); } },
    { ...T.tour1[2], apply: () => { setGame(0.04, 40); setPair('ctft', 'ctft'); S.seed = 16; playBoth('match'); } },
    { ...T.tour1[3], apply: () => { setGame(0, 200); setMix(MIXES[0].x); S.seed = 1; playBoth('evo'); } },
    { ...T.tour1[4], apply: () => { setGame(0.05, 200); setMix(MIXES[0].x); S.seed = 1; playBoth('evo'); } },
    { ...T.tour1[5], apply: () => { setGame(0, 1); setMix(MIXES[0].x); S.seed = 1; playBoth('evo'); } },
]);
  $('tourSlot1').appendChild(tour1.el);

  const setKin = (id: string, B: number, C: number) => {
    S.kin = KINS.find((k) => k.id === id)!; S.B = B; S.C = C;
    kinSl.B.set(Math.round(B * 100)); kinSl.C.set(Math.round(C * 100));
    runKin();
    reveal(kChart);
  };
  const tour2 = createTour(scope, [
    { ...T.tour2[0], apply: () => { S.kseed = 1; setKin('kardes', 0.8, 0.3); } },
    { ...T.tour2[1], apply: () => { S.kseed = 1; setKin('kuzen', 0.8, 0.3); } },
    { ...T.tour2[2], apply: () => { S.kseed = 1; setKin('kuzen', 1.0, 0.05); } },
    { ...T.tour2[3], apply: () => { S.kseed = 1; setKin('yabanci', 1.0, 0.05); } },
    { ...T.tour2[4], apply: () => { S.kseed = 1; setKin('yarim', 0.8, 0.2); } },
]);
  $('tourSlot2').appendChild(tour2.el);

  ready = true;

  /* ---------- Başlangıç ---------- */
  showTab('tour');
  const poke = scope.announcer($('live'), () => lastSay);
  const onAction = () => { dirty = true; poke(); };
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);
  scope.on(root, 'change', onAction);
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
