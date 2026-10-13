// Sekme 2: Biz/Onlar kaydırıcısı. Merkezdeki kişi için kimin "biz" sayıldığı ayarlarla yeniden çizilir.
import { mulberry32 } from '../rng';
import { createTour } from '../tour';
import { L } from './text';
import { chipRow, makeSlider, pc, type Ctx, type Meter, type Panel } from '../ui';
import { BIZ_DEFAULT, N_PEOPLE, VIEW_H, VIEW_W, bizView, describeBiz, makePeople, timeline, type BizInputs, type BizView } from './model';

const SVGNS = 'http://www.w3.org/2000/svg';
const node = (tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement => {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.appendChild(e);
  return e as SVGElement;
};

const PRESETS: Array<{ key: string; set: Partial<BizInputs> }> = [
  { key: 'base', set: { ...BIZ_DEFAULT } },
  { key: 'label', set: { ...BIZ_DEFAULT, label: 1 } },
  { key: 'goal', set: { ...BIZ_DEFAULT, goal: 1 } },
  { key: 'contact', set: { ...BIZ_DEFAULT, contact: 0.8, goal: 0.5 } },
  { key: 'threat', set: { ...BIZ_DEFAULT, threat: 1 } },
];

export function createBizPanel(ctx: Ctx, host: HTMLElement) {
  const T = L().biz;
  const inp: BizInputs = { ...BIZ_DEFAULT };
  const people = makePeople(mulberry32(11));
  let ego = 0;
  let view: BizView = bizView(people, ego, inp);
  let dirty = true, playing = false, last = 0;
  const hid = `${ctx.id}-h`;

  host.innerHTML =
    '<div data-ref="tour"></div>' +
    '<div class="chips" data-ref="presets"></div>' +
    `<section class="card" aria-label="${T.netAria}">` +
    `<h3 class="sim-h">${T.netTitle}</h3>` +
    '<div class="chips" data-ref="egos"></div>' +
    '<div class="stage"><svg viewBox="0 0 ' + VIEW_W + ' ' + VIEW_H + '" role="group" aria-label="' + T.netSvgAria + '" data-ref="net"></svg>' +
    '<div class="legend" data-ref="lg"></div></div>' +
    '<p class="note">' + T.netNote + '</p>' +
    '</section>' +
    `<section class="card" aria-label="${L().common.inputs}"><h3 class="sim-h">${L().common.inputs}</h3><div class="sliders" data-ref="sl"></div>` +
    `<div class="row"><button type="button" class="btn tour-next" data-ref="play">${T.play}</button></div></section>` +
    `<section class="card" aria-label="${T.tlAria}"><h3 class="sim-h">${T.tlTitle}</h3>` +
    '<div class="chart"><svg viewBox="0 0 360 168" role="img" aria-label="" data-ref="tl"></svg>' +
    '<div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h24" stroke="var(--pfc)" stroke-width="2.6"/></svg>' + T.tlLegend[0] + '</span>' +
    '<span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h24" stroke="var(--dop)" stroke-width="2.6" stroke-dasharray="5 3"/></svg>' + T.tlLegend[1] + '</span></div></div>' +
    '<p class="note" data-ref="tlNote"></p></section>' +
    '<div class="notes" data-notes="biz"></div>';

  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const net = q<SVGSVGElement>('net'), tl = q<SVGSVGElement>('tl');

  /* ---- Lejant ---- */
  const icon = (inner: string): string => `<svg viewBox="0 0 26 22" aria-hidden="true">${inner}</svg>`;
  const hatch = (id: string): string => `<defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--dop)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--panel)" stroke-width="1.8"/></pattern></defs>`;
  q('lg').innerHTML =
    `<span>${icon('<rect x="6" y="3" width="14" height="14" fill="var(--muted)"/>')}${T.legend[0]}</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="var(--muted)"/>')}${T.legend[1]}</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="var(--pfc)"/>')}${T.legend[2]}</span>` +
    `<span>${icon(hatch(`${hid}-l`) + `<circle cx="13" cy="10" r="8" fill="url(#${hid}-l)"/>`)}${T.legend[3]}</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="none" stroke="var(--ink)" stroke-width="2.6"/>')}${T.legend[4]}</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="none" stroke="var(--edge)" stroke-width="2" stroke-dasharray="3 3"/>')}${T.legend[5]}</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="var(--muted)" fill-opacity=".4"/>')}${T.legend[6]}</span>`;

  /* ---- Ağ ---- */
  net.insertAdjacentHTML('afterbegin', hatch(hid));
  node('text', { class: 'gl', x: 70, y: 12, 'text-anchor': 'middle' }, net).textContent = T.groupLabels[0];
  node('text', { class: 'gl', x: 290, y: 12, 'text-anchor': 'middle' }, net).textContent = T.groupLabels[1];
  const lines = people.map(() => node('line', { class: 'tie', x1: 0, y1: 0, x2: 0, y2: 0, visibility: 'hidden' }, net));
  const gs = people.map((p) => {
    const g = node('g', { class: 'pp', tabindex: 0, role: 'button', transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` }, net);
    node('circle', { class: 'ring', r: 17, fill: 'none' }, g);
    node('circle', { class: 'ring2', r: 22, fill: 'none' }, g);
    const fill = p.c === 0 ? 'var(--pfc)' : `url(#${hid})`;
    if (p.g === 0) node('rect', { class: 'sh', x: -9, y: -9, width: 18, height: 18, fill, stroke: 'var(--ink)', 'stroke-width': 1 }, g);
    else node('circle', { class: 'sh', r: 10, fill, stroke: 'var(--ink)', 'stroke-width': 1 }, g);
    node('text', { class: 'tag', x: 0, y: 32, 'text-anchor': 'middle' }, g).textContent = '';
    ctx.scope.on(g, 'click', () => pick(p.id));
    ctx.scope.on(g as unknown as HTMLElement, 'keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(p.id); } });
    return g;
  });
  function pick(i: number): void { ego = i; dirty = true; ctx.touch(); setEgo(i === 0 ? 'e0' : i === N_PEOPLE / 2 ? 'e1' : null); }
  const setEgo = chipRow(q('egos'), ctx, [{ key: 'e0', label: T.egoChips.e0 }, { key: 'e1', label: T.egoChips.e1 }], (k) => { ego = k === 'e0' ? 0 : N_PEOPLE / 2; dirty = true; setEgo(k); }, T.egoAria);
  setEgo('e0');

  /* ---- Girdiler ---- */
  const sl: Record<string, ReturnType<typeof makeSlider>> = {};
  const sld = (key: keyof BizInputs, name: string, hint: string, color: string, fmt: (v: number) => string = (v) => pc(v / 100)) =>
    (sl[key] = makeSlider(ctx, q('sl'), key, name, hint, 0, 100, Math.round(inp[key] * 100), (v) => { inp[key] = v / 100; dirty = true; setPre(null); }, fmt, color));
  const setPre = chipRow(q('presets'), ctx, PRESETS.map((p) => ({ key: p.key, label: T.presets[p.key] })), (k) => { set(PRESETS.find((p) => p.key === k)!.set); setPre(k); }, L().common.presets);
  setPre('base');
  sld('goal', T.sliders.goal.name, T.sliders.goal.hint, 'var(--gld)');
  sld('label', T.sliders.label.name, T.sliders.label.hint, 'var(--pfc)');
  sld('contact', T.sliders.contact.name, T.sliders.contact.hint, 'var(--pit)');
  sld('threat', T.sliders.threat.name, T.sliders.threat.hint, 'var(--amy)');
  sld('time', T.sliders.time.name, T.sliders.time.hint, 'var(--ink)', T.timeVal);

  function set(p: Partial<BizInputs>): void {
    Object.assign(inp, p);
    (Object.keys(sl) as Array<keyof BizInputs>).forEach((k) => sl[k].set(Math.round(inp[k] * 100)));
    dirty = true;
  }
  ctx.scope.on(q('play'), 'click', () => {
    if (!playing && inp.time >= 0.99) set({ time: 0 });
    playing = !playing; last = 0; q('play').textContent = playing ? T.pause : T.play; ctx.touch();
  });

  /* ---- Çizim ---- */
  function renderNet(): void {
    const e = people[ego];
    people.forEach((p, i) => {
      const t = view.tiers[i], g = gs[i];
      g.setAttribute('class', `pp t-${t}`);
      g.setAttribute('aria-label', T.person(i + 1, !!p.g, !!p.c, t));
      g.setAttribute('aria-pressed', String(t === 'ego'));
      g.querySelector('.tag')!.textContent = t === 'ego' ? T.center : '';
      const ln = lines[i];
      if (t === 'biz') { ln.setAttribute('x1', String(e.x)); ln.setAttribute('y1', String(e.y)); ln.setAttribute('x2', String(p.x)); ln.setAttribute('y2', String(p.y)); ln.setAttribute('visibility', 'visible'); }
      else ln.setAttribute('visibility', 'hidden');
    });
  }
  const TX0 = 34, TW = 312, TY = 124, TH = 96, TMAX = 12;
  function renderTl(): void {
    const tx = (t: number) => TX0 + t * TW, ty = (n: number) => TY - (n / TMAX) * TH;
    const data = timeline(people, ego, inp);
    let s = '';
    for (const n of [0, 6, 12]) s += `<line class="grid" x1="${TX0}" y1="${ty(n)}" x2="${TX0 + TW}" y2="${ty(n)}"/><text class="ax" x="${TX0 - 6}" y="${ty(n) + 3.5}" text-anchor="end">${n}</text>`;
    for (const t of [0, 0.5, 1]) s += `<text class="ax" x="${tx(t)}" y="${TY + 14}" text-anchor="${t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}">${t === 0 ? T.tlStart : t === 1 ? T.tlEnd : T.tlMid}</text>`;
    const path = (f: (d: (typeof data)[number]) => number) => data.map((d, k) => `${k ? 'L' : 'M'}${tx(d.t).toFixed(1)} ${ty(f(d)).toFixed(1)}`).join('');
    s += `<path d="${path((d) => d.old)}" fill="none" stroke="var(--pfc)" stroke-width="2.6" stroke-linejoin="round"/>`;
    s += `<path d="${path((d) => d.neu)}" fill="none" stroke="var(--dop)" stroke-width="2.6" stroke-dasharray="5 3" stroke-linejoin="round"/>`;
    s += `<line x1="${tx(inp.time)}" y1="${TY - TH - 2}" x2="${tx(inp.time)}" y2="${TY}" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="2 3"/>`;
    s += `<circle cx="${tx(inp.time)}" cy="${ty(view.bizOld)}" r="4.5" fill="var(--pfc)" stroke="var(--ink)" stroke-width="1.4"/><circle cx="${tx(inp.time)}" cy="${ty(view.bizNew)}" r="4.5" fill="var(--dop)" stroke="var(--ink)" stroke-width="1.4"/>`;
    s += `<text class="ax" x="10" y="${TY - TH / 2}" text-anchor="middle" transform="rotate(-90 10 ${TY - TH / 2})">${T.tlYAxis}</text>`;
    s += `<text class="ax" x="${TX0 + TW / 2}" y="${TY + 30}" text-anchor="middle">${T.tlXAxis}</text>`;
    tl.innerHTML = s;
    const end = data[data.length - 1];
    tl.setAttribute('aria-label', T.tlSvgAria(data[0].old, data[0].neu, end.old, end.neu));
    q('tlNote').textContent = T.tlNote(view.bizOld, view.nIn, view.bizNew, view.nOut);
  }

  /* ---- Rehberli tur ---- */
  const tour = createTour(ctx.scope, [
    { ...T.tour[0], apply: () => { set({ ...BIZ_DEFAULT }); setPre('base'); } },
    { ...T.tour[1], apply: () => { set({ ...BIZ_DEFAULT, label: 1 }); setPre('label'); } },
    { ...T.tour[2], apply: () => { set({ ...BIZ_DEFAULT, goal: 1 }); setPre('goal'); } },
    { ...T.tour[3], apply: () => { set({ ...BIZ_DEFAULT, contact: 0.8, goal: 0.5, time: 0.9 }); setPre('contact'); } },
    { ...T.tour[4], apply: () => { set({ goal: 0.8, label: 0.8, contact: 0.8, threat: 1, time: 0.9 }); setPre(null); } },
    { ...T.tour[5], apply: () => { set({ goal: 0.8, label: 0.8, contact: 0.8, threat: 0.1, time: 0.9 }); setPre(null); } },
  ], { onExit: () => ctx.touch() });
  q('tour').replaceWith(tour.el);

  return {
    draw(now = 0): boolean {
      if (playing) {
        const dt = last ? Math.max(0, (now - last) / 1000) : 0;
        last = now;
        if (dt > 0) {
          inp.time = Math.min(1, inp.time + dt / 8);
          sl.time.set(Math.round(inp.time * 100)); dirty = true;
          if (inp.time >= 1) { playing = false; q('play').textContent = T.play; ctx.touch(); }
        }
      }
      if (!dirty) return false;
      dirty = false;
      view = bizView(people, ego, inp);
      renderNet(); renderTl();
      return true;
    },
    resume() { last = 0; },
    say: () => describeBiz(view),
    meters: (): Meter[] => [
      { label: T.meters.count, value: `${view.nBiz} / ${N_PEOPLE - 1}`, frac: view.nBiz / (N_PEOPLE - 1), color: 'var(--ink)' },
      { label: T.meters.within, value: pc(view.meanIn), frac: view.meanIn, color: 'var(--pfc)' },
      { label: T.meters.outside, value: pc(view.meanOut), frac: view.meanOut, color: 'var(--dop)' },
    ],
    set,
  } satisfies Panel & { set(p: Partial<BizInputs>): void };
}
