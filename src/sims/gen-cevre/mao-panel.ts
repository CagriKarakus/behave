// Sekme 2: MAO-A varyantı × çocuklukta kötü muamele (Caspi tarzı etkileşim). Fikri öğretir; kesin risk hesabı değildir.
import { svg, svgText } from '../kit';
import { CASPI_RATIO, describeMao, maoPopulationRisk, maoRisk } from './model';
import { num, percent } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { L } from './text';
import { bookBox, chipRow, makeSlider, pc, type Ctx, type Meter, type Panel, type SliderHandle } from '../ui';

const SCEN_DEF = [
  { key: 'caspi', ratio: CASPI_RATIO },
  { key: 'small', ratio: 1.5 },
  { key: 'none', ratio: 1 },
];
const scen = () => SCEN_DEF.map((s, i) => ({ ...s, label: L().mao.scen[i] }));

const TEMPLATE = () => {
  const M = L().mao;
  return `
<div class="callout" role="note">
  <p>${M.callout1(t('repl.karışık'))}</p>
  <p>${M.callout2}</p>
</div>
<p class="note">${M.question}</p>
<div class="chips" data-ref="scen" role="group" aria-label="${M.scenLabel}"></div>

<div class="stage">
  <svg data-ref="chart" viewBox="0 0 360 230" role="img" aria-label="${M.chartLabel}"></svg>
  <div class="legend" aria-label="${M.legendLabel}">
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="var(--amy)" stroke-width="2.4"/><circle cx="13" cy="5" r="3.4" fill="var(--amy)"/></svg>${M.legendLow}</span>
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="var(--pfc)" stroke-width="2.4" stroke-dasharray="5 3"/><rect x="9.6" y="1.6" width="6.8" height="6.8" fill="var(--pfc)"/></svg>${M.legendHigh}</span>
  </div>
</div>

<section class="card" aria-label="${M.gridCardLabel}">
  <h3 class="sim-h">${M.gridTitle}</h3>
  <p class="note">${M.gridNote}</p>
  <div class="grids">
    <figure><svg data-ref="gridLow" viewBox="0 0 110 110" role="img" aria-label="${M.gridLowLabel}"></svg><figcaption data-ref="capLow"></figcaption></figure>
    <figure><svg data-ref="gridHigh" viewBox="0 0 110 110" role="img" aria-label="${M.gridHighLabel}"></svg><figcaption data-ref="capHigh"></figcaption></figure>
  </div>
  <table class="gx" data-ref="tbl"></table>
</section>

<section aria-label="${M.inputsLabel}"><h3 class="sim-h">${L().common.inputs}</h3><div class="sliders" data-ref="sliders"></div></section>

<details class="more"><summary>${t('sim.how')}</summary>
  <p>${M.how[0]}</p>
  <p>${M.how[1]}</p>
  <p>${M.how[2]}</p>
</details>

${bookBox([
    { id: 'ch08-e9', text: M.book[0](t('repl.karışık')) },
    { id: 'ch08-e6', text: M.book[1]() },
    { id: 'ch08-e8', text: M.book[2](t('repl.karışık')) },
  ], M.bookExtra)}
<p class="foot">${M.foot}</p>`;
};

export interface MaoPanel extends Panel {
  set(p: { level?: number; ratio?: number; share?: number }): void;
}

export function createMaoPanel(ctx: Ctx, host: HTMLElement): MaoPanel {
  host.innerHTML = TEMPLATE();
  const $ = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const S = { level: 0.9, ratio: CASPI_RATIO, share: 0.1, dirty: true };
  const sl: Record<string, SliderHandle> = {};

  const setChip = chipRow($('scen'), ctx, scen().map((s) => ({ key: s.key, label: s.label })), (k) => {
    S.ratio = scen().find((s) => s.key === k)!.ratio; sl.ratio.set(Math.round(S.ratio * 10)); S.dirty = true; setChip(k);
  });
  const chipFor = () => scen().find((s) => Math.abs(s.ratio - S.ratio) < 0.01)?.key ?? null;
  const slH = $('sliders');
  const SL = L().mao.sliders, times = L().mao.times;
  sl.level = makeSlider(ctx, slH, 'lvl', SL.level.name, SL.level.hint, 0, 100, Math.round(S.level * 100),
    (v) => { S.level = v / 100; S.dirty = true; }, (v) => (v < 5 ? SL.level.none : v < 30 ? SL.level.mild(percent(String(v))) : v < 70 ? SL.level.mid(percent(String(v))) : SL.level.severe(percent(String(v)))), 'var(--red)');
  sl.ratio = makeSlider(ctx, slH, 'ratio', SL.ratio.name, SL.ratio.hint, 10, 50, Math.round(S.ratio * 10),
    (v) => { S.ratio = v / 10; S.dirty = true; setChip(chipFor()); }, (v) => times(num(v / 10, 1)), 'var(--amy)', 1);
  sl.share = makeSlider(ctx, slH, 'share', SL.share.name, SL.share.hint, 0, 40, Math.round(S.share * 100),
    (v) => { S.share = v / 100; S.dirty = true; }, (v) => percent(String(v)), 'var(--lesion)');
  setChip(chipFor());

  const ch = $<SVGElement>('chart');
  const R = { l: 38, r: 16, t: 28, b: 44 };
  const xAt = (l: number) => R.l + l * (360 - R.l - R.r);
  const yAt = (v: number) => 230 - R.b - v * (230 - R.b - R.t);
  function drawChart(): void {
    ch.innerHTML = '';
    for (const v of [0, 0.25, 0.5, 0.75, 1]) { svg('line', { class: 'grid', x1: R.l, x2: 360 - R.r, y1: yAt(v), y2: yAt(v) }, ch); svgText(ch, { x: R.l - 6, y: yAt(v) + 3.5, 'text-anchor': 'end' }, String(Math.round(v * 100))); }
    for (const [l, nm] of [[0, L().mao.ticks.none], [0.5, L().mao.ticks.mid], [1, L().mao.ticks.severe]] as const) { svgText(ch, { x: xAt(l), y: 230 - R.b + 15, 'text-anchor': l === 0 ? 'start' : l === 1 ? 'end' : 'middle' }, nm); }
    svgText(ch, { x: (R.l + 360 - R.r) / 2, y: 224, 'text-anchor': 'middle', class: 'ax-t' }, L().mao.axisX);
    svgText(ch, { x: 6, y: 10, 'text-anchor': 'start', class: 'ax-t' }, L().mao.axisY);
    const pts = (low: boolean) => Array.from({ length: 51 }, (_, i) => `${xAt(i / 50).toFixed(1)},${yAt(maoRisk(low, i / 50, S.ratio)).toFixed(1)}`).join(' ');
    svg('polyline', { class: 'ln', stroke: 'var(--pfc)', 'stroke-dasharray': '6 3', points: pts(false) }, ch);
    svg('polyline', { class: 'ln', stroke: 'var(--amy)', points: pts(true) }, ch);
    svg('line', { x1: xAt(S.level), x2: xAt(S.level), y1: yAt(0), y2: yAt(1), stroke: 'var(--ink)', 'stroke-width': 1.2, 'stroke-dasharray': '2 3' }, ch);
    const hi = maoRisk(false, S.level, S.ratio), lo = maoRisk(true, S.level, S.ratio);
    svg('rect', { x: xAt(S.level) - 4.5, y: yAt(hi) - 4.5, width: 9, height: 9, fill: 'var(--pfc)', stroke: 'var(--panel)', 'stroke-width': 1.4 }, ch);
    svg('circle', { cx: xAt(S.level), cy: yAt(lo), r: 5, fill: 'var(--amy)', stroke: 'var(--panel)', 'stroke-width': 1.4 }, ch);
    const flip = S.level > 0.7;
    const anchor = flip ? 'end' : 'start', dx = flip ? -10 : 10;
    svgText(ch, { x: xAt(S.level) + dx, y: yAt(lo) - 8, 'text-anchor': anchor, style: 'fill:var(--ink)' }, pc(lo));
    if (Math.abs(yAt(hi) - yAt(lo)) > 9) svgText(ch, { x: xAt(S.level) + dx, y: yAt(hi) + 15, 'text-anchor': anchor, style: 'fill:var(--ink)' }, pc(hi));
  }
  function drawGrid(svgEl: SVGElement, risk: number, color: string, square: boolean): void {
    svgEl.innerHTML = '';
    const k = Math.round(risk * 100);
    for (let i = 0; i < 100; i++) {
      const cx = 7 + (i % 10) * 10.6, cy = 7 + Math.floor(i / 10) * 10.6, on = i < k;
      const a = { fill: on ? color : 'none', stroke: on ? color : 'var(--control-border)', 'stroke-width': on ? 1 : 0.9 };
      if (square) svg('rect', { x: cx - 3.6, y: cy - 3.6, width: 7.2, height: 7.2, ...a }, svgEl);
      else svg('circle', { cx, cy, r: 3.8, ...a }, svgEl);
    }
  }
  function drawTable(): void {
    const M = L().mao;
    const row = (nm: string, low: boolean) => `<tr><th scope="row">${nm}</th><td>${pc(maoRisk(low, 0, S.ratio))}</td><td>${pc(maoRisk(low, 1, S.ratio))}</td><td>${pc(maoPopulationRisk(low, S.share, S.ratio))}</td></tr>`;
    $('tbl').innerHTML = `<thead><tr><th><span class="sr-only">${M.th.variant}</span></th><th scope="col">${M.th.none}</th><th scope="col">${M.th.severe}</th><th scope="col">${M.th.all(pc(S.share))}</th></tr></thead><tbody>${row(M.rowLow, true)}${row(M.rowHigh, false)}</tbody>`;
  }

  return {
    set(p) {
      if (p.level !== undefined) { S.level = p.level; sl.level.set(Math.round(p.level * 100)); }
      if (p.ratio !== undefined) { S.ratio = p.ratio; sl.ratio.set(Math.round(p.ratio * 10)); setChip(chipFor()); }
      if (p.share !== undefined) { S.share = p.share; sl.share.set(Math.round(p.share * 100)); }
      S.dirty = true;
    },
    say: () => describeMao(S.level, S.ratio, S.share),
    meters: (): Meter[] => {
      const lo = maoRisk(true, S.level, S.ratio), hi = maoRisk(false, S.level, S.ratio);
      return [
        { label: L().mao.meters.low, value: pc(lo), frac: lo, color: 'var(--amy)' },
        { label: L().mao.meters.high, value: pc(hi), frac: hi, color: 'var(--pfc)' },
        { label: L().mao.meters.ratio, value: L().mao.times(num(lo / hi, 1)), frac: Math.min(1, (lo / hi - 1) / 4), color: 'var(--lesion)' },
      ];
    },
    draw(): boolean {
      if (!S.dirty) return false;
      S.dirty = false;
      drawChart();
      const lo = maoRisk(true, S.level, S.ratio), hi = maoRisk(false, S.level, S.ratio);
      drawGrid($('gridLow'), lo, 'var(--amy)', false); drawGrid($('gridHigh'), hi, 'var(--pfc)', true);
      $('capLow').textContent = L().mao.capLow(Math.round(lo * 100));
      $('capHigh').textContent = L().mao.capHigh(Math.round(hi * 100));
      drawTable();
      return true;
    },
  };
}
