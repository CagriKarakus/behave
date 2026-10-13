import { mulberry32 } from '../rng';
import '../sim.css';
import './view.css';
import { Scope, pct, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import { pct as fpct } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { f2, slider } from '../ui';
import { L } from './text';
import {
  CHANCE, COLS, EMOTIONS, GINI_MAX, GINI_MIN, KURZBAN_DEFAULT, MATRICES, TAJFEL_DEFAULT, TARGETS,
  behaviors, classify, col, confusion, corr, describeKurzban, describePos, describeTajfel, dominant, emotions,
  mixedShare, simulateMemory, simulateTajfel, society, strategyCols, userProfile,
  type KurzbanInputs, type Pos, type TajfelInputs,
} from './model';

type Tab = 'tajfel' | 'kurzban' | 'fiske';
const TAB_KEYS: Tab[] = ['tajfel', 'kurzban', 'fiske'];
const SIGNED = (n: number) => (n > 0 ? `+${n}` : String(n));
const EMO_VAR: Record<string, string> = { gurur: '--pfc', kiskanclik: '--dop', acima: '--pit', tiksinme: '--amy' };
const BEH_KEYS = ['yardim', 'iliski', 'dislama', 'saldiri'] as const;
/** Şematik figürlerde yalnızca ten rengi tonu değişir (başka özellik yok). */
const SKIN = ['#E9C9A6', '#7B4B2E'];
const ORDER = [0, 3, 6, 5, 2, 1, 4, 7];

const GROUPS: Array<{ p: Pos }> = [
  { p: { w: 0.84, c: 0.84 } },
  { p: { w: 0.82, c: 0.24 } },
  { p: { w: 0.2, c: 0.86 } },
  { p: { w: 0.12, c: 0.12 } },
  { p: { w: 0.55, c: 0.45 } },
];

const TEMPLATE = (id: string) => {
  const T = L();
  return `
<div class="sim sim-biz">
  <p class="lede">${T.lede}</p>
  <div class="tabs" role="tablist" aria-label="${T.tabsLabel}" data-ref="tabs">
    ${TAB_KEYS.map((k, i) => `<button type="button" role="tab" class="tab" id="${id}-t-${k}" aria-controls="${id}-p-${k}" data-tab="${k}">${T.tabs[i]}</button>`).join('')}
  </div>
  <div class="sim-bar" role="group" aria-label="${T.barLabel}">
    <div class="sim-bar-in">
      <p class="say" data-ref="say"></p>
      <div class="meters">
        ${[0, 1, 2].map((i) => `<div class="m" style="--c: var(${['--amy', '--pfc', '--dop'][i]})"><div class="m-top"><span data-ref="l${i}"></span><b data-ref="v${i}"></b></div><div class="track"><b data-ref="b${i}"></b></div></div>`).join('')}
      </div>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section role="tabpanel" id="${id}-p-tajfel" aria-labelledby="${id}-t-tajfel" data-ref="p-tajfel" class="panel">
    <div class="box">
      <h3 class="sim-h">${T.t.h1}</h3>
      <div class="chips" role="group" aria-label="${T.t.methodsLabel}" data-ref="t-methods"></div>
      <div class="row"><button class="btn btn-go" type="button" data-ref="t-draw">${T.t.draw}</button></div>
      <p class="t-label" data-ref="t-label"></p>
    </div>
    <div class="box">
      <h3 class="sim-h" data-ref="m-title"></h3>
      <p class="hintline" data-ref="m-cap"></p>
      <div class="mx" data-ref="m-grid" role="group" aria-label="${T.t.matrixLabel}"></div>
      <div class="mx mx-h" data-ref="m-hist" hidden aria-label="${T.t.histLabel}"></div>
      <div class="mx mx-tags" data-ref="m-tags" hidden></div>
      <p class="fb" data-ref="m-fb"></p>
      <div class="row">
        <button class="btn" type="button" data-ref="m-prev">${T.t.prev}</button>
        <button class="btn" type="button" data-ref="m-next">${T.t.next}</button>
      </div>
    </div>
    <section aria-label="${T.t.inputsLabel}"><h3 class="sim-h">${T.t.inputsH}</h3><div class="sliders" data-ref="t-in"></div></section>
  </section>

  <section role="tabpanel" id="${id}-p-kurzban" aria-labelledby="${id}-t-kurzban" data-ref="p-kurzban" class="panel" hidden>
    <div class="chips" data-ref="k-presets" role="group" aria-label="${T.k.presetsLabel}"></div>
    <div class="stage">
      <svg viewBox="0 0 360 132" role="img" aria-label="${T.k.stageLabel}" data-ref="k-stage"></svg>
      <div class="legend" data-ref="k-legend"></div>
    </div>
    <section class="chart" aria-label="${T.k.chartSection}">
      <h3 class="sim-h">${T.k.chartH}</h3>
      <svg viewBox="0 0 360 96" role="img" aria-label="${T.k.chartLabel}" data-ref="k-chart"></svg>
      <p class="tally" data-ref="k-tally"></p>
    </section>
    <section aria-label="${T.k.inputsLabel}"><h3 class="sim-h">${T.k.inputsH}</h3><div class="sliders" data-ref="k-in"></div></section>
    <div class="row"><button class="btn" type="button" data-ref="k-rerun">${T.k.rerun}</button></div>
  </section>

  <section role="tabpanel" id="${id}-p-fiske" aria-labelledby="${id}-t-fiske" data-ref="p-fiske" class="panel" hidden>
    <div class="stage">
      <svg viewBox="0 0 360 304" role="group" aria-label="${T.f.stageLabel}" data-ref="f-stage"></svg>
      <div class="legend"><span>${T.f.legendDot}</span><span>${T.f.legendSoc}</span></div>
    </div>
    <div class="box">
      <h3 class="sim-h" data-ref="f-name"></h3>
      <div class="bars" data-ref="f-emo"></div>
      <div class="bars" data-ref="f-beh"></div>
      <p class="note" data-ref="f-note"></p>
      <label class="sl-name" for="${id}-gname">${T.f.nameLabel}</label>
      <input type="text" class="txt" id="${id}-gname" maxlength="24" data-ref="f-gname" autocomplete="off">
    </div>
    <section aria-label="${T.f.inputsLabel}"><h3 class="sim-h">${T.f.inputsH}</h3><div class="sliders" data-ref="f-in"></div></section>
  </section>

  <details class="how">
    <summary>${t('sim.how')}</summary>
    ${T.how.map((x) => `<p>${x}</p>`).join('\n    ')}
  </details>

  <aside class="book" aria-label="${t('sim.book')}">
    <h3 class="sim-h">${t('sim.book')}</h3>
    <ul>
      <li>${T.book.e3(t('repl.sağlam'))}</li>
      <li>${T.book.e8(t('repl.sağlam'))}</li>
      <li>${T.book.e10(t('repl.bilinmiyor'))}</li>
      <li>${T.book.e12(t('repl.sağlam'))}</li>
      <li>${T.book.e1(t('repl.tartışmalı'))}</li>
      <li>${T.book.e2}</li>
      <li>${T.book.contact}</li>
    </ul>
  </aside>

  <p class="foot">${T.foot}</p>
</div>`;
};

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const T = L();
  const id = uid('biz');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  const S = {
    tab: 'tajfel' as Tab,
    seed: 3,
    t: { ...TAJFEL_DEFAULT } as TajfelInputs,
    method: 0, mine: null as 0 | 1 | null, draws: 0, mi: 0, picks: [null, null, null, null] as Array<number | null>,
    k: { ...KURZBAN_DEFAULT } as KurzbanInputs, sel: 0, kSeed: 1,
    gini: 0.35, layer: false, gsel: 0,
  };
  const gpos: Pos[] = GROUPS.map((g) => ({ ...g.p }));
  const gname: string[] = T.groups.slice();
  let tRes = simulateTajfel(S.t, S.seed);
  let kRes = simulateMemory(S.k, S.kSeed);
  let soc = society(S.gini, 1);

  // ---- Alt çubuk ----
  const sayEl = $('say');
  const poke = scope.announcer($('live'), () => sayEl.textContent ?? '');
  scope.on(root, 'click', poke);
  scope.on(root, 'input', poke);
  const meter = (i: number, label: string, v: number, text?: string) => {
    $(`l${i}`).textContent = label;
    $(`v${i}`).textContent = text ?? pct(v) + '%';
    $(`b${i}`).style.width = pct(Math.min(1, Math.max(0, v))) + '%';
  };
  function renderBar(): void {
    if (S.tab === 'tajfel') {
      sayEl.textContent = describeTajfel(S.t, tRes);
      meter(0, T.bar.favor, tRes.favorShare);
      meter(1, T.bar.sacrifice, tRes.sacrificeShare);
      meter(2, T.bar.fair, tRes.fairShare);
    } else if (S.tab === 'kurzban') {
      sayEl.textContent = describeKurzban(S.k, kRes);
      meter(0, T.bar.raceMix, kRes.sameRace);
      meter(1, T.bar.shirtMix, kRes.sameShirt, S.k.shirts ? undefined : '—');
      if (!S.k.shirts) $('b1').style.width = '0%';
      meter(2, T.bar.errors, kRes.errors / 160, String(kRes.errors));
    } else {
      const p = gpos[S.gsel], d = dominant(p);
      sayEl.textContent = describePos(gname[S.gsel], p);
      meter(0, T.emo[d], emotions(p)[d]);
      meter(1, T.bar.help, behaviors(p).yardim);
      meter(2, T.bar.mixedSoc, mixedShare(soc));
    }
  }

  // ---- Arayüz yardımcıları ----
  function addSlider(parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, step: number,
    fmt: (v: number) => string, onInput: (v: number) => void): (v: number) => void {
    const h = slider(scope, parent, { id: `${id}-s-${key}`, name, hint, min, max, step, fmt, onInput });
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
  function addChips(host: HTMLElement, names: string[], onPick: (i: number) => void): (i: number) => void {
    const bs = names.map((n, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = n; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => onPick(i));
      host.appendChild(b);
      return b;
    });
    return (i) => bs.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
  }
  function bars(host: HTMLElement, defs: Array<[string, string]>): (vals: number[]) => void {
    const rows = defs.map(([label, cv]) => {
      const r = document.createElement('div');
      r.className = 'bar-r';
      r.style.setProperty('--c', `var(${cv})`);
      r.innerHTML = `<span class="bar-l">${label}</span><div class="track"><b></b></div><em></em>`;
      host.appendChild(r);
      return [r.querySelector('b') as HTMLElement, r.querySelector('em') as HTMLElement];
    });
    return (vals) => rows.forEach(([b, e], i) => { b.style.width = pct(vals[i]) + '%'; e.textContent = pct(vals[i]) + '%'; });
  }

  // =================================================================== 1) Tajfel
  const names = () => T.methods[S.method].groups;
  const mGrid = $('m-grid'), mHist = $('m-hist'), mTags = $('m-tags');
  const colBtns: HTMLButtonElement[] = [];
  const rowLab = document.createElement('div');
  rowLab.className = 'rl';
  rowLab.innerHTML = `<span>${T.t.rowIn}</span><span>${T.t.rowOut}</span>`;
  mGrid.appendChild(rowLab);
  for (let c = 0; c < COLS; c++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cell'; b.innerHTML = '<span class="a"></span><span class="b"></span>';
    scope.on(b, 'click', () => pick(c));
    mGrid.appendChild(b); colBtns.push(b);
  }
  mHist.appendChild(Object.assign(document.createElement('div'), { className: 'rl' }));
  mTags.appendChild(Object.assign(document.createElement('div'), { className: 'rl' }));
  const histBars: Array<[HTMLElement, HTMLElement]> = [], tagEls: HTMLElement[] = [];
  for (let c = 0; c < COLS; c++) {
    const h = document.createElement('div');
    h.className = 'hb'; h.innerHTML = '<i></i><span></span>';
    mHist.appendChild(h); histBars.push([h.querySelector('i') as HTMLElement, h.querySelector('span') as HTMLElement]);
    const t = document.createElement('span');
    t.className = 'tg2'; mTags.appendChild(t); tagEls.push(t);
  }
  function pick(c: number): void {
    S.picks[S.mi] = c;
    renderMatrix(); renderBar();
  }
  function renderLabel(): void {
    $('t-label').textContent = S.mine === null
      ? T.t.noLabel
      : T.t.label(names()[S.mine]);
  }
  function drawLabel(): void {
    S.draws++;
    S.mine = mulberry32(S.seed * 31 + S.draws)() < 0.5 ? 0 : 1;
    S.picks = [null, null, null, null];
    renderLabel(); renderMatrix(); renderBar();
  }
  function renderMatrix(): void {
    const m = MATRICES[S.mi], mine = S.mine, picked = S.picks[S.mi];
    $('m-title').textContent = T.t.title(S.mi + 1, MATRICES.length, m.kind);
    $('m-cap').textContent = mine === null ? T.t.needLabel : T.t.cap(names()[mine], names()[1 - mine], S.t.control);
    colBtns.forEach((b, c) => {
      const i = col(m, c);
      b.querySelector('.a')!.textContent = String(i.own);
      b.querySelector('.b')!.textContent = String(i.other);
      b.disabled = mine === null;
      b.setAttribute('aria-pressed', String(picked === c));
      b.setAttribute('aria-label', T.t.colLabel(c + 1, String(i.own), String(i.other)));
    });
    mHist.hidden = mTags.hidden = picked === null;
    ($('m-prev') as HTMLButtonElement).disabled = S.mi === 0;
    ($('m-next') as HTMLButtonElement).disabled = S.mi === MATRICES.length - 1;
    if (picked === null) { $('m-fb').textContent = mine === null ? '' : T.t.fbWait; return; }
    const s = strategyCols(m), i = col(m, picked), k = classify(m, picked);
    histBars.forEach(([bar, t], c) => { bar.style.height = Math.round(tRes.hist[S.mi][c] * 100 * 1.1) + 'px'; t.textContent = pct(tRes.hist[S.mi][c]) + '%'; });
    tagEls.forEach((t, c) => {
      t.textContent = [c === s.mjp ? T.t.tags[0] : '', c === s.mip ? T.t.tags[1] : '', c === s.md ? T.t.tags[2] : '', c === s.fair ? T.t.tags[3] : ''].join('');
    });
    const prof = userProfile(S.picks);
    $('m-fb').textContent = T.t.fbPick(String(i.own), String(i.other), SIGNED(i.diff), String(i.joint)) +
      (k.fair ? T.t.verdictFair : k.favors ? (k.sacrifices ? T.t.verdictSacrifice : T.t.verdictFavors) : T.t.verdictOther) +
      (prof.kind !== 'none' ? T.t.sofar(prof.text) : '') + T.t.tagsLegend;
  }
  scope.on($('m-prev'), 'click', () => { S.mi = Math.max(0, S.mi - 1); renderMatrix(); });
  scope.on($('m-next'), 'click', () => { S.mi = Math.min(MATRICES.length - 1, S.mi + 1); renderMatrix(); });
  scope.on($('t-draw'), 'click', drawLabel);
  const setMethod = addChips($('t-methods'), T.methods.map((m) => m.name), (i) => { S.method = i; setMethod(i); S.mine = null; S.picks = [null, null, null, null]; renderLabel(); renderMatrix(); });
  const tIn = $('t-in');
  function changeT(): void { tRes = simulateTajfel(S.t, S.seed); renderMatrix(); renderBar(); }
  const sIdent = addSlider(tIn, 'id', T.t.ident, T.t.identHint, 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.t.ident = v; changeT(); });
  const sFair = addSlider(tIn, 'fa', T.t.fair, T.t.fairHint, 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.t.fair = v; changeT(); });
  const tgControl = addToggle(tIn, T.t.control, T.t.controlHint, () => { S.t.control = !S.t.control; syncT(); changeT(); });
  const rerunT = document.createElement('button');
  rerunT.type = 'button'; rerunT.className = 'btn'; rerunT.textContent = T.t.rerun;
  tIn.appendChild(rerunT);
  scope.on(rerunT, 'click', () => { S.seed++; changeT(); });
  function syncT(): void { sIdent(S.t.ident); sFair(S.t.fair); tgControl(S.t.control); setMethod(S.method); }

  // =================================================================== 2) Kurzban
  const kStage = $<SVGElement>('k-stage');
  const defs = svg('defs', {}, kStage);
  const patId = `${id}-stripe`;
  const pat = svg('pattern', { id: patId, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  svg('rect', { width: 6, height: 6, class: 'sh1' }, pat);
  svg('rect', { width: 2.4, height: 6, class: 'stripe' }, pat);
  const people = ORDER.map((ti, k) => {
    const t = TARGETS[ti], x = 28 + k * 43.5;
    const g = svg('g', { transform: `translate(${x},0)`, class: 'pp', tabindex: 0, role: 'button' }, kStage);
    svg('rect', { class: 'sel', x: -19, y: 6, width: 38, height: 70, rx: 8 }, g);
    svg('circle', { class: 'head', cx: 0, cy: 19, r: 8, fill: SKIN[t.race] }, g);
    const body = svg('rect', { class: 'body', x: -14, y: 30, width: 28, height: 38, rx: 7 }, g);
    if (t.race === 0) svg('circle', { class: 'badge', cx: 0, cy: 48, r: 4.5 }, g); else svg('rect', { class: 'badge', x: -4.5, y: 43.5, width: 9, height: 9 }, g);
    svgText(g, { class: 'nm', y: 88, 'text-anchor': 'middle' }, `${ti + 1}`);
    const pr = svgText(g, { class: 'pr', y: 104, 'text-anchor': 'middle' }, '');
    scope.on(g as unknown as HTMLElement, 'click', () => { S.sel = ti; renderK(); });
    scope.on(g as unknown as HTMLElement, 'keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); S.sel = ti; renderK(); } });
    return { ti, g, body, pr, t };
  });
  svgText(kStage, { class: 'cap', x: 180, y: 126, 'text-anchor': 'middle' }, '');
  const kCap = kStage.lastChild as SVGElement;
  $('k-legend').innerHTML = `<span>${T.k.legendSkin(T.race[0], T.race[1])}</span><span>${T.k.legendBadge}</span><span>${T.k.legendShirt}</span>`;
  const kChart = $<SVGElement>('k-chart');
  const CX0 = 132, CX1 = 336, cx = (v: number) => CX0 + v * (CX1 - CX0);
  svg('line', { class: 'ch-line', x1: cx(CHANCE.same), x2: cx(CHANCE.same), y1: 6, y2: 66 }, kChart);
  svgText(kChart, { class: 'ch-t', x: cx(CHANCE.same), y: 82, 'text-anchor': 'middle' }, T.k.chance(fpct(CHANCE.same)));
  const kBars = [0, 1].map((i) => {
    const y = 12 + i * 28;
    svgText(kChart, { class: 'ch-t', x: 4, y: y + 12 }, i === 0 ? T.k.barRace : T.k.barShirt);
    const r = svg('rect', { class: i === 0 ? 'cb race' : 'cb shirt', x: CX0, y, height: 18, width: 0 }, kChart);
    const t = svgText(kChart, { class: 'ch-v', y: y + 13 }, '');
    return { r, t };
  });
  function renderK(): void {
    const u = S.k;
    const w = confusion(u, S.sel);
    people.forEach((p) => {
      p.body.setAttribute('class', 'body ' + (u.shirts ? (p.t.shirt === 1 ? 'b1' : 'sh0') : 'sh-n'));
      if (u.shirts && p.t.shirt === 1) p.body.setAttribute('fill', `url(#${patId})`); else p.body.removeAttribute('fill');
      p.g.classList.toggle('on', p.ti === S.sel);
      p.g.setAttribute('aria-pressed', String(p.ti === S.sel));
      p.g.setAttribute('aria-label', T.k.person(p.ti + 1, T.race[p.t.race], u.shirts ? T.shirt[p.t.shirt] : null));
      p.pr.textContent = p.ti === S.sel ? T.k.sentence : fpct(w[p.ti]);
    });
    kCap.textContent = T.k.cap(S.sel + 1);
    const vals = [kRes.sameRace, u.shirts ? kRes.sameShirt : 0];
    kBars.forEach((b, i) => {
      b.r.setAttribute('width', String(vals[i] * (CX1 - CX0)));
      b.t.setAttribute('x', String(cx(vals[i]) + 4));
      b.t.textContent = i === 1 && !u.shirts ? T.k.noShirt : pct(vals[i]) + '%';
    });
    $('k-tally').textContent = T.k.tally(kRes.errors);
    markK(KP.findIndex((p) => JSON.stringify(p[1]) === JSON.stringify(S.k))); renderBar();
  }
  const KP: Array<[string, KurzbanInputs]> = [
    [T.k.presets[0], { ...KURZBAN_DEFAULT }],
    [T.k.presets[1], { ...KURZBAN_DEFAULT, shirts: true }],
    [T.k.presets[2], { ...KURZBAN_DEFAULT, shirts: true, coalition: 0 }],
  ];
  const markK = addChips($('k-presets'), KP.map((p) => p[0]), (i) => { S.k = { ...KP[i][1] }; changeK(true); });
  const kIn = $('k-in');
  const tgShirts = addToggle(kIn, T.k.shirts, T.k.shirtsHint, () => { S.k.shirts = !S.k.shirts; changeK(true); });
  const sVis = addSlider(kIn, 'vis', T.k.vis, T.k.visHint, 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.k.shirtVis = v; changeK(); });
  const sCoal = addSlider(kIn, 'coal', T.k.coal, T.k.coalHint, 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.k.coalition = v; changeK(); });
  const sRace = addSlider(kIn, 'race', T.k.raceSal, T.k.raceSalHint, 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.k.raceSal = v; changeK(); });
  function changeK(sync = false): void {
    kRes = simulateMemory(S.k, S.kSeed);
    if (sync) { tgShirts(S.k.shirts); sVis(S.k.shirtVis); sCoal(S.k.coalition); sRace(S.k.raceSal); }
    renderK();
  }
  scope.on($('k-rerun'), 'click', () => { S.kSeed++; changeK(); });

  // =================================================================== 3) Fiske
  const fStage = $<SVGElement>('f-stage');
  const X0 = 44, X1 = 346, Y0 = 12, Y1 = 262;
  const px = (w: number) => X0 + w * (X1 - X0), py = (c: number) => Y1 - c * (Y1 - Y0);
  const xm = px(0.5), ym = py(0.5);
  const Q: Array<[Emotion, number, number, number, number, string, string]> = [
    ['gurur', xm, Y0, X1, ym, T.emo.gurur, 'end'], ['kiskanclik', X0, Y0, xm, ym, T.emo.kiskanclik, 'start'],
    ['acima', xm, ym, X1, Y1, T.emo.acima, 'end'], ['tiksinme', X0, ym, xm, Y1, T.emo.tiksinme, 'start'],
  ];
  for (const [k, x0, y0, x1, y1, lab, anc] of Q) {
    svg('rect', { class: 'quad', x: x0, y: y0, width: x1 - x0, height: y1 - y0, style: `fill: var(${EMO_VAR[k]})` }, fStage);
    svgText(fStage, { class: 'qlab', x: anc === 'end' ? x1 - 6 : x0 + 6, y: y0 + 14, 'text-anchor': anc }, lab);
  }
  svg('rect', { class: 'frame', x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0 }, fStage);
  svgText(fStage, { class: 'ax', x: xm, y: 284, 'text-anchor': 'middle' }, T.f.axisWarmth);
  svgText(fStage, { class: 'ax', x: X0, y: 276, 'text-anchor': 'start' }, T.f.axisLow);
  svgText(fStage, { class: 'ax', x: X1, y: 276, 'text-anchor': 'end' }, T.f.axisHigh);
  svgText(fStage, { class: 'ax', x: 0, y: 0, 'text-anchor': 'middle', transform: `translate(12,${(Y0 + Y1) / 2}) rotate(-90)` }, T.f.axisComp);
  const layer = svg('g', { class: 'soc' }, fStage);
  const dots = soc.map(() => svg('circle', { r: 3.2 }, layer));
  const toks = GROUPS.map((_, i) => {
    const g = svg('g', { class: 'tok', tabindex: 0, role: 'button' }, fStage);
    svg('circle', { class: 'hit', r: 22 }, g);
    svg('circle', { class: 'dot', r: 13 }, g);
    svgText(g, { class: 'tl', y: 4, 'text-anchor': 'middle' }, String(i + 1));
    const nm = svgText(g, { class: 'tn', y: 29, 'text-anchor': 'middle' }, '');
    return { g, nm };
  });
  function placeAll(): void {
    toks.forEach((t, i) => {
      t.g.style.transform = `translate(${px(gpos[i].w).toFixed(1)}px, ${py(gpos[i].c).toFixed(1)}px)`;
      t.g.classList.toggle('on', i === S.gsel);
      t.nm.textContent = gname[i];
      t.g.setAttribute('aria-label', T.f.tokLabel(gname[i], fpct(gpos[i].w), fpct(gpos[i].c)));
    });
  }
  const emoBars = bars($('f-emo'), EMOTIONS.map((e) => [T.emo[e], EMO_VAR[e]] as [string, string]));
  const behBars = bars($('f-beh'), BEH_KEYS.map((k) => [T.beh[k], '--ink'] as [string, string]));
  function renderF(): void {
    const p = gpos[S.gsel];
    placeAll();
    $('f-name').textContent = T.f.head(gname[S.gsel], fpct(p.w), fpct(p.c));
    emoBars(EMOTIONS.map((e) => emotions(p)[e]));
    const b = behaviors(p);
    behBars(BEH_KEYS.map((k) => b[k]));
    $('f-note').textContent = dominant(p) === 'tiksinme' ? T.f.noteAmy : (dominant(p) === 'gurur' ? T.f.noteHigh : T.f.noteMix);
    const inp = $<HTMLInputElement>('f-gname');
    if (document.activeElement !== inp) inp.value = gname[S.gsel];
    renderBar();
  }
  function renderSoc(): void {
    soc = society(S.gini, 1);
    dots.forEach((d, i) => { d.setAttribute('cx', px(soc[i].w).toFixed(1)); d.setAttribute('cy', py(soc[i].c).toFixed(1)); });
    layer.setAttribute('visibility', S.layer ? 'visible' : 'hidden');
    $('f-corr').textContent = T.f.soc(soc.length, fpct(mixedShare(soc)), f2(corr(soc)));
    renderBar();
  }
  // Sürükleme ve klavye
  let drag = -1;
  const toPos = (ev: PointerEvent): Pos => {
    const m = (fStage as unknown as SVGSVGElement).getScreenCTM()!.inverse();
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m);
    const cl = (v: number) => Math.min(0.97, Math.max(0.03, v));
    return { w: cl((pt.x - X0) / (X1 - X0)), c: cl((Y1 - pt.y) / (Y1 - Y0)) };
  };
  toks.forEach((t, i) => {
    scope.on(t.g as unknown as HTMLElement, 'pointerdown', (ev: PointerEvent) => {
      drag = i; S.gsel = i; t.g.classList.add('drag');
      (t.g as unknown as Element).setPointerCapture?.(ev.pointerId);
      ev.preventDefault(); renderF();
    });
    scope.on(t.g as unknown as HTMLElement, 'pointermove', (ev: PointerEvent) => {
      if (drag !== i) return;
      gpos[i] = toPos(ev); renderF();
    });
    const end = () => { if (drag === i) { drag = -1; t.g.classList.remove('drag'); poke(); } };
    scope.on(t.g as unknown as HTMLElement, 'pointerup', end);
    scope.on(t.g as unknown as HTMLElement, 'pointercancel', end);
    scope.on(t.g as unknown as HTMLElement, 'focus', () => { if (S.gsel !== i) { S.gsel = i; renderF(); } });
    scope.on(t.g as unknown as HTMLElement, 'keydown', (ev) => {
      const d: Record<string, [number, number]> = { ArrowLeft: [-0.04, 0], ArrowRight: [0.04, 0], ArrowUp: [0, 0.04], ArrowDown: [0, -0.04] };
      const v = d[ev.key];
      if (!v) return;
      ev.preventDefault();
      gpos[i] = { w: Math.min(0.97, Math.max(0.03, gpos[i].w + v[0])), c: Math.min(0.97, Math.max(0.03, gpos[i].c + v[1])) };
      S.gsel = i; renderF(); poke();
    });
  });
  scope.on($('f-gname'), 'input', () => {
    gname[S.gsel] = ($('f-gname') as HTMLInputElement).value.trim() || T.f.defaultName(S.gsel + 1);
    placeAll(); renderBar();
  });
  const fIn = $('f-in');
  const tgLayer = addToggle(fIn, T.f.layer, T.f.layerHint, () => { S.layer = !S.layer; tgLayer(S.layer); renderSoc(); });
  const sGini = addSlider(fIn, 'gini', T.f.gini, T.f.giniHint, GINI_MIN, GINI_MAX, 0.01, f2, (v) => { S.gini = v; renderSoc(); });
  const corrEl = document.createElement('p');
  corrEl.className = 'sl-hint'; corrEl.setAttribute('data-ref', 'f-corr');
  fIn.appendChild(corrEl);

  // =================================================================== Sekmeler
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  function setTab(t: Tab): void {
    S.tab = t;
    tabs.forEach((b) => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-pressed', String(on)); b.tabIndex = on ? 0 : -1; });
    for (const k of TAB_KEYS) $(`p-${k}`).hidden = k !== t;
    renderBar();
  }
  tabs.forEach((b, i) => {
    scope.on(b, 'click', () => setTab(b.dataset.tab as Tab));
    scope.on(b, 'keydown', (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const nb = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      nb.focus(); setTab(nb.dataset.tab as Tab);
    });
  });

  syncT(); renderLabel(); renderMatrix();
  changeK(true);
  sGini(S.gini); tgLayer(S.layer); renderSoc(); renderF();
  setTab('tajfel');

  // =================================================================== Tur
  const setPos = (i: number, w: number, c: number) => { gpos[i] = { w, c }; S.gsel = i; };
  const tour = createTour(scope, [
    {
      title: 'Keyfi bir etiket',
      text: 'Yazı tura gibi anlamsız bir ölçütle iki gruptan birine atanırsın. Sonra iki isimsiz kişiye puan dağıtırsın: biri senin grubundan, biri öbüründen.',
      look: 'Matriste bir sütun seç; ilk sayı iç grup üyesinin, ikincisi dış grup üyesinin puanı.',
      apply: () => { setTab('tajfel'); S.t = { ...TAJFEL_DEFAULT }; syncT(); if (S.mine === null) drawLabel(); else changeT(); },
    },
    {
      title: 'Fark mı, kazanç mı?',
      text: 'Matris 1\'de en büyük toplam ve en büyük iç grup kazancı sağ uçtadır; en büyük fark sol uçtadır. Sanal katılımcıların çoğu, iç grubun mutlak kazancından vazgeçip farkı seçer (kitapta: kayırmacılık, keyfi etiketle bile).',
      look: 'Sütun altlarındaki dağılımda sol uçta (F) kümelenme. "Kontrol" anahtarı ikinci alıcıyı da iç grup yapar ve fark seçimi çöker.',
      apply: () => { setTab('tajfel'); S.t = { ...TAJFEL_DEFAULT }; syncT(); S.mi = 0; if (S.mine === null) drawLabel(); if (S.picks[0] === null) S.picks[0] = 1; changeT(); },
    },
    {
      title: 'Irk: koalisyon ipucu',
      text: 'Kim ne dedi? Forma yokken yanlış atıflar çoğunlukla aynı ırktan kişiye gider. Irk burada otomatik bir kategori gibi görünür.',
      look: 'Irka göre çubuğun şans düzeyinin (%43) çok üstünde olması.',
      apply: () => { setTab('kurzban'); S.k = { ...KURZBAN_DEFAULT }; S.sel = 0; changeK(true); },
    },
    {
      title: 'Forma gelince',
      text: 'İki takımın forması giyilince ve forma koalisyonu belli edince karışmalar formaya göre kümelenir; ırka göre kümelenme belirgin azalır ama tamamen silinmez. Irk değişmez bir kategori değil, yeniden çizilebilir bir ipucudur.',
      look: 'Irk çubuğunun küçülüp forma çubuğunun büyümesi. "Forma var ama anlamsız" çipine geçince ne olur?',
      apply: () => { setTab('kurzban'); S.k = { ...KURZBAN_DEFAULT, shirts: true }; changeK(true); },
    },
    {
      title: 'Sıcaklık–yetkinlik haritası',
      text: 'Gruplar iki eksende konumlanır ve köşe duyguyu belirler. "Yeni grup" düşük–düşük köşeye sürüklenince tiksinme ve dışlama baskın olur. Sağ altta duran "Yaşlılar" ise acıma ve yardım uyandırır.',
      look: 'Bir daireyi sürükle; alt çubukta duygu ve davranış çubukları değişir.',
      apply: () => { setTab('fiske'); S.layer = false; tgLayer(false); renderSoc(); setPos(4, 0.28, 0.34); renderF(); },
    },
    {
      title: 'Eşitsizlik ve karışık algı',
      text: 'Toplum katmanını aç ve Gini\'yi yükselt: gruplar karışık köşelere kayar ve karışık stereotip payı artar. Kitaptaki 37 ülke bulgusu korelasyoneldir.',
      look: 'Alt çubukta "Karışık algı (toplum)" yüzdesi.',
      apply: () => { setTab('fiske'); S.layer = true; tgLayer(true); S.gini = 0.5; sGini(0.5); renderSoc(); renderF(); },
    },
  ]);
  root.querySelector('.lede')!.after(tour.el);

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
