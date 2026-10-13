import '../sim.css';
import './view.css';
import { Scope, ref, svg, svgText, uid } from '../kit';
import { decimalSep } from '../../i18n/locale';
import { percent } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { createTour } from '../tour';
import { slider } from '../ui';
import {
  BABOON_DEFAULT, CONTACT_DEFAULT, PAY_DEFAULT, TR, TRENCH_DEFAULT, VILLAGE_DEFAULT,
  clamp, describeTrench, ensembleTruce, meanKnow, simulateTrench, truceCount, weekFire,
  type Rule, type TrenchParams, type TrenchRun,
} from './model';
import { L } from './text';
import { LG, cls, dotI, key, pc, type Card, type Env, type Meter, type PanelApi, type SliderHandle, type SliderOpts, type State, type Tab, type Transport } from './env';

const TEMPLATE = (id: string): string => {
  const x = L();
  return `
<div class="sim sim-sb">
  <p class="lede">${x.lede}</p>
  <div class="tabs" role="tablist" aria-label="${x.tabsAria}">
    <button class="tab" role="tab" id="${id}-tab-sip" data-pane="sip" aria-controls="${id}-pane-sip" aria-selected="true" type="button">${x.tabSip}</button>
    <button class="tab" role="tab" id="${id}-tab-tem" data-pane="tem" aria-controls="${id}-pane-tem" aria-selected="false" tabindex="-1" type="button">${x.tabTem}</button>
    <button class="tab" role="tab" id="${id}-tab-bab" data-pane="bab" aria-controls="${id}-pane-bab" aria-selected="false" tabindex="-1" type="button">${x.tabBab}</button>
  </div>

  <div class="sim-bar" role="group" aria-label="${x.barAria}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- ============ 1 · Siperler ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-sip" data-pane="sip" aria-labelledby="${id}-tab-sip">
    <div data-ref="tour1"></div>
    <section class="card" aria-label="${x.trench.cardAria}">
      <h3 class="sim-h">${x.trench.h}</h3>
      <div class="stage">
        <svg viewBox="0 0 360 172" role="img" aria-label="${x.trench.svgAria}" data-ref="trench"></svg>
        ${key([LG.quiet, x.trench.lgQuiet], [LG.two, x.trench.lgTwo], [LG.fire, x.trench.lgFire], [LG.raid, x.trench.lgRaid], [LG.flag, x.trench.lgFlag], [LG.neu, x.trench.lgNew])}
        <p class="note">${x.trench.trustNote}</p>
      </div>
      <div data-ref="tp1"></div>
    </section>

    <section class="card" aria-label="${x.tl.cardAria}">
      <h3 class="sim-h">${x.tl.h}</h3>
      <div class="chart"><svg viewBox="0 0 360 178" role="img" aria-label="${x.tl.svgAria}" data-ref="tl"></svg>
        ${key([dotI('var(--pfc)'), x.tl.lgTruce], [dotI('var(--amy)'), x.tl.lgFire], [dotI('var(--ink)'), x.tl.lgRaid], [LG.line('var(--dop)'), x.tl.lgRot])}
      </div>
    </section>

    <section class="card" aria-label="${x.inputs.cardAria}">
      <h3 class="sim-h">${x.inputs.h}</h3>
      <div class="chips" role="group" aria-label="${x.inputs.ruleAria}" data-ref="ruleChips"></div>
      <p class="sl-hint">${x.inputs.ruleHint}</p>
      <div class="sliders" data-ref="tSl"></div>
    </section>

    <section class="card" aria-label="${x.sens.cardAria}">
      <h3 class="sim-h">${x.sens.h}</h3>
      <div class="chart"><svg viewBox="0 0 360 160" role="img" aria-label="${x.sens.svgAria}" data-ref="sens"></svg></div>
      <p class="note">${x.sens.note}</p>
    </section>

    <details class="how">
      <summary>${t('sim.how')}</summary>
      <div class="how-in">
        <p>${x.sipHow.p1}</p>
        <p>${x.sipHow.p2}</p>
        <p>${x.sipHow.p3}</p>
      </div>
    </details>

    <aside class="book" aria-label="${t('sim.book')}">
      <h3 class="sim-h">${t('sim.book')}</h3>
      <ul>
        <li>${x.sipBook.e12}</li>
        <li>${x.sipBook.unused(t('repl.tartışmalı'))}</li>
      </ul>
    </aside>
  </section>

  <!-- ============ 2 · Temas ve itibar ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-tem" data-pane="tem" aria-labelledby="${id}-tab-tem" hidden>
    <p class="note" data-ref="load-tem" role="status">${x.loading}</p>
  </section>

  <!-- ============ 3 · Babunlar ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-bab" data-pane="bab" aria-labelledby="${id}-tab-bab" hidden>
    <p class="note" data-ref="load-bab" role="status">${x.loading}</p>
  </section>

  <p class="foot">${x.foot}</p>
</div>`;
};

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('sb');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let slN = 0;

  /* ---------- Durum ---------- */
  const S: State = {
    tab: 'sip', focus: 'ct',
    t: { ...TRENCH_DEFAULT }, tseed: 3,
    c: { ...CONTACT_DEFAULT }, cseed: 5,
    v: { ...VILLAGE_DEFAULT }, vseed: 2,
    y: { ...PAY_DEFAULT }, cond: 'pwywHayir',
    b: { ...BABOON_DEFAULT }, bseed: 4,
  };
  let dirty = true, lastSay = '';
  // Yeniden hesaplama bayrakları
  const need = { t: true, c: true, v: true, y: true, b: true, sens: true };

  /* ---------- Yardımcılar ---------- */
  function makeSlider(parent: HTMLElement, o: SliderOpts): SliderHandle {
    const h = slider(scope, parent, { id: `${id}-s${++slN}`, name: o.name, hint: o.hint, min: o.min, max: o.max, step: o.step, value: o.val, fmt: o.fmt, color: o.color, cls: 'sl', onInput: (v) => { o.cb(v); dirty = true; } });
    return { inp: h.inp, set: (v) => h.set(v) };
  }
  function toggles<T extends string>(parent: HTMLElement, items: { k: T; name: string }[], get: () => T | null, pick: (k: T) => void): () => void {
    const btns = items.map((it) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = it.name; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => { pick(it.k); dirty = true; });
      parent.appendChild(b);
      return b;
    });
    return () => items.forEach((it, i) => btns[i].setAttribute('aria-pressed', String(get() === it.k)));
  }
  function makeTransport(parent: HTMLElement, o: { max: number; speed: number; unit: 'day' | 'round'; seed: () => void }): Transport {
    const sid = `${id}-s${++slN}`;
    parent.innerHTML = `<div class="row play"><button class="btn tour-next" type="button" data-k="play"></button><button class="btn" type="button" data-k="rew">${L().tpRew}</button><button class="btn" type="button" data-k="seed">${L().tpSeed}</button></div><div class="sl"><div class="sl-top"><label class="sl-name" for="${sid}">${L().tpTime}</label><span class="sl-val"></span></div><input type="range" id="${sid}" min="0" max="${o.max - 1}" step="1"></div>`;
    const q = (k: string) => parent.querySelector<HTMLButtonElement>(`[data-k="${k}"]`)!;
    const inp = parent.querySelector<HTMLInputElement>('input')!, val = parent.querySelector<HTMLElement>('.sl-val')!;
    const tp: Transport = {
      pos: 0, playing: false, max: o.max, speed: o.speed,
      idx: () => Math.min(o.max - 1, Math.floor(tp.pos)),
      set: (i, play) => { tp.pos = clamp(play && reduced ? o.max - 1 : i, 0, o.max - 1); tp.playing = play && !reduced; dirty = true; },
      sync: () => {
        const i = tp.idx();
        inp.value = String(i);
        val.textContent = o.unit === 'round' ? L().tpRound(i, o.max - 1) : L().tpDay(i + 1, o.max);
        inp.setAttribute('aria-valuetext', val.textContent);
        q('play').textContent = tp.playing ? L().tpPause : tp.pos >= o.max - 1 ? L().tpReplay : L().tpPlay;
      },
    };
    scope.on(q('play'), 'click', () => { if (tp.pos >= o.max - 1) tp.pos = 0; tp.playing = !tp.playing; dirty = true; });
    scope.on(q('rew'), 'click', () => tp.set(0, true));
    scope.on(q('seed'), 'click', () => { o.seed(); tp.set(0, true); });
    scope.on(inp, 'input', () => { tp.pos = Number(inp.value); tp.playing = false; dirty = true; });
    return tp;
  }
  const tiles = (xs: [string, string][]): string => xs.map(([l, v]) => `<div class="ro"><span>${l}</span><b>${v}</b></div>`).join('');
  const setW = (el: HTMLElement, frac: number) => { el.style.width = `${(clamp(frac) * 100).toFixed(1)}%`; };
  const yGrid = (parent: Element, x0: number, x1: number, y: (v: number) => number, vals: number[], fmt: (v: number) => string): void => {
    for (const v of vals) { svg('line', { class: 'grid', x1: x0, x2: x1, y1: y(v), y2: y(v) }, parent); svgText(parent, { class: 'ax', x: x0 - 6, y: y(v) + 3.5, 'text-anchor': 'end' }, fmt(v)); }
  };
  const poly = (pts: [number, number][]): string => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const clipRect = (parent: Element, cid: string, h: number): SVGElement => {
    const cp = svg('clipPath', { id: cid }, svg('defs', {}, parent));
    return svg('rect', { x: 0, y: 0, width: 0, height: h }, cp);
  };

  /* ---------- Sekmeler ---------- */
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  // "Temas ve itibar" ve "Babunlar" sekmeleri ayrı parçalardan, ilk seçildiklerinde yüklenir (ilk açılış küçük kalır).
  const lazy: Partial<Record<'tem' | 'bab', PanelApi>> = {};
  const loading: Partial<Record<'tem' | 'bab', boolean>> = {};
  let gone = false;
  scope.onDispose(() => { gone = true; });
  function loadPanel(t: 'tem' | 'bab'): void {
    if (lazy[t] || loading[t]) return;
    loading[t] = true;
    const host = root.querySelector<HTMLElement>(`.pane[data-pane="${t}"]`)!;
    const made = t === 'tem'
      ? import('./panel-tem').then((m) => m.createTemPanel(env, host))
      : import('./panel-bab').then((m) => m.createBabPanel(env, host));
    void made.then((p) => {
      if (gone) return;
      lazy[t] = p;
      p.tp.set(0, true);
      dirty = true;
      if (S.tab === t) { dirty = false; render(); poke(); }
    });
  }
  function showTab(t: Tab, focus = false): void {
    S.tab = t; dirty = true;
    for (const b of tabBtns) {
      const on = b.dataset.pane === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const p of panes) p.hidden = p.dataset.pane !== t;
    if (t !== 'sip') loadPanel(t);
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
  function setBar(say: string, ms: Meter[]): void {
    $('say').textContent = say;
    lastSay = say;
    ms.forEach((m, i) => {
      const e = meterEls[i];
      e.d.style.setProperty('--c', m.color);
      e.l.textContent = m.label; e.t.textContent = m.text; setW(e.f, m.frac);
    });
  }
  const env: Env = { scope, id, $, S, need, touch: () => { dirty = true; }, setBar, makeSlider, toggles, makeTransport, tiles, yGrid, poly, clipRect };

  /* =====================================================================
     1 · Siperler
     ===================================================================== */
  const S8 = TR.S;
  const px = (s: number): number => 22 + s * 45.14;
  const zig = (x: number, y0: number, y1: number): string => {
    const n = 8, dy = (y1 - y0) / n;
    return Array.from({ length: n + 1 }, (_, i) => `${i ? 'L' : 'M'}${(x + (i % 2 ? 3.5 : -3.5) * (i === 0 || i === n ? 0 : 1)).toFixed(1)},${(y0 + dy * i).toFixed(1)}`).join('');
  };
  const trSvg = $<SVGElement>('trench');
  svgText(trSvg, { class: 'tl', x: 4, y: 13 }, L().trench.lineA);
  svgText(trSvg, { class: 'tl', x: 4, y: 168 }, L().trench.lineB);
  const secs = Array.from({ length: S8 }, (_, s) => {
    const x = px(s), g = svg('g', {}, trSvg);
    svg('line', { class: 't-base', x1: x, x2: x, y1: 46, y2: 126 }, g);
    const zA = svg('path', { class: 't-fire hide', d: zig(x - 3, 46, 126) }, g), zB = svg('path', { class: 't-fire hide', d: zig(x + 3, 126, 46) }, g);
    const rA = svg('path', { class: 't-raid hide', d: `M${x - 3},48V112M${x - 8},105L${x - 3},113L${x + 2},105` }, g), rB = svg('path', { class: 't-raid hide', d: `M${x + 3},124V60M${x - 2},67L${x + 3},59L${x + 8},67` }, g);
    const dA = svg('g', { class: 'hide' }, g), dB = svg('g', { class: 'hide' }, g);
    for (const [gg, y] of [[dA, 62], [dB, 108]] as const) for (const o of [-5, 5]) svg('circle', { class: 't-dot', cx: x + o, cy: y, r: 2.8 }, gg);
    const flag = svg('circle', { class: 't-flag hide', cx: x, cy: 86, r: 5 }, g);
    const post = (y: number) => {
      const nw = svg('rect', { class: 't-new hide', x: x - 16, y: y - 3, width: 32, height: 24, rx: 4 }, g);
      svg('rect', { class: 't-post', x: x - 13, y, width: 26, height: 18, rx: 3 }, g);
      const tr = svg('rect', { class: 't-trust', x: x - 10, y: y + 12, width: 0, height: 3.5, rx: 1 }, g);
      return { nw, tr };
    };
    return { zA, zB, rA, rB, dA, dB, flag, pA: post(22), pB: post(130), x };
  });

  // Zaman çizelgesi
  const TL = { x0: 30, x1: 352, cy: 12, rh: 9, ly0: 112, ly1: 156 };
  const tlx = (d: number): number => TL.x0 + ((TL.x1 - TL.x0) * d) / TR.days;
  const tl = $<SVGElement>('tl');
  for (let s = 0; s < S8; s++) if (s % 7 === 0) svgText(tl, { class: 'ax', x: TL.x0 - 6, y: TL.cy + s * TL.rh + 7, 'text-anchor': 'end' }, L().tl.sector(s + 1));
  const tlClip = clipRect(tl, `${id}-clipT`, 178);
  const tlG = svg('g', { 'clip-path': `url(#${id}-clipT)` }, tl);
  const tlCells = { quiet: svg('path', { class: 'c-quiet' }, tlG), fire: svg('path', { class: 'c-fire' }, tlG), raid: svg('path', { class: 'c-raid' }, tlG) };
  const tlRot = svg('path', { class: 'c-rot' }, tlG);
  const tlArea = svg('path', { class: 'c-area' }, tlG), tlLine = svg('polyline', { class: 'ln c-line' }, tlG);
  const ty = (n: number): number => TL.ly1 - ((TL.ly1 - TL.ly0) * n) / S8;
  yGrid(tl, TL.x0, TL.x1, ty, [0, 4, 8], String);
  svgText(tl, { class: 'ax', x: TL.x0, y: TL.ly0 - 6 }, L().tl.axSectors);
  for (let w = 0; w <= 26; w += 4) svgText(tl, { class: 'ax', x: tlx(w * 7), y: 171, 'text-anchor': w === 0 ? 'start' : 'middle' }, String(w));
  const tlCur = svg('line', { class: 'cursor', y1: TL.cy - 4, y2: TL.ly1 }, tl);
  let runT: TrenchRun;
  function buildTimeline(): void {
    const cw = (TL.x1 - TL.x0) / TR.days + 0.35;
    const sets = { quiet: '', fire: '', raid: '' };
    let rot = '', pts: [number, number][] = [], area = `M${TL.x0},${TL.ly1}`;
    for (let d = 0; d < TR.days; d++) {
      const a = runT.acts[d], x = tlx(d);
      for (let s = 0; s < S8; s++) {
        const y = TL.cy + s * TL.rh, A = a[s], B = a[S8 + s];
        const k = A === 3 || B === 3 ? 'raid' : A >= 2 || B >= 2 ? 'fire' : runT.truce[d][s] ? 'quiet' : '';
        if (k) sets[k] += `M${x.toFixed(1)} ${y}h${cw.toFixed(2)}v${TL.rh - 1}h-${cw.toFixed(2)}z`;
      }
      const nr = runT.rotated[d].reduce((p, c) => p + c, 0);
      if (nr) rot += `M${x.toFixed(1)} ${TL.cy + S8 * TL.rh + 6}v${-Math.min(nr, 3) * 2.5 - 1}`;
      const yy = ty(truceCount(runT, d));
      pts.push([x, yy]); area += `L${x.toFixed(1)},${yy.toFixed(1)}`;
    }
    area += `L${TL.x1},${TL.ly1}z`;
    tlCells.quiet.setAttribute('d', sets.quiet); tlCells.fire.setAttribute('d', sets.fire); tlCells.raid.setAttribute('d', sets.raid);
    tlRot.setAttribute('d', rot); tlArea.setAttribute('d', area); tlLine.setAttribute('points', poly(pts));
  }
  function drawTrench(d: number): void {
    const a = runT.acts[d], kn = runT.know[d];
    secs.forEach((e, s) => {
      const A = a[s], B = a[S8 + s];
      cls(e.zA, 't-fire', A === 2); cls(e.zB, 't-fire', B === 2);
      cls(e.rA, 't-raid', A === 3); cls(e.rB, 't-raid', B === 3);
      cls(e.dA, '', A === 1); cls(e.dB, '', B === 1);
      cls(e.flag, 't-flag', runT.truce[d][s] === 1);
      e.pA.tr.setAttribute('width', (20 * kn[s]).toFixed(1)); e.pB.tr.setAttribute('width', (20 * kn[S8 + s]).toFixed(1));
      const recent = (i: number) => [0, 1, 2].some((k) => d - k >= 0 && runT.rotated[d - k][i]);
      cls(e.pA.nw, 't-new', recent(s)); cls(e.pB.nw, 't-new', recent(S8 + s));
    });
    const x = tlx(d + 1);
    tlClip.setAttribute('width', x.toFixed(1)); tlCur.setAttribute('x1', x.toFixed(1)); tlCur.setAttribute('x2', x.toFixed(1));
    trSvg.setAttribute('aria-label', describeTrench(runT, d));
  }

  // Duyarlılık grafiği
  const SN = { x0: 36, x1: 346, top: 10, bot: 116 };
  const sens = $<SVGElement>('sens');
  const TEN = [1, 2, 3, 4, 6, 8, 12, 16, 20, 26];
  const sx = (w: number): number => SN.x0 + ((SN.x1 - SN.x0) * (w - 1)) / 25;
  const sy = (v: number): number => SN.bot - (SN.bot - SN.top) * v;
  yGrid(sens, SN.x0, SN.x1, sy, [0, 0.5, 1], pc);
  for (const w of [1, 4, 8, 12, 16, 20, 26]) svgText(sens, { class: 'ax', x: sx(w), y: SN.bot + 14, 'text-anchor': w === 1 ? 'start' : w === 26 ? 'end' : 'middle' }, String(w));
  svgText(sens, { class: 'ax', x: (SN.x0 + SN.x1) / 2, y: SN.bot + 30, 'text-anchor': 'middle' }, L().sens.axis);
  const snIki = svg('polyline', { class: 'ln s-iki' }, sens), snTam = svg('polyline', { class: 'ln s-tam' }, sens);
  const snLbI = svgText(sens, { class: 'ax lgt', x: SN.x1, y: 0, 'text-anchor': 'end' }, L().sens.lblTwo), snLbT = svgText(sens, { class: 'ax lgt', x: SN.x1, y: 0, 'text-anchor': 'end' }, L().sens.lblFull);
  const snDot = svg('circle', { class: 'cur-dot', r: 4.6 }, sens);
  let sensKey = '', sensVal: Record<Rule, number[]> = { iki: [], tam: [] };
  function drawSens(): void {
    const k = `${S.t.ritual}|${S.t.accident}|${S.t.command}`;
    if (k !== sensKey) {
      sensKey = k;
      for (const rule of ['iki', 'tam'] as const) sensVal[rule] = TEN.map((w) => ensembleTruce({ ...S.t, tenure: w, rule }, 4));
    }
    snIki.setAttribute('points', poly(TEN.map((w, i) => [sx(w), sy(sensVal.iki[i])])));
    snTam.setAttribute('points', poly(TEN.map((w, i) => [sx(w), sy(sensVal.tam[i])])));
    const li = sensVal.iki[TEN.length - 1], lt = sensVal.tam[TEN.length - 1], up = li >= lt;
    // Etiketler eksen sayılarının üstünde kalsın; iki çizgi sıfıra yakınken etiketler üst üste binmesin.
    const yIn = (y: number): number => Math.min(SN.bot - 5, Math.max(SN.top + 8, y));
    let yI = yIn(sy(li) + (up ? -7 : 14)), yT = yIn(sy(lt) + (up ? 14 : -7));
    if (Math.abs(yI - yT) < 11) { if (up) yI = yT - 11; else yT = yI - 11; }
    snLbI.setAttribute('y', String(yI)); snLbT.setAttribute('y', String(yT));
    snDot.setAttribute('cx', String(sx(S.t.tenure))); snDot.setAttribute('cy', String(sy(ensembleTruce(S.t, 4))));
  }

  // Girdiler
  const tSlH = $('tSl');
  const setT = (patch: Partial<TrenchParams>) => {
    S.t = { ...S.t, ...patch };
    if (patch.tenure !== undefined) hTen.set(patch.tenure);
    if (patch.ritual !== undefined) hRit.set(Math.round(patch.ritual * 100));
    if (patch.accident !== undefined) hAcc.set(Math.round(patch.accident * 1000) / 10);
    if (patch.command !== undefined) hCom.set(Math.round(patch.command * 100));
    need.t = need.sens = dirty = true;
  };
  const sl = L().sipSliders;
  const hTen = makeSlider(tSlH, { name: sl.tenure.name, hint: sl.tenure.hint, min: 1, max: 26, step: 1, val: S.t.tenure, fmt: (v) => L().weeks(v), cb: (v) => { setT({ tenure: v }); }, color: 'var(--pfc)' });
  const hRit = makeSlider(tSlH, { name: sl.ritual.name, hint: sl.ritual.hint, min: 0, max: 100, step: 5, val: S.t.ritual * 100, fmt: (v) => percent(String(v)), cb: (v) => { setT({ ritual: v / 100 }); }, color: 'var(--pfc)' });
  const hAcc = makeSlider(tSlH, { name: sl.accident.name, hint: sl.accident.hint, min: 0, max: 8, step: 0.5, val: S.t.accident * 100, fmt: (v) => percent(String(v).replace('.', decimalSep())), cb: (v) => { setT({ accident: v / 100 }); }, color: 'var(--amy)' });
  const hCom = makeSlider(tSlH, { name: sl.command.name, hint: sl.command.hint, min: 0, max: 100, step: 5, val: S.t.command * 100, fmt: (v) => percent(String(v)), cb: (v) => { setT({ command: v / 100 }); }, color: 'var(--amy)' });
  const syncRule = toggles<Rule>($('ruleChips'), [{ k: 'iki', name: L().inputs.ruleTwo }, { k: 'tam', name: L().inputs.ruleFull }], () => S.t.rule, (k) => setT({ rule: k }));
  const tT = makeTransport($('tp1'), { max: TR.days, speed: 8, unit: 'day', seed: () => { S.tseed++; need.t = true; } });
  function barTrench(): void {
    const d = tT.idx(), tc = truceCount(runT, d), wf = weekFire(runT, d);
    setBar(describeTrench(runT, d), [
      { label: L().meterTrench.sectors, text: `${tc}/${S8}`, frac: tc / S8, color: 'var(--pfc)' },
      { label: L().meterTrench.week, text: String(wf), frac: wf / 40, color: 'var(--amy)' },
      { label: L().meterTrench.trust, text: pc(meanKnow(runT, d)), frac: meanKnow(runT, d), color: 'var(--ink)' },
    ]);
  }
  function renderTrench(): void {
    if (need.t) { runT = simulateTrench(S.t, S.tseed); buildTimeline(); need.t = false; }
    if (need.sens) { drawSens(); need.sens = false; }
    drawTrench(tT.idx()); syncRule(); tT.sync(); barTrench();
  }


  /* ---------- Rehberli turlar ---------- */
  const seekT = (d: number, play = false) => tT.set(d, play);
  const apply1: (() => void)[] = [
    () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT }); seekT(0, true); },
    () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT }); seekT(110); },
    () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT, ritual: 0 }); seekT(TR.days - 1); },
    () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT, accident: 0.04, command: 0, rule: 'iki' }); seekT(TR.days - 1); },
    () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT, accident: 0.04, command: 0, rule: 'tam' }); seekT(TR.days - 1); },
    () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT, tenure: 4, command: 1, rule: 'iki' }); seekT(TR.days - 1); },
  ];
  const tour1 = createTour(scope, L().tour1.map((st, i) => ({ ...st, apply: apply1[i] })));
  $('tour1').appendChild(tour1.el);


  /* ---------- Başlangıç ---------- */
  const poke = scope.announcer($('live'), () => lastSay);
  const onAction = (ev: Event) => {
    const card = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-card]')?.dataset.card as Card | undefined;
    if (card) { S.focus = card; dirty = true; }
    if (dirty) { dirty = false; render(); }
    poke();
  };
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);

  let last = performance.now();
  function render(): void {
    if (S.tab === 'sip') renderTrench();
    else lazy[S.tab]?.render();
  }
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    const tp = S.tab === 'sip' ? tT : lazy[S.tab]?.tp;
    if (tp?.playing) {
      tp.pos = Math.min(tp.max - 1, tp.pos + dt * tp.speed);
      if (tp.pos >= tp.max - 1) tp.playing = false;
      dirty = true;
    }
    if (dirty) { dirty = false; render(); }
  }
  render();
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
