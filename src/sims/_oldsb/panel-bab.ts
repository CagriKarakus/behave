// Savaş ve barış, "Babunlar" sekmesi: ayrı (tembel yüklenen) parça; sekme seçilince yüklenir.
import { t } from '../../i18n/t';
import { num } from '../../i18n/fmt';
import { svg, svgText } from '../kit';
import { createTour } from '../tour';
import { BABOON_DEFAULT, BB, approachDays, describeBaboons, simulateBaboons, type BabParams, type BabRun } from './model';
import { L } from './text';
import { LG, cls, key, pc, pctFmt, sv, type Env, type PanelApi } from './env';

export const BAB_HTML = (): string => {
  const b = L().bb;
  return `
    <div data-ref="tour3"></div>
    <section class="card" aria-label="${b.cardAria}">
      <h3 class="sim-h">${b.h}</h3>
      <div class="chips" role="group" aria-label="${b.scenarioAria}" data-ref="bbChips"></div>
      <div class="stage">
        <svg viewBox="0 0 360 212" role="img" aria-label="${b.stageAria}" data-ref="bbStage"></svg>
        ${key([sv(14, 12, '<circle cx="7" cy="6" r="5" fill="var(--dop)" fill-opacity=".7" stroke="var(--ink)"/>'), b.lgFemale], [sv(14, 12, '<rect x="2" y="1" width="10" height="10" fill="var(--amy)" fill-opacity=".7" stroke="var(--ink)"/>'), b.lgMale], [sv(14, 12, '<rect x="2" y="1" width="10" height="10" fill="var(--amy)" fill-opacity=".7" stroke="var(--ink)" stroke-width="2.4" stroke-dasharray="3 2"/>'), b.lgDump], [sv(14, 12, '<path d="M7 1L13 6L7 11L1 6z" fill="var(--amy)" fill-opacity=".7" stroke="var(--pfc)" stroke-width="2"/>'), b.lgNew], [sv(14, 12, '<circle cx="7" cy="6" r="3" fill="var(--pfc)"/>'), b.lgNear])}
      </div>
      <div data-ref="tp3"></div>
      <div class="chart"><svg viewBox="0 0 360 184" role="img" aria-label="${b.chartAria}" data-ref="bbChart"></svg>
        ${key([LG.line('var(--amy)'), b.lgMaleAgg], [LG.line('var(--dop)', ' stroke-dasharray="5 3"'), b.lgStress], [LG.line('var(--pfc)'), b.lgNewcomers])}
      </div>
      <div class="readout" data-ref="bbRead"></div>
      <div class="sliders" data-ref="bbSl"></div>
    </section>

    <details class="how">
      <summary>${t('sim.how')}</summary>
      <div class="how-in">
        <p>${b.how.p1}</p>
        <p>${b.how.p2}</p>
      </div>
    </details>

    <aside class="book" aria-label="${t('sim.book')}">
      <h3 class="sim-h">${t('sim.book')}</h3>
      <ul>
        <li>${b.book}</li>
      </ul>
    </aside>
`;
};

export function createBabPanel(env: Env, host: HTMLElement): PanelApi {
  const { scope, id, $, S, need, touch, setBar, makeSlider, toggles, makeTransport, tiles, yGrid, poly, clipRect } = env;
  host.innerHTML = BAB_HTML();

  const bs = $<SVGElement>('bbStage');
  svgText(bs, { class: 'tl', x: 4, y: 12 }, L().bb.females);
  svgText(bs, { class: 'tl', x: 4, y: 98 }, L().bb.males);
  svgText(bs, { class: 'tl', x: 4, y: 178 }, L().bb.newcomers);
  const rpos = (i: number, sex: 'F' | 'M'): [number, number] => { const j = sex === 'F' ? i : i - BB.females; return [30 + (j % 8) * 43, (sex === 'F' ? 28 : 108) + Math.floor(j / 8) * 26]; };
  let runB: BabRun;
  interface BEl { g: SVGElement; shape: SVGElement; x: SVGElement }
  let resEls: BEl[] = [], newEls: { g: SVGElement; shape: SVGElement; badge: SVGElement }[] = [];
  const bbLayer = svg('g', {}, bs);
  function buildBabStage(): void {
    bbLayer.replaceChildren();
    resEls = runB.residents.map((r, i) => {
      const [x, y] = rpos(i, r.sex), g = svg('g', {}, bbLayer);
      const shape = r.sex === 'F' ? svg('circle', { class: 'b-f', cx: x, cy: y, r: 8 }, g)
        : svg('rect', { class: r.kind === 'dump' ? 'b-m b-dump' : 'b-m', x: x - 7.5, y: y - 7.5, width: 15, height: 15 }, g);
      const xx = svg('path', { class: 'b-x hide', d: `M${x - 5},${y - 5}L${x + 5},${y + 5}M${x + 5},${y - 5}L${x - 5},${y + 5}` }, g);
      return { g, shape, x: xx };
    });
    const n = runB.newcomers.length, step = Math.min(34, 300 / Math.max(1, n)), r = n > 14 ? 5 : 8;
    newEls = runB.newcomers.map((_, i) => {
      const x = 30 + i * step, y = 196, g = svg('g', { class: 'hide' }, bbLayer);
      const shape = svg('path', { class: 'b-n', d: `M${x},${y - r}L${x + r},${y}L${x},${y + r}L${x - r},${y}z` }, g);
      const badge = svg('circle', { class: 'b-badge hide', cx: x + r, cy: y - r, r: 3 }, g);
      return { g, shape, badge };
    });
  }
  const BC = { x0: 34, x1: 346, top: 12, bot: 136 };
  const bch = $<SVGElement>('bbChart');
  const bx = (d: number): number => BC.x0 + ((BC.x1 - BC.x0) * d) / (BB.days - 1), by = (v: number): number => BC.bot - (BC.bot - BC.top) * v;
  yGrid(bch, BC.x0, BC.x1, by, [0, 0.5, 1], pc);
  for (let m = 0; m <= 18; m += 3) svgText(bch, { class: 'ax', x: bx(m * 30), y: BC.bot + 14, 'text-anchor': m === 0 ? 'start' : 'middle' }, String(m));
  svgText(bch, { class: 'ax', x: (BC.x0 + BC.x1) / 2, y: BC.bot + 30, 'text-anchor': 'middle' }, L().bb.axMonth);
  svg('line', { class: 'offline', x1: bx(BB.outbreak), x2: bx(BB.outbreak), y1: BC.top, y2: BC.bot }, bch);
  svgText(bch, { class: 'ax', x: bx(BB.outbreak) + 4, y: BC.top + 9 }, L().bb.outbreak);
  const bClip = clipRect(bch, `${id}-clipB`, 184);
  const bG = svg('g', { 'clip-path': `url(#${id}-clipB)` }, bch);
  const bLM = svg('polyline', { class: 'ln b-male' }, bG), bLS = svg('polyline', { class: 'ln b-str' }, bG), bLN = svg('polyline', { class: 'ln b-new' }, bG);
  const bTicks = svg('path', { class: 'b-tick' }, bch);
  const bCur = svg('line', { class: 'cursor', y1: BC.top, y2: BC.bot }, bch);
  function drawBab(d: number): void {
    const stress = runB.stress[d];
    resEls.forEach((e, i) => {
      const r = runB.residents[i], dead = r.diesDay !== null && d >= r.diesDay;
      e.shape.setAttribute('fill-opacity', dead ? '0' : (0.15 + 0.8 * (r.sex === 'F' ? stress : r.agg)).toFixed(2));
      e.shape.setAttribute('class', `${r.sex === 'F' ? 'b-f' : r.kind === 'dump' ? 'b-m b-dump' : 'b-m'}${dead ? ' dead' : ''}`);
      cls(e.x, 'b-x', dead);
    });
    runB.newcomers.forEach((nc, i) => {
      const e = newEls[i], here = d >= nc.arrive;
      cls(e.g, '', here);
      if (here) { e.shape.setAttribute('fill-opacity', (0.15 + 0.8 * nc.a[d]).toFixed(2)); cls(e.badge, 'b-badge', nc.contact !== null && d >= nc.contact); }
    });
    bClip.setAttribute('width', bx(d + 1).toFixed(1));
    bCur.setAttribute('x1', bx(d).toFixed(1)); bCur.setAttribute('x2', bx(d).toFixed(1));
    bs.setAttribute('aria-label', describeBaboons(runB, d));
  }
  function buildBabChart(): void {
    bLM.setAttribute('points', poly(runB.maleAgg.map((v, d) => [bx(d), by(v)])));
    bLS.setAttribute('points', poly(runB.stress.map((v, d) => [bx(d), by(v)])));
    bLN.setAttribute('points', poly(runB.newAgg.flatMap((v, d) => (Number.isNaN(v) ? [] : [[bx(d), by(v)] as [number, number]]))));
    bTicks.setAttribute('d', runB.newcomers.map((n) => `M${bx(n.arrive).toFixed(1)},${BC.bot}v-7`).join(''));
  }
  const tB = makeTransport($('tp3'), { max: BB.days, speed: 30, unit: 'day', seed: () => { S.bseed++; need.b = true; } });
  const bbSl = $('bbSl');
  const setB = (patch: Partial<BabParams>) => {
    S.b = { ...S.b, ...patch };
    if (patch.kill !== undefined) hKi.set(Math.round(patch.kill * 100));
    if (patch.gap !== undefined) hGa.set(patch.gap);
    if (patch.months !== undefined) hMo.set(patch.months);
    need.b = true; touch();
  };
  const hKi = makeSlider(bbSl, { name: L().bb.kill.name, hint: L().bb.kill.hint, min: 0, max: 100, step: 5, val: 100, fmt: pctFmt, cb: (v) => setB({ kill: v / 100 }), color: 'var(--amy)' });
  const hGa = makeSlider(bbSl, { name: L().bb.gap.name, hint: L().bb.gap.hint, min: 10, max: 180, step: 5, val: S.b.gap, fmt: (v) => L().days(v), cb: (v) => setB({ gap: v }), color: 'var(--pfc)' });
  const hMo = makeSlider(bbSl, { name: L().bb.adapt.name, hint: L().bb.adapt.hint, min: 3, max: 12, step: 1, val: S.b.months, fmt: (v) => L().months(v), cb: (v) => setB({ months: v }), color: 'var(--pfc)' });
  const syncBb = toggles($('bbChips'), [{ k: 'no', name: L().bb.chipNo }, { k: 'yes', name: L().bb.chipYes }], () => (S.b.kill === 0 ? 'no' : S.b.kill === 1 ? 'yes' : null), (k) => setB({ kill: k === 'yes' ? 1 : 0 }));
  function readBab(d: number): void {
    const f = runB.females[d], m = runB.resMales[d];
    const typical = approachDays(runB.stress[0]);
    $('bbRead').innerHTML = tiles([
      [L().bb.tRatio, `${m ? num(f / m, 1) : '-'}:1`], [L().bb.tApproach, String(Math.round(approachDays(runB.stress[d])))],
      [L().bb.tBefore, String(Math.round(typical))], [L().bb.tNewAgg, Number.isNaN(runB.newAgg[d]) ? '-' : pc(runB.newAgg[d])],
    ]);
  }
  function barBab(): void {
    const d = tB.idx();
    setBar(describeBaboons(runB, d), [
      { label: L().bb.meterMale, text: pc(runB.maleAgg[d]), frac: runB.maleAgg[d], color: 'var(--amy)' },
      { label: L().bb.meterStress, text: pc(runB.stress[d]), frac: runB.stress[d], color: 'var(--dop)' },
      { label: L().bb.meterApproach, text: L().days(Math.round(approachDays(runB.stress[d]))), frac: approachDays(runB.stress[d]) / 120, color: 'var(--pfc)' },
    ]);
  }
  function renderBab(): void {
    if (need.b) { runB = simulateBaboons(S.b, S.bseed); buildBabStage(); buildBabChart(); need.b = false; }
    const d = tB.idx();
    drawBab(d); readBab(d); syncBb(); tB.sync(); barBab();
  }

  const seekB = (d: number, play = false) => tB.set(d, play);
  const apply3: (() => void)[] = [
    () => { setB({ ...BABOON_DEFAULT }); S.bseed = 4; seekB(80); },
    () => { setB({ ...BABOON_DEFAULT }); S.bseed = 4; seekB(135); },
    () => { setB({ ...BABOON_DEFAULT }); S.bseed = 4; seekB(175); },
    () => { setB({ ...BABOON_DEFAULT }); S.bseed = 4; seekB(400); },
    () => { setB({ ...BABOON_DEFAULT, kill: 0 }); S.bseed = 4; seekB(BB.days - 1); },
    () => { setB({ ...BABOON_DEFAULT, gap: 10 }); S.bseed = 4; seekB(BB.days - 1); },
  ];
  const tour3 = createTour(scope, L().tour3.map((st, i) => ({ ...st, apply: apply3[i] })));
  $('tour3').appendChild(tour3.el);
  return { render: renderBab, tp: tB };
}
