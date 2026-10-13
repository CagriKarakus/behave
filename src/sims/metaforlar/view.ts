import { mulberry32 } from '../rng';
import { slider } from '../ui';
import '../sim.css';
import './view.css';
import { Scope, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import { pct, percent } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import type { MsgKey } from '../../i18n/messages';
import { L } from './text';
import {
  CARDS, CARD_IDS, DEFAULTS, K_REPL, SACRED, clamp, cyberNext, cyberShare, describeCard, describeSacred, expectedBacklash,
  expectedSupport, gauges, maxShift, offerParts, simulateCrowd, type CardId, type Holder, type Inputs, type Mode,
  type OfferKind, type Status,
} from './model';

type Tab = 'bed' | 'kut';
const n100 = (x: number): string => String(Math.round(x * 100));
const GLYPH: Record<Status, string> = { sağlam: '✓', karışık: '~', tartışmalı: '✕', bilinmiyor: '?' };
const tag = (st: Status): string => `<em class="tag" data-st="${st}"><span aria-hidden="true">${GLYPH[st]}</span> ${t(`repl.${st}` as MsgKey)}</em>`;
const sw = (w: number, inner: string): string => `<svg viewBox="0 0 ${w} 12" aria-hidden="true">${inner}</svg>`;
const key = (...a: string[]): string => `<div class="legend">${a.map((t) => `<span>${t}</span>`).join('')}</div>`;
const KIND_IDS: OfferKind[] = ['maddi', 'sembolik', 'karma'];
const BED_BOOK_IDS: string[][] = [['ch15-e1'], ['ch15-e6'], ['ch15-e4'], ['ch15-e11', 'ch15-e10'], ['ch15-e7', 'ch15-e8', 'ch15-e9'], ['ch15-e5']];
const stText = (k: Status): string => t(`repl.${k}` as MsgKey);
const bookList = (ids: string[][], items: Array<{ links: string[]; after: (st: (k: Status) => string) => string }>): string =>
  items.map((it, i) => `<li>${it.links.map((l, j) => `<a href="#/bolum/ch15?deney=${ids[i][j]}">${l}</a>`).join(', ')}${it.after(stText)}</li>`).join('\n        ');

const TEMPLATE = (id: string) => {
  const X = L();
  return `
<div class="sim sim-met">
  <p class="lede">${X.lede}</p>
  <div class="tabs" role="tablist" aria-label="${X.tabsAria}">
    <button class="tab" role="tab" id="${id}-tab-bed" data-pane="bed" aria-controls="${id}-pane-bed" aria-selected="true" type="button">${X.tabBed}</button>
    <button class="tab" role="tab" id="${id}-tab-kut" data-pane="kut" aria-controls="${id}-pane-kut" aria-selected="false" tabindex="-1" type="button">${X.tabKut}</button>
  </div>

  <div class="sim-bar" role="group" aria-label="${X.barAria}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- ============ 1 · Beden ve ahlak karışıklığı ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-bed" data-pane="bed" aria-labelledby="${id}-tab-bed">
    <div data-ref="tour1"></div>
    <div class="chips" role="group" aria-label="${X.cardChipsAria}" data-ref="cardChips"></div>

    <section class="card" aria-label="${X.cardAria}">
      <div class="card-h"><h3 class="card-t" data-ref="cTitle"></h3><div class="tags" data-ref="cTags"></div></div>
      <div class="stage"><svg viewBox="0 0 360 180" role="img" data-ref="stage"></svg>
        <div class="legend" data-ref="stageKey"></div></div>
      <div class="seg mode" role="group" aria-label="${X.modeAria}" data-ref="modeSeg">
        <button class="btn" type="button" aria-pressed="true" data-mode="book">${X.modeBook}</button>
        <button class="btn" type="button" aria-pressed="false" data-mode="repl">${X.modeRepl}</button>
      </div>
      <div class="gauges" data-ref="gauges"></div>
      ${key(
        `<i class="sq" style="background:var(--dop)"></i>${X.keyBook}`,
        `<i class="sq" style="background:var(--pfc)"></i>${X.keyRepl}`,
        `<i class="bar2" style="background:var(--ink)"></i>${X.keyBase}`,
        `<i class="bar2 gh2"></i>${X.keyOther}`,
      )}
      <div class="sliders" data-ref="inp"></div>
      <p class="note" data-ref="cMeta"></p>
      <p class="note" data-ref="cNote"></p>
    </section>

    <section aria-label="${X.cmpAria}">
      <h3 class="sim-h">${X.cmpTitle}</h3>
      <div class="ovs" data-ref="ovs"></div>
      <p class="note">${X.cmpNote}</p>
    </section>

    <details class="how">
      <summary>${t('sim.how')}</summary>
      <div class="how-in">
        <p>${X.howBed1(K_REPL)}</p>
        <p>${X.howBed2}</p>
        <p>${X.howBed3}</p>
      </div>
    </details>

    <aside class="book" aria-label="${t('sim.book')}">
      <h3 class="sim-h">${t('sim.book')}</h3>
      <ul>
        ${bookList(BED_BOOK_IDS, X.bookBed)}
      </ul>
    </aside>
  </section>

  <!-- ============ 2 · Kutsal değerler ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-kut" data-pane="kut" aria-labelledby="${id}-tab-kut" hidden>
    <div data-ref="tour2"></div>
    <div class="chips" role="group" aria-label="${X.kindChipsAria}" data-ref="kindChips"></div>

    <section aria-label="${X.chartAria}">
      <h3 class="sim-h">${X.chartTitle}</h3>
      <div class="stage"><svg viewBox="0 0 360 200" role="img" data-ref="chart"></svg><div class="legend" data-ref="chartKey"></div></div>
    </section>

    <section aria-label="${X.crowdAria}">
      <h3 class="sim-h">${X.crowdTitle}</h3>
      <div class="stage"><svg viewBox="0 0 360 164" role="img" data-ref="crowd"></svg>
        ${key(
          sw(16, '<circle cx="8" cy="6" r="5" fill="var(--gld)"/>') + X.legAccept,
          sw(16, '<circle cx="8" cy="6" r="4" fill="none" stroke="var(--edge)" stroke-width="1.8"/>') + X.legReject,
          sw(16, '<path d="M3 1L13 11M13 1L3 11" stroke="var(--amy)" stroke-width="2.2" stroke-linecap="round"/>') + X.legAngry,
        )}</div>
    </section>

    <section aria-label="${X.inputsAria}">
      <h3 class="sim-h">${X.inputsTitle}</h3>
      <div class="sliders" data-ref="kSl"></div>
      <div class="row"><button class="btn" type="button" data-ref="rerun">${X.rerun}</button></div>
    </section>

    <details class="how">
      <summary>${t('sim.how')}</summary>
      <div class="how-in">
        <p>${X.howKut1}</p>
        <p>${X.howKut2(SACRED.A, SACRED.B, SACRED.C)}</p>
      </div>
    </details>

    <aside class="book" aria-label="${t('sim.book')}">
      <h3 class="sim-h">${t('sim.book')}</h3>
      <ul>
        ${bookList([['ch15-e12']], X.bookKut)}
      </ul>
    </aside>
  </section>

  <p class="foot">${X.foot}</p>
</div>`;
};

interface SliderHandle { inp: HTMLInputElement; set: (v: number) => void }
type Ctl =
  | { t: 'sl'; k: keyof Inputs; name: string; hint: string; fmt: (v: number) => string; color: string }
  | { t: 'seg'; k: keyof Inputs; name: string; opts: Array<[number, string]> }
  | { t: 'btn'; name: string };
const p0 = (v: number): string => percent(String(v));
const ctls = (): Record<CardId, Ctl[]> => {
  const C = L().ctl;
  return {
    cyber: [
      { t: 'sl', k: 'excl', name: C.cyber.exclName, hint: C.cyber.exclHint, fmt: p0, color: 'var(--amy)' },
      { t: 'seg', k: 'glitch', name: C.cyber.glitchName, opts: [[0, C.cyber.glitchOpts[0]], [1, C.cyber.glitchOpts[1]]] },
      { t: 'btn', name: C.cyber.restart },
    ],
    insula: [
      { t: 'sl', k: 'gross', name: C.insula.grossName, hint: C.insula.grossHint, fmt: p0, color: 'var(--gld)' },
      { t: 'sl', k: 'viol', name: C.insula.violName, hint: C.insula.violHint, fmt: p0, color: 'var(--amy)' },
    ],
    cup: [{ t: 'sl', k: 'temp', name: C.cup.name, hint: C.cup.hint, fmt: C.cup.fmt, color: 'var(--dop)' }],
    clip: [{ t: 'sl', k: 'weight', name: C.clip.name, hint: C.clip.hint, fmt: C.clip.fmt, color: 'var(--pfc)' }],
    macbeth: [
      { t: 'sl', k: 'mviol', name: C.macbeth.violName, hint: C.macbeth.violHint, fmt: p0, color: 'var(--amy)' },
      { t: 'seg', k: 'chan', name: C.macbeth.chanName, opts: [[0, C.macbeth.chanOpts[0]], [1, C.macbeth.chanOpts[1]]] },
      { t: 'seg', k: 'washed', name: C.macbeth.washedName, opts: [[0, C.macbeth.washedOpts[0]], [1, C.macbeth.washedOpts[1]]] },
    ],
    germ: [{ t: 'sl', k: 'lang', name: C.germ.name, hint: C.germ.hint, fmt: p0, color: 'var(--red)' }],
  };
};

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('met');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let slN = 0;

  interface State {
    tab: Tab; mode: Mode; card: CardId; x: Inputs;
    kind: OfferKind; size: number; sacred: number; seed: number;
    cy: { rnd: () => number; seed: number; holder: Holder; to: Holder; t: number; throws: number; got: number };
  }
  const S: State = {
    tab: 'bed', mode: 'book', card: 'insula', x: { ...DEFAULTS },
    kind: 'maddi', size: 0.6, sacred: 1, seed: 1,
    cy: { rnd: mulberry32(1), seed: 1, holder: 'a', to: 'b', t: 0, throws: 0, got: 0 },
  };
  let dirty = true;
  let lastSay = '';
  let ball: SVGElement | null = null;
  let cyTxt: SVGElement | null = null;

  /* ---------- Yardımcılar ---------- */
  function makeSlider(parent: HTMLElement, o: { name: string; hint: string; min: number; max: number; step: number; val: number; fmt: (v: number) => string; cb: (v: number) => void; color?: string }): SliderHandle {
    const h = slider(scope, parent, { id: `${id}-s${++slN}`, name: o.name, hint: o.hint, min: o.min, max: o.max, step: o.step, value: o.val, fmt: o.fmt, color: o.color, cls: 'sl', onInput: (v) => { o.cb(v); } });
    return { inp: h.inp, set: (v) => h.set(v) };
  }
  function chipGroup<T extends string>(parent: HTMLElement, items: Array<{ k: T; name: string }>, pick: (k: T) => void): (cur: T) => void {
    const btns = items.map((it) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = it.name; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => { pick(it.k); dirty = true; });
      parent.appendChild(b);
      return b;
    });
    return (cur) => items.forEach((it, i) => btns[i].setAttribute('aria-pressed', String(cur === it.k)));
  }
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
     1 · Beden ve ahlak karışıklığı
     ===================================================================== */
  const modeBtns = Array.from($('modeSeg').querySelectorAll<HTMLButtonElement>('button'));
  for (const b of modeBtns) scope.on(b, 'click', () => { S.mode = b.dataset.mode as Mode; dirty = true; });
  const syncCardChip = chipGroup($('cardChips'), CARD_IDS.map((c) => ({ k: c, name: CARDS[c].short })), (c) => selectCard(c));

  // Girdi denetimleri kart seçilince kurulur.
  let ctlSync: Array<() => void> = [];
  const inpEl = $('inp');
  function buildInputs(): void {
    inpEl.textContent = '';
    ctlSync = [];
    const X = S.x as unknown as Record<string, number>;
    for (const c of ctls()[S.card]) {
      if (c.t === 'sl') {
        const h = makeSlider(inpEl, { name: c.name, hint: c.hint, min: 0, max: 100, step: 5, val: Math.round(X[c.k] * 100), fmt: c.fmt, color: c.color, cb: (v) => { X[c.k] = v / 100; dirty = true; } });
        ctlSync.push(() => h.set(Math.round(X[c.k] * 100)));
      } else if (c.t === 'btn') {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'btn'; b.textContent = c.name;
        scope.on(b, 'click', () => restartCyber(S.cy.seed + 1));
        inpEl.appendChild(b);
      } else {
        const g = document.createElement('div');
        g.className = 'dg';
        g.innerHTML = `<p class="dg-l">${c.name}</p><div class="seg" role="group" aria-label="${c.name}"></div>`;
        inpEl.appendChild(g);
        const box = g.querySelector('.seg')!;
        const btns = c.opts.map(([v, name]) => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'btn'; b.textContent = name; b.setAttribute('aria-pressed', 'false');
          scope.on(b, 'click', () => { X[c.k] = v; dirty = true; });
          box.appendChild(b);
          return b;
        });
        ctlSync.push(() => c.opts.forEach(([v], i) => btns[i].setAttribute('aria-pressed', String(X[c.k] === v))));
      }
    }
  }
  function selectCard(c: CardId): void {
    S.card = c; dirty = true;
    buildInputs();
    $('stage').textContent = '';
    ball = null; cyTxt = null;
  }
  /** Tur adımları: kartı ve girdileri birlikte ayarlar. */
  function setCard(c: CardId, x: Partial<Inputs>, mode: Mode = S.mode): void {
    S.x = { ...DEFAULTS, ...x }; S.mode = mode;
    selectCard(c);
  }

  // Sahne çizimleri (viewBox 360x180)
  const stage = $<SVGElement>('stage');
  const NODE = { fill: 'var(--panel)', stroke: 'var(--edge)', 'stroke-width': 1.6 };
  const T = (parent: Element, x: number, y: number, s: string, cls = 't2', anchor = 'middle'): SVGElement => svgText(parent, { class: cls, x, y, 'text-anchor': anchor }, s);
  const box = (parent: Element, x: number, y: number, w: number, h: number, lines: string[], fill = 'var(--panel)', op = 1): void => {
    svg('rect', { x, y, width: w, height: h, rx: 8, fill: 'var(--panel)', stroke: 'var(--edge)', 'stroke-width': 1.4 }, parent);
    if (op > 0) svg('rect', { x: x + 1, y: y + 1, width: w - 2, height: h - 2, rx: 7, fill, 'fill-opacity': op.toFixed(2) }, parent);
    lines.forEach((l, i) => T(parent, x + w / 2, y + h / 2 + (i - (lines.length - 1) / 2) * 13 + 4, l, i === 0 ? 't1' : 't2'));
  };
  const arrow = (parent: Element, x1: number, y1: number, x2: number, y2: number, w: number, color: string, dash = ''): void => {
    const a = Math.atan2(y2 - y1, x2 - x1), hx = x2 - Math.cos(a) * 2, hy = y2 - Math.sin(a) * 2, s = 5 + w;
    svg('line', { x1, y1, x2: x2 - Math.cos(a) * s * 0.7, y2: y2 - Math.sin(a) * s * 0.7, stroke: color, 'stroke-width': w.toFixed(1), 'stroke-linecap': 'round', ...(dash ? { 'stroke-dasharray': dash } : {}) }, parent);
    svg('path', { d: `M${hx} ${hy} L${hx - Math.cos(a - 0.45) * s} ${hy - Math.sin(a - 0.45) * s} L${hx - Math.cos(a + 0.45) * s} ${hy - Math.sin(a + 0.45) * s}z`, fill: color }, parent);
  };
  const POS: Record<Holder, [number, number]> = { a: [64, 46], b: [296, 46], s: [180, 120] };

  function drawStage(): void {
    stage.textContent = '';
    const x = S.x, X = L(), Z = X.st;
    const g = Object.fromEntries(gauges(S.card, x).map((q) => [q.key, q.book])) as Record<string, number>;
    const cur = Object.fromEntries(gauges(S.card, x).map((q) => [q.key, q[S.mode]])) as Record<string, number>;
    ball = null; cyTxt = null;
    if (S.card === 'cyber') {
      const pS = 1 - x.excl;
      stage.setAttribute('aria-label', Z.ariaCyber(pct(x.excl), pct(cyberShare(x.excl))));
      const link = (a: Holder, b: Holder, w: number, col: string, dash = ''): void => {
        const [x1, y1] = POS[a], [x2, y2] = POS[b];
        svg('line', { x1, y1, x2, y2, stroke: col, 'stroke-width': w.toFixed(1), 'stroke-linecap': 'round', 'stroke-opacity': 0.6, ...(dash ? { 'stroke-dasharray': dash } : {}) }, stage);
      };
      link('a', 'b', 4.5, 'var(--edge)');
      link('a', 's', 1 + 6 * pS, x.excl > 0.85 ? 'var(--amy)' : 'var(--edge)', x.excl > 0.85 ? '2 6' : '');
      link('b', 's', 1 + 6 * pS, x.excl > 0.85 ? 'var(--amy)' : 'var(--edge)', x.excl > 0.85 ? '2 6' : '');
      for (const h of ['a', 'b', 's'] as Holder[]) {
        const [cx, cy] = POS[h];
        svg('circle', { cx, cy, r: 19, ...NODE, 'stroke-width': h === 's' ? 3 : 1.6 }, stage);
        T(stage, cx, cy + 4, h === 's' ? Z.you : h.toUpperCase(), 't1');
      }
      T(stage, 64, 82, Z.playerA); T(stage, 296, 82, Z.playerB);
      cyTxt = T(stage, 8, 172, '', 'st', 'start');
      T(stage, 352, 172, x.glitch ? Z.noticeGlitch : Z.noticeNone, 'st', 'end');
      ball = svg('circle', { r: 6, fill: 'var(--dop)', stroke: 'var(--ink)', 'stroke-width': 1.2 }, stage);
      placeBall();
    } else if (S.card === 'insula') {
      stage.setAttribute('aria-label', Z.ariaInsula(n100(g.ins)));
      const ins = g.ins;
      box(stage, 6, 18, 104, 44, [Z.badTaste, Z.physDisgust], 'var(--gld)', 0.12 + 0.4 * x.gross);
      box(stage, 6, 110, 104, 44, [Z.moralViol, Z.unfairOffer], 'var(--amy)', 0.12 + 0.4 * x.viol);
      arrow(stage, 112, 42, 152, 72, 1.5 + 4 * x.gross, 'var(--gld)');
      arrow(stage, 112, 132, 152, 98, 1.5 + 4 * x.viol, 'var(--amy)');
      svg('circle', { cx: 180, cy: 86, r: 30, fill: 'var(--amy)', 'fill-opacity': (0.1 + 0.7 * ins).toFixed(2), stroke: 'var(--ink)', 'stroke-width': 2 }, stage);
      T(stage, 180, 134, Z.antInsula, 't1');
      T(stage, 180, 148, Z.activity(n100(ins)));
      arrow(stage, 210, 72, 248, 42, 1.5 + 4 * ins, 'var(--edge)');
      arrow(stage, 210, 100, 248, 132, 1.5 + 4 * ins, 'var(--edge)');
      box(stage, 250, 18, 104, 44, [Z.judgeHarsher, stText('tartışmalı')], 'var(--dop)', 0.1 + 0.5 * clamp((cur.sev - 0.5) * 4));
      box(stage, 250, 110, 104, 44, [Z.offerRejected, stText('sağlam')], 'var(--dop)', 0.1 + 0.5 * cur.rej);
    } else if (S.card === 'cup') {
      const t = 2 * x.temp - 1, hot = t > 0.1, cold = t < -0.1;
      const col = hot ? 'var(--dop)' : cold ? 'var(--pfc)' : 'var(--lesion)';
      const cupW = hot ? Z.cupHot : cold ? Z.cupCold : Z.cupMild;
      stage.setAttribute('aria-label', Z.ariaCup(cupW, n100(cur.warm)));
      svg('path', { d: 'M70 64 H130 V108 Q130 134 100 134 Q70 134 70 108 Z', fill: col, 'fill-opacity': (0.25 + 0.55 * Math.abs(t)).toFixed(2), stroke: 'var(--ink)', 'stroke-width': 2 }, stage);
      svg('path', { d: 'M130 76 Q152 76 152 94 Q152 112 130 112', fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2 }, stage);
      if (hot) for (const dx of [84, 100, 116]) svg('path', { d: `M${dx} 54 q-6 -8 0 -16 q6 -8 0 -16`, fill: 'none', stroke: 'var(--dop)', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-opacity': 0.4 + 0.6 * t }, stage);
      if (cold) for (const [dx, dy] of [[84, 82], [104, 92], [90, 108]]) svg('rect', { x: dx, y: dy, width: 14, height: 14, rx: 3, fill: 'var(--panel)', stroke: 'var(--pfc)', 'stroke-width': 1.8, transform: `rotate(12 ${dx + 7} ${dy + 7})` }, stage);
      T(stage, 100, 156, Z.inHand(cupW), 't1');
      arrow(stage, 168, 92, 238, 92, 3, 'var(--edge)');
      T(stage, 203, 82, Z.judgeShifts);
      svg('circle', { cx: 290, cy: 62, r: 20, ...NODE }, stage);
      svg('path', { d: 'M254 128 Q254 94 290 94 Q326 94 326 128 Z', ...NODE }, stage);
      const mood = (cur.warm - 0.5) * 18;
      svg('path', { d: `M281 68 Q290 ${72 + mood} 299 68`, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.8, 'stroke-linecap': 'round' }, stage);
      T(stage, 290, 156, Z.describedPerson, 't1');
    } else if (S.card === 'clip') {
      const w = 2 * x.weight - 1;
      const clipW = x.weight > 0.65 ? Z.clipHeavy : x.weight < 0.35 ? Z.clipLight : Z.clipMid;
      stage.setAttribute('aria-label', Z.ariaClip(clipW, n100(cur.ser)));
      svg('rect', { x: 110, y: 22, width: 100, height: 126, rx: 8, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': (2 + 3.5 * x.weight).toFixed(1) }, stage);
      svg('rect', { x: 140, y: 14, width: 40, height: 14, rx: 4, fill: 'var(--ink)' }, stage);
      svg('rect', { x: 124, y: 40, width: 72, height: 98, rx: 3, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.5 }, stage);
      for (const dy of [54, 68, 82, 96, 110]) svg('line', { x1: 132, x2: dy % 28 ? 186 : 170, y1: dy, y2: dy, stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-linecap': 'round' }, stage);
      T(stage, 160, 166, Z.candidateResume, 't1');
      const len = 20 + 44 * x.weight;
      arrow(stage, 262, 40, 262, 40 + len, 2 + 3 * x.weight, 'var(--pfc)');
      T(stage, 262, 148, clipW, 't1');
      const mood = clamp(0.5 + w * 0.5);
      svg('rect', { x: 296, y: 40, width: 50, height: 14, rx: 7, fill: 'none', stroke: 'var(--edge)', 'stroke-width': 1.4 }, stage);
      svg('rect', { x: 297, y: 41, width: Math.max(2, 48 * mood), height: 12, rx: 6, fill: 'var(--pfc)', 'fill-opacity': 0.7 }, stage);
      T(stage, 321, 72, Z.serious);
    } else if (S.card === 'macbeth') {
      stage.setAttribute('aria-label', Z.ariaMac(n100(x.mviol), n100(cur.gar), n100(cur.sab)));
      svg('circle', { cx: 56, cy: 78, r: 26, fill: 'var(--red)', 'fill-opacity': (0.1 + 0.6 * x.mviol).toFixed(2), stroke: 'var(--ink)', 'stroke-width': 2 }, stage);
      T(stage, 56, 124, Z.stain, 't1'); T(stage, 56, 138, x.chan ? Z.lieWritten : Z.lieSpoken);
      arrow(stage, 86, 70, 188, 44, 1.5 + 5 * (cur.gar - 0.3) / 0.4, 'var(--edge)', x.chan ? '3 4' : '');
      arrow(stage, 86, 90, 188, 124, 1.5 + 5 * (cur.sab - 0.3) / 0.4, 'var(--edge)', x.chan ? '' : '3 4');
      box(stage, 192, 20, 160, 48, [Z.mouthBox, Z.wish(n100(cur.gar))], 'var(--gld)', 0.08 + 0.5 * (cur.gar - 0.3) / 0.4);
      box(stage, 192, 104, 160, 48, [x.washed ? Z.handBoxWashed : Z.handBox, Z.wish(n100(cur.sab))], 'var(--gld)', 0.08 + 0.5 * (cur.sab - 0.3) / 0.4);
      T(stage, 272, 87, x.washed ? Z.washedNote : Z.notWashedNote);
    } else {
      stage.setAttribute('aria-label', Z.ariaGerm(pct(x.lang), n100(cur.imm)));
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; svg('line', { x1: 50 + Math.cos(a) * 16, y1: 80 + Math.sin(a) * 16, x2: 50 + Math.cos(a) * 26, y2: 80 + Math.sin(a) * 26, stroke: 'var(--red)', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, stage); }
      svg('circle', { cx: 50, cy: 80, r: 16, fill: 'var(--red)', 'fill-opacity': (0.15 + 0.6 * x.lang).toFixed(2), stroke: 'var(--ink)', 'stroke-width': 1.8 }, stage);
      T(stage, 50, 126, Z.germLang1, 't1'); T(stage, 50, 139, Z.germLang2, 't1');
      arrow(stage, 84, 80, 124, 80, 1.5 + 4 * x.lang, 'var(--red)');
      svg('ellipse', { cx: 180, cy: 80, rx: 46, ry: 32, ...NODE }, stage);
      T(stage, 180, 77, Z.society1, 't1'); T(stage, 180, 91, Z.society2, 't1');
      arrow(stage, 230, 80, 262, 80, 1.5 + 4 * x.lang, 'var(--red)');
      box(stage, 266, 34, 88, 44, [Z.antiImm1, Z.antiImm2], 'var(--red)', 0.08 + 0.55 * (cur.imm - 0.4) / 0.3);
      box(stage, 266, 98, 88, 44, [Z.econ1, Z.econ2], 'var(--lesion)', 0.08);
      T(stage, 354, 160, Z.unchanged, 't2', 'end');
    }
    $('stageKey').textContent = X.stageKey[S.card];
  }

  // Cyberball animasyonu: top atışları (tohumlu); az hareket tercihinde durur.
  const THROW = 0.6;
  function placeBall(): void {
    if (!ball) return;
    const c = S.cy;
    const [x1, y1] = POS[c.holder], [x2, y2] = POS[c.to];
    const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d;
    const t = reduced ? 0 : c.t;
    const sx = x1 + ux * 25, sy = y1 + uy * 25, ex = x2 - ux * 25, ey = y2 - uy * 25;
    ball.setAttribute('cx', (sx + (ex - sx) * t).toFixed(1));
    ball.setAttribute('cy', (sy + (ey - sy) * t - Math.sin(Math.PI * t) * 10).toFixed(1));
    if (cyTxt) { const Z = L().st, sh = pct(cyberShare(S.x.excl)); cyTxt.textContent = reduced ? Z.cyReduced(sh, pct(1 / 3)) : Z.cyLive(c.got, c.throws, sh); }
  }
  function restartCyber(seed: number): void {
    S.cy = { rnd: mulberry32(seed), seed, holder: 'a', to: 'b', t: 0, throws: 0, got: 0 };
    S.cy.to = cyberNext('a', S.x.excl, S.cy.rnd);
    placeBall();
  }
  restartCyber(1);

  // Gauge, genel bakış, özet
  const gaugesEl = $('gauges');
  function drawGauges(): void {
    const gs = gauges(S.card, S.x);
    const other: Mode = S.mode === 'book' ? 'repl' : 'book';
    gaugesEl.innerHTML = gs.map((q) => {
      const v = q[S.mode], o = q[other];
      return `<div class="g${q.control ? ' ctl' : ''}"><div class="g-top"><span class="g-l">${q.label}${q.control ? '' : ' ' + tag(q.st)}</span><b>${n100(v)}</b></div>` +
        `<div class="g-trk" data-m="${S.mode}"><b style="width:${(v * 100).toFixed(1)}%"></b><i class="gb" style="left:${(q.base * 100).toFixed(1)}%"></i><i class="gh" data-m="${other}" style="left:${(o * 100).toFixed(1)}%"></i></div></div>`;
    }).join('');
  }
  const ovsEl = $('ovs');
  ovsEl.innerHTML = CARD_IDS.map((c) => {
    const s = maxShift(c);
    return `<button type="button" class="ov" data-card="${c}" aria-pressed="false"><span class="ov-n">${CARDS[c].short}</span><span class="ov-t">${Array.from(new Set(CARDS[c].exps.map((e) => e.status))).map(tag).join('')}</span>` +
      `<span class="ov-r"><span>${L().ovBook}</span><span class="track" style="--c:var(--dop)"><b style="width:${s.book}%"></b></span><b>${s.book}</b></span>` +
      `<span class="ov-r"><span>${L().ovRepl}</span><span class="track" style="--c:var(--pfc)"><b style="width:${s.repl}%"></b></span><b>${s.repl}</b></span></button>`;
  }).join('');
  const ovBtns = Array.from(ovsEl.querySelectorAll<HTMLButtonElement>('.ov'));
  for (const b of ovBtns) scope.on(b, 'click', () => selectCard(b.dataset.card as CardId));

  function renderBed(): void {
    const c = CARDS[S.card];
    for (const b of modeBtns) b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode));
    syncCardChip(S.card);
    ovBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.card === S.card)));
    ctlSync.forEach((f) => f());
    $('cTitle').textContent = c.name;
    $('cTags').innerHTML = Array.from(new Set(c.exps.map((e) => e.status))).map(tag).join('') + `<span class="exps">${c.exps.map((e) => e.label).join(' · ')}</span>`;
    $('cMeta').textContent = L().metaphorLine(c.metaphor);
    $('cNote').textContent = L().replLine(c.note);
    drawStage();
    drawGauges();
    const gs = gauges(S.card, S.x), g = gs.find((q) => q.key === c.bar)!;
    setBar(describeCard(S.card, S.x, S.mode), [
      { label: L().meterSel, text: n100(g[S.mode]), frac: g[S.mode], color: S.mode === 'book' ? 'var(--dop)' : 'var(--pfc)' },
      { label: L().meterBook, text: n100(g.book), frac: g.book, color: 'var(--dop)' },
      { label: L().meterRepl, text: n100(g.repl), frac: g.repl, color: 'var(--pfc)' },
    ]);
  }

  /* =====================================================================
     2 · Kutsal değerler
     ===================================================================== */
  const syncKind = chipGroup($('kindChips'), KIND_IDS.map((k) => ({ k, name: L().kinds[k] })), (k) => { S.kind = k; });
  const sizeSl = makeSlider($('kSl'), {
    name: L().sizeName, hint: L().sizeHint,
    min: 0, max: 100, step: 5, val: S.size * 100, fmt: p0, cb: (v) => { S.size = v / 100; dirty = true; }, color: 'var(--dop)',
  });
  const sacSl = makeSlider($('kSl'), {
    name: L().sacName, hint: L().sacHint,
    min: 0, max: 100, step: 5, val: S.sacred * 100, fmt: p0, cb: (v) => { S.sacred = v / 100; dirty = true; }, color: 'var(--amy)',
  });
  scope.on($('rerun'), 'click', () => { S.seed++; dirty = true; });

  const chart = $<SVGElement>('chart');
  const CP = { x0: 38, x1: 344, y0: 168, y1: 28 };
  const cx = (z: number): number => CP.x0 + (CP.x1 - CP.x0) * z;
  const cy = (v: number): number => CP.y0 - (CP.y0 - CP.y1) * v;
  function curve(S0: number, kind: OfferKind): string {
    return Array.from({ length: 21 }, (_, i) => { const z = i / 20, { m, y } = offerParts(kind, z); return `${i ? 'L' : 'M'}${cx(z).toFixed(1)} ${cy(expectedSupport(S0, m, y)).toFixed(1)}`; }).join('');
  }
  function drawChart(): void {
    chart.textContent = '';
    chart.setAttribute('aria-label', L().ariaChart(pct(S.sacred), describeSacred(S.sacred, S.kind, S.size)));
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      svg('line', { class: 'grid', x1: CP.x0, x2: CP.x1, y1: cy(v), y2: cy(v) }, chart);
      svgText(chart, { class: 'ax', x: CP.x0 - 6, y: cy(v) + 3.5, 'text-anchor': 'end' }, n100(v));
    }
    for (const z of [0, 0.5, 1]) svgText(chart, { class: 'ax', x: cx(z), y: CP.y0 + 14, 'text-anchor': 'middle' }, p0(z * 100));
    svgText(chart, { class: 'ax', x: (CP.x0 + CP.x1) / 2, y: 196, 'text-anchor': 'middle' }, L().axSize);
    svgText(chart, { class: 'ax', x: 6, y: 10, 'text-anchor': 'start' }, L().axSupport);
    svg('path', { d: curve(0, 'maddi'), class: 'ln', stroke: 'var(--lesion)', 'stroke-width': 1.6, 'stroke-dasharray': '2 4' }, chart);
    svg('path', { d: curve(S.sacred, 'maddi'), class: 'ln', stroke: 'var(--dop)' }, chart);
    svg('path', { d: curve(S.sacred, 'sembolik'), class: 'ln', stroke: 'var(--pfc)', 'stroke-dasharray': '7 4' }, chart);
    if (S.kind === 'karma') svg('path', { d: curve(S.sacred, 'karma'), class: 'ln', stroke: 'var(--gld)' }, chart);
    const { m, y } = offerParts(S.kind, S.size);
    svg('circle', { cx: cx(S.size), cy: cy(expectedSupport(S.sacred, m, y)), r: 6, fill: 'var(--ink)', stroke: 'var(--panel)', 'stroke-width': 2 }, chart);
    $('chartKey').innerHTML =
      `<span>${sw(26, '<path d="M1 6H25" stroke="var(--dop)" stroke-width="2.4"/>')}${L().keyMaterial}</span>` +
      `<span>${sw(26, '<path d="M1 6H25" stroke="var(--pfc)" stroke-width="2.4" stroke-dasharray="7 4"/>')}${L().keySymbolic}</span>` +
      `<span>${sw(26, '<path d="M1 6H25" stroke="var(--lesion)" stroke-width="1.8" stroke-dasharray="2 4"/>')}${L().keyOrdinary}</span>` +
      (S.kind === 'karma' ? `<span>${sw(26, '<path d="M1 6H25" stroke="var(--gld)" stroke-width="2.4"/>')}${L().keyBoth}</span>` : '') +
      `<span>${sw(14, '<circle cx="7" cy="6" r="5" fill="var(--ink)"/>')}${L().keySelected}</span>`;
  }

  const crowd = $<SVGElement>('crowd');
  function drawCrowd(): void {
    crowd.textContent = '';
    const { m, y } = offerParts(S.kind, S.size);
    const c = simulateCrowd(S.sacred, m, y, S.seed);
    crowd.setAttribute('aria-label', L().ariaCrowd(c.accept, c.reject, c.angry));
    c.dots.forEach((d, i) => {
      const px = 22 + (i % 10) * 35.5, py = 12 + Math.floor(i / 10) * 14.5;
      if (d === 'a') svg('circle', { cx: px, cy: py, r: 5, fill: 'var(--gld)' }, crowd);
      else if (d === 'r') svg('circle', { cx: px, cy: py, r: 4, fill: 'none', stroke: 'var(--edge)', 'stroke-width': 1.8 }, crowd);
      else svg('path', { d: `M${px - 4.5} ${py - 4.5}L${px + 4.5} ${py + 4.5}M${px + 4.5} ${py - 4.5}L${px - 4.5} ${py + 4.5}`, stroke: 'var(--amy)', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, crowd);
    });
    svgText(crowd, { class: 'ax', x: 352, y: 160, 'text-anchor': 'end' }, L().crowdTotals(c.accept, c.reject, c.angry));
  }

  function renderKut(): void {
    syncKind(S.kind);
    sizeSl.set(Math.round(S.size * 100)); sacSl.set(Math.round(S.sacred * 100));
    drawChart(); drawCrowd();
    const { m, y } = offerParts(S.kind, S.size);
    const sup = expectedSupport(S.sacred, m, y), back = expectedBacklash(S.sacred, m, y), ord = expectedSupport(0, m, y);
    setBar(describeSacred(S.sacred, S.kind, S.size), [
      { label: L().meterSupport, text: pct(sup), frac: sup, color: 'var(--gld)' },
      { label: L().meterBacklash, text: pct(back), frac: back, color: 'var(--amy)' },
      { label: L().meterOrdinary, text: pct(ord), frac: ord, color: 'var(--lesion)' },
    ]);
  }

  /* ---------- Turlar ---------- */
  const tour1Apply: Array<() => void> = [
    () => setCard('insula', { viol: 0.9 }, 'book'),
    () => setCard('cyber', { excl: 1 }, 'book'),
    () => setCard('cyber', { excl: 1, glitch: 1 }, 'book'),
    () => setCard('cup', { temp: 1 }, 'book'),
    () => setCard('cup', { temp: 1 }, 'repl'),
    () => setCard('germ', { lang: 1 }, 'book'),
  ];
  const tour1 = createTour(scope, L().tour1.map((st, i) => ({ ...st, apply: tour1Apply[i] })));
  $('tour1').appendChild(tour1.el);

  const kut = (kind: OfferKind, size: number, sacred: number, seed = S.seed): void => { S.kind = kind; S.size = size; S.sacred = sacred; S.seed = seed; dirty = true; };
  const tour2Apply: Array<() => void> = [
    () => kut('maddi', 0.7, 0),
    () => kut('maddi', 0.7, 1),
    () => kut('sembolik', 0.7, 1),
    () => kut('karma', 0.7, 1),
    () => kut('maddi', 0.7, 0.5, 4),
  ];
  const tour2 = createTour(scope, L().tour2.map((st, i) => ({ ...st, apply: tour2Apply[i] })));
  $('tour2').appendChild(tour2.el);

  /* ---------- Başlangıç ve döngü ---------- */
  buildInputs();
  const poke = scope.announcer($('live'), () => lastSay);
  const onAction = () => { if (dirty) { dirty = false; render(); } poke(); };
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);

  let last = performance.now();
  function render(): void {
    if (S.tab === 'bed') renderBed(); else renderKut();
  }
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (S.tab === 'bed' && S.card === 'cyber' && !reduced) {
      const c = S.cy;
      c.t += dt / THROW;
      if (c.t >= 1) {
        c.holder = c.to; c.throws++; if (c.holder === 's') c.got++;
        c.to = cyberNext(c.holder, S.x.excl, c.rnd); c.t = 0;
      }
      placeBall();
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
