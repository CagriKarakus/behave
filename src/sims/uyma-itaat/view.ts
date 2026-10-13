import { mulberry32 } from '../rng';
import { slider } from '../ui';
import '../sim.css';
import './view.css';
import { Scope, pct, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import { t } from '../../i18n/t';
import type { MsgKey } from '../../i18n/messages';
import { L } from './text';
import {
  ASCH_DEFAULT, LEVELS, MIL, MIL_DEFAULT, aschCurve, aschTrial, describeAsch, describeMilgram,
  simulateAsch, simulateMilgram, volts,
  type AschInputs, type AschTrial, type Learner, type MilgramInputs,
} from './model';

const LETTERS = ['A', 'B', 'C'];
export const ASCH_PRESETS: Array<{ id: string; u: AschInputs }> = [
  { id: 'base', u: ASCH_DEFAULT },
  { id: 'small', u: { ...ASCH_DEFAULT, n: 2 } },
  { id: 'ally', u: { ...ASCH_DEFAULT, ally: true } },
  { id: 'private', u: { ...ASCH_DEFAULT, open: false } },
];
export const MIL_PRESETS: Array<{ id: string; u: MilgramInputs }> = [
  { id: 'base', u: MIL_DEFAULT },
  { id: 'far', u: { ...MIL_DEFAULT, authority: 0 } },
  { id: 'near', u: { ...MIL_DEFAULT, learner: 1 } },
  { id: 'diff', u: { ...MIL_DEFAULT, diffused: true } },
  { id: 'peer', u: { ...MIL_DEFAULT, peer: true } },
];

const TEMPLATE = (id: string) => {
  const T = L();
  const rep = (key: 'sağlam' | 'karışık' | 'tartışmalı') => `(${t('repl.badge', { s: t(`repl.${key}` as MsgKey) }).toLowerCase()})`;
  return `
<div class="sim sim-uyma">
  <p class="lede">${T.lede}</p>
  <div class="tabs" role="tablist" aria-label="${T.tabsAria}" data-ref="tabs">
    <button type="button" role="tab" class="tab" id="${id}-t-asch" aria-controls="${id}-p-asch" data-tab="asch">${T.tabAsch}</button>
    <button type="button" role="tab" class="tab" id="${id}-t-mil" aria-controls="${id}-p-mil" data-tab="mil">${T.tabMil}</button>
  </div>

  <div class="sim-bar" role="group" aria-label="${T.barAria}">
    <div class="sim-bar-in">
      <p class="say" data-ref="say"></p>
      <div class="meters">
        <div class="m" style="--c: var(--amy)"><div class="m-top"><span data-ref="l0"></span><b data-ref="v0">0%</b></div><div class="track"><b data-ref="b0"></b></div></div>
        <div class="m" style="--c: var(--dop)"><div class="m-top"><span data-ref="l1"></span><b data-ref="v1">0%</b></div><div class="track"><b data-ref="b1"></b></div></div>
        <div class="m" style="--c: var(--pfc)"><div class="m-top"><span data-ref="l2"></span><b data-ref="v2">0%</b></div><div class="track"><b data-ref="b2"></b></div></div>
      </div>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section role="tabpanel" id="${id}-p-asch" aria-labelledby="${id}-t-asch" data-ref="p-asch" class="panel">
    <div class="chips" data-ref="a-presets" role="group" aria-label="${T.asch.presetsAria}"></div>
    <div class="stage">
      <svg viewBox="0 0 360 258" role="img" aria-label="${T.asch.stageAria}" data-ref="a-stage"></svg>
      <div class="legend">
        <span><i style="background:color-mix(in srgb, var(--amy) 24%, var(--panel));border:2px solid var(--amy);box-sizing:border-box"></i>${T.asch.legendWrong}</span>
        <span><i style="background:color-mix(in srgb, var(--pfc) 24%, var(--panel));border:2px solid var(--pfc);box-sizing:border-box"></i>${T.asch.legendRight}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><circle cx="13" cy="5" r="4" fill="none" stroke="var(--ink)" stroke-width="2"/></svg>${T.asch.legendReal}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><circle cx="13" cy="5" r="4" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-dasharray="2 2"/></svg>${T.asch.legendAlly}</span>
      </div>
    </div>
    <div class="row">
      <button class="btn btn-go" type="button" data-ref="a-play">${T.asch.play}</button>
      <button class="btn" type="button" data-ref="a-rerun">${T.asch.rerun}</button>
    </div>
    <p class="tally" data-ref="a-tally" aria-live="off"></p>
    <section class="chart" aria-label="${T.asch.chartAria}">
      <h3 class="sim-h">${T.asch.chartTitle}</h3>
      <svg viewBox="0 0 360 185" role="img" aria-label="${T.asch.chartSvgAria}" data-ref="a-chart"></svg>
      <div class="legend">
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--amy)" stroke-width="2.4"/></svg>${T.asch.legendCur}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 3"/></svg>${T.asch.legendBase}</span>
      </div>
    </section>
    <section aria-label="${T.asch.inputsAria}">
      <h3 class="sim-h">${T.asch.inputsTitle}</h3>
      <div class="sliders" data-ref="a-in"></div>
    </section>
  </section>

  <section role="tabpanel" id="${id}-p-mil" aria-labelledby="${id}-t-mil" data-ref="p-mil" class="panel" hidden>
    <div class="chips" data-ref="m-presets" role="group" aria-label="${T.mil.presetsAria}"></div>
    <div class="stage">
      <svg viewBox="0 0 360 232" role="img" aria-label="${T.mil.stageAria}" data-ref="m-stage"></svg>
      <div class="legend">
        <span><i style="background:var(--amy)"></i>${T.mil.legendGoing}</span>
        <span><i style="background:transparent;border:2px solid var(--pfc);width:10px;height:10px;box-sizing:border-box"></i>${T.mil.legendQuit}</span>
      </div>
    </div>
    <div class="row">
      <button class="btn btn-go" type="button" data-ref="m-play">${T.mil.play}</button>
      <button class="btn" type="button" data-ref="m-rerun">${T.mil.rerun}</button>
    </div>
    <section class="chart" aria-label="${T.mil.chartAria}">
      <h3 class="sim-h">${T.mil.chartTitle}</h3>
      <svg viewBox="0 0 360 185" role="img" aria-label="${T.mil.chartSvgAria}" data-ref="m-chart"></svg>
      <div class="legend">
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--ink)" stroke-width="2.2"/></svg>${T.mil.legendStill}</span>
        <span><i style="background:var(--pfc)"></i>${T.mil.legendStopAt}</span>
        <span><i style="background:var(--amy)"></i>${T.mil.legendFull}</span>
      </div>
    </section>
    <section aria-label="${T.mil.inputsAria}">
      <h3 class="sim-h">${T.mil.inputsTitle}</h3>
      <div class="sliders" data-ref="m-in"></div>
    </section>
  </section>

  <details class="how">
    <summary>${t('sim.how')}</summary>
    <p><b>${T.how.aschLabel}</b> ${T.how.asch}</p>
    <p><b>${T.how.milLabel}</b> ${T.how.mil}</p>
    <p>${T.how.assumptions}</p>
  </details>

  <aside class="book" aria-label="${t('sim.book')}">
    <h3 class="sim-h">${t('sim.book')}</h3>
    <ul>
      <li><a href="#/bolum/ch12?deney=ch12-e8">${T.book.asch.link}</a> ${rep('sağlam')}. ${T.book.asch.note}</li>
      <li><a href="#/bolum/ch12?deney=ch12-e9">${T.book.mil.link}</a> ${rep('karışık')}. ${T.book.mil.note}</li>
      <li><a href="#/bolum/ch12?deney=ch12-e10">${T.book.sper.link}</a> ${rep('tartışmalı')} ${T.book.sper.before}<a href="#/bolum/ch12?deney=ch12-e11">ch12-e11</a>${T.book.sper.after}</li>
    </ul>
  </aside>

  <p class="foot">${T.foot}</p>
</div>`;
};

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('uyma');
  const T = L();
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const S = {
    tab: 'asch' as 'asch' | 'mil',
    a: { ...ASCH_DEFAULT } as AschInputs,
    m: { ...MIL_DEFAULT } as MilgramInputs,
    seed: 5,
    trialNo: 0,
    tally: { played: 0, conformed: 0 },
    pos: LEVELS, // Milgram merdiveninde gösterilen basamak (kesirli)
    playing: false,
  };
  let cohort = simulateAsch(S.a, S.seed);
  let run = simulateMilgram(S.m, S.seed);
  let trial: AschTrial = aschTrial(S.a, mulberry32(S.seed));
  // Deneme animasyonu: başlangıç zamanı (null: oynamıyor).
  let anim: { t0: number; sig: string; counted: boolean } | null = null;
  const STEP = reduced ? 1 : 550, THINK = reduced ? 1 : 750;

  // ---- Alt çubuk ----
  const sayEl = $('say');
  const poke = scope.announcer($('live'), () => sayEl.textContent ?? '');
  scope.on(root, 'click', poke);
  scope.on(root, 'input', poke);
  const meter = (i: number, label: string, v: number, text?: string) => {
    $(`l${i}`).textContent = label;
    $(`v${i}`).textContent = text ?? pct(v) + '%';
    $(`b${i}`).style.width = pct(v) + '%';
  };
  function renderBar(): void {
    if (S.tab === 'asch') {
      sayEl.textContent = describeAsch(S.a, cohort);
      meter(0, T.asch.meterRate, cohort.rate);
      meter(1, T.asch.meterAny, cohort.anyShare);
      meter(2, T.asch.meterNever, cohort.neverShare);
    } else {
      sayEl.textContent = describeMilgram(S.m, run);
      meter(0, T.mil.meterFull, run.full);
      meter(1, T.mil.meterEarly, run.early);
      meter(2, T.mil.meterMedian, run.median / LEVELS, run.median === 0 ? '0 V' : volts(run.median) + ' V');
    }
  }

  // ---- Küçük arayüz yardımcıları ----
  function addSlider(parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, step: number,
    fmt: (v: number) => string, onInput: (v: number) => void, cls: string): (v: number) => void {
    const h = slider(scope, parent, { id: `${id}-s-${key}`, name, hint, min, max, step, fmt, cls, onInput });
    return (v) => h.set(v);
  }
  function addToggle(parent: HTMLElement, name: string, hint: string, onToggle: () => void): (on: boolean) => void {
    const w = document.createElement('div');
    w.innerHTML = `<button type="button" class="btn tg" aria-pressed="false">${name}</button><p class="sl-hint">${hint}</p>`;
    parent.appendChild(w);
    const b = w.querySelector('button') as HTMLButtonElement;
    scope.on(b, 'click', onToggle);
    return (on) => b.setAttribute('aria-pressed', String(on));
  }
  function addChoice(parent: HTMLElement, label: string, names: string[], hint: string, onPick: (i: number) => void): (i: number) => void {
    const w = document.createElement('div');
    w.innerHTML = `<div class="sl-top"><span class="sl-name">${label}</span></div><div class="row" role="radiogroup" aria-label="${label}"></div><p class="sl-hint">${hint}</p>`;
    parent.appendChild(w);
    const row = w.querySelector('.row') as HTMLElement;
    const bs = names.map((n, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn'; b.textContent = n; b.setAttribute('role', 'radio');
      scope.on(b, 'click', () => onPick(i));
      row.appendChild(b);
      return b;
    });
    return (i) => bs.forEach((b, j) => { b.setAttribute('aria-checked', String(i === j)); b.setAttribute('aria-pressed', String(i === j)); });
  }
  function addPresets<U>(host: HTMLElement, list: Array<{ id: string; u: U }>, names: string[], apply: (u: U) => void): (cur: U) => void {
    const bs = list.map((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = names[i]; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => apply({ ...p.u }));
      host.appendChild(b);
      return b;
    });
    return (cur) => list.forEach((p, i) => bs[i].setAttribute('aria-pressed', String(JSON.stringify(p.u) === JSON.stringify(cur))));
  }

  // =================================================================== ASCH
  const aStage = $<SVGElement>('a-stage');
  const REF_LEN = 70, BASE_Y = 128;
  // Kartlar
  svg('rect', { class: 'card', x: 10, y: 8, width: 100, height: 140, rx: 8 }, aStage);
  svgText(aStage, { class: 'cap', x: 60, y: 24, 'text-anchor': 'middle' }, T.asch.capRef);
  svg('rect', { class: 'card', x: 120, y: 8, width: 230, height: 140, rx: 8 }, aStage);
  svgText(aStage, { class: 'cap', x: 235, y: 24, 'text-anchor': 'middle' }, T.asch.capWhich);
  const refLine = svg('line', { class: 'bar', x1: 60, x2: 60, y1: BASE_Y, y2: BASE_Y - REF_LEN }, aStage);
  void refLine;
  const optX = [168, 235, 302];
  const optLines = optX.map((x, i) => {
    const l = svg('line', { class: 'bar', x1: x, x2: x, y1: BASE_Y, y2: BASE_Y - REF_LEN }, aStage);
    svgText(aStage, { class: 'cap lt', x, y: 144, 'text-anchor': 'middle' }, LETTERS[i]);
    return l;
  });
  const seatsG = svg('g', {}, aStage);
  const aStatus = svgText(aStage, { class: 'status', x: 180, y: 248, 'text-anchor': 'middle' }, '');
  let seats: Array<{ c: SVGElement; t: SVGElement; ally: boolean }> = [];

  function drawCards(): void {
    const d = 10 + 40 * S.a.easy;
    const wrongLens = [REF_LEN - d, REF_LEN + 0.7 * d];
    let wi = 0;
    optLines.forEach((l, i) => {
      const len = i === trial.correct ? REF_LEN : wrongLens[wi++];
      l.setAttribute('y2', String(BASE_Y - len));
    });
  }
  function buildSeats(): void {
    seatsG.replaceChildren();
    const count = trial.speakers.length + 1;
    const step = Math.min(30, 330 / count);
    const r = Math.min(11, step / 2 - 1.5);
    const x0 = 180 - (step * (count - 1)) / 2;
    seats = [];
    for (let i = 0; i < count; i++) {
      const isSubj = i === count - 1;
      const ally = !isSubj && trial.speakers[i].ally;
      const g = svg('g', { transform: `translate(${(x0 + i * step).toFixed(1)},190)` }, seatsG);
      const c = svg('circle', { class: 'seat' + (isSubj ? ' subj' : '') + (ally ? ' ally' : ''), r }, g);
      const t = svgText(g, { class: 'seat-t', y: 4, 'text-anchor': 'middle' }, isSubj ? '?' : '');
      seats.push({ c, t, ally });
    }
    const subjX = x0 + (count - 1) * step;
    svgText(seatsG, { class: 'cap', x: Math.max(40, (x0 + subjX - step) / 2), y: 218, 'text-anchor': 'middle' }, T.asch.seatsCap(trial.speakers.length));
    svgText(seatsG, { class: 'cap', x: Math.min(330, subjX), y: 230, 'text-anchor': 'middle' }, T.asch.subject);
  }
  /** Animasyonun o anki durumunu (kaç kişi konuştu, denek cevapladı mı) çizer. */
  function drawSeats(now: number): void {
    const n = trial.speakers.length;
    const el = anim ? now - anim.t0 : Infinity;
    const spoken = anim ? Math.min(n, Math.floor(el / STEP)) : S.trialNo > 0 ? n : 0;
    const decided = anim ? el >= n * STEP + THINK : S.trialNo > 0;
    const sig = `${trial.correct}${trial.wrong}|${spoken}|${decided}|${S.a.open}`;
    if (anim && sig === anim.sig) return;
    if (anim) anim.sig = sig;
    seats.forEach((s, i) => {
      if (i < n) {
        const sp = trial.speakers[i];
        const on = i < spoken;
        s.c.classList.toggle('bad', on && !sp.ally);
        s.c.classList.toggle('good', on && sp.ally);
        s.t.textContent = on ? LETTERS[sp.pick] : '';
      }
    });
    const subj = seats[n];
    const pick = trial.conforms ? trial.wrong : trial.correct;
    subj.c.classList.toggle('bad', decided && trial.conforms);
    subj.c.classList.toggle('good', decided && !trial.conforms);
    subj.t.textContent = decided ? LETTERS[pick] : '?';
    if (!anim && S.trialNo === 0) aStatus.textContent = T.asch.statusIdle;
    else if (!decided) {
      aStatus.textContent = spoken < n ? T.asch.statusSpoken(spoken, n) : S.a.open ? T.asch.statusOpenTurn : T.asch.statusPrivate;
    } else {
      aStatus.textContent = trial.conforms
        ? T.asch.statusConform(LETTERS[trial.wrong])
        : T.asch.statusIndep(LETTERS[trial.correct]);
      if (anim && !anim.counted) {
        anim.counted = true;
        S.tally.played++; if (trial.conforms) S.tally.conformed++;
        drawTally();
        anim = null;
        poke();
      }
    }
  }
  const aTally = $('a-tally');
  function drawTally(): void {
    aTally.textContent = S.tally.played
      ? T.asch.tally(S.tally.played, S.tally.conformed, pct(cohort.p))
      : '';
  }
  function newTrial(): void {
    trial = aschTrial(S.a, mulberry32(S.seed * 7919 + ++S.trialNo));
    buildSeats(); drawCards();
  }
  function playTrial(): void {
    newTrial();
    anim = { t0: performance.now(), sig: '', counted: false };
    drawSeats(anim.t0);
  }

  // Grafik
  const aChart = $<SVGElement>('a-chart');
  const AC = { x0: 40, x1: 346, top: 12, bot: 140, ymax: 0.6 };
  const axN = (n: number) => AC.x0 + ((n - 1) / 14) * (AC.x1 - AC.x0);
  const ayP = (p: number) => AC.bot - (AC.bot - AC.top) * (p / AC.ymax);
  for (const v of [0, 0.2, 0.4, 0.6]) {
    svg('line', { class: 'grid', x1: AC.x0, x2: AC.x1, y1: ayP(v), y2: ayP(v) }, aChart);
    svgText(aChart, { x: AC.x0 - 6, y: ayP(v) + 3.5, 'text-anchor': 'end' }, pct(v) + '%');
  }
  for (const n of [1, 3, 6, 9, 12, 15]) svgText(aChart, { x: axN(n), y: AC.bot + 14, 'text-anchor': 'middle' }, String(n));
  svgText(aChart, { x: (AC.x0 + AC.x1) / 2, y: AC.bot + 30, 'text-anchor': 'middle' }, T.asch.axisX);
  for (const [n, t] of [[3, T.asch.markNoticeable], [6, T.asch.markPlateau]] as const) {
    svg('line', { class: 'grid dash', x1: axN(n), x2: axN(n), y1: AC.top, y2: AC.bot }, aChart);
    svgText(aChart, { x: axN(n) + 3, y: AC.top + 8 }, t);
  }
  const aRefLine = svg('polyline', { class: 'ln ref', points: '' }, aChart);
  const aLine = svg('polyline', { class: 'ln cur', points: '' }, aChart);
  const aDot = svg('circle', { class: 'dot', r: 4.5 }, aChart);
  const aDotT = svgText(aChart, { class: 'dot-t', 'text-anchor': 'middle' }, '');
  const pts = (arr: number[]) => arr.map((p, i) => `${axN(i + 1).toFixed(1)},${ayP(p).toFixed(1)}`).join(' ');
  const refCurve = aschCurve(ASCH_DEFAULT);
  aRefLine.setAttribute('points', pts(refCurve));
  function drawAschChart(): void {
    const c = aschCurve(S.a);
    aLine.setAttribute('points', pts(c));
    const n = Math.max(1, S.a.n);
    aDot.setAttribute('cx', axN(n).toFixed(1));
    aDot.setAttribute('cy', ayP(c[n - 1]).toFixed(1));
    aDotT.setAttribute('x', axN(n).toFixed(1));
    aDotT.setAttribute('y', (ayP(c[n - 1]) - 9).toFixed(1));
    aDotT.textContent = pct(c[n - 1]) + '%';
  }

  // Girdiler
  const aIn = $('a-in');
  const setN = addSlider(aIn, 'n', T.asch.nameN, T.asch.hintN, 1, 15, 1,
    T.asch.fmtN, (v) => { S.a.n = v; changeAsch(); }, 'sl-amy');
  const setAlly = addToggle(aIn, T.asch.nameAlly, T.asch.hintAlly, () => { S.a.ally = !S.a.ally; changeAsch(); });
  const setOpen = addChoice(aIn, T.asch.nameOpen, T.asch.optOpen, T.asch.hintOpen, (i) => { S.a.open = i === 0; changeAsch(); });
  const setEasy = addSlider(aIn, 'easy', T.asch.nameEasy, T.asch.hintEasy, 0, 1, 0.05,
    (v) => (v < 0.34 ? T.asch.fmtEasy[0] : v < 0.67 ? T.asch.fmtEasy[1] : T.asch.fmtEasy[2]), (v) => { S.a.easy = v; changeAsch(); }, 'sl-pfc');
  const markAschPresets = addPresets(
    $('a-presets'), ASCH_PRESETS, T.asch.presets, (u) => { S.a = u; changeAsch(true); });

  function syncAschInputs(): void {
    setN(S.a.n); setAlly(S.a.ally); setOpen(S.a.open ? 0 : 1); setEasy(S.a.easy); markAschPresets(S.a);
  }
  function changeAsch(sync = false): void {
    cohort = simulateAsch(S.a, S.seed);
    S.tally = { played: 0, conformed: 0 };
    anim = null; S.trialNo = 0; drawTally();
    trial = aschTrial(S.a, mulberry32(S.seed));
    buildSeats(); drawCards(); drawSeats(performance.now());
    drawAschChart();
    if (sync) syncAschInputs(); else markAschPresets(S.a);
    renderBar();
  }
  scope.on($('a-play'), 'click', playTrial);
  scope.on($('a-rerun'), 'click', () => { S.seed++; changeAsch(); });

  // =================================================================== MILGRAM
  const mStage = $<SVGElement>('m-stage');
  const rungs: SVGElement[] = [];
  for (let i = 0; i < LEVELS; i++) rungs.push(svg('rect', { class: 'rung', x: 15 + i * 11, y: 12, width: 10, height: 16, rx: 2 }, mStage));
  const rungX = (d: number) => 15 + (d - 1) * 11 + 5;
  svgText(mStage, { class: 'cap', x: rungX(1), y: 42, 'text-anchor': 'middle' }, '15 V');
  svgText(mStage, { class: 'cap', x: rungX(30), y: 42, 'text-anchor': 'end' }, '450 V');
  for (const j of MIL.jumps) {
    svg('line', { class: 'tick', x1: rungX(j) - 5, x2: rungX(j) - 5, y1: 10, y2: 32 }, mStage);
    svgText(mStage, { class: 'cap', x: rungX(j) - 5, y: 42, 'text-anchor': 'middle' }, volts(j) + ' V');
  }
  svgText(mStage, { class: 'cap', x: 180, y: 56, 'text-anchor': 'middle' }, T.mil.stageThresholds);
  const DX = 24, DY = 74, DS = 14;
  const dots: SVGElement[] = [];
  for (let i = 0; i < MIL.agents; i++) {
    dots.push(svg('circle', { class: 'ag', cx: DX + (i % 10) * DS + 6, cy: DY + Math.floor(i / 10) * DS + 6, r: 5.2 }, mStage));
  }
  const mVolt = svgText(mStage, { class: 'big', x: 176, y: 104 }, '');
  const mGo = svgText(mStage, { class: 'cap2', x: 176, y: 130 }, '');
  const mStop = svgText(mStage, { class: 'cap2', x: 176, y: 150 }, '');
  const mNote = svgText(mStage, { class: 'cap', x: 176, y: 176 }, '');
  const mNote2 = svgText(mStage, { class: 'cap', x: 176, y: 190 }, '');

  function drawMilStage(): void {
    const shown = Math.floor(S.pos + 1e-9);
    // Basamaklar
    rungs.forEach((r, i) => {
      const on = i < shown;
      r.classList.toggle('on', on);
      r.setAttribute('fill-opacity', on ? (0.3 + 0.7 * ((i + 1) / LEVELS)).toFixed(2) : '0');
    });
    // Ajanlar artan sıralıdır: ilk durmuş olanlar ızgaranın başına dizilir.
    let stopped = 0;
    run.last.forEach((d, i) => {
      const quit = d < LEVELS && d + 1 <= shown; // d. şoku verdikten sonra (d+1) basamağını reddetti
      if (quit) stopped++;
      dots[i].classList.toggle('quit', quit);
    });
    const going = MIL.agents - stopped;
    mVolt.textContent = shown === 0 ? T.mil.start : volts(shown) + ' V';
    mGo.textContent = T.mil.going(going);
    mStop.textContent = T.mil.stopped(stopped);
    if (shown >= LEVELS) {
      mNote.textContent = T.mil.reachedFull(run.hist[LEVELS]);
      mNote2.textContent = T.mil.expected(pct(run.expected));
    } else { mNote.textContent = S.playing ? T.mil.climbing : ''; mNote2.textContent = ''; }
  }

  // Bırakma grafiği
  const mChart = $<SVGElement>('m-chart');
  const MC = { x0: 34, x1: 346, top: 12, bot: 140 };
  const mx = (d: number) => MC.x0 + (d / LEVELS) * (MC.x1 - MC.x0);
  const my = (v: number) => MC.bot - (MC.bot - MC.top) * v;
  for (const v of [0, 0.5, 1]) {
    svg('line', { class: 'grid', x1: MC.x0, x2: MC.x1, y1: my(v), y2: my(v) }, mChart);
    svgText(mChart, { x: MC.x0 - 6, y: my(v) + 3.5, 'text-anchor': 'end' }, pct(v) + '%');
  }
  for (const d of [1, 10, 20, 30]) svgText(mChart, { x: mx(d), y: MC.bot + 14, 'text-anchor': d === 30 ? 'end' : 'middle' }, volts(d) + ' V');
  svgText(mChart, { x: (MC.x0 + MC.x1) / 2, y: MC.bot + 30, 'text-anchor': 'middle' }, T.mil.axisX);
  const barsG = svg('g', {}, mChart);
  const survLine = svg('polyline', { class: 'ln surv', points: '' }, mChart);
  function drawMilChart(): void {
    const shown = Math.floor(S.pos + 1e-9);
    barsG.replaceChildren();
    const n = run.last.length;
    for (let d = 0; d <= LEVELS; d++) {
      const cnt = run.hist[d];
      if (!cnt) continue;
      if (d < LEVELS && d + 1 > shown) continue;
      if (d === LEVELS && shown < LEVELS) continue;
      const h = (MC.bot - MC.top) * (cnt / n);
      svg('rect', { class: d === LEVELS ? 'bar-full' : 'bar-stop', x: (mx(d) - 3.2).toFixed(1), y: (MC.bot - h).toFixed(1), width: 6.4, height: h.toFixed(1) }, barsG);
    }
    const p: string[] = [];
    for (let d = 0; d <= Math.min(shown, LEVELS); d++) {
      const s = run.last.filter((x) => x >= d).length / n;
      p.push(`${mx(d).toFixed(1)},${my(s).toFixed(1)}`);
    }
    survLine.setAttribute('points', p.join(' '));
  }

  // Girdiler
  const mIn = $('m-in');
  const setAuth = addSlider(mIn, 'auth', T.mil.nameAuth, T.mil.hintAuth, 0, 1, 0.05,
    (v) => (v < 0.34 ? T.mil.fmtAuth[0] : v < 0.67 ? T.mil.fmtAuth[1] : T.mil.fmtAuth[2]), (v) => { S.m.authority = v; changeMil(); }, 'sl-amy');
  const setPres = addSlider(mIn, 'pres', T.mil.namePres, T.mil.hintPres, 0, 1, 0.05,
    (v) => (v < 0.34 ? T.mil.fmtPres[0] : v < 0.67 ? T.mil.fmtPres[1] : T.mil.fmtPres[2]), (v) => { S.m.prestige = v; changeMil(); }, 'sl-dop');
  const setLearn = addChoice(mIn, T.mil.nameLearn, T.mil.learners, T.mil.hintLearn, (i) => { S.m.learner = i as Learner; changeMil(); });
  const setDiff = addToggle(mIn, T.mil.nameDiff, T.mil.hintDiff, () => { S.m.diffused = !S.m.diffused; changeMil(); });
  const setPeer = addToggle(mIn, T.mil.namePeer, T.mil.hintPeer, () => { S.m.peer = !S.m.peer; changeMil(); });
  const markMilPresets = addPresets($('m-presets'), MIL_PRESETS, T.mil.presets, (u) => { S.m = u; changeMil(true); });

  function syncMilInputs(): void {
    setAuth(S.m.authority); setPres(S.m.prestige); setLearn(S.m.learner); setDiff(S.m.diffused); setPeer(S.m.peer); markMilPresets(S.m);
  }
  function changeMil(sync = false): void {
    run = simulateMilgram(S.m, S.seed);
    S.playing = false; S.pos = LEVELS;
    drawMilStage(); drawMilChart();
    if (sync) syncMilInputs(); else markMilPresets(S.m);
    renderBar();
  }
  function playMil(): void {
    S.pos = 0; S.playing = !reduced;
    if (reduced) S.pos = LEVELS;
    drawMilStage(); drawMilChart();
  }
  scope.on($('m-play'), 'click', playMil);
  scope.on($('m-rerun'), 'click', () => { S.seed++; changeMil(); playMil(); });

  // =================================================================== Sekmeler
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  function setTab(t: 'asch' | 'mil'): void {
    S.tab = t;
    tabs.forEach((b) => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-pressed', String(on)); b.tabIndex = on ? 0 : -1; });
    $('p-asch').hidden = t !== 'asch';
    $('p-mil').hidden = t !== 'mil';
    renderBar();
  }
  tabs.forEach((b, i) => {
    scope.on(b, 'click', () => setTab(b.dataset.tab as 'asch' | 'mil'));
    scope.on(b, 'keydown', (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const nb = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      nb.focus(); setTab(nb.dataset.tab as 'asch' | 'mil');
    });
  });

  setTab('asch');
  changeMil(true);
  changeAsch(true);

  // =================================================================== Tur
  const tourApply: Array<() => void> = [
    () => { setTab('asch'); S.a = { ...ASCH_DEFAULT }; changeAsch(true); playTrial(); },
    () => { setTab('asch'); S.a = { ...ASCH_DEFAULT, n: 3 }; changeAsch(true); },
    () => { setTab('asch'); S.a = { ...ASCH_DEFAULT, ally: true }; changeAsch(true); playTrial(); },
    () => { setTab('mil'); S.m = { ...MIL_DEFAULT }; changeMil(true); playMil(); },
    () => { setTab('mil'); S.m = { ...MIL_DEFAULT, learner: 2 }; changeMil(true); playMil(); },
    () => { setTab('mil'); S.m = { ...MIL_DEFAULT, peer: true }; changeMil(true); playMil(); },
  ];
  const tour = createTour(scope, T.tour.map((st, i) => ({ ...st, apply: tourApply[i] })));
  root.querySelector('.lede')!.after(tour.el);

  // =================================================================== Başlangıç ve döngü
  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (anim) drawSeats(now);
    if (S.playing) {
      const before = Math.floor(S.pos);
      S.pos = Math.min(LEVELS, S.pos + dt * 4);
      if (S.pos >= LEVELS) S.playing = false;
      if (Math.floor(S.pos) !== before || !S.playing) { drawMilStage(); drawMilChart(); }
    }
  }
  scope.loop(frame, { root, onResume: () => { last = performance.now(); } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
