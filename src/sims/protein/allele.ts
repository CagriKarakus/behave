// Küçük ek kart: bir varyantın (alelin) popülasyonda yayılması. Wright-Fisher: her nesil seçilim + rastlantısal örnekleme (sürüklenme).
import { percent } from '../../i18n/fmt';
import { mulberry32 } from '../rng';
import { svg, svgText } from '../kit';
import { chips, el, pc, slider, type Ctx } from '../ui';
import { fitness, runWF, selectP, type SelMode } from './model';
import { L } from './text';

const SIZES = [20, 50, 100, 200, 500];
const GENS = 100;
const RUNS = 30;
const X0 = 38, X1 = 350, Y0 = 8, Y1 = 118;

export function createAllele(ctx: Ctx, host: HTMLElement, getF: () => number) {
  const a = L().allele;
  let mode: SelMode = 'yararli', strength = 5, p0 = 10, ni = 2, seed = 7;
  let dirty = true;
  host.innerHTML =
    `<p class="note">${a.intro}</p>` +
    '<div class="chips" data-ref="mo"></div><div class="sliders" data-ref="sl"></div><div class="row" data-ref="ac"></div>' +
    `<div class="chart"><svg viewBox="0 0 360 150" role="img" aria-label="${a.chartAria}" data-ref="ch"></svg></div>` +
    '<p class="say-al" data-ref="out"></p>';
  const q = <T extends HTMLElement | SVGElement = HTMLElement>(k: string): T => host.querySelector<T>(`[data-ref="${k}"]`) as T;
  const touch = (): void => { dirty = true; };

  const setMode = chips(q('mo'), ctx.scope, (['notr', 'yararli', 'zararli', 'denge'] as const).map((key) => ({ key, label: a.modes[key] })),
    (k) => { mode = k as SelMode; setMode(mode); touch(); }, a.modeAria);
  const sl = q('sl');
  const sS = slider(ctx.scope, sl, { id: `${ctx.id}-al-s`, name: a.sName, hint: a.sHint, min: 1, max: 20, value: strength, cls: 'sl', fmt: (v) => percent(String(v)), onInput: (v) => { strength = v; touch(); } });
  slider(ctx.scope, sl, { id: `${ctx.id}-al-p`, name: a.pName, hint: a.pHint, min: 1, max: 50, value: p0, cls: 'sl', fmt: (v) => percent(String(v)), onInput: (v) => { p0 = v; touch(); } });
  slider(ctx.scope, sl, { id: `${ctx.id}-al-n`, name: a.nName, hint: a.nHint, min: 0, max: SIZES.length - 1, value: ni, cls: 'sl', fmt: (v) => a.nFmt(SIZES[v]), onInput: (v) => { ni = v; touch(); } });
  const ac = q('ac');
  const again = el(ac, 'button', 'btn', a.again); again.type = 'button';
  ctx.scope.on(again, 'click', () => { seed++; touch(); });
  const fromMut = el(ac, 'button', 'btn', a.fromMut); fromMut.type = 'button';
  ctx.scope.on(fromMut, 'click', () => {
    const f = getF();
    mode = f >= 0.995 ? 'notr' : 'zararli';
    strength = Math.max(1, Math.round((1 - f) * 20));
    sS.set(strength);
    setMode(mode); touch();
  });
  setMode(mode);

  const gx = (g: number): number => X0 + (g / GENS) * (X1 - X0);
  const gy = (p: number): number => Y1 - p * (Y1 - Y0);
  const path = (xs: number[]): string => xs.map((p, g) => `${g ? 'L' : 'M'}${gx(g).toFixed(1)} ${gy(p).toFixed(1)}`).join('');

  function render(): void {
    const w = fitness(mode, strength / 100);
    const rnd = mulberry32(seed * 977 + ni);
    const runs = Array.from({ length: RUNS }, () => runWF(p0 / 100, SIZES[ni], GENS, w, rnd));
    const ends = runs.map((r) => r[r.length - 1]);
    const fix = ends.filter((e) => e === 1).length, lost = ends.filter((e) => e === 0).length;
    const mean = ends.reduce((s, v) => s + v, 0) / RUNS;
    const exp = [p0 / 100];
    for (let g = 0; g < GENS; g++) exp.push(selectP(exp[g], w));
    const s = q<SVGElement>('ch');
    s.innerHTML = '';
    for (const v of [0, 0.5, 1]) {
      svg('line', { x1: X0, x2: X1, y1: gy(v), y2: gy(v), class: 'grid' }, s);
      svgText(s, { x: X0 - 6, y: gy(v) + 3, 'text-anchor': 'end' }, pc(v));
    }
    svgText(s, { x: X0, y: 138 }, '0');
    svgText(s, { x: X1, y: 138, 'text-anchor': 'end' }, a.gens(GENS));
    runs.slice(0, 12).forEach((r) => svg('path', { d: path(r), class: 'ln al-run' }, s));
    svg('path', { d: path(exp), class: 'ln al-exp' }, s);
    q('out').textContent = a.out(RUNS, fix, lost, RUNS - fix - lost, pc(mean));
  }
  return {
    draw(): boolean { if (!dirty) return false; dirty = false; render(); return true; },
  };
}
