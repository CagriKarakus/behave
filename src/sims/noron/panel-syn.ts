// Sekme 2: Sinaps. Salım -> reseptöre bağlanma -> geri alım / enzimle yıkım; ilaç benzeri engeller sinyalin düzeyini ve süresini değiştirir.
import { decimalSep } from '../../i18n/locale';
import { pct } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { svg, svgText } from '../kit';
import { SYN_DEFAULT, advanceSyn, clamp, createSyn, f1, f2, release, singleSpike, type Single, type Syn, type SynP, type SynType } from './model';
import { mulberry32 } from '../rng';
import type { TourStep } from '../tour';
import { L } from './text';
import { chipRow, el, gridY, linePath, makeSlider, toggleBtn, type Ctx, type Meter, type SliderHandle } from './ui';

const SPEED = 40;   // gerçek 1 sn = 40 ms model zamanı
const WIN = 200;
const NP = 48;      // sinaptik aralıktaki parçacık yuvası
const CMAX = 2.4;   // C grafiği tavanı
const RECV = [66, 114, 162, 210, 258, 306];
const CH = { x0: 34, x1: 352 };
const cxs = (s: Syn, t: number): number => CH.x1 - (s.t - t) / WIN * (CH.x1 - CH.x0);

export function createSynPanel(ctx: Ctx, host: HTMLElement) {
  const X = L().syn;
  const P: SynP = { ...SYN_DEFAULT };
  let s = createSyn();
  let paused = false, dirty = true, last = -1;
  let one: Single = singleSpike(P), base: Single = one, oneDirty = true;
  let seenRel = 0, flash = -1e9;
  const rnd = mulberry32(9);
  const slots = Array.from({ length: NP }, () => ({ x: 46 + rnd() * 268, y: 84 + rnd() * 60, a: rnd() * 6.28, b: rnd() * 6.28 }));

  let st = '<path class="term" d="M30 6H330V52Q330 72 310 72H50Q30 72 30 52Z"/>' +
    `<text class="lb" x="40" y="20">${X.presyn}</text>` +
    '<path data-r="imp" class="imp" d="M205 3L195 20H203L199 33L213 14H205Z" opacity="0"/>';
  for (const [x, y] of [[70, 38], [112, 50], [152, 36], [252, 40]]) st += `<circle class="ves" cx="${x}" cy="${y}" r="10"/><circle class="vd" cx="${x}" cy="${y}" r="3.5"/>`;
  st += '<circle data-r="dv" class="ves" cx="200" cy="58" r="10"/><circle class="vd" data-r="dvd" cx="200" cy="58" r="3.5"/>' +
    '<rect class="pump" x="276" y="64" width="28" height="12" rx="4"/><path class="pumpa" d="M290 64V46M285 52L290 46L295 52"/>' +
    `<text class="lb" x="290" y="92" text-anchor="middle">${X.pump}</text><path data-r="xru" class="xx" opacity="0" d="M279 62L301 80M301 62L279 80"/>`;
  for (const [x, y] of [[74, 132], [178, 112], [300, 134]]) st += `<g data-r="enz"><path class="enz" d="M-7 0L0 -7L7 0L0 7Z" transform="translate(${x} ${y})"/></g>`;
  st += '<path data-r="xen" class="xx" opacity="0" d="M164 100L192 124M192 100L164 124"/>';
  for (let i = 0; i < NP; i++) st += `<circle data-r="np${i}" class="np" r="3.2" cx="60" cy="100" opacity="0"/>`;
  st += '<path class="mem" d="M30 150H330"/>';
  RECV.forEach((x, i) => { st += `<path data-r="rc${i}" class="rc" d="M${x - 10} 148Q${x - 10} 164 ${x} 164Q${x + 10} 164 ${x + 10} 148"/>`; });
  st += `<rect class="post" x="30" y="170" width="300" height="60" rx="12"/><text class="lb" x="42" y="190">${X.postsyn}</text>`;

  host.innerHTML =
    `<p class="note">${X.note}</p>` +
    '<div class="chips" data-ref="type"></div>' +
    `<div class="stage"><svg viewBox="0 0 360 238" role="img" aria-label="${X.synAria}" data-ref="syn">${st}</svg>` +
    `<div class="legend"><span><i style="background:var(--gld)"></i>${X.legNt}</span><span><i style="background:var(--dop)"></i>${X.legBound}</span><span><i style="background:var(--pit);border-radius:2px"></i>${X.legEnz}</span><span>${X.legCup}</span></div></div>` +
    '<div class="row" data-ref="act"></div>' +
    `<div class="card"><h3 class="sim-h">${X.fatesTitle}</h3><div class="fates" data-ref="fates"></div></div>` +
    `<div class="chart"><h4 class="sim-h">${X.ccTitle}</h4><svg viewBox="0 0 360 132" role="img" aria-label="${X.ccAria}" data-ref="cc"></svg></div>` +
    `<div class="chart"><h4 class="sim-h">${X.rcTitle}</h4><svg viewBox="0 0 360 112" role="img" aria-label="${X.rcAria}" data-ref="rc"></svg></div>` +
    `<div class="card"><h3 class="sim-h">${L().inputs}</h3><div class="sliders" data-ref="sl"></div></div>` +
    `<details class="more"><summary>${t('sim.how')}</summary>` +
    `<p>${X.howA}</p>` +
    `<p>${X.howB}</p></details>`;

  const q = <T extends Element = HTMLElement>(k: string) => host.querySelector<T>(`[data-ref="${k}"]`)!;
  const r = <T extends SVGElement = SVGElement>(k: string) => host.querySelector<T>(`[data-r="${k}"]`)!;
  const np = Array.from({ length: NP }, (_, i) => r(`np${i}`));
  const rcs = RECV.map((_, i) => r(`rc${i}`));
  const enz = Array.from(host.querySelectorAll<SVGElement>('[data-r="enz"]'));

  /* ---------- Denetimler ---------- */
  const mark = () => { oneDirty = dirty = true; };
  const setType = chipRow(q('type'), ctx, [{ key: 'geri', label: X.typeRu }, { key: 'enzim', label: X.typeEn }], (k) => { P.type = k as SynType; mark(); setType(P.type); }, X.typeLabel);
  const act = q('act');
  const fireB = el(act, 'button', 'btn', X.fire); fireB.type = 'button';
  ctx.scope.on(fireB, 'click', () => { fire(); ctx.touch(); });
  const pauseT = toggleBtn(ctx, act, X.pause, (v) => { paused = v; pauseT.b.textContent = v ? X.resume : X.pause; dirty = true; });
  const resetB = el(act, 'button', 'btn', X.reset); resetB.type = 'button';
  ctx.scope.on(resetB, 'click', () => { reset(); ctx.touch(); });
  const drugs = document.createElement('div');
  drugs.className = 'row';
  act.after(drugs);
  const tRu = toggleBtn(ctx, drugs, X.blockRu, (v) => { P.blockRu = v; mark(); });
  const tEn = toggleBtn(ctx, drugs, X.blockEn, (v) => { P.blockEn = v; mark(); });

  const sl = q('sl');
  const hs: Record<string, SliderHandle> = {};
  hs.q = makeSlider(ctx, sl, 'q', X.slQ.name, X.slQ.hint, 2, 15, 10, (v) => { P.q = v / 10; mark(); }, (v) => f1(v / 10), 'var(--gld)');
  hs.density = makeSlider(ctx, sl, 'den', X.slDen.name, X.slDen.hint, 3, 20, 10, (v) => { P.density = v / 10; mark(); }, (v) => `${f1(v / 10)}x`, 'var(--dop)');
  hs.ru = makeSlider(ctx, sl, 'ru', X.slRu.name, X.slRu.hint, 0, 20, 10, (v) => { P.ru = v / 10; mark(); }, (v) => `${f1(v / 10)}x`, 'var(--gld)');
  hs.en = makeSlider(ctx, sl, 'en', X.slEn.name, X.slEn.hint, 0, 20, 10, (v) => { P.en = v / 10; mark(); }, (v) => `${f1(v / 10)}x`, 'var(--pit)');
  hs.rate = makeSlider(ctx, sl, 'rate', X.slRate.name, X.slRate.hint, 0, 50, P.rate, (v) => { P.rate = v; dirty = true; }, (v) => `${v} Hz`, 'var(--ink)');
  const fates = q('fates');
  const fateRows = [[X.fates[0], 'var(--gld)'], [X.fates[1], 'var(--pit)'], [X.fates[2], 'var(--lesion)']].map(([name, c]) => {
    const d = el(fates, 'div', 'fate', `<span>${name}</span><div class="track"><b style="background:${c}"></b></div><span class="fv"></span>`);
    return { bar: d.querySelector('b') as HTMLElement, v: d.querySelector('.fv') as HTMLElement };
  });

  /* ---------- Grafik iskeletleri ---------- */
  const cc = q<SVGSVGElement>('cc'), rr = q<SVGSVGElement>('rc');
  const CC = { top: 10, h: 90 }, RR = { top: 8, h: 66 };
  const yc = (v: number): number => CC.top + (1 - clamp(v / CMAX)) * CC.h;
  const yr = (v: number): number => RR.top + (1 - clamp(v / 1.2)) * RR.h;
  for (const v of [0, 1, 2]) gridY(cc, CH.x0, CH.x1, yc(v), String(v));
  for (const v of [0, 0.5, 1]) gridY(rr, CH.x0, CH.x1, yr(v), String(v).replace('.', decimalSep()));
  svgText(cc, { x: 3, y: 8 }, X.unit); svgText(rr, { x: 3, y: 8 }, X.response);
  const meanL = svg('line', { class: 'mean', x1: CH.x0, x2: CH.x1 }, cc);
  const meanT = svgText(cc, { class: 'lb', x: CH.x0 + 4, y: 0 }, '');
  const cP = svg('path', { class: 'cl', d: '' }, cc);
  const rP = svg('path', { class: 'rl', d: '' }, rr);
  const tkP = svg('path', { class: 'tk', d: '' }, cc);
  svgText(cc, { x: CH.x0, y: 118, class: 'lb' }, X.ticks);
  for (const g of [cc, rr]) [['-200 ms', 0], ['-100', 0.5], [X.now, 1]].forEach(([t, k], i) => svgText(g, { x: CH.x0 + (CH.x1 - CH.x0) * (k as number), y: g === cc ? 130 : 110, 'text-anchor': i === 0 ? 'start' : i === 2 ? 'end' : 'middle' }, String(t)));

  /* ---------- Eylemler ---------- */
  function fire(): void { release(s, P); paused = false; pauseT.set(false); pauseT.b.textContent = X.pause; dirty = true; }
  function reset(): void { s = createSyn(); seenRel = 0; flash = -1e9; dirty = true; }

  let meanC = 0;
  function paint(now: number): void {
    if (oneDirty) {
      oneDirty = false;
      one = singleSpike(P); base = singleSpike({ ...P, blockRu: false, blockEn: false });
      [one.fRu, one.fEn, one.fDf].forEach((f, i) => { fateRows[i].bar.style.width = `${(f * 100).toFixed(0)}%`; fateRows[i].v.textContent = pct(f); });
      const ru = r('xru'), en = r('xen');
      ru.setAttribute('opacity', P.blockRu ? '1' : '0'); en.setAttribute('opacity', P.blockEn ? '1' : '0');
      for (const e of enz) e.setAttribute('opacity', P.blockEn ? '0.3' : String(clamp(P.en / 1.2, 0.25, 1) * (P.type === 'enzim' ? 1 : 0.75)));
      host.querySelector('.pump')!.setAttribute('opacity', P.blockRu ? '0.3' : String(clamp(P.ru / 1.2, 0.25, 1)));
    }
    if (s.released !== seenRel) { if (s.released > seenRel) flash = now; seenRel = s.released; }
    const fa = (now - flash) / 400;
    r('imp').setAttribute('opacity', fa >= 0 && fa < 1 ? String(1 - fa) : '0');
    r('dv').setAttribute('stroke-dasharray', fa >= 0 && fa < 1 ? '3 3' : '0');
    r('dvd').setAttribute('opacity', fa >= 0 && fa < 1 ? '0' : '1');
    const nVis = Math.round(clamp(s.C / 2) * NP);
    for (let i = 0; i < NP; i++) {
      const on = i < nVis, sp = slots[i];
      if (on) { np[i].setAttribute('cx', (sp.x + 7 * Math.sin(now / 420 + sp.a)).toFixed(1)); np[i].setAttribute('cy', (sp.y + 5 * Math.cos(now / 360 + sp.b)).toFixed(1)); }
      np[i].setAttribute('opacity', on ? '0.9' : '0');
    }
    const active = Math.round(clamp(P.density * 3, 1, 6)), lit = Math.round(s.B * active + 0.15);
    rcs.forEach((e, i) => { e.setAttribute('class', `rc${i < active ? ' on' : ' off'}${i < Math.min(active, lit) ? ' bound' : ''}`); });
    const cs: Array<[number, number]> = [], rs: Array<[number, number]> = [];
    let sum = 0, cnt = 0;
    for (const [t, c, rv] of s.tr) { cs.push([cxs(s, t), yc(c)]); rs.push([cxs(s, t), yr(rv)]); sum += c; cnt++; }
    cP.setAttribute('d', linePath(cs)); rP.setAttribute('d', linePath(rs));
    meanC = cnt ? sum / cnt : 0;
    const my = yc(meanC);
    meanL.setAttribute('y1', String(my)); meanL.setAttribute('y2', String(my));
    meanT.setAttribute('y', String(my - 3)); meanT.textContent = X.mean(f2(meanC));
    let tk = '';
    for (const t of s.fires) { const x = cxs(s, t); if (x >= CH.x0) tk += `M${x.toFixed(1)} 100V108`; }
    tkP.setAttribute('d', tk);
  }
  function draw(now: number): boolean {
    const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    const anim = now - flash < 450;
    if (paused && !dirty && !anim) return false;
    if (!paused && dt > 0) advanceSyn(s, P, dt * SPEED, true);
    dirty = false;
    paint(now);
    return true;
  }

  setType(P.type);
  return {
    draw, resume: () => { last = -1; },
    say(): string {
      const X = L().syn;
      const drug = P.blockRu && P.blockEn ? X.drugBoth : P.blockRu ? X.drugRu : P.blockEn ? X.drugEn : X.drugNone;
      const main = one.fRu >= one.fEn && one.fRu >= one.fDf ? X.mainRu : one.fEn >= one.fDf ? X.mainEn : X.mainDf;
      return X.say(drug, f1(one.half), P.blockRu || P.blockEn ? f1(base.half) : null, Math.round(one.dur), main);
    },
    meters(): Meter[] {
      return [
        { label: L().syn.mMean, value: `${f2(meanC)} ${L().syn.unit}`, frac: meanC / 1.5, color: 'var(--gld)' },
        { label: L().syn.mHalf, value: `${f1(one.half)} ms`, frac: one.half / 40, color: 'var(--pit)' },
        { label: L().syn.mDur, value: `${Math.round(one.dur)} ms`, frac: one.dur / 200, color: 'var(--dop)' },
      ];
    },
    /** Rehberli tur için: durumu sıfırla ve ayarla. */
    scene(p: Partial<SynP>, impulse = false): void {
      reset();
      Object.assign(P, SYN_DEFAULT, p);
      setType(P.type); tRu.set(P.blockRu); tEn.set(P.blockEn);
      hs.q.set(Math.round(P.q * 10)); hs.density.set(Math.round(P.density * 10)); hs.ru.set(Math.round(P.ru * 10)); hs.en.set(Math.round(P.en * 10)); hs.rate.set(P.rate);
      paused = false; pauseT.set(false); pauseT.b.textContent = X.pause;
      mark();
      if (impulse) fire();
    },
  };
}

type SynPanel = ReturnType<typeof createSynPanel>;

/** Sinaps sekmesinin rehberli turu (sekmeyle birlikte tembel yüklenir). */
export const synTour = (syn: SynPanel): TourStep[] => {
  const TS = L().tourSyn;
  return [
    { ...TS[0], apply: () => syn.scene({ rate: 0 }, true) },
    { ...TS[1], apply: () => syn.scene({ rate: 0 }, true) },
    { ...TS[2], apply: () => syn.scene({ blockRu: true }) },
    { ...TS[3], apply: () => syn.scene({ blockEn: true }) },
    { ...TS[4], apply: () => syn.scene({ type: 'enzim', blockEn: true }) },
    { ...TS[5], apply: () => syn.scene({ density: 0.5 }) },
  ];
};
