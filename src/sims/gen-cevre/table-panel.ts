// Sekme 1: gen × çevre tablosu, reaksiyon normu grafiği ve sanal popülasyondan kalıtılabilirlik.
import { svg, svgText } from '../kit';
import {
  DEFAULT_PARAMS, MAX_ENV, PER_CELL, PRESETS, VARIANTS, decompose, describeTable, h2Curve, rankFlips, simulatePop, tableFromParams,
  type Decomp, type Pop, type Table, type TableParams,
} from './model';
import { percent } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { L } from './text';
import { bookBox, chipRow, makeSlider, pc, type Ctx, type Meter, type Panel, type SliderHandle } from '../ui';

const VAR_COL = ['var(--hyp)', 'var(--pit)', 'var(--eff)'];

/** Varyant işareti: A daire, B kare, C üçgen (renk tek başına anlam taşımasın). */
function marker(parent: Element, g: number, x: number, y: number, r: number, extra: Record<string, string | number> = {}): SVGElement {
  const a = { fill: VAR_COL[g], stroke: 'var(--panel)', 'stroke-width': 1.4, ...extra };
  if (g === 0) return svg('circle', { cx: x, cy: y, r, ...a }, parent);
  if (g === 1) return svg('rect', { x: x - r, y: y - r, width: 2 * r, height: 2 * r, rx: 1, ...a }, parent);
  return svg('polygon', { points: `${x},${y - r * 1.2} ${x + r * 1.15},${y + r * 0.85} ${x - r * 1.15},${y + r * 0.85}`, ...a }, parent);
}

const legendHTML = (): string => `<div class="legend" aria-label="${L().table.variantsLabel}">` + VARIANTS.map((v, g) => {
  const s = g === 0 ? '<circle cx="8" cy="5" r="4"/>' : g === 1 ? '<rect x="4" y="1" width="8" height="8" rx="1"/>' : '<polygon points="8,0 13,9 3,9"/>';
  return `<span><svg viewBox="0 0 16 10" fill="${VAR_COL[g]}" aria-hidden="true">${s}</svg>${L().table.variant(v)}</span>`;
}).join('') + '</div>';

const TEMPLATE = () => {
  const T = L().table;
  return `
<p class="note">${T.intro}</p>
<div class="chips" data-ref="presets" role="group" aria-label="${T.presetsLabel}"></div>
<p class="note preset-note" data-ref="presetNote"></p>

<div class="stage">
  <svg data-ref="rn" viewBox="0 0 360 236" role="img" aria-label="${T.rnLabel}"></svg>
  ${legendHTML()}
</div>

<section class="card" aria-label="${T.cardLabel}">
  <h3 class="sim-h">${T.cardTitle}</h3>
  <div class="tbl-wrap" data-ref="tbl"></div>
  <p class="note">${T.cardNote}</p>
</section>

<section class="card" aria-label="${T.varCardLabel}">
  <h3 class="sim-h">${T.varTitle}</h3>
  <div class="vbar" data-ref="vbar" role="img" aria-label="${T.vbarLabel}"></div>
  <div class="vleg" data-ref="vleg"></div>
  <h3 class="sim-h">${T.curveTitle}</h3>
  <p class="note">${T.curveNote}</p>
  <div class="chart"><svg data-ref="curve" viewBox="0 0 360 130" role="img" aria-label="${T.curveLabel}"></svg></div>
</section>

<section aria-label="${T.inputsLabel}"><h3 class="sim-h">${L().common.inputs}</h3>
  <div class="sliders" data-ref="sliders"></div>
  <div class="row" style="margin-top:12px"><button class="btn" type="button" data-ref="rerun">${T.rerun}</button></div>
</section>

<details class="more"><summary>${t('sim.how')}</summary>
  <p>${T.how[0](PER_CELL)}</p>
  <p>${T.how[1]}</p>
  <p>${T.how[2]}</p>
</details>

${bookBox([
    { id: 'ch08-e4', text: T.book[0](t('repl.sağlam')) },
    { id: 'ch08-e5', text: T.book[1](t('repl.karışık')) },
  ], T.bookExtra)}
<p class="foot">${T.foot}</p>
`;
};

export interface TablePanel extends Panel {
  /** Tur ve dış çağrılar: hazır örnek ya da parametre kümesi uygula. */
  setPreset(id: string): void;
  setParams(p: Partial<TableParams>): void;
}

export function createTablePanel(ctx: Ctx, host: HTMLElement): TablePanel {
  host.innerHTML = TEMPLATE();
  const $ = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;

  const S = {
    params: { ...DEFAULT_PARAMS } as TableParams,
    table: tableFromParams(DEFAULT_PARAMS) as Table,
    preset: null as string | null,
    seed: 1,
    pop: null as unknown as Pop,
    dec: null as unknown as Decomp,
    curve: [] as number[],
    flips: 0,
    dirty: true,
    structural: true,
  };
  const nEnv = () => S.table.cells[0].length;

  function recompute(): void {
    S.pop = simulatePop(S.table.cells, S.seed);
    S.dec = decompose(S.pop);
    S.curve = h2Curve(S.pop);
    S.flips = rankFlips(S.table.cells);
    S.dirty = true;
  }

  /* ---- Sliders ---- */
  const sl: Record<string, SliderHandle> = {};
  const slHost = $('sliders');
  const SL = L().table.sliders;
  const fromParams = () => { S.table = tableFromParams(S.params); S.preset = null; S.structural = true; setChip(null); recompute(); };
  sl.n = makeSlider(ctx, slHost, 'n', SL.n.name, SL.n.hint, 1, MAX_ENV, S.params.n, (v) => { S.params.n = v; fromParams(); }, SL.n.fmt, 'var(--gld)');
  sl.spread = makeSlider(ctx, slHost, 'spread', SL.spread.name, SL.spread.hint, 0, 100, Math.round(S.params.spread * 100), (v) => { S.params.spread = v / 100; fromParams(); }, (v) => percent(String(v)), 'var(--gld)');
  sl.gen = makeSlider(ctx, slHost, 'gen', SL.gen.name, SL.gen.hint, 0, 100, Math.round(S.params.gen * 100), (v) => { S.params.gen = v / 100; fromParams(); }, (v) => percent(String(v)), 'var(--pit)');
  sl.inter = makeSlider(ctx, slHost, 'inter', SL.inter.name, SL.inter.hint, 0, 100, Math.round(S.params.inter * 100), (v) => { S.params.inter = v / 100; fromParams(); }, (v) => percent(String(v)), 'var(--red)');
  ctx.scope.on($('rerun'), 'click', () => { S.seed++; recompute(); ctx.touch(); });

  /* ---- Hazır örnekler ---- */
  const setChip = chipRow($('presets'), ctx, PRESETS.map((p) => ({ key: p.id, label: p.name })), (k) => setPreset(k));
  function setPreset(id: string): void {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    if (p.params) { S.params = { ...p.params }; S.table = tableFromParams(S.params); }
    else { const t = p.table!; S.table = { ...t, cells: t.cells.map((r) => r.slice()), envNames: t.envNames.slice() }; S.params.n = t.cells[0].length; }
    S.preset = id; S.structural = true;
    sl.n.set(S.params.n); sl.spread.set(Math.round(S.params.spread * 100)); sl.gen.set(Math.round(S.params.gen * 100)); sl.inter.set(Math.round(S.params.inter * 100));
    setChip(id);
    $('presetNote').textContent = p.note;
    recompute();
  }
  function setParams(p: Partial<TableParams>): void {
    S.params = { ...S.params, ...p };
    sl.n.set(S.params.n); sl.spread.set(Math.round(S.params.spread * 100)); sl.gen.set(Math.round(S.params.gen * 100)); sl.inter.set(Math.round(S.params.inter * 100));
    $('presetNote').textContent = '';
    fromParams();
  }

  /* ---- Tablo ---- */
  const tbl = $('tbl');
  function buildTable(): void {
    const n = nEnv(), T = L().table;
    const head = S.table.envNames.map((nm) => `<th scope="col">${nm}</th>`).join('');
    const rows = VARIANTS.map((v, g) =>
      `<tr><th scope="row"><svg viewBox="0 0 16 12" width="16" height="12" fill="${VAR_COL[g]}" aria-hidden="true">${g === 0 ? '<circle cx="8" cy="6" r="4.5"/>' : g === 1 ? '<rect x="3.5" y="1.5" width="9" height="9" rx="1"/>' : '<polygon points="8,0.5 13.5,11 2.5,11"/>'}</svg> ${v}</th>` +
      Array.from({ length: n }, (_, e) => `<td><input type="number" inputmode="decimal" min="0" max="100" step="1" data-g="${g}" data-e="${e}" value="${Math.round(S.table.cells[g][e] * 10) / 10}" aria-label="${T.cellAria(v, S.table.envNames[e])}"></td>`).join('') + '</tr>').join('');
    const pe = Array.from({ length: n }, (_, e) => `<td class="pe" data-pe="${e}">–</td>`).join('');
    tbl.innerHTML = `<table class="gx"><thead><tr><th><span class="sr-only">${T.thVariant}</span></th>${head}</tr></thead><tbody>${rows}<tr class="h2row"><th scope="row">${T.h2Row}</th>${pe}</tr></tbody></table>`;
  }
  ctx.scope.on(tbl, 'input', (ev) => {
    const t = ev.target as HTMLInputElement;
    if (!t.dataset || t.dataset.g === undefined) return;
    const v = parseFloat(t.value);
    if (!Number.isFinite(v)) return;
    S.table.cells[+t.dataset.g][+t.dataset.e!] = Math.min(100, Math.max(0, v));
    S.preset = null; setChip(null); $('presetNote').textContent = L().table.edited;
    recompute();
  });

  /* ---- Reaksiyon normu ---- */
  const rn = $<SVGElement>('rn');
  const R = { l: 38, r: 28, t: 26, b: 50, W: 360, H: 236 };
  const xAt = (e: number, n: number) => (n === 1 ? (R.l + R.W - R.r) / 2 : R.l + (e / (n - 1)) * (R.W - R.r - R.l - 8) + 4);
  const yAt = (v: number) => R.H - R.b - (v / 100) * (R.H - R.b - R.t);
  function drawRN(): void {
    rn.innerHTML = '';
    const n = nEnv(), c = S.table.cells;
    for (const v of [0, 25, 50, 75, 100]) {
      svg('line', { class: 'grid', x1: R.l, x2: R.W - R.r + 6, y1: yAt(v), y2: yAt(v) }, rn);
      svgText(rn, { x: R.l - 6, y: yAt(v) + 3.5, 'text-anchor': 'end' }, String(v));
    }
    S.table.envNames.forEach((nm, e) => {
      const x = xAt(e, n);
      svg('line', { x1: x, x2: x, y1: yAt(0), y2: yAt(0) + 4, stroke: 'var(--muted)' }, rn);
      svgText(rn, { x, y: yAt(0) + 16, 'text-anchor': 'middle' }, nm.length > 11 ? nm.slice(0, 10) + '…' : nm);
    });
    svgText(rn, { x: (R.l + R.W - R.r) / 2, y: R.H - 6, 'text-anchor': 'middle', class: 'ax-t' }, S.table.axis);
    svgText(rn, { x: 6, y: 10, 'text-anchor': 'start', class: 'ax-t' }, S.table.yLabel.length > 44 ? S.table.yLabel.slice(0, 43) + '…' : S.table.yLabel);
    // bireyler: her hücreden ilk 12 (soluk noktalar)
    const per = S.pop.perCell;
    for (let g = 0; g < VARIANTS.length; g++) for (let e = 0; e < n; e++) {
      const base = (g * n + e) * per;
      for (let k = 0; k < 12; k++) {
        const y = Math.min(100, Math.max(0, S.pop.y[base + k]));
        svg('circle', { cx: xAt(e, n) + (g - 1) * 7 + ((k % 4) - 1.5) * 1.6, cy: yAt(y), r: 1.5, fill: VAR_COL[g], opacity: 0.32 }, rn);
      }
    }
    for (let g = 0; g < VARIANTS.length; g++) {
      if (n > 1) svg('polyline', { class: 'ln', stroke: VAR_COL[g], points: c[g].map((v, e) => `${xAt(e, n).toFixed(1)},${yAt(v).toFixed(1)}`).join(' '), ...(g === 1 ? { 'stroke-dasharray': '6 3' } : {}) }, rn);
    }
    for (let g = 0; g < VARIANTS.length; g++) for (let e = 0; e < n; e++) marker(rn, g, xAt(e, n), yAt(c[g][e]), 4.2);
    // uç etiketleri (çakışmayı it)
    const ys = VARIANTS.map((_, g) => yAt(c[g][n - 1]));
    const order = [0, 1, 2].sort((a, b) => ys[a] - ys[b]);
    let prev = -99;
    for (const g of order) { const y = Math.max(ys[g], prev + 12); prev = y; svgText(rn, { x: xAt(n - 1, n) + 11, y: y + 3.5, class: 'v-lbl', fill: 'var(--ink)' }, VARIANTS[g]); }
  }

  /* ---- Varyans payları + eğri ---- */
  const SEG_COL = { h2: 'var(--pit)', env: 'var(--gld)', gxe: 'var(--red)', res: 'var(--lesion)' } as const;
  function drawVar(): void {
    const d = S.dec, names = L().table.seg;
    const SEG = (['h2', 'env', 'gxe', 'res'] as const).map((k) => [k, names[k], SEG_COL[k]] as const);
    $('vbar').innerHTML = SEG.map(([k, nm, col]) => `<i style="width:${(d[k] * 100).toFixed(1)}%;background:${col}" title="${nm}"></i>`).join('');
    $('vleg').innerHTML = SEG.map(([k, nm, col]) => `<span><i style="background:${col}"></i>${nm} <b>${pc(d[k])}</b></span>`).join('');
  }
  function drawCurve(): void {
    const sv = $<SVGElement>('curve');
    sv.innerHTML = '';
    const x0 = 38, x1 = 340, top = 16, bot = 96, n = S.curve.length;
    const y = (v: number) => bot - v * (bot - top);
    const x = (i: number) => (n === 1 ? (x0 + x1) / 2 : x0 + (i / (n - 1)) * (x1 - x0));
    for (const v of [0, 0.5, 1]) { svg('line', { class: 'grid', x1: x0, x2: x1, y1: y(v), y2: y(v) }, sv); svgText(sv, { x: x0 - 6, y: y(v) + 3.5, 'text-anchor': 'end' }, pc(v)); }
    svg('polyline', { class: 'ln', stroke: 'var(--pit)', points: S.curve.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ') }, sv);
    S.curve.forEach((v, i) => {
      svg('circle', { cx: x(i), cy: y(v), r: 4, fill: 'var(--pit)', stroke: 'var(--panel)', 'stroke-width': 1.4 }, sv);
      svgText(sv, { x: x(i), y: y(v) - 8, 'text-anchor': 'middle', style: 'fill:var(--ink)' }, pc(v));
      svgText(sv, { x: x(i), y: bot + 14, 'text-anchor': 'middle' }, String(i + 1));
    });
    svgText(sv, { x: (x0 + x1) / 2, y: 124, 'text-anchor': 'middle', class: 'ax-t' }, L().table.curveAxis);
    sv.setAttribute('viewBox', '0 0 360 130');
  }
  function drawPerEnv(): void {
    tbl.querySelectorAll<HTMLElement>('.pe').forEach((c) => { c.textContent = pc(S.dec.perEnv[+c.dataset.pe!]); });
  }
  // Tablo hücreleri: sliders/örnek değişince değerleri yenile (yazarken odağı bozma)
  function syncCells(): void {
    tbl.querySelectorAll<HTMLInputElement>('input[data-g]').forEach((i) => { if (document.activeElement !== i) i.value = String(Math.round(S.table.cells[+i.dataset.g!][+i.dataset.e!] * 10) / 10); });
  }

  setPreset('none');
  buildTable();
  S.structural = false;

  return {
    setPreset: (id) => setPreset(id),
    setParams,
    say: () => describeTable(S.dec, S.curve, S.flips, nEnv()),
    meters: (): Meter[] => [
      { label: L().table.meters.h2, value: pc(S.dec.h2), frac: S.dec.h2, color: 'var(--pit)' },
      { label: L().table.meters.env, value: pc(S.dec.env), frac: S.dec.env, color: 'var(--gld)' },
      { label: L().table.meters.gxe, value: pc(S.dec.gxe), frac: S.dec.gxe, color: 'var(--red)' },
    ],
    draw(): boolean {
      if (!S.dirty) return false;
      S.dirty = false;
      if (S.structural) { buildTable(); S.structural = false; } else syncCells();
      drawRN(); drawVar(); drawCurve(); drawPerEnv();
      return true;
    },
  };
}
