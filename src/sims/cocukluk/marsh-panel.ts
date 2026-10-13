// Sekme 1: Marshmallow testi. Tek çocuk sahnesi + sanal grup dağılımı + sonraki yaşamla ilişki (Watts 2018).
import { svg as svgEl, svgText } from '../kit';
import { DEFAULT_MARSH, MAX_WAIT, STRATEGIES, histogram, lateLife, makeCohort, summarize, waitOf, waits, type Late, type MarshInput, type Strategy } from './model';
import { bookBox, chipRow, el, f1, f2, makeSlider, pc, type Ctx, type Meter, type Panel } from '../ui';
import { pct } from '../../i18n/fmt';
import { t as tr } from '../../i18n/t';
import { L } from './text';

const N = 400, SHOWN = 160, SPEED = 60;
type Mode = 'raw' | 'ctrl';
const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function createMarshPanel(ctx: Ctx, host: HTMLElement) {
  const T = L().marsh;
  let seed = 9;
  let cohort = makeCohort(seed, N);
  const inp: MarshInput = { ...DEFAULT_MARSH };
  let mode: Mode = 'raw';
  let idx = 3;
  let w: number[] = [];
  let late: Late;
  let sum = summarize([]);
  let groupDirty = true, sceneDirty = true, lateDirty = true;
  // Sahne animasyonu
  let running = false, t = 0, last = 0;
  const stopAt = () => Math.min(waitOf(cohort[idx], inp), MAX_WAIT);

  host.innerHTML =
    `<p class="note">${T.note}</p>` +
    `<div class="stage"><svg viewBox="0 0 320 150" role="img" aria-label="${T.sceneAria}" data-ref="scene"></svg></div>` +
    `<div class="row"><button type="button" class="btn" data-ref="go">${T.start}</button><button type="button" class="btn" data-ref="next">${T.another}</button><button type="button" class="btn" data-ref="reseed">${T.newGroup}</button></div>` +
    `<div class="card"><h3 class="sim-h">${T.inputs}</h3><div class="sliders" data-ref="ctl"></div></div>` +
    `<div class="card"><h3 class="sim-h">${T.groupH}</h3><div class="chart"><svg viewBox="0 0 320 140" role="img" aria-label="${T.histAria}" data-ref="hist"></svg></div>` +
    `<div class="legend"><span><i style="background:var(--dop)"></i>${T.legendAte}</span><span><i style="background:var(--pfc)"></i>${T.legendDone}</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M5 9 L13 1 L21 9 Z" fill="var(--ink)"/></svg>${T.legendMine}</span></div></div>` +
    `<div class="card"><h3 class="sim-h">${T.lateH}</h3><div class="row" data-ref="modes"></div>` +
    `<div class="chart"><svg viewBox="0 0 320 170" role="img" aria-label="${T.lateAria}" data-ref="late"></svg></div>` +
    `<div class="readout3"><div class="ro"><span class="k">${T.roRaw}</span><span class="v" data-ref="rraw"></span></div><div class="ro"><span class="k">${T.roCtrl}</span><span class="v" data-ref="rctrl"></span></div><div class="ro"><span class="k">${T.roLeft}</span><span class="v" data-ref="rleft"></span></div></div>` +
    `<div class="callout"><strong>${T.calloutHead}</strong><span>${T.calloutBody}</span></div>` +
    `<p class="note">${T.rNote}</p></div>` +
    bookBox([
      { id: 'ch07-e5', text: T.book[0] },
      { id: 'ch07-e12', text: T.book[1] },
    ]) +
    `<details class="more"><summary>${tr('sim.how')}</summary><p>${T.how[0]}</p><p>${T.how[1]}</p></details>`;

  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const scene = q<SVGSVGElement>('scene');

  /* ---- Sahne ---- */
  scene.innerHTML =
    `<rect x="16" y="112" width="288" height="8" rx="2" fill="var(--line)" stroke="var(--edge)" stroke-width="1.2"/>` +
    `<rect x="30" y="120" width="6" height="26" fill="var(--line)" stroke="var(--edge)"/><rect x="284" y="120" width="6" height="26" fill="var(--line)" stroke="var(--edge)"/>` +
    `<ellipse cx="110" cy="111" rx="32" ry="5" fill="var(--bg)" stroke="var(--edge)" stroke-width="1.2"/>` +
    `<rect data-r="mm1" x="98" y="92" width="24" height="18" rx="8" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.8"/>` +
    `<rect data-r="mm2" x="124" y="94" width="22" height="16" rx="7" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.8" hidden/>` +
    `<path data-r="cloud" d="M90 98 q-6 -12 8 -14 q4 -12 18 -6 q14 -6 20 8 q10 6 0 14 H98 q-10 0 -8 -2z" fill="none" stroke="var(--pfc)" stroke-width="1.6" stroke-dasharray="3 3" hidden/>` +
    `<line data-r="gaze" x1="214" y1="60" x2="124" y2="96" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="3 3"/>` +
    `<rect x="208" y="78" width="28" height="34" rx="9" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.8"/>` +
    `<circle cx="222" cy="62" r="17" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.8"/>` +
    `<g data-r="eyesOpen"><circle cx="214" cy="60" r="2.2" fill="var(--ink)"/><circle cx="224" cy="60" r="2.2" fill="var(--ink)"/></g>` +
    `<g data-r="eyesShut" hidden stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"><path d="M211 60 h6"/><path d="M221 60 h6"/></g>` +
    `<path data-r="mouth" d="M215 69 q6 4 12 0" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round"/>`;
  const r = (n: string) => scene.querySelector<SVGElement>(`[data-r="${n}"]`)!;
  const timer = svgText(scene, { x: 16, y: 24, class: 'big' }, '0:00');
  svgText(scene, { x: 16, y: 38, class: 'ax-t' }, T.cap);
  svgEl('rect', { x: 16, y: 44, width: 130, height: 6, rx: 3, fill: 'var(--line)' }, scene);
  const barFg = svgEl('rect', { x: 16, y: 44, width: 0, height: 6, rx: 3, fill: 'var(--pfc)' }, scene);
  const status = svgText(scene, { x: 16, y: 68, class: 'v-lbl' }, '');
  const caption = svgText(scene, { x: 16, y: 82, class: 'ax-t' }, '');

  function drawScene(): void {
    const stop = stopAt();
    const done = !running && t >= stop && t > 0;
    const ate = done && stop < MAX_WAIT;
    const won = done && !ate;
    timer.textContent = mmss(t);
    barFg.setAttribute('width', String((130 * t) / MAX_WAIT));
    barFg.setAttribute('fill', ate ? 'var(--dop)' : 'var(--pfc)');
    status.textContent = ate ? T.ate(mmss(stop)) : won ? T.won : running ? T.waiting : t > 0 ? T.paused : T.ready;
    r('mm1').toggleAttribute('hidden', ate);
    r('mm2').toggleAttribute('hidden', !won);
    const s = inp.strategy;
    r('cloud').toggleAttribute('hidden', s !== 'cold' || ate);
    r('gaze').toggleAttribute('hidden', !(s === 'look' || s === 'hot') || ate);
    r('eyesShut').toggleAttribute('hidden', s !== 'eyes' || ate);
    r('eyesOpen').toggleAttribute('hidden', s === 'eyes' && !ate);
    r('mouth').setAttribute('d', ate ? 'M215 71 q6 -5 12 0 q-6 4 -12 0' : won ? 'M214 68 q7 7 14 0' : 'M215 69 q6 4 12 0');
    caption.textContent = (inp.trust ? T.trustYes : T.trustNo) + ' · ' + STRATEGIES[s].label;
  }

  /* ---- Girdiler ---- */
  const ctl = q('ctl');
  const stratRow = el(ctl, 'div', 'chips');
  const setStrat = chipRow(stratRow, ctx, (Object.keys(STRATEGIES) as Strategy[]).map((k) => ({ key: k, label: STRATEGIES[k].label })), (k) => { inp.strategy = k as Strategy; changed(); }, T.strategyGroup);
  el(ctl, 'p', 'sl-hint', T.strategyHint);
  const trustRow = el(ctl, 'div', 'chips');
  const setTrust = chipRow(trustRow, ctx, [{ key: 'y', label: T.trustYes }, { key: 'n', label: T.trustNo }], (k) => { inp.trust = k === 'y'; changed(); }, T.trustGroup);
  el(ctl, 'p', 'sl-hint', T.trustHint);
  const age = makeSlider(ctx, ctl, 'age', T.ageName, T.ageHint, 3, 6, inp.age, (v) => { inp.age = v; changed(); }, (v) => L().ageFmt(v), 'var(--pfc)');

  function changed(): void {
    groupDirty = lateDirty = sceneDirty = true;
    running = false; t = 0;
    goBtn.textContent = T.start;
    syncUi();
  }
  function syncUi(): void {
    setStrat(inp.strategy); setTrust(inp.trust ? 'y' : 'n'); setMode(mode);
    age.set(inp.age);
  }

  const goBtn = q<HTMLButtonElement>('go');
  ctx.scope.on(goBtn, 'click', () => {
    if (!running && t >= stopAt()) t = 0;
    running = !running; last = 0; sceneDirty = true; goBtn.textContent = running ? T.pause : T.start; ctx.touch();
  });
  ctx.scope.on(q('next'), 'click', () => { idx = (idx * 7 + 5) % SHOWN; running = false; t = 0; sceneDirty = groupDirty = true; goBtn.textContent = T.start; ctx.touch(); });
  ctx.scope.on(q('reseed'), 'click', () => { seed += 1; cohort = makeCohort(seed, N); running = false; t = 0; groupDirty = lateDirty = sceneDirty = true; goBtn.textContent = T.start; ctx.touch(); });

  const setMode = chipRow(q('modes'), ctx, [{ key: 'raw', label: T.modeRaw }, { key: 'ctrl', label: T.modeCtrl }], (k) => { mode = k as Mode; lateDirty = true; }, T.modeGroup);

  /* ---- Grup ve sonraki yaşam çizimi ---- */
  const hist = q<SVGSVGElement>('hist'), lateSvg = q<SVGSVGElement>('late');
  function drawGroup(): void {
    w = waits(cohort, inp);
    sum = summarize(w);
    late = lateLife(cohort, w);
    const h = histogram(w), n = w.length;
    const X0 = 30, W = 280, bw = W / 11, base = 108, top = 14, scale = (base - top) / (0.7 * n);
    let s = `<line class="grid" x1="${X0}" y1="${base}" x2="${X0 + W}" y2="${base}"/>`;
    for (const f of [0.2, 0.4, 0.6]) { const y = base - f * n * scale; s += `<line class="grid" x1="${X0}" y1="${y}" x2="${X0 + W}" y2="${y}"/><text x="${X0 - 4}" y="${y + 3}" text-anchor="end">${pct(f)}</text>`; }
    h.forEach((c, i) => {
      const hh = Math.min(base - top + 6, c * scale), x = X0 + i * bw + 2;
      s += `<rect x="${x}" y="${base - hh}" width="${bw - 4}" height="${hh}" rx="2" fill="${i === 10 ? 'var(--pfc)' : 'var(--dop)'}"/>`;
    });
    s += `<text class="v-lbl" x="${X0 + 10.5 * bw}" y="${Math.max(10, base - Math.min(base - top + 6, h[10] * scale) - 4)}" text-anchor="middle">${pc(h[10] / n)}</text>`;
    for (let m = 0; m <= 12; m += 3) s += `<text x="${X0 + (m / 1.5) * bw}" y="${base + 12}" text-anchor="middle">${m}</text>`;
    s += `<text x="${X0 + 10.5 * bw}" y="${base + 12}" text-anchor="middle">15</text><text class="ax-t" x="${X0 + W / 2}" y="${base + 26}" text-anchor="middle">${T.histAxis}</text>`;
    const mine = Math.min(w[idx] >= MAX_WAIT ? 10 : Math.floor(w[idx] / 90), 10), cx = X0 + mine * bw + bw / 2;
    s += `<path d="M${cx - 5} ${base + 1} L${cx} ${base - 6} L${cx + 5} ${base + 1}Z" fill="var(--ink)"/>`;
    hist.innerHTML = s;
    groupDirty = false;
  }
  function drawLate(): void {
    const raw = mode === 'raw';
    const xs = raw ? late.x : late.cx, ys = raw ? late.y : late.cy;
    const xmin = raw ? 0 : Math.min(...xs), xmax = raw ? 15 : Math.max(...xs);
    const ymin = -3, ymax = 3, X0 = 36, W = 272, Y0 = 10, H = 124;
    const px = (v: number) => X0 + ((v - xmin) / (xmax - xmin || 1)) * W, py = (v: number) => Y0 + H - ((Math.max(ymin, Math.min(ymax, v)) - ymin) / (ymax - ymin)) * H;
    let s = `<line class="grid" x1="${X0}" y1="${Y0 + H}" x2="${X0 + W}" y2="${Y0 + H}"/><line class="grid" x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0 + H}"/>`;
    for (let i = 0; i < SHOWN; i++) s += `<circle cx="${px(xs[i]).toFixed(1)}" cy="${py(ys[i]).toFixed(1)}" r="2.3" fill="var(--edge)" fill-opacity=".55"/>`;
    const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
    const b = sxx ? sxy / sxx : 0;
    s += `<line x1="${px(xmin)}" y1="${py(my + b * (xmin - mx))}" x2="${px(xmax)}" y2="${py(my + b * (xmax - mx))}" stroke="var(--red)" stroke-width="2.4" stroke-linecap="round"/>`;
    s += `<text class="ax-t" x="${X0 + W / 2}" y="${Y0 + H + 18}" text-anchor="middle">${raw ? T.lateAxisRaw : T.lateAxisCtrl}</text>`;
    s += `<text class="ax-t" x="10" y="${Y0 + H / 2}" text-anchor="middle" transform="rotate(-90 10 ${Y0 + H / 2})">${T.lateAxisY}</text>`;
    s += `<text class="v-lbl" x="${X0 + W - 4}" y="${Y0 + 12}" text-anchor="end">r = ${f2(raw ? late.rawR : late.ctrlR)}</text>`;
    lateSvg.innerHTML = s;
    q('rraw').textContent = f2(late.rawR);
    q('rctrl').textContent = f2(late.ctrlR);
    q('rleft').textContent = pc(late.rawR > 0 ? late.ctrlR / late.rawR : 0);
    lateDirty = false;
  }

  function say(): string {
    return T.say(inp.age, L().strategies[inp.strategy].low, inp.trust, pc(sum.completed), f1(sum.meanMin), f2(late.rawR), f2(late.ctrlR));
  }
  function meters(): Meter[] {
    const raw = mode === 'raw';
    return [
      { label: T.mDone, value: pc(sum.completed), frac: sum.completed, color: 'var(--pfc)' },
      { label: T.mMean, value: T.mMeanVal(f1(sum.meanMin)), frac: sum.meanMin / 15, color: 'var(--dop)' },
      { label: raw ? T.mRRaw : T.mRCtrl, value: f2(raw ? late.rawR : late.ctrlR), frac: Math.abs(raw ? late.rawR : late.ctrlR) / 0.5, color: 'var(--pit)' },
    ];
  }

  syncUi();
  return {
    say, meters,
    resume: () => { last = 0; },
    draw(now = 0): boolean {
      let redrew = false;
      if (running) {
        if (!last) last = now;
        const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
        last = now;
        t = Math.min(stopAt(), t + dt * SPEED);
        if (t >= stopAt()) { running = false; goBtn.textContent = T.replay; ctx.touch(); }
        sceneDirty = true;
      }
      if (groupDirty) { drawGroup(); redrew = true; }
      if (lateDirty) { if (!late) drawGroup(); drawLate(); redrew = true; }
      if (sceneDirty) { drawScene(); sceneDirty = false; redrew = true; }
      return redrew;
    },
    set(p: Partial<MarshInput> & { mode?: Mode }): void {
      if (p.age !== undefined) inp.age = p.age;
      if (p.strategy) inp.strategy = p.strategy;
      if (p.trust !== undefined) inp.trust = p.trust;
      if (p.mode) mode = p.mode;
      changed();
    },
  } satisfies Panel & { set(p: Partial<MarshInput> & { mode?: Mode }): void };
}
