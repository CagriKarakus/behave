// Sekme 1: Toplama ve eşik. Dendritlere dokunarak girdi ekle; aksonun başlangıcında toplanır; eşik -> tam ya da hiç.
import { percent } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { svg, svgText } from '../kit';
import {
  AHP, AMP0, DEND, PEAK, REFR, REST, THR, advance, createNeuron, fiCurve, pspMv, queue, recentRate, vOf, clamp, f1,
  type Drive, type Neuron,
} from './model';
import { L } from './text';
import { chipRow, gridY, linePath, makeSlider, type Ctx, type Meter, type SliderHandle } from './ui';

const SPEED = 30;   // model zamanı: gerçek 1 sn = 30 ms (yavaş çekim)
const WIN = 120;    // grafikte görünen model süresi (ms)
const TIPS: Array<[number, number]> = [[156, 118], [146, 52], [146, 168], [50, 100], [50, 30], [50, 190]];
const SOMA: [number, number] = [214, 110];
const AX0 = 262, AX1 = 350;
const T = { x0: 34, x1: 352, top: 10, h: 130, vmax: 50, vmin: -90, tick0: 156, tick1: 178 };
const yv = (v: number): number => T.top + (T.vmax - clamp(v, T.vmin, T.vmax)) / (T.vmax - T.vmin) * T.h;
const fmv = (v: number): string => f1(v);
const dName = (d: number): string => L().sum.dendriteAria(d + 1, DEND[d] >= 0.9, fmv(pspMv(d)));

export interface SumSet { exc?: number; inh?: number; thr?: number; gap?: number; kind?: 1 | -1 }

export function createSumPanel(ctx: Ctx, host: HTMLElement) {
  const X = L().sum;
  const S = { kind: 1 as 1 | -1, exc: 0, inh: 0, thr: THR, gap: 2, paused: false };
  let seed = 1;
  let n: Neuron = createNeuron(seed);
  let fi: number[] = [];
  let fiDirty = true, dirty = true, last = -1;
  let seen = 0, flash = -1e9;
  const pulse: number[] = TIPS.map(() => -1e9);
  const pulseK: Array<1 | -1> = TIPS.map(() => 1);
  const drive = (): Drive => ({ thr: S.thr, exc: S.exc, inh: S.inh });

  /* ---------- Yerleşim ---------- */
  let cell = '';
  TIPS.forEach(([x, y], i) => {
    const ey = SOMA[1] + (y - SOMA[1]) * 0.25;
    cell += `<path class="dn" d="M${x} ${y}C${x + 50} ${y} 160 ${ey} 192 ${ey}" style="stroke-width:${(1.5 + 2.5 * DEND[i]).toFixed(1)}px"/>`;
  });
  cell += `<path class="ax" d="M${SOMA[0] + 22} 98L${AX0} 106V114L${SOMA[0] + 22} 122Z"/><path class="ax" d="M${AX0} 110H${AX1}" style="stroke-width:4px"/>` +
    `<rect class="my" x="276" y="102" width="24" height="16" rx="8"/><rect class="my" x="312" y="102" width="24" height="16" rx="8"/>` +
    `<circle class="soma" cx="${SOMA[0]}" cy="${SOMA[1]}" r="24"/><circle data-r="glow" cx="${SOMA[0]}" cy="${SOMA[1]}" r="24" fill="var(--dop)" opacity="0"/>` +
    `<text class="sv" data-r="sv" x="${SOMA[0]}" y="${SOMA[1] + 4}" text-anchor="middle">-70 mV</text>` +
    `<circle class="hill" cx="248" cy="110" r="7"/><text class="lb" x="244" y="142">${X.hillock}</text>` +
    `<text class="lb" x="318" y="96" text-anchor="middle">${X.axon}</text><text class="lb" x="${SOMA[0]}" y="76" text-anchor="middle">${X.soma}</text>` +
    `<text class="lb" x="84" y="222">${X.dendrites}</text>` +
    `<circle data-r="dot" cx="${AX0}" cy="110" r="6" fill="var(--ink)" opacity="0"/>`;
  TIPS.forEach(([x, y], i) => {
    cell += `<g class="tip" tabindex="0" role="button" data-d="${i}" aria-label="${dName(i)}"><circle class="hit" cx="${x}" cy="${y}" r="21"/>` +
      `<circle data-r="p${i}" class="pulse" cx="${x}" cy="${y}" r="10" opacity="0"/><circle class="dot" cx="${x}" cy="${y}" r="10"/>` +
      `<text class="sg" data-r="g${i}" x="${x}" y="${y + 4.5}" text-anchor="middle">+</text><text class="mv" x="${x}" y="${y + 27}" text-anchor="middle">${fmv(pspMv(i))}</text></g>`;
  });

  host.innerHTML =
    `<p class="note">${X.note}</p>` +
    `<div class="stage"><svg viewBox="0 0 360 226" role="group" aria-label="${X.cellAria}" data-ref="cell">${cell}</svg>` +
    `<div class="legend"><span><i style="background:var(--dop)"></i>${X.legExc}</span><span><i style="background:var(--pfc)"></i>${X.legInh}</span><span>${X.legMv}</span></div></div>` +
    `<div class="chips" data-ref="kind"></div>` +
    `<div class="row"><button type="button" class="btn" data-ref="all">${X.btnAll}</button><button type="button" class="btn" data-ref="train">${X.btnTrain}</button>` +
    `<button type="button" class="btn" data-ref="pause" aria-pressed="false">${X.pause}</button><button type="button" class="btn" data-ref="reset">${X.reset}</button></div>` +
    `<div class="chart"><h4 class="sim-h">${X.traceTitle(WIN)}</h4><svg viewBox="0 0 360 200" role="img" aria-label="${X.traceAria}" data-ref="trace"></svg>` +
    `<div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5H25" stroke="var(--ink)" stroke-width="2"/></svg>${X.legVm}</span>` +
    `<span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5H25" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="2 3"/></svg>${X.legAnalog}</span>` +
    `<span><i style="background:var(--lesion);opacity:.5;border-radius:2px"></i>${X.legRefr}</span></div></div>` +
    `<div class="card"><h3 class="sim-h">${L().inputs}</h3><div class="sliders" data-ref="sl"></div></div>` +
    `<div class="chart"><h4 class="sim-h">${X.fiTitle}</h4><svg viewBox="0 0 360 150" role="img" aria-label="${X.fiAria}" data-ref="fi"></svg></div>` +
    `<details class="more"><summary>${t('sim.how')}</summary>` +
    `<p>${X.howA}</p>` +
    `<p>${X.howB(THR, PEAK, REFR, AMP0)}</p></details>`;

  const q = <T2 extends Element = HTMLElement>(r: string) => host.querySelector<T2>(`[data-ref="${r}"]`)!;
  const r = <T2 extends SVGElement = SVGElement>(k: string) => host.querySelector<T2>(`[data-r="${k}"]`)!;

  /* ---------- Girdiler ---------- */
  const setKind = chipRow(q('kind'), ctx, [{ key: '1', label: X.kindExc }, { key: '-1', label: X.kindInh }], (k) => {
    S.kind = k === '1' ? 1 : -1; dirty = true; refreshKind();
  }, X.kindLabel);
  function refreshKind(): void {
    setKind(String(S.kind));
    TIPS.forEach((_, i) => {
      r(`g${i}`).textContent = S.kind === 1 ? '+' : '−';
      host.querySelector(`.tip[data-d="${i}"]`)!.setAttribute('data-k', String(S.kind));
    });
  }
  function add(d: number, kind: 1 | -1 = S.kind, delay = 0): void {
    queue(n, d, kind, delay);
    if (delay === 0) { pulse[d] = performance.now(); pulseK[d] = kind; }
    S.paused = false; dirty = true;
  }
  host.querySelectorAll<SVGGElement>('.tip').forEach((g) => {
    const d = +g.dataset.d!;
    const go = () => { add(d); ctx.touch(); };
    ctx.scope.on(g as unknown as HTMLElement, 'click', go);
    ctx.scope.on(g as unknown as HTMLElement, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
  const volley = (ds: number[], kind: 1 | -1, delay: number): void => { for (const d of ds) queue(n, d, kind, delay); };
  const train = (d: number, count: number, gap: number, delay: number): void => { for (let i = 0; i < count; i++) queue(n, d, 1, delay + i * gap); };
  ctx.scope.on(q('all'), 'click', () => { volley([0, 1, 2, 3, 4, 5], 1, 0); S.paused = false; dirty = true; ctx.touch(); });
  ctx.scope.on(q('train'), 'click', () => { train(0, 8, S.gap, 0); S.paused = false; dirty = true; ctx.touch(); });
  const pauseB = q('pause');
  const setPause = (p: boolean) => { S.paused = p; pauseB.setAttribute('aria-pressed', String(p)); pauseB.textContent = p ? X.resume : X.pause; dirty = true; };
  ctx.scope.on(pauseB, 'click', () => { setPause(!S.paused); ctx.touch(); });
  ctx.scope.on(q('reset'), 'click', () => { reset(); ctx.touch(); });

  const sl = q('sl');
  const hs: Record<string, SliderHandle> = {};
  hs.exc = makeSlider(ctx, sl, 'exc', X.slExc.name, X.slExc.hint, 0, 100, 0, (v) => { S.exc = v / 100; fiDirty = dirty = true; }, (v) => percent(String(v)), 'var(--dop)');
  hs.inh = makeSlider(ctx, sl, 'inh', X.slInh.name, X.slInh.hint, 0, 100, 0, (v) => { S.inh = v / 100; fiDirty = dirty = true; }, (v) => percent(String(v)), 'var(--pfc)');
  hs.thr = makeSlider(ctx, sl, 'thr', X.slThr.name, X.slThr.hint, -60, -48, THR, (v) => { S.thr = v; fiDirty = dirty = true; }, (v) => `${v} mV`, 'var(--ink)');
  hs.gap = makeSlider(ctx, sl, 'gap', X.slGap.name, X.slGap.hint, 1, 12, 2, (v) => { S.gap = v; dirty = true; }, (v) => `${v} ms`, 'var(--ink)');

  /* ---------- Grafik iskeletleri ---------- */
  const tr = q<SVGSVGElement>('trace');
  const refrP = svg('path', { class: 'refr', d: '' }, tr);
  for (const v of [40, 0]) gridY(tr, T.x0, T.x1, yv(v), String(v));
  const restY = yv(REST);
  gridY(tr, T.x0, T.x1, restY, '-70');
  const thrL = svg('line', { class: 'thr', x1: T.x0, x2: T.x1 }, tr);
  const thrT = svgText(tr, { x: T.x1 - 2, y: 0, 'text-anchor': 'end', class: 'lb' }, X.thrLabel);
  const thrV = svgText(tr, { x: T.x0 - 4, y: 0, 'text-anchor': 'end' }, '');
  svgText(tr, { x: T.x1 - 2, y: restY + 12, 'text-anchor': 'end', class: 'lb' }, X.restLabel);
  svgText(tr, { x: 3, y: 8 }, 'mV');
  const shP = svg('path', { class: 'sh', d: '' }, tr);
  const vP = svg('path', { class: 'vl', d: '' }, tr);
  svgText(tr, { x: T.x0, y: T.tick0 - 4, class: 'lb' }, X.sameSize);
  const tickP = svg('path', { class: 'tk', d: '' }, tr);
  [[0, `-${WIN} ms`], [WIN / 3, '-80'], [2 * WIN / 3, '-40'], [WIN, X.now]].forEach(([k, t], i) => {
    svgText(tr, { x: T.x0 + (T.x1 - T.x0) * (k as number) / WIN, y: 194, 'text-anchor': i === 0 ? 'start' : i === 3 ? 'end' : 'middle' }, String(t));
  });
  const xt = (t: number): number => T.x1 - (n.t - t) / WIN * (T.x1 - T.x0);

  const fg = q<SVGSVGElement>('fi');
  const F = { x0: 34, x1: 346, top: 12, h: 100, ymax: 100 };
  const fx = (p: number): number => F.x0 + p * (F.x1 - F.x0);
  const fy = (hz: number): number => F.top + (1 - clamp(hz / F.ymax)) * F.h;
  for (const hz of [0, 50, 100]) gridY(fg, F.x0, F.x1, fy(hz), String(hz));
  svgText(fg, { x: 3, y: 8 }, 'Hz');
  [0, 0.5, 1].forEach((p) => svgText(fg, { x: fx(p), y: 128, 'text-anchor': p === 0 ? 'start' : p === 1 ? 'end' : 'middle' }, percent(String(p * 100))));
  svgText(fg, { x: F.x1, y: 144, 'text-anchor': 'end' }, X.fiX);
  const fiP = svg('path', { class: 'fil', d: '' }, fg);
  const fiM = svg('line', { class: 'fim', y1: F.top, y2: F.top + F.h }, fg);
  const fiD = svg('circle', { class: 'fid', r: 5 }, fg);
  const fiT = svgText(fg, { class: 'lb', y: F.top + 10 }, '');

  /* ---------- Çizim ---------- */
  let lastSv = '';
  function paint(now: number): void {
    const v = vOf(n);
    const sv = `${Math.round(v)} mV`;
    if (sv !== lastSv) { lastSv = sv; r('sv').textContent = sv.replace('-', '−'); }
    r('glow').setAttribute('opacity', String(clamp((v - REST) / (PEAK - REST)) * 0.5));
    if (n.spikes.length !== seen) { if (n.spikes.length > seen) flash = now; seen = n.spikes.length; }
    const fa = (now - flash) / 650;
    const dot = r('dot');
    dot.setAttribute('opacity', fa >= 0 && fa < 1 ? '1' : '0');
    dot.setAttribute('cx', String(AX0 + (AX1 - AX0) * clamp(fa)));
    TIPS.forEach((_, i) => {
      const a = (now - pulse[i]) / 500, p = r(`p${i}`);
      if (a >= 0 && a < 1) { p.setAttribute('r', String(10 + 14 * a)); p.setAttribute('opacity', String(0.8 * (1 - a))); p.setAttribute('stroke', pulseK[i] === 1 ? 'var(--dop)' : 'var(--pfc)'); }
      else p.setAttribute('opacity', '0');
    });
    // zar gerilimi
    const lo = n.t - WIN;
    const vs: Array<[number, number]> = [], ss: Array<[number, number]> = [];
    for (const [t, vv, s] of n.tr) if (t >= lo) { vs.push([xt(t), yv(vv)]); ss.push([xt(t), yv(s)]); }
    vP.setAttribute('d', linePath(vs)); shP.setAttribute('d', linePath(ss));
    const ty = yv(S.thr);
    thrL.setAttribute('y1', String(ty)); thrL.setAttribute('y2', String(ty));
    thrT.setAttribute('y', String(ty - 4)); thrV.setAttribute('y', String(ty + 3.5)); thrV.textContent = String(S.thr);
    let rd = '', tk = '';
    for (const s of n.spikes) {
      if (s < lo - REFR) continue;
      const x0 = Math.max(T.x0, xt(s)), x1 = Math.min(T.x1, xt(s + REFR));
      if (x1 > x0) rd += `M${x0.toFixed(1)} ${T.top}H${x1.toFixed(1)}V${T.top + T.h}H${x0.toFixed(1)}Z`;
      if (s >= lo) tk += `M${xt(s).toFixed(1)} ${T.tick0}V${T.tick1}`;
    }
    refrP.setAttribute('d', rd); tickP.setAttribute('d', tk);
    // ateşleme hızı eğrisi
    if (fiDirty) {
      fiDirty = false;
      fi = fiCurve(S.thr, S.inh, 11, 700);
      fiP.setAttribute('d', linePath(fi.map((hz, i) => [fx(i / 10), fy(hz)] as [number, number])));
    }
    const pos = S.exc * 10, i0 = Math.min(9, Math.floor(pos)), cur = fi[i0] + (fi[i0 + 1] - fi[i0]) * (pos - i0);
    fiM.setAttribute('x1', String(fx(S.exc))); fiM.setAttribute('x2', String(fx(S.exc)));
    fiD.setAttribute('cx', String(fx(S.exc))); fiD.setAttribute('cy', String(fy(cur)));
    fiT.setAttribute('x', String(fx(S.exc) + (S.exc > 0.6 ? -8 : 8))); fiT.setAttribute('text-anchor', S.exc > 0.6 ? 'end' : 'start');
    fiT.textContent = `~${Math.round(cur)} Hz`;
  }

  function reset(): void {
    n = createNeuron(++seed); seen = 0; flash = -1e9; setPause(false); dirty = true;
    for (let i = 0; i < pulse.length; i++) pulse[i] = -1e9;
  }
  function draw(now: number): boolean {
    const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    const anim = now - flash < 700 || pulse.some((p) => now - p < 520);
    if (S.paused && !dirty && !anim) return false;
    if (!S.paused && dt > 0) advance(n, dt * SPEED, drive(), true);
    dirty = false;
    paint(now);
    return true;
  }

  refreshKind();
  return {
    draw, resume: () => { last = -1; },
    say(): string {
      const a = n.xs, need = S.thr - REST, rate = recentRate(n);
      const X = L().sum;
      if (n.age >= 0 || (n.spikes.length && n.t - n.spikes[n.spikes.length - 1] < 4)) return X.spiked(PEAK);
      if (S.exc > 0 && rate > 0) return X.sustained(Math.round(rate));
      if (a > 0.5) return X.summing(f1(a), f1(Math.max(0, need - a)));
      return X.rest;
    },
    meters(): Meter[] {
      const rate = recentRate(n), a = Math.max(0, n.xs);
      return [
        { label: L().sum.mVm, value: `${Math.round(vOf(n))} mV`.replace('-', '−'), frac: (vOf(n) - AHP) / (PEAK - AHP), color: 'var(--ink)' },
        { label: L().sum.mSum, value: `${f1(a)} / ${S.thr - REST} mV`, frac: a / (S.thr - REST), color: 'var(--dop)' },
        { label: L().sum.mRate, value: `${Math.round(rate)} Hz`, frac: rate / 100, color: 'var(--pfc)' },
      ];
    },
    /** Rehberli tur için: durumu ayarla (sıfırlar) ve girdi planını çalıştır. */
    scene(set: SumSet, plan?: (api: { add: (d: number, kind: 1 | -1, delay: number) => void; volley: typeof volley; train: typeof train }) => void): void {
      reset();
      S.exc = set.exc ?? 0; S.inh = set.inh ?? 0; S.thr = set.thr ?? THR; S.gap = set.gap ?? 2; S.kind = set.kind ?? 1;
      hs.exc.set(Math.round(S.exc * 100)); hs.inh.set(Math.round(S.inh * 100)); hs.thr.set(S.thr); hs.gap.set(S.gap);
      refreshKind(); fiDirty = dirty = true;
      plan?.({ add: (d, kind, delay) => add(d, kind, delay), volley, train });
    },
  };
}

