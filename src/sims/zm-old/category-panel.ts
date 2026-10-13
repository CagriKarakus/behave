// Sekme 2: Kategori sınırı yanılgısı. Sürekli bir değişken kutulara bölününce kutu sınırındaki fark şişer.
import { percent } from '../../i18n/fmt';
import { svg, svgText } from '../kit';
import { chipRow, f1, makeSlider, type Ctx, type Meter, type Panel, type SliderHandle } from '../ui';
import { EXAMPLES } from './data';
import { compare, describeCat, edges, segments, sweep, unitWord as unitOf, widthOf, type CatParams } from './model';
import { L } from './text';

const num = (v: number): string => f1(v).replace(/[.,]0$/, '');
const W = 360, X0 = 46, X1 = 344;
const STRIP_N = 48;

export interface CategoryPanel extends Panel {
  set(p: { example?: string; delta?: number; offset?: number; strength?: number; boxes?: number }): void;
}

export function createCategoryPanel(ctx: Ctx, host: HTMLElement): CategoryPanel {
  const T = L().cat;
  host.innerHTML = `
<div class="chips" data-ref="ex"></div>
<div class="stage">
  <svg data-ref="map" viewBox="0 0 ${W} 252" role="img" aria-label="${T.mapAria}"></svg>
  <svg data-ref="swp" viewBox="0 0 ${W} 150" role="img" aria-label="${T.swpAria}"></svg>
  <div class="legend" aria-label="${T.legendAria}">
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5 H25" class="lg-curve"/></svg>${T.lgCurve}</span>
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5 H25" class="lg-diag"/></svg>${T.lgDiag}</span>
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M13 0 V10" class="lg-div"/></svg>${T.lgDiv}</span>
  </div>
</div>
<section aria-label="${T.inputsAria}"><h3 class="sim-h">${T.inputsH}</h3><div class="sliders" data-ref="sliders"></div></section>
<div class="notes" data-notes="cat"></div>`;

  const $ = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const S = { ex: 0, delta: EXAMPLES[0].delta, off: 0, strength: 60, n: EXAMPLES[0].boxes, dirty: true, stripFor: -1 };
  const ex = () => EXAMPLES[S.ex];
  const params = (): CatParams => {
    const e = ex();
    const base = { lo: e.lo, hi: e.hi, n: S.n };
    return { ...base, delta: S.delta, offset: (S.off / 100) * (widthOf(base) / 2), strength: S.strength / 100 };
  };
  const unitWord = () => unitOf(ex().unit);

  const setChip = chipRow($('ex'), ctx, EXAMPLES.map((e) => ({ key: e.key, label: e.label })), (k) => {
    S.ex = Math.max(0, EXAMPLES.findIndex((e) => e.key === k));
    S.delta = ex().delta; S.n = ex().boxes; S.off = 0; S.stripFor = -1; S.dirty = true;
  }, T.chipsAria);

  const sl: Record<string, SliderHandle> = {};
  const box = $('sliders');
  sl.delta = makeSlider(ctx, box, 'delta', T.deltaName, T.deltaHint, 1, 20, S.delta,
    (v) => { S.delta = v; S.dirty = true; }, (v) => `${num(v)} ${unitWord()}`, 'var(--ink)', 1);
  sl.off = makeSlider(ctx, box, 'off', T.offName, T.offHint, -100, 100, S.off,
    (v) => { S.off = v; S.dirty = true; }, (v) => offText(v), 'var(--dop)', 5);
  sl.strength = makeSlider(ctx, box, 'str', T.strName, T.strHint, 0, 100, S.strength,
    (v) => { S.strength = v; S.dirty = true; }, (v) => (v === 0 ? T.strNone : percent(String(v))), 'var(--amy)', 5);
  sl.n = makeSlider(ctx, box, 'n', T.nName, T.nHint, 2, 8, S.n,
    (v) => { S.n = v; S.dirty = true; }, (v) => T.nVal(v), 'var(--pfc)', 1);

  function offText(v: number): string {
    if (v === 0) return T.offMid;
    const u = Math.abs(v / 100) * (widthOf({ lo: ex().lo, hi: ex().hi, n: S.n }) / 2);
    const n = num(Math.round(u * 10) / 10);
    return v > 0 ? T.offRight(n, unitWord()) : T.offLeft(n, unitWord());
  }

  const map = $<SVGElement>('map'), swp = $<SVGElement>('swp');
  const xOf = (v: number, e = ex()) => X0 + ((v - e.lo) / (e.hi - e.lo)) * (X1 - X0);
  const yMap = (v: number, e = ex()) => 214 - ((v - e.lo) / (e.hi - e.lo)) * 138;

  function drawMap(p: CatParams): void {
    map.textContent = '';
    const e = ex(), c = compare(p), segs = segments(p), es = edges(p);
    // Şerit: iki jeton rengi arasında sürekli geçiş
    for (let i = 0; i < STRIP_N; i++) {
      const r = svg('rect', { x: X0 + (i * (X1 - X0)) / STRIP_N, y: 12, width: (X1 - X0) / STRIP_N + 0.5, height: 22 }, map);
      r.setAttribute('style', `fill:color-mix(in srgb, var(${e.from}) ${Math.round(100 - (i / (STRIP_N - 1)) * 100)}%, var(${e.to}))`);
    }
    svg('rect', { x: X0, y: 12, width: X1 - X0, height: 22, class: 'frame' }, map);
    // Kutu sınırları
    for (const b of es) svg('line', { x1: xOf(b), x2: xOf(b), y1: 8, y2: 214, class: 'div' }, map);
    // Eksenler
    svg('line', { x1: X0, x2: X1, y1: 214, y2: 214, class: 'grid' }, map);
    svg('line', { x1: X0, x2: X0, y1: 76, y2: 214, class: 'grid' }, map);
    svg('line', { x1: X0, y1: 214, x2: X1, y2: 76, class: 'diag' }, map);
    svgText(map, { x: 2, y: 218, class: 'tk' }, num(e.lo));
    svgText(map, { x: 2, y: 80, class: 'tk' }, num(e.hi));
    svgText(map, { x: X0, y: 68, class: 'tk' }, T.mapPerceived);
    svgText(map, { x: (X0 + X1) / 2, y: 246, class: 'tk', 'text-anchor': 'middle' }, T.mapAxis(e.axis));
    // Algı eğrisi: her kutuda eğimi (1 - güç) olan yatık parça
    for (const [a, b] of segs) {
      const pa = a - p.strength * (a - (a + b) / 2), pb = b - p.strength * (b - (a + b) / 2);
      svg('line', { x1: xOf(a), y1: yMap(pa), x2: xOf(b), y2: yMap(pb), class: 'curve' }, map);
    }
    // Çift: şeritte işaret, eğride nokta, iki eksende parantez
    for (const [v, pv, name, side] of [[c.a, c.pa, 'A', 'end'], [c.b, c.pb, 'B', 'start']] as const) {
      const x = xOf(v);
      svg('path', { d: `M${x} 36 l-4 7 h8 z`, class: 'mk' }, map);
      svgText(map, { x: x + (side === 'end' ? -5 : 5), y: 52, 'text-anchor': side, class: 'pt' }, name);
      svg('line', { x1: x, x2: x, y1: 60, y2: yMap(pv), class: 'drop' }, map);
      svg('line', { x1: X0, x2: x, y1: yMap(pv), y2: yMap(pv), class: 'drop' }, map);
      svg('circle', { cx: x, cy: yMap(pv), r: 4, class: 'dot' }, map);
    }
    svg('path', { d: `M${xOf(c.a)} 222 v4 H${xOf(c.b)} v-4`, class: 'br' }, map);
    svg('path', { d: `M${X0 - 4} ${yMap(c.pa)} h-4 V${yMap(c.pb)} h4`, class: 'br on' }, map);
  }

  function drawSweep(p: CatParams): void {
    swp.textContent = '';
    const pts = sweep(p, 61), half = widthOf(p) / 2;
    const maxV = Math.max(p.delta, ...pts.map((q) => q.perceived)) * 1.15 || 1;
    const x = (u: number) => X0 + ((u + half) / (2 * half)) * (X1 - X0), y = (v: number) => 112 - (v / maxV) * 96;
    svg('rect', { x: x(-p.delta / 2), y: 12, width: Math.max(1, x(p.delta / 2) - x(-p.delta / 2)), height: 100, class: 'zone' }, swp);
    svg('line', { x1: X0, x2: X1, y1: 112, y2: 112, class: 'grid' }, swp);
    svg('line', { x1: X0, x2: X1, y1: y(p.delta), y2: y(p.delta), class: 'diag' }, swp);
    svgText(swp, { x: X1, y: Math.max(10, y(p.delta) - 4), 'text-anchor': 'end', class: 'tk' }, T.swpTrue);
    svg('polyline', { points: pts.map((q) => `${x(q.offset).toFixed(1)},${y(q.perceived).toFixed(1)}`).join(' '), class: 'curve flat' }, swp);
    const cur = compare(p).perceived;
    svg('circle', { cx: x(p.offset), cy: y(cur), r: 4.5, class: 'dot' }, swp);
    svgText(swp, { x: 2, y: 22, class: 'tk' }, T.swpY1);
    svgText(swp, { x: 2, y: 34, class: 'tk' }, T.swpY2);
    svgText(swp, { x: X0, y: 128, class: 'tk' }, T.swpLeft);
    svgText(swp, { x: X1, y: 128, class: 'tk', 'text-anchor': 'end' }, T.swpRight);
    svgText(swp, { x: (X0 + X1) / 2, y: 128, class: 'tk', 'text-anchor': 'middle' }, T.swpMid);
    svgText(swp, { x: (X0 + X1) / 2, y: 144, class: 'tk', 'text-anchor': 'middle' }, T.swpZone);
  }

  function render(): void {
    S.dirty = false;
    const e = ex(), p = params();
    setChip(e.key);
    sl.delta.inp.max = String(e.maxDelta);
    sl.delta.set(S.delta); sl.off.set(S.off, offText(S.off)); sl.strength.set(S.strength); sl.n.set(S.n);
    drawMap(p); drawSweep(p);
  }

  return {
    say: () => { const e = ex(); return describeCat(params(), e.unit, num); },
    meters(): Meter[] {
      const c = compare(params()), e = ex(), u = e.unit === '%' ? '' : ` ${unitOf(e.unit)}`;
      return [
        { label: T.mTrue, value: `${num(c.truth)}${u}`, frac: c.truth / (e.maxDelta * 2), color: 'var(--ink)' },
        { label: T.mPerc, value: `${num(Math.round(c.perceived * 10) / 10)}${u}`, frac: c.perceived / (e.maxDelta * 2), color: 'var(--pfc)' },
        { label: T.mBias, value: `${c.bias >= 0 ? '+' : '−'}${num(Math.abs(Math.round(c.bias * 10) / 10))}${u}`, frac: Math.abs(c.bias) / (e.maxDelta * 2), color: 'var(--amy)' },
      ];
    },
    draw(): boolean { if (!S.dirty) return false; render(); return true; },
    resume() { S.dirty = true; },
    set(q) {
      if (q.example !== undefined) { S.ex = Math.max(0, EXAMPLES.findIndex((e) => e.key === q.example)); S.delta = ex().delta; S.n = ex().boxes; S.off = 0; }
      if (q.boxes !== undefined) S.n = q.boxes;
      if (q.delta !== undefined) S.delta = q.delta;
      if (q.offset !== undefined) S.off = q.offset;
      if (q.strength !== undefined) S.strength = q.strength;
      render();
    },
  };
}
