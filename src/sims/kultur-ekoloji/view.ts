import { repBadge } from '../ui';
import { t, type MsgKey } from '../../i18n/t';
import { percent } from '../../i18n/fmt';
import { L } from './text';
import type { BK, RP, RS, Strings } from './text.tr';
import type { RepStatus } from '../ui';
import '../sim.css';
import './view.css';
import { Scope, pct, ref, uid } from '../kit';
import { createTour } from '../tour';
import {
  ECOS, GA, GB, H, ISLAND_KM, NC, W, WALL, analyze, clearBorders, corridor, cultureOf, describeGrid, describePgg,
  grantAll, grantAutonomy, newWorld, paintWall, pggSweep, playPgg, reseed, riverFence, step, windowOf,
  type Metrics, type PggResult,
} from './model';

const CELL = 12;
const STEP_S = 0.12;

interface Scen { id: string; pref: number; mob: number; river?: boolean }
const SCEN: Scen[] = [
  { id: 'mixed', pref: 0.12, mob: 0.5 },
  { id: 'mid', pref: 0.4, mob: 0.5 },
  { id: 'stuck', pref: 0.5, mob: 0.1 },
  { id: 'sep', pref: 0.5, mob: 1 },
  { id: 'river', pref: 0.4, mob: 0.5, river: true },
];
const TOOLS = ['look', 'wall', 'erase', 'aut'] as const;
type Tool = (typeof TOOLS)[number];

const PGG_PRESETS = [
  { id: 'hi', ineq: 0.2, trust: 0.85 },
  { id: 'lo', ineq: 0.7, trust: 0.25 },
];

const ecoName = (id: string): string => L().eco[id as keyof Strings['eco']];
const RS: RS = (s) => t(`repl.${s}` as MsgKey);
const RP: RP = (s, bold) => (bold ? `<span class="rep">${t('repl.badge', { s: `<b>${RS(s)}</b>` })}</span>` : repBadge(s));
const BOOK: BK = (id, label) => `<a href="#/bolum/ch09?deney=${id}">${label}</a>`;

const slider = (k: keyof Strings['sl'], min: number, max: number, stp: number, cls = '') => {
  const { name, hint } = L().sl[k];
  return `<div class="sl ${cls}"><div class="sl-top"><label class="sl-name" for="@${k}">${name}</label><span class="sl-val" data-ref="v-${k}"></span></div>` +
  `<input type="range" id="@${k}" data-k="${k}" min="${min}" max="${max}" step="${stp}"><p class="sl-hint">${hint}</p></div>`;
};

const meterHtml = (k: number) =>
  `<div class="m" data-ref="mm${k}"><div class="m-top"><span data-ref="ml${k}"></span><b data-ref="mv${k}">0%</b></div><div class="track"><b data-ref="mb${k}"></b></div></div>`;

const TEMPLATE = (id: string) => {
  const T = L();
  return `
<div class="sim sim-ke">
  <p class="lede">${T.lede}</p>
  <div data-ref="tourHost"></div>
  <div class="tabs" role="tablist" aria-label="${T.tabsLabel}">
    ${T.tabs.map((tab, i) => `<button type="button" class="tab" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${i + 1}. ${tab}</button>`).join('')}
  </div>
  <div class="sim-bar" role="group" aria-label="${T.barLabel}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters">${[0, 1, 2].map(meterHtml).join('')}</div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section role="tabpanel" id="${id}-p0" aria-labelledby="${id}-t0" class="panel" data-ref="p0">
    <div class="chips" data-ref="scen" role="group" aria-label="${T.scenLabel}">${SCEN.map((s, i) => `<button type="button" class="chip" data-s="${s.id}" aria-pressed="false">${T.scen[i]}</button>`).join('')}</div>
    <div class="stage">
      <canvas data-ref="grid" role="img" aria-label="${T.gridAria}"></canvas>
      <div class="legend">
        <span><i class="sq" style="background:var(--pfc)"></i>${T.legA}</span>
        <span><i style="background:var(--dop)"></i>${T.legB}</span>
        <span><i class="sq" style="background:var(--edge)"></i>${T.legWall}</span>
        <span><i class="sq" style="background:var(--gld);opacity:.45"></i>${T.legAut}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--red)" stroke-width="3"/></svg>${T.legRisk}</span>
      </div>
    </div>
    <div class="row" data-ref="tools" role="group" aria-label="${T.toolsLabel}">${TOOLS.map((k) => `<button type="button" class="btn" data-tool="${k}" aria-pressed="${k === 'look'}">${T.tools[k]}</button>`).join('')}</div>
    <div class="row">
      <button type="button" class="btn" data-ref="play" aria-pressed="true">${T.pause}</button>
      <button type="button" class="btn" data-ref="step">${T.step}</button>
      <button type="button" class="btn" data-ref="fast">${T.fast}</button>
      <button type="button" class="btn" data-ref="restart">${T.restart}</button>
      <button type="button" class="btn" data-ref="allaut">${T.allAut}</button>
      <button type="button" class="btn" data-ref="noborder">${T.noBorder}</button>
    </div>
    <section class="chart" aria-label="${T.riskSection}">
      <h3 class="sim-h">${T.riskH}</h3>
      <svg viewBox="0 0 360 150" role="img" aria-label="${T.riskAria}" data-ref="chart"></svg>
    </section>
    <div class="sliders">
      ${slider('pref', 0, 80, 1, 'sl-pfc')}
      ${slider('mob', 0, 100, 1, 'sl-dop')}
      ${slider('ratio', 30, 70, 1)}
    </div>
  </section>

  <section role="tabpanel" id="${id}-p1" aria-labelledby="${id}-t1" class="panel" data-ref="p1" hidden>
    <div class="chips" data-ref="eco" role="group" aria-label="${T.ecoLabel}">${ECOS.map((e) => `<button type="button" class="chip" data-e="${e.id}" aria-pressed="false">${ecoName(e.id)}</button>`).join('')}</div>
    <div class="stage">
      <svg viewBox="0 0 360 214" role="group" aria-label="${T.mapAria}" data-ref="map"></svg>
      <div class="legend"><span>${T.legStroke}</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--edge)" stroke-width="2" stroke-dasharray="5 3"/></svg>${T.legReduce}</span></div>
    </div>
    <div class="sliders">
      ${slider('L', 0, 100, 1, 'sl-gld')}
      ${slider('V', 0, 100, 1, 'sl-amy')}
    </div>
    <div class="tests" data-ref="tests"></div>
  </section>

  <section role="tabpanel" id="${id}-p2" aria-labelledby="${id}-t2" class="panel" data-ref="p2" hidden>
    <h3 class="sim-h">${T.hallH}</h3>
    <div class="chips" data-ref="cchips" role="group" aria-label="${T.originLabel}">
      <button type="button" class="chip" data-c="north" aria-pressed="false">${T.chipNorth}</button>
      <button type="button" class="chip" data-c="south" aria-pressed="true">${T.chipSouth}</button>
      <button type="button" class="chip" data-c="ins" aria-pressed="true">${T.chipInsult}</button>
      <button type="button" class="chip" data-c="rerun">${T.chipRerun}</button>
    </div>
    <div class="stage"><svg viewBox="0 0 360 96" role="img" aria-label="${T.hallAria}" data-ref="hall"></svg></div>
    <div class="tests" data-ref="ctests"></div>
    ${slider('h', 0, 100, 1, 'sl-amy')}
    <h3 class="sim-h">${T.pggH}</h3>
    <div class="chips" data-ref="pchips" role="group" aria-label="${T.pattLabel}">${PGG_PRESETS.map((p) => `<button type="button" class="chip" data-p="${p.id}" aria-pressed="false">${T.presets[p.id]}</button>`).join('')}<button type="button" class="chip" data-p="rerun">${T.replay}</button></div>
    <div class="tests" data-ref="ptests"></div>
    <section class="chart"><h3 class="sim-h">${T.roundH}</h3><svg viewBox="0 0 360 130" role="img" aria-label="${T.roundAria}" data-ref="pchart"></svg></section>
    <section class="chart"><h3 class="sim-h">${T.ineqH}</h3><svg viewBox="0 0 360 130" role="img" aria-label="${T.ineqAria}" data-ref="schart"></svg></section>
    <div class="sliders">
      ${slider('ineq', 0, 100, 1, 'sl-dop')}
      ${slider('trust', 0, 100, 1, 'sl-gld')}
      ${slider('cost', 1, 3, 0.5)}
    </div>
  </section>

  <details class="how"><summary>${t('sim.how')}</summary>
    ${T.how.map((p) => `<p>${p}</p>`).join('\n    ')}
  </details>

  <aside class="book" aria-label="${t('sim.book')}">
    <h3 class="sim-h">${t('sim.book')}</h3>
    <ul>
      ${T.book.map((f) => `<li>${f(BOOK, RP, RS)}</li>`).join('\n      ')}
    </ul>
  </aside>
  <p class="foot">${T.foot}</p>
</div>`;
};

const bar = (label: string, v: number, text: string, color: string) =>
  `<div class="bar" style="--c:${color}"><div class="bar-top"><span>${label}</span><b>${text}</b></div><div class="track"><b style="width:${pct(Math.max(0, Math.min(1, v)))}%"></b></div></div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('ke');
  container.innerHTML = TEMPLATE(id).replace(/id="@/g, `id="${id}-`).replace(/for="@/g, `for="${id}-`);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(n: string) => ref<T>(root, n);
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const S = {
    tab: 0, seed: 7, pref: 0.4, mob: 0.5, ratio: 0.5, playing: true, tool: 'look' as Tool, scen: 'mid' as string | null,
    w: newWorld(7), m: null as unknown as Metrics, hist: [] as Array<[number, number]>, calm: 0, acc: 0, fenced: false,
    eco: 'rice' as string | null, L: 0.9, V: 0.15,
    h: 0.8, insult: true, cseed: 1,
    ineq: 0.2, trust: 0.85, cost: 1, pseed: 1, pp: 'hi' as string | null, pg: null as unknown as PggResult, sweep: [] as ReturnType<typeof pggSweep>,
    last: 'grid' as 'grid' | 'eco' | 'cor' | 'pgg',
  };
  let dirty = true;
  const sayEl = $('say');
  const meter = (k: number, label: string, v: number, text: string, color: string) => {
    $(`ml${k}`).textContent = label; $(`mv${k}`).textContent = text;
    $(`mb${k}`).style.width = pct(Math.max(0, Math.min(1, v))) + '%'; $(`mm${k}`).style.setProperty('--c', color);
  };
  const css = (n: string) => getComputedStyle(root).getPropertyValue(n).trim() || '#888';

  // ---------- Sekmeler ----------
  const tabEls = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = [$('p0'), $('p1'), $('p2')];
  function selectTab(i: number, focus = false): void {
    S.tab = i;
    tabEls.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    panels.forEach((p, k) => { p.hidden = k !== i; });
    S.last = (['grid', 'eco', 'cor'] as const)[i];
    if (focus) tabEls[i].focus();
    dirty = true; render();
  }
  tabEls.forEach((b, k) => {
    scope.on(b, 'click', () => selectTab(k));
    scope.on(b, 'keydown', (ev) => {
      const key = (ev as KeyboardEvent).key;
      if (key === 'ArrowRight') { ev.preventDefault(); selectTab((k + 1) % 3, true); }
      else if (key === 'ArrowLeft') { ev.preventDefault(); selectTab((k + 2) % 3, true); }
    });
  });

  // ---------- Kaydırıcılar ----------
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('input[data-k]'));
  const pv = (v: number) => percent(String(v));
  const fmt: Record<string, (v: number) => string> = {
    pref: pv, mob: (v) => L().mobVal(Math.round(v), 1 + Math.round(v / 11.1)), ratio: (v) => `${pv(v)} / ${pv(100 - v)}`,
    L: pv, V: pv, h: pv, ineq: pv, trust: pv, cost: (v) => `${v}:1`,
  };
  function syncSliders(): void {
    const vals: Record<string, number> = {
      pref: S.pref * 100, mob: S.mob * 100, ratio: S.ratio * 100, L: S.L * 100, V: S.V * 100, h: S.h * 100,
      ineq: S.ineq * 100, trust: S.trust * 100, cost: S.cost,
    };
    for (const i of inputs) { const k = i.dataset.k!; i.value = String(vals[k]); $(`v-${k}`).textContent = fmt[k](vals[k]); }
  }

  // ---------- 1. Izgara ----------
  const canvas = $<HTMLCanvasElement>('grid');
  canvas.width = W * CELL; canvas.height = H * CELL;
  const ctx = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent) ? null : canvas.getContext('2d');
  const hist = S.hist;
  function resetWorld(): void {
    S.w = reseed(S.w, S.seed, S.ratio); S.calm = 0; hist.length = 0;
    S.m = analyze(S.w, S.pref); hist.push([S.m.meanKm, S.m.risk]); dirty = true;
  }
  S.w = newWorld(S.seed, S.ratio);
  S.m = analyze(S.w, S.pref); hist.push([S.m.meanKm, S.m.risk]);
  function advance(n: number): void {
    for (let k = 0; k < n; k++) {
      const moved = step(S.w, S.pref, S.mob);
      S.calm = moved < 3 ? S.calm + 1 : 0;
      if (S.w.t % 2 === 0 || n === 1) { const m = analyze(S.w, S.pref); hist.push([m.meanKm, m.risk]); }
    }
    if (hist.length > 400) hist.splice(0, hist.length - 400);
    S.m = analyze(S.w, S.pref); dirty = true;
  }
  const playBtn = $<HTMLButtonElement>('play');
  function setPlaying(v: boolean): void { S.playing = v; playBtn.setAttribute('aria-pressed', String(v)); playBtn.textContent = v ? L().pause : L().play; }
  function setScen(id: string | null): void {
    S.scen = id;
    root.querySelectorAll<HTMLElement>('[data-s]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === id)));
  }
  function applyScen(sc: Scen, run = 0): void {
    S.pref = sc.pref; S.mob = sc.mob; syncSliders(); setScen(sc.id);
    S.w = newWorld(S.seed, S.ratio); S.calm = 0; hist.length = 0;
    if (sc.river) riverFence(S.w);
    S.fenced = !!sc.river;
    S.m = analyze(S.w, S.pref); hist.push([S.m.meanKm, S.m.risk]);
    if (run) advance(run);
    dirty = true;
  }

  function cellAt(ev: PointerEvent): number {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((ev.clientX - r.left) / r.width) * W), y = Math.floor(((ev.clientY - r.top) / r.height) * H);
    return x < 0 || y < 0 || x >= W || y >= H ? -1 : y * W + x;
  }
  let painting = false;
  function paintAt(ev: PointerEvent): void {
    const i = cellAt(ev);
    if (i < 0) return;
    if (S.tool === 'wall' || S.tool === 'erase') { paintWall(S.w, i, S.tool === 'wall'); S.fenced = true; setScen(null); S.m = analyze(S.w, S.pref); dirty = true; }
    else if (S.tool === 'aut') { if (grantAutonomy(S.w, S.m, i)) { S.fenced = true; S.m = analyze(S.w, S.pref); dirty = true; } }
  }
  scope.on(canvas, 'pointerdown', (ev) => { if (S.tool === 'look') return; painting = true; canvas.setPointerCapture?.(ev.pointerId); paintAt(ev); announce(); });
  scope.on(canvas, 'pointermove', (ev) => { if (painting && (S.tool === 'wall' || S.tool === 'erase')) paintAt(ev); });
  scope.on(canvas, 'pointerup', () => { painting = false; });
  scope.on(canvas, 'pointercancel', () => { painting = false; });

  function drawGrid(): void {
    if (!ctx) return;
    const cA = css('--pfc'), cB = css('--dop'), cW = css('--edge'), cG = css('--gld'), cR = css('--red'), cL = css('--line'), cI = css('--ink');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { c, aut } = S.w;
    for (let i = 0; i < NC; i++) {
      const x = (i % W) * CELL, y = ((i / W) | 0) * CELL;
      if (aut[i]) { ctx.globalAlpha = 0.28; ctx.fillStyle = cG; ctx.fillRect(x, y, CELL, CELL); ctx.globalAlpha = 1; }
      const g = c[i];
      if (g === WALL) { ctx.fillStyle = cW; ctx.fillRect(x, y, CELL, CELL); ctx.fillStyle = cI; ctx.fillRect(x + 1, y + 1, 2, 2); }
      else if (g === GA) { ctx.fillStyle = cA; ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4); }
      else if (g === GB) { ctx.fillStyle = cB; ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, CELL / 2 - 2, 0, 6.2832); ctx.fill(); }
    }
    const { lab, score } = S.m;
    const edge = (i: number, j: number, x: number, y: number, hz: boolean) => {
      const a = c[i], b = c[j];
      if ((a !== GA && a !== GB) || (b !== GA && b !== GB) || a === b) return;
      const hot = Math.max(score[lab[i]] ?? 0, score[lab[j]] ?? 0) >= 0.1 && !(aut[i] || aut[j]);
      ctx.strokeStyle = hot ? cR : cL; ctx.lineWidth = hot ? 2.6 : 1;
      ctx.beginPath();
      if (hz) { ctx.moveTo(x, y + CELL); ctx.lineTo(x + CELL, y + CELL); } else { ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL); }
      ctx.stroke();
    };
    for (let i = 0; i < NC; i++) {
      const x = (i % W) * CELL, y = ((i / W) | 0) * CELL;
      if (i % W < W - 1) edge(i, i + 1, x, y, false);
      if (i + W < NC) edge(i, i + W, x, y, true);
    }
  }

  const X0 = Math.log(5), X1 = Math.log(110);
  function drawChart(): void {
    const px = (km: number) => 34 + ((Math.log(Math.max(5, Math.min(110, km))) - X0) / (X1 - X0)) * 316;
    const py = (r: number) => 116 - r * 96;
    const a = px(ISLAND_KM.lo), b = px(ISLAND_KM.hi);
    let curve = '';
    for (let k = 0; k <= 40; k++) { const km = Math.exp(X0 + (k / 40) * (X1 - X0)); curve += `${k ? 'L' : 'M'}${px(km).toFixed(1)},${py(windowOf(km) * 0.9).toFixed(1)}`; }
    const pts = hist.map(([km, r]) => `${px(km).toFixed(1)},${py(r).toFixed(1)}`).join(' ');
    const cur = hist[hist.length - 1];
    $('chart').innerHTML =
      `<rect x="${a}" y="16" width="${b - a}" height="100" fill="var(--eff)" fill-opacity=".18"/>` +
      `<line class="grid" x1="34" y1="116" x2="350" y2="116"/><line class="grid" x1="34" y1="16" x2="34" y2="116"/>` +
      `<path d="${curve}" fill="none" stroke="var(--edge)" stroke-width="1.2" stroke-dasharray="3 3"/>` +
      `<polyline points="${pts}" class="ln" stroke="var(--amy)" stroke-width="2"/>` +
      `<circle cx="${px(cur[0]).toFixed(1)}" cy="${py(cur[1]).toFixed(1)}" r="5" fill="var(--ink)" stroke="var(--panel)" stroke-width="2"/>` +
      [5, 10, 20, 40, 80].map((k) => `<text x="${px(k)}" y="130" text-anchor="middle">${k}</text>`).join('') +
      `<text x="350" y="141" text-anchor="end">${L().axisKm}</text>` +
      `<text x="${(a + b) / 2}" y="11" text-anchor="middle" class="bandlab">${L().bandLab}</text>` +
      `<text x="30" y="20" text-anchor="end">${L().axisRisk}</text><text x="30" y="116" text-anchor="end">0</text>`;
  }

  // ---------- 2. Ekoloji haritası ----------
  const ecoNode = (i: number) => ({ x: 4, y: 6 + i * 41, w: 96, h: 30 });
  const MECH = [{ k: 'L', x: 138, y: 34 }, { k: 'V', x: 138, y: 134 }];
  const CULT = [{ k: 'K', y: 14 }, { k: 'Hol', y: 84 }, { k: 'O', y: 154 }];
  const mapSvg = $('map');
  function drawMap(): void {
    const T = L();
    const cu = cultureOf(S.L, S.V);
    const val: Record<string, number> = { L: S.L, V: S.V, K: cu.K, Hol: cu.Hol, O: cu.O };
    let h = '';
    const ln = (x1: number, y1: number, x2: number, y2: number, w: number, o: number, dash = false) =>
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--edge)" stroke-width="${(0.6 + 4 * w).toFixed(1)}" stroke-opacity="${o.toFixed(2)}" stroke-linecap="round"${dash ? ' stroke-dasharray="5 4"' : ''}/>`;
    ECOS.forEach((e, i) => {
      const n = ecoNode(i), sel = S.eco === e.id;
      h += ln(n.x + n.w, n.y + 15, MECH[0].x, MECH[0].y + 18, e.L, sel ? 0.9 : 0.18) + ln(n.x + n.w, n.y + 15, MECH[1].x, MECH[1].y + 18, e.V, sel ? 0.9 : 0.18);
    });
    h += ln(218, MECH[0].y + 18, 258, CULT[0].y + 18, S.L, 0.8) + ln(218, MECH[0].y + 18, 258, CULT[1].y + 18, S.L * 0.8, 0.6) + ln(218, MECH[1].y + 18, 258, CULT[2].y + 18, S.V, 0.8)
      + ln(218, MECH[0].y + 18, 258, CULT[2].y + 18, S.L * 0.5, 0.5, true) + ln(218, MECH[1].y + 18, 258, CULT[0].y + 18, S.V * 0.3, 0.5, true);
    ECOS.forEach((e, i) => {
      const n = ecoNode(i), sel = S.eco === e.id;
      h += `<g class="node" data-e="${e.id}" role="button" tabindex="0" aria-pressed="${sel}" aria-label="${ecoName(e.id)}"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" class="nb${sel ? ' sel' : ''}"/><text x="${n.x + 8}" y="${n.y + 19}" class="nt">${ecoName(e.id).split(' (')[0]}${e.book ? '' : ' *'}</text></g>`;
    });
    const box = (x: number, y: number, w: number, name: string, k: string, color: string) => {
      const v = val[k];
      return `<g><rect x="${x}" y="${y}" width="${w}" height="36" rx="8" class="nb"/><rect x="${x + 1}" y="${y + 1}" width="${((w - 2) * v).toFixed(1)}" height="34" rx="7" fill="${color}" fill-opacity=".28"/>` +
        `<text x="${x + 8}" y="${y + 15}" class="nt">${name}</text><text x="${x + 8}" y="${y + 29}" class="nv nvv">${pctS(v)}</text></g>`;
    };
    MECH.forEach((m, i) => { h += box(m.x, m.y, 80, T.mech[i], m.k, m.k === 'L' ? 'var(--gld)' : 'var(--amy)'); });
    CULT.forEach((c, i) => { h += box(258, c.y, 100, T.cult[i], c.k, c.k === 'K' ? 'var(--pfc)' : c.k === 'Hol' ? 'var(--pit)' : 'var(--amy)'); });
    h += `<text x="4" y="212" class="nv">${T.mapNote}</text>`;
    mapSvg.innerHTML = h;
  }
  const rep = repBadge('karışık');
  function drawTests(): void {
    const c = cultureOf(S.L, S.V);
    const dv = (x: number) => (x >= 1 ? `+%${Math.round((x - 1) * 100)}` : `-%${Math.round((1 - x) * 100)}`);
    $('tests').innerHTML =
      `<div class="tc"><h4>Sosyogram ${rep}</h4>${bar('Kendini arkadaştan büyük çizme', (c.self - 0.7) / 0.7, c.self >= 1.03 ? `${dv(c.self)} büyük` : c.self <= 0.97 ? `${dv(c.self)} küçük` : 'eşit', 'var(--pfc)')}</div>` +
      `<div class="tc"><h4>Tavşan, köpek, havuç ${rep}</h4>${bar('Tavşan ile havucu eşleştirme (ilişkisel)', c.rel, `%${pct(c.rel)}`, 'var(--pit)')}${bar('Tavşan ile köpeği eşleştirme (kategori)', 1 - c.rel, `%${pct(1 - c.rel)}`, 'var(--edge)')}</div>` +
      `<div class="tc"><h4>Bölge göstergeleri ${rep}</h4>${bar('Boşanma oranı (göreli)', c.divorce / 2, dv(c.divorce), 'var(--dop)')}${bar('Patent başvurusu (göreli)', c.patent / 2, dv(c.patent), 'var(--gld)')}</div>` +
      `<div class="tc"><h4>Resim bağlamı (Masuda ve Nisbett) ${rep}</h4>${bar('Arka planı hatırlama', c.ctx, `%${pct(c.ctx)}`, 'var(--pit)')}${bar('Merkezdeki nesneyi hatırlama', c.ctr, `%${pct(c.ctr)}`, 'var(--pfc)')}</div>` +
      `<p class="sl-hint">Göreli değerler, kollektivizm orta düzeydeyken 0 kabul edilir. Pirinç ve buğday değerleri kitaptaki yönü izler; sayılar modelindir.</p>`;
  }
  function pickEco(id: string): void {
    const e = ECOS.find((x) => x.id === id)!;
    S.eco = id; S.L = e.L; S.V = e.V; syncSliders();
    root.querySelectorAll<HTMLElement>('[data-e]').forEach((b) => { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.e === id)); });
    S.last = 'eco'; dirty = true;
  }
  scope.on(mapSvg as unknown as HTMLElement, 'click', (ev) => { const g = (ev.target as Element).closest('[data-e]'); if (g) { pickEco(g.getAttribute('data-e')!); announce(); } });
  scope.on(mapSvg as unknown as HTMLElement, 'keydown', (ev) => {
    const k = (ev as KeyboardEvent).key, g = (ev.target as Element).closest('[data-e]');
    if (g && (k === 'Enter' || k === ' ')) { ev.preventDefault(); pickEco(g.getAttribute('data-e')!); announce(); }
  });

  // ---------- 3. Koridor ve kamu malı ----------
  const hall = $('hall');
  function drawHall(): void {
    hall.innerHTML =
      `<rect x="4" y="22" width="352" height="52" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.5"/>` +
      `<rect x="318" y="34" width="28" height="28" rx="4" fill="var(--panel)" stroke="var(--edge)" stroke-width="1.5"/><text x="332" y="52" text-anchor="middle" class="nv">anket</text>` +
      `<circle cx="70" cy="48" r="11" fill="var(--pfc)"/><text x="70" y="86" text-anchor="middle" class="nv">katılımcı</text>` +
      `<circle cx="${S.insult ? 150 : 200}" cy="48" r="17" fill="var(--edge)"/><text x="${S.insult ? 150 : 200}" y="86" text-anchor="middle" class="nv">iri yapılı işbirlikçi</text>` +
      (S.insult ? `<path d="M108,34 L126,40 L116,48 L128,56 L108,62 L112,48 Z" fill="var(--red)"/><rect x="170" y="2" width="120" height="22" rx="8" fill="var(--panel)" stroke="var(--red)" stroke-width="1.5"/><text x="230" y="17" text-anchor="middle" class="nt">omuz atar, hakaret eder</text>` : `<text x="230" y="17" text-anchor="middle" class="nv">olaysız geçiş</text>`);
  }
  function drawCor(): void {
    const ctl = corridor(S.h, false, 200, S.cseed), ins = corridor(S.h, true, 200, S.cseed + 50);
    const row = (name: string, a: number, b: number, color: string) =>
      `<div class="pair"><span class="pl">${name}</span><div class="bar" style="--c:${color}"><div class="bar-top"><span>Kontrol</span><b>${pct(a)}</b></div><div class="track"><b style="width:${pct(a)}%"></b></div></div><div class="bar" style="--c:${color}"><div class="bar-top"><span>Hakaret</span><b>${pct(b)}</b></div><div class="track"><b style="width:${pct(b)}%"></b></div></div></div>`;
    const dots = corridor(S.h, S.insult, 40, S.cseed + 7).dots;
    $('ctests').innerHTML =
      row('Testosteron yükselişi', ctl.dT, ins.dT, 'var(--eff)') + row('Glukokortikoid yükselişi', ctl.dC, ins.dC, 'var(--amy)') + row('Hikâyeyi şiddetle bitirenler (%)', ctl.violent, ins.violent, 'var(--red)') +
      `<div class="dots" role="img" aria-label="40 katılımcının hikâye sonu: dolu kare şiddetle biten">${dots.map((d) => `<i class="${d ? 'v' : ''}"></i>`).join('')}</div><p class="sl-hint">Her işaret bir katılımcı; dolu kare hikâyeyi şiddetle bitirdi (${S.insult ? 'hakaret' : 'kontrol'} koşulu, tohum ${S.cseed}). Replikasyon: bilinmiyor.</p>`;
  }
  function runPgg(): void {
    S.pg = playPgg({ ineq: S.ineq, trust: S.trust, cost: S.cost, seed: S.pseed });
    S.sweep = pggSweep(S.trust, S.cost);
  }
  function drawPgg(): void {
    const r = S.pg, tot = r.pro + r.anti;
    $('ptests').innerHTML =
      `<div class="tc"><h4>Ceza kime gitti?</h4><div class="stack" role="img" aria-label="Ceza puanlarının dağılımı"><b class="s1" style="width:${tot ? pct(r.pro / tot) : 0}%"></b><b class="s2" style="width:${tot ? pct(r.anti / tot) : 0}%"></b></div>` +
      `<div class="legend"><span><i class="sq" style="background:var(--gld)"></i>hile yapana (prososyal): ${Math.round(r.pro)} puan</span><span><i class="sq" style="background:var(--red)"></i>cömert olana (antisosyal): ${Math.round(r.anti)} puan</span></div></div>`;
    const px = (t: number, n: number) => 34 + (t / Math.max(1, n - 1)) * 316, py = (v: number) => 112 - v * 96;
    const line = (a: number[], cls: string, col: string) => `<polyline points="${a.map((v, t) => `${px(t, a.length).toFixed(1)},${py(v).toFixed(1)}`).join(' ')}" class="ln ${cls}" stroke="${col}"/>`;
    $('pchart').innerHTML = `<line class="grid" x1="34" y1="112" x2="350" y2="112"/><line class="grid" x1="34" y1="16" x2="34" y2="112"/>` +
      line(r.coop, '', 'var(--pfc)') + line(r.trust, 'dash', 'var(--gld)') +
      `<text x="350" y="126" text-anchor="end">tur (1-10)</text><text x="30" y="20" text-anchor="end">1</text><text x="30" y="112" text-anchor="end">0</text>` +
      `<text x="346" y="${py(r.coop[r.coop.length - 1]) - 5}" text-anchor="end" class="gl">katkı oranı</text><text x="346" y="${py(r.trust[r.trust.length - 1]) + 12}" text-anchor="end" class="gl">güven</text>`;
    const sx = (v: number) => 34 + v * 316, n = S.sweep;
    const sl = (key: 'capital' | 'antiShare', cls: string, col: string) => `<polyline points="${n.map((p) => `${sx(p.ineq).toFixed(1)},${py(p[key]).toFixed(1)}`).join(' ')}" class="ln ${cls}" stroke="${col}"/>`;
    $('schart').innerHTML = `<line class="grid" x1="34" y1="112" x2="350" y2="112"/><line class="grid" x1="34" y1="16" x2="34" y2="112"/>` +
      sl('capital', '', 'var(--gld)') + sl('antiShare', 'dash', 'var(--red)') +
      `<line x1="${sx(S.ineq)}" y1="16" x2="${sx(S.ineq)}" y2="112" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="2 3"/>` +
      `<text x="350" y="126" text-anchor="end">gelir eşitsizliği</text><text x="40" y="${py(n[0].capital) - 6}" class="gl">sosyal sermaye</text><text x="346" y="${py(n[n.length - 1].antiShare) - 6}" text-anchor="end" class="gl">antisosyal ceza payı</text>`;
  }

  // ---------- Çubuk ve çizim ----------
  function render(): void {
    if (S.tab === 0) {
      drawGrid(); drawChart();
      const m = S.m;
      meter(0, 'Ortalama parça', Math.min(1, m.meanKm / 100), `${Math.round(m.meanKm)} km`, 'var(--pfc)');
      meter(1, 'Çatışma riski', m.risk, `%${pct(m.risk)}`, 'var(--red)');
      meter(2, 'Mutsuz kişi', m.unhappy, `%${pct(m.unhappy)}`, 'var(--lesion)');
    } else if (S.tab === 1) {
      drawMap(); drawTests();
      const c = cultureOf(S.L, S.V);
      meter(0, 'Kollektivizm', c.K, `%${pct(c.K)}`, 'var(--pfc)'); meter(1, 'Bütüncül dikkat', c.Hol, `%${pct(c.Hol)}`, 'var(--pit)'); meter(2, 'Onur duyarlılığı', c.O, `%${pct(c.O)}`, 'var(--amy)');
    } else {
      drawHall(); drawCor(); drawPgg();
      const ins = corridor(S.h, true, 200, S.cseed + 50);
      meter(0, 'Hakaret sonrası şiddet', ins.violent, `%${pct(ins.violent)}`, 'var(--red)');
      meter(1, 'Antisosyal ceza payı', S.pg.antiShare, `%${pct(S.pg.antiShare)}`, 'var(--amy)');
      meter(2, 'Sosyal sermaye', S.pg.capital, `%${pct(S.pg.capital)}`, 'var(--gld)');
    }
    sayEl.textContent = say();
  }
  function say(): string {
    if (S.tab === 0) {
      const base = describeGrid(S.m, S.pref, S.fenced);
      return S.calm >= 5 ? `${base} Hareket durdu: denge.` : base;
    }
    if (S.tab === 1) {
      const c = cultureOf(S.L, S.V);
      const kind = c.K > 0.55 ? 'kollektivist ve bütüncül' : c.O > 0.5 ? 'bireyci, onurunu sert savunan' : 'bireyci ve analitik';
      return `Bu ekolojide eğilim: ${kind}. Kollektivizm %${pct(c.K)}, bütüncül dikkat %${pct(c.Hol)}, onur duyarlılığı %${pct(c.O)}.`;
    }
    if (S.last === 'pgg') return describePgg(S.pg);
    const c0 = corridor(S.h, S.insult, 200, S.cseed + (S.insult ? 50 : 0));
    return `Onur kültürü %${pct(S.h)}: ${S.insult ? 'hakaretten sonra' : 'hakaret olmadan'} hikâyeyi şiddetle bitirenler %${pct(c0.violent)}.`;
  }
  const announce = scope.announcer($('live'), () => sayEl.textContent ?? '', 700);

  // ---------- Olaylar ----------
  scope.on(root, 'input', (ev) => {
    const t = ev.target as HTMLInputElement, k = t.dataset.k;
    if (!k) return;
    const v = Number(t.value), f = v / 100;
    if (k === 'pref') { S.pref = f; setScen(null); S.m = analyze(S.w, S.pref); S.calm = 0; S.last = 'grid'; }
    else if (k === 'mob') { S.mob = f; setScen(null); S.calm = 0; S.last = 'grid'; }
    else if (k === 'ratio') { S.ratio = f; setScen(null); resetWorld(); S.last = 'grid'; }
    else if (k === 'L' || k === 'V') { if (k === 'L') S.L = f; else S.V = f; S.eco = null; root.querySelectorAll<HTMLElement>('[data-e]').forEach((b) => b.setAttribute('aria-pressed', 'false')); S.last = 'eco'; }
    else if (k === 'h') { S.h = f; root.querySelectorAll<HTMLElement>('[data-c]').forEach((b) => { if (b.dataset.c === 'north' || b.dataset.c === 'south') b.setAttribute('aria-pressed', 'false'); }); S.last = 'cor'; }
    else { if (k === 'ineq') S.ineq = f; else if (k === 'trust') S.trust = f; else S.cost = v; S.pp = null; markPresets(); runPgg(); S.last = 'pgg'; }
    syncSliders(); dirty = true; announce();
  });
  function markPresets(): void { root.querySelectorAll<HTMLElement>('[data-p]').forEach((b) => { if (b.dataset.p !== 'rerun') b.setAttribute('aria-pressed', String(b.dataset.p === S.pp)); }); }
  function setCor(h: number, insult: boolean): void {
    S.h = h; S.insult = insult; S.last = 'cor';
    root.querySelectorAll<HTMLElement>('[data-c]').forEach((b) => {
      const c = b.dataset.c!;
      if (c === 'north') b.setAttribute('aria-pressed', String(h < 0.5)); else if (c === 'south') b.setAttribute('aria-pressed', String(h >= 0.5)); else if (c === 'ins') b.setAttribute('aria-pressed', String(insult));
    });
    syncSliders(); dirty = true;
  }
  function setPgg(id: string): void {
    const p = PGG_PRESETS.find((x) => x.id === id)!;
    S.ineq = p.ineq; S.trust = p.trust; S.pp = id; markPresets(); syncSliders(); runPgg(); S.last = 'pgg'; dirty = true;
  }
  scope.on(root, 'click', (ev) => {
    const t = (ev.target as Element).closest('button');
    if (!t) return;
    const d = t.dataset;
    if (d.s) { applyScen(SCEN.find((s) => s.id === d.s)!); setPlaying(true); S.last = 'grid'; }
    else if (d.tool) { S.tool = d.tool as Tool; root.querySelectorAll<HTMLElement>('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b === t))); canvas.style.touchAction = S.tool === 'look' ? '' : 'none'; canvas.style.cursor = S.tool === 'look' ? '' : 'crosshair'; }
    else if (d.e) { pickEco(d.e); }
    else if (d.c) {
      if (d.c === 'north') setCor(0.2, S.insult); else if (d.c === 'south') setCor(0.8, S.insult);
      else if (d.c === 'ins') setCor(S.h, !S.insult); else { S.cseed++; S.last = 'cor'; dirty = true; }
    } else if (d.p) { if (d.p === 'rerun') { S.pseed++; runPgg(); S.last = 'pgg'; dirty = true; } else setPgg(d.p); }
    else {
      const r = t.getAttribute('data-ref');
      if (r === 'play') setPlaying(!S.playing);
      else if (r === 'step') { setPlaying(false); advance(1); }
      else if (r === 'fast') advance(40);
      else if (r === 'restart') { S.seed++; resetWorld(); }
      else if (r === 'allaut') { grantAll(S.w, S.m); S.fenced = true; S.m = analyze(S.w, S.pref); dirty = true; }
      else if (r === 'noborder') { clearBorders(S.w); S.fenced = false; setScen(null); S.m = analyze(S.w, S.pref); dirty = true; }
      else return;
      S.last = 'grid';
    }
    announce();
  });

  // Tema değişince kanvas yeniden çizilsin.
  if (typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(() => { dirty = true; });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    scope.onDispose(() => mo.disconnect());
  }

  // ---------- Döngü ----------
  let last = 0;
  function frame(now: number): void {
    const dt = last ? Math.max(0, (now - last) / 1000) : 0;
    last = now;
    if (S.tab === 0 && S.playing && S.calm < 5) {
      S.acc += reduce ? dt * 0.3 : dt;
      let n = 0;
      while (S.acc >= STEP_S && n < 3) { S.acc -= STEP_S; n++; }
      if (n) advance(n);
    }
    if (!dirty) return;
    dirty = false;
    render();
  }

  // ---------- Rehberli tur ----------
  const tour = createTour(scope, [
    { title: 'Karışık yaşam', text: 'İki grup iç içe yaşıyor, parçalar küçük. Henüz çatışmaya elverişli büyüklükte bir ada yok.', look: 'Ortalama parça yaklaşık 10 km, risk göstergesi düşük.',
      apply: () => { selectTab(0); applyScen(SCEN[0]); setPlaying(false); } },
    { title: 'Orta büyüklükte adalar', text: 'Benzerlik tercihi komşuluğu ayrıştırır, parçalar büyür. Kitaptaki gibi 20-60 km çaplı adalar oluşunca çatışma riski tepe yapar (Lim ve ark.).', look: 'Grafikte kırmızı çizginin sarı bandın içinde yükselmesi; kırmızı temas çizgileri.',
      apply: () => { selectTab(0); applyScen(SCEN[1], 7); setPlaying(false); } },
    { title: 'Net sınır', text: 'Hareketlilik düşükse orta adalar kalıcı olur. Sınırlar net ve tanınan (özerk) olunca temas çatışmaya dönüşmez (Rutherford: iyi çitler). "Sınırları kaldır" ile karşılaştırılabilir.', look: 'Yeşil özerk bölgeler ve risk çubuğunun düşüşü.',
      apply: () => { selectTab(0); applyScen(SCEN[2], 60); grantAll(S.w, S.m); S.fenced = true; S.m = analyze(S.w, S.pref); dirty = true; setPlaying(false); } },
    { title: 'Pirinç ve buğday', text: 'Pirinç, komşularla ortak sulama emeği ister; buğday bireysel çalışılır. Pirinç bölgelerinde kollektivist, bütüncül eğilim daha belirgin (Talhelm, Masuda ve Nisbett). Her iki replikasyon da karışık.', look: 'Haritada kalın çizgiler; "Buğday" düğmesine geçince kollektivizmin düşmesi.',
      apply: () => { selectTab(1); pickEco('rice'); } },
    { title: 'Onur kültürü', text: 'Hırsızlığa açık sürü ekolojisinden gelen onur kültüründe hakaret, kişisel saldırı sayılır. Koridor deneyinde hakarete uğrayan Güneyli erkeklerde hormonlar ve hayal edilen şiddet artar, Kuzeylilerde artmaz.', look: 'Güneyli ve Kuzeyli seçince "Hakaret" sütunundaki farklar.',
      apply: () => { selectTab(2); setCor(0.8, true); } },
    { title: 'Antisosyal ceza', text: 'Güven ve hukuk zayıf, gelir eşitsizliği yüksekse ceza hile yapana değil, cömert olana da gider (Yunanistan ve Umman). Avustralya örüntüsünde bu neredeyse yoktur.', look: 'Ceza çubuğunda kırmızı pay ve eşitsizlik eğrisinde sosyal sermayenin düşüşü.',
      apply: () => { selectTab(2); setPgg('lo'); } },
  ]);
  $('tourHost').appendChild(tour.el);

  // ---------- Başlangıç ----------
  runPgg(); markPresets();
  pickEco('rice'); setCor(0.8, true);
  applyScen(SCEN[1], 6); setPlaying(true);
  S.last = 'grid';
  tour.go(0);
  syncSliders(); render(); dirty = false;
  scope.loop(frame, { root, onResume: () => { dirty = true; last = performance.now(); } });

  return () => { scope.dispose(); container.innerHTML = ''; };
}
