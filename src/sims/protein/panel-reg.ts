// Sekme 2: Gen düzenlenmesi. Sinyal -> transkripsiyon faktörü (TF) -> promotör -> gen; metilasyon kilidi; alternatif ekleme.
import { svg, svgText } from '../kit';
import { el, pc, slider, type Ctx, type Meter } from '../ui';
import { EXONS, expression, splice, type RegOut } from './model';
import { L } from './text';

const W = 168, X = [6, 186];

export interface RegState { sig: [number, number]; tf: number; me: [boolean, boolean]; e2: boolean; e3: boolean }

export function createRegPanel(ctx: Ctx, host: HTMLElement) {
  const r = L().reg;
  const S: RegState = { sig: [10, 80], tf: 100, me: [false, false], e2: true, e3: true };
  let dirty = true;

  host.innerHTML =
    `<p class="note">${r.intro}</p>` +
    `<div class="stage"><svg viewBox="0 0 360 262" role="img" aria-label="${r.sceneAria}" data-ref="sc"></svg>` +
    `<div class="legend"><span><i style="background:var(--eff)"></i>${r.legHormone}</span><span><i style="background:var(--pfc)"></i>${r.legTf}</span><span><i style="background:var(--gld);border-radius:2px"></i>${r.legGene}</span><span><i style="background:var(--red);border-radius:2px"></i>${r.legMethyl}</span></div></div>` +
    `<div class="card"><h3 class="sim-h">${r.inputs}</h3><div class="sliders" data-ref="sl"></div><div class="row" data-ref="mt"></div></div>` +
    `<div class="card"><h3 class="sim-h">${r.splitTitle}</h3>` +
    `<p class="note">${r.splitNote}</p>` +
    `<div class="row" data-ref="ex"></div><div class="exrow" data-ref="pre" aria-label="${r.exonsAria}"></div><div class="exrow" data-ref="mat" aria-label="${r.matureAria}"></div>` +
    '<p data-ref="sp"></p></div>';
  const q = <T extends HTMLElement | SVGElement = HTMLElement>(k: string): T => host.querySelector<T>(`[data-ref="${k}"]`) as T;
  const mark = (): void => { dirty = true; ctx.touch(); };

  const sl = q('sl');
  const hs = [0, 1].map((i) => slider(ctx.scope, sl, {
    id: `${ctx.id}-sig${i}`, name: r.sigName('AB'[i]), hint: i ? r.sigHintHigh : r.sigHintLow,
    min: 0, max: 100, value: S.sig[i], cls: 'sl', color: 'var(--eff)', fmt: (v) => `%${v}`, onInput: (v) => { S.sig[i] = v; mark(); },
  }));
  const hTf = slider(ctx.scope, sl, {
    id: `${ctx.id}-tf`, name: r.tfName, hint: r.tfHint, min: 0, max: 100, value: S.tf, cls: 'sl', color: 'var(--pfc)', fmt: (v) => `%${v}`,
    onInput: (v) => { S.tf = v; mark(); },
  });
  const mt = q('mt');
  const mBtn = [0, 1].map((i) => {
    const b = el(mt, 'button', 'btn', r.lockBtn('AB'[i])); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    ctx.scope.on(b, 'click', () => { S.me[i] = !S.me[i]; mark(); });
    return b;
  });
  const exBtn = [1, 2].map((i) => {
    const b = el(q('ex'), 'button', 'btn', r.exonBtn(EXONS[i].id, L().roles[EXONS[i].role])); b.type = 'button'; b.setAttribute('aria-pressed', 'true');
    ctx.scope.on(b, 'click', () => { if (i === 1) S.e2 = !S.e2; else S.e3 = !S.e3; mark(); });
    return b;
  });

  const out = (): RegOut[] => [0, 1].map((i) => expression({ signal: S.sig[i] / 100, tf: S.tf / 100, methyl: S.me[i] }));

  function cell(s: SVGElement, i: number, o: RegOut): void {
    const x0 = X[i];
    const cx = x0 + 35;
    svg('rect', { x: x0, y: 16, width: W, height: 238, rx: 12, class: 'cell' }, s);
    svgText(s, { x: x0 + W / 2, y: 34, 'text-anchor': 'middle', class: 'ct' }, r.env('AB'[i]));
    // hormon noktaları
    const n = Math.round((S.sig[i] / 100) * 5);
    for (let k = 0; k < 5; k++) svg('circle', { cx: x0 + 18 + k * 13, cy: 64, r: 5, class: k < n ? 'hor on' : 'hor' }, s);
    svgText(s, { x: x0 + 88, y: 68 }, r.hormone(pc(S.sig[i] / 100)));
    svg('path', { d: `M${cx} 74V90M${cx - 4} 85L${cx} 90L${cx + 4} 85`, class: 'arr' }, s);
    // TF
    svg('circle', { cx, cy: 108, r: 16, class: 'tf0' }, s);
    svg('circle', { cx, cy: 108, r: Math.max(0.1, 16 * o.tfActive), class: 'tf1' }, s);
    svgText(s, { x: x0 + 60, y: 105 }, r.tfActive);
    svgText(s, { x: x0 + 60, y: 118 }, pc(o.tfActive));
    // TF -> promotör
    svg('path', { d: `M${cx} 126V147M${cx - 4} 142L${cx} 147L${cx + 4} 142`, class: 'arr' }, s);
    if (S.me[i]) svg('path', { d: `M${cx - 6} 130L${cx + 6} 142M${cx + 6} 130L${cx - 6} 142`, class: 'xx' }, s);
    svgText(s, { x: x0 + 52, y: 140 }, S.me[i] ? r.cannotSit : r.sit(pc(o.bound)));
    // DNA
    svg('line', { x1: x0 + 8, x2: x0 + W - 8, y1: 170, y2: 170, class: 'dna' }, s);
    svg('rect', { x: x0 + 12, y: 162, width: 46, height: 16, rx: 3, class: 'prom' }, s);
    svg('rect', { x: x0 + 62, y: 162, width: 94, height: 16, rx: 3, class: o.state === 'kapalı' ? 'gene' : o.state === 'kısmen' ? 'gene half' : 'gene on' }, s);
    svgText(s, { x: x0 + 35, y: 158, 'text-anchor': 'middle' }, r.promoter);
    svgText(s, { x: x0 + 109, y: 157, 'text-anchor': 'middle' }, r.gene);
    // metil işaretleri
    if (S.me[i]) {
      for (const dx of [-14, 0, 14]) { svg('path', { d: `M${cx + dx} 178V188`, class: 'stem' }, s); svg('circle', { cx: cx + dx, cy: 192, r: 4.5, class: 'me' }, s); }
      svgText(s, { x: cx, y: 210, 'text-anchor': 'middle' }, r.methyl);
    }
    // mRNA
    const nm = Math.round(o.expr * 6);
    for (let k = 0; k < nm; k++) svg('path', { d: `M${x0 + 66 + k * 15} 192q3.5 -7 7 0t7 0`, class: 'mrna' }, s);
    svgText(s, { x: x0 + 109, y: 210, 'text-anchor': 'middle' }, r.mrna);
    svgText(s, { x: x0 + W / 2, y: 236, 'text-anchor': 'middle', class: 'ex' }, r.geneExpr(L().geneState[o.state], pc(o.expr)));
    svg('rect', { x: x0 + 12, y: 242, width: W - 24, height: 6, rx: 3, class: 'trk' }, s);
    svg('rect', { x: x0 + 12, y: 242, width: Math.max(0, (W - 24) * o.expr), height: 6, rx: 3, class: 'fil' }, s);
  }

  function render(): void {
    const os = out();
    const s = q<SVGElement>('sc');
    s.innerHTML = '';
    cell(s, 0, os[0]);
    cell(s, 1, os[1]);
    mBtn.forEach((b, i) => b.setAttribute('aria-pressed', String(S.me[i])));
    exBtn[0].setAttribute('aria-pressed', String(S.e2));
    exBtn[1].setAttribute('aria-pressed', String(S.e3));
    const blocks = (on: (id: string) => boolean): string => EXONS.map((e) => `<span class="exn${on(e.id) ? '' : ' skip'}" style="flex:${e.len}"><b>${e.id}</b>${L().roles[e.role]}${on(e.id) ? '' : r.skipped}</span>`).join('');
    q('pre').innerHTML = blocks(() => true);
    const sp = splice(S.e2, S.e3);
    q('mat').innerHTML = EXONS.filter((e) => sp.exons.includes(e.id)).map((e) => `<span class="exn mat" style="flex:${e.len}"><b>${e.id}</b>${L().roles[e.role]}</span>`).join('');
    q('sp').textContent = r.product(sp.len, sp.does);
  }

  return {
    say(): string {
      const os = out(), sp = splice(S.e2, S.e3);
      const gs = L().geneState;
      const lock = S.me[0] || S.me[1] ? r.lock([S.me[0] && 'A', S.me[1] && 'B'].filter(Boolean) as string[]) : '';
      return r.say(gs[os[0].state], pc(os[0].expr), gs[os[1].state], pc(os[1].expr), lock, sp.exons.join('-'), sp.len);
    },
    meters(): Meter[] {
      const os = out(), sp = splice(S.e2, S.e3);
      return [
        { label: r.mExprA, value: pc(os[0].expr), frac: os[0].expr, color: 'var(--gld)' },
        { label: r.mExprB, value: pc(os[1].expr), frac: os[1].expr, color: 'var(--gld)' },
        { label: r.mLen, value: r.mLenVal(sp.len), frac: sp.len / 210, color: 'var(--pit)' },
      ];
    },
    draw(): boolean { if (!dirty) return false; dirty = false; render(); return true; },
    /** Tur: durumu kur. */
    set(p: Partial<{ a: number; b: number; tf: number; meA: boolean; meB: boolean; e2: boolean; e3: boolean }>): void {
      if (p.a !== undefined) { S.sig[0] = p.a; hs[0].set(p.a); }
      if (p.b !== undefined) { S.sig[1] = p.b; hs[1].set(p.b); }
      if (p.tf !== undefined) { S.tf = p.tf; hTf.set(p.tf); }
      if (p.meA !== undefined) S.me[0] = p.meA;
      if (p.meB !== undefined) S.me[1] = p.meB;
      if (p.e2 !== undefined) S.e2 = p.e2;
      if (p.e3 !== undefined) S.e3 = p.e3;
      dirty = true;
    },
  };
}
