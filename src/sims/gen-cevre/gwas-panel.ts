// Sekme 3: boy gibi poligenik bir özellik: çok sayıda küçük etkili varyant + çevre, ve bir GWAS'ın bulabildikleri.
import { svg, svgText } from '../kit';
import {
  BINS, GWAS_N, HEIGHT_MEAN, HEIGHT_SD, M_STEPS, N_PEOPLE, Z_RANGE, describeGwas, discovery, simulateGwas, type Discovery, type GwasSim,
} from './model';
import { int, num, percent } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { L as TXT } from './text';
import { bookBox, chipRow, makeSlider, pc, pc1, type Ctx, type Meter, type Panel, type SliderHandle } from '../ui';

const REF_M = M_STEPS.length - 1;

const TEMPLATE = () => {
  const G = TXT().gwas;
  return `
<p class="note">${G.intro}</p>
<div class="stage">
  <svg data-ref="hist" viewBox="0 0 360 220" role="img" aria-label="${G.histLabel}"></svg>
  <div class="legend" aria-label="${G.legendLabel}">
    <span><i style="background:var(--hyp);opacity:.6;border-radius:2px"></i>${G.legendHeight}</span>
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 8 H8 V2 H18 V8 H25" fill="none" stroke="var(--ink)" stroke-width="1.8"/></svg>${G.legendGenes}</span>
  </div>
</div>

<section aria-label="${G.inputsLabel}"><h3 class="sim-h">${TXT().common.inputs}</h3><div class="sliders" data-ref="sliders"></div>
  <div class="row" style="margin-top:12px"><button class="btn" type="button" data-ref="book">${G.btnBook}</button><button class="btn" type="button" data-ref="rerun">${G.btnRerun}</button></div>
</section>

<section class="card" aria-label="${G.cardLabel}">
  <h3 class="sim-h">${G.cardTitle}</h3>
  <p class="note">${G.cardNote}</p>
  <div class="chips" data-ref="sample" role="group" aria-label="${G.sampleLabel}"></div>
  <div class="readout3" data-ref="read"></div>
  <p class="note" data-ref="cmp"></p>
</section>

<details class="more"><summary>${t('sim.how')}</summary>
  <p>${G.how[0]}</p>
  <p>${G.how[1](int(N_PEOPLE))}</p>
  <p>${G.how[2]}</p>
  <p>${G.how[3]}</p>
</details>

${bookBox([
    { id: 'ch08-e10', text: G.book[0](t('repl.sağlam')) },
    { id: 'ch08-e11', text: G.book[1]() },
    { id: 'ch08-e12', text: G.book[2]() },
  ], G.bookExtra)}
<p class="foot">${G.foot(HEIGHT_MEAN, HEIGHT_SD)}</p>`;
};

export interface GwasPanel extends Panel {
  set(p: { mIdx?: number; env?: number; sample?: 'y2010' | 'y2022' }): void;
}

export function createGwasPanel(ctx: Ctx, host: HTMLElement): GwasPanel {
  host.innerHTML = TEMPLATE();
  const $ = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const S = { mIdx: 4, env: 0.2, sample: 'y2010' as 'y2010' | 'y2022', seed: 1, dirty: true, sim: null as unknown as GwasSim, disc: null as unknown as Discovery };
  const sl: Record<string, SliderHandle> = {};
  const M = () => M_STEPS[S.mIdx];

  const slH = $('sliders');
  const SL = TXT().gwas.sliders;
  sl.m = makeSlider(ctx, slH, 'm', SL.m.name, SL.m.hint, 0, REF_M, S.mIdx, (v) => { S.mIdx = v; S.dirty = true; }, (v) => int(M_STEPS[v]), 'var(--hyp)');
  sl.env = makeSlider(ctx, slH, 'env', SL.env.name, SL.env.hint, 0, 100, Math.round(S.env * 100), (v) => { S.env = v / 100; S.dirty = true; }, (v) => percent(String(v)), 'var(--gld)', 5);
  const setSample = chipRow($('sample'), ctx, [{ key: 'y2010', label: TXT().gwas.samples[0] }, { key: 'y2022', label: TXT().gwas.samples[1] }], (k) => { S.sample = k as 'y2010' | 'y2022'; S.dirty = true; setSample(k); });
  setSample(S.sample);
  ctx.scope.on($('rerun'), 'click', () => { S.seed++; S.dirty = true; });
  ctx.scope.on($('book'), 'click', () => api.set({ mIdx: REF_M, env: 0.2, sample: 'y2010' }));

  const hist = $<SVGElement>('hist');
  const L = 30, Rr = 14, T = 12, B = 44, W = 360, H = 220;
  function drawHist(): void {
    hist.innerHTML = '';
    const { pHist, gHist } = S.sim;
    const peak = Math.max(...pHist, ...gHist, 1);
    const bw = (W - L - Rr) / BINS, y = (c: number) => H - B - (c / peak) * (H - B - T);
    svg('line', { class: 'grid', x1: L, x2: W - Rr, y1: y(0), y2: y(0) }, hist);
    for (let b = 0; b < BINS; b++) {
      const h = (pHist[b] / peak) * (H - B - T);
      if (h > 0) svg('rect', { x: L + b * bw + 0.5, y: y(pHist[b]), width: bw - 1, height: h, fill: 'var(--hyp)', opacity: 0.6 }, hist);
    }
    // yalnızca genler: basamaklı kontur
    let d = '';
    for (let b = 0; b < BINS; b++) d += `${b === 0 ? 'M' : 'L'}${(L + b * bw).toFixed(1)},${y(gHist[b]).toFixed(1)} L${(L + (b + 1) * bw).toFixed(1)},${y(gHist[b]).toFixed(1)} `;
    svg('path', { d, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, hist);
    for (const z of [-3, -2, -1, 0, 1, 2, 3]) {
      const x = L + ((z + Z_RANGE) / (2 * Z_RANGE)) * (W - L - Rr);
      svg('line', { x1: x, x2: x, y1: y(0), y2: y(0) + 4, stroke: 'var(--muted)' }, hist);
      if (z % 1 === 0 && Math.abs(z) !== 2) svgText(hist, { x, y: y(0) + 16, 'text-anchor': 'middle' }, String(Math.round(HEIGHT_MEAN + z * HEIGHT_SD)));
    }
    svgText(hist, { x: (L + W - Rr) / 2, y: H - 6, 'text-anchor': 'middle', class: 'ax-t' }, TXT().gwas.axisX);
    svgText(hist, { x: 6, y: 10, 'text-anchor': 'start', class: 'ax-t' }, TXT().gwas.axisY(int(N_PEOPLE)));
  }

  function drawRead(): void {
    const d = S.disc, ref = S.sample === 'y2010', G = TXT().gwas, R = G.read;
    const cell = (k: string, v: string, hint: string) => `<div class="ro"><span class="k">${k}</span><span class="v">${v}</span><span class="k">${hint}</span></div>`;
    $('read').innerHTML =
      cell(R.found, int(d.count), ref ? R.foundBook10 : R.foundBook22) +
      cell(R.top, pc1(d.top), ref ? R.topBook10 : R.topCm(num(d.topCm, 1))) +
      cell(R.sum, pc1(d.sum), ref ? R.sumBook10 : R.sumBook22);
    $('cmp').textContent = M() === M_STEPS[REF_M] && Math.abs(S.env - 0.2) < 0.001
      ? (ref ? G.cmp.book10 : G.cmp.book22)
      : G.cmp.other;
  }

  function recompute(): void {
    S.sim = simulateGwas(M(), S.env, S.seed);
    S.disc = discovery(M(), 1 - S.env, GWAS_N[S.sample]);
  }

  const api: GwasPanel = {
    set(p) {
      if (p.mIdx !== undefined) { S.mIdx = p.mIdx; sl.m.set(p.mIdx); }
      if (p.env !== undefined) { S.env = p.env; sl.env.set(Math.round(p.env * 100)); }
      if (p.sample) { S.sample = p.sample; setSample(p.sample); }
      S.dirty = true;
    },
    say: () => describeGwas(M(), S.env, S.disc),
    meters: (): Meter[] => [
      { label: TXT().gwas.meters.genetic, value: pc(S.sim.varG / S.sim.varP), frac: S.sim.varG / S.sim.varP, color: 'var(--hyp)' },
      { label: TXT().gwas.meters.top, value: pc1(S.disc.top), frac: S.disc.top, color: 'var(--pit)' },
      { label: TXT().gwas.meters.sum, value: pc1(S.disc.sum), frac: S.disc.sum, color: 'var(--gld)' },
    ],
    draw(): boolean {
      if (!S.dirty) return false;
      S.dirty = false;
      recompute(); drawHist(); drawRead();
      return true;
    },
  };
  return api;
}
