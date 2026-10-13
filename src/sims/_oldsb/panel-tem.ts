// Savaş ve barış, "Temas ve itibar" sekmesi: ayrı (tembel yüklenen) parça. Siperler sekmesi ilk açılışta gelir;
// bu panel yalnızca sekme seçilince yüklenir ve kurulur.
import { num } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { svg, svgText } from '../kit';
import { createTour } from '../tour';
import {
  BOOK, CONDS, CT, FO, PAY_DEFAULT, PY,
  conditionsMet, correlation, describeContact, describePay, describeVillage, condName, simulateContact, simulatePay, simulateVillage, simulateVillages,
  type Cond, type ContactParams, type ContactRun, type PayParams, type VillageParams,
} from './model';
import { L } from './text';
import { LG, dotI, f1, key, pc, pctFmt, sv, type Env, type PanelApi } from './env';

export const TEM_HTML = (): string => {
  const x = L();
  const c = x.ct, f = x.fo, p = x.py;
  return `
    <div data-ref="tour2"></div>

    <section class="card" data-card="ct" aria-label="${c.cardAria}">
      <h3 class="sim-h">${c.h}</h3>
      <div class="chips" role="group" aria-label="${c.presetsAria}" data-ref="ctChips"></div>
      <div class="stage">
        <svg viewBox="0 0 360 154" role="img" aria-label="${c.stageAria}" data-ref="ctStage"></svg>
        ${key([sv(14, 12, '<circle cx="7" cy="6" r="5" fill="var(--amy)" fill-opacity=".2" stroke="var(--ink)"/>'), c.lgLow], [sv(14, 12, '<circle cx="7" cy="6" r="5" fill="var(--amy)" fill-opacity=".95" stroke="var(--ink)"/>'), c.lgHigh], [LG.line('var(--muted)'), c.lgPair])}
      </div>
      <div data-ref="tp2"></div>
      <div class="chart"><svg viewBox="0 0 360 172" role="img" aria-label="${c.chartAria}" data-ref="ctChart"></svg>
        ${key([LG.line('var(--ink)'), c.lgSel], [LG.line('var(--amy)', ' stroke-dasharray="5 3"'), c.lgNone], [LG.line('var(--pfc)', ' stroke-dasharray="2 3"'), c.lgAll])}
      </div>
      <div class="sliders" data-ref="ctSl"></div>
      <div class="chips" role="group" aria-label="${c.strengthAria}" data-ref="ctStrength"></div>
      <p class="sl-hint">${c.strengthHint}</p>
    </section>

    <section class="card" data-card="fo" aria-label="${f.cardAria}">
      <h3 class="sim-h">${f.h}</h3>
      <div class="chart"><svg viewBox="0 0 360 196" role="img" aria-label="${f.scatterAria(BOOK.villages, FO.years)}" data-ref="foScatter"></svg>
        ${key([dotI('var(--lesion)'), f.lgVillages(BOOK.villages)], [sv(14, 12, '<circle cx="7" cy="6" r="4.5" fill="var(--pfc)" stroke="var(--ink)" stroke-width="1.6"/>'), f.lgMine])}
      </div>
      <div class="chart"><svg viewBox="0 0 360 120" role="img" aria-label="${f.lineAria}" data-ref="foLine"></svg></div>
      <div class="readout" data-ref="foRead"></div>
      <div class="sliders" data-ref="foSl"></div>
    </section>

    <section class="card" data-card="py" aria-label="${p.cardAria}">
      <h3 class="sim-h">${p.h}</h3>
      <div class="chips" role="group" aria-label="${p.condsAria}" data-ref="pyChips"></div>
      <div class="chart"><svg viewBox="0 0 360 186" role="img" aria-label="${p.chartAria}" data-ref="pyChart"></svg></div>
      <p class="note">${p.note(PY.price)}</p>
      <div class="sliders" data-ref="pySl"></div>
    </section>

    <details class="how">
      <summary>${t('sim.how')}</summary>
      <div class="how-in">
        <p>${x.temHow.contact}</p>
        <p>${x.temHow.forest}</p>
        <p>${x.temHow.photo}</p>
      </div>
    </details>

    <aside class="book" aria-label="${t('sim.book')}">
      <h3 class="sim-h">${t('sim.book')}</h3>
      <ul>
        <li>${x.temBook.e3(t('repl.karışık'))}</li>
        <li>${x.temBook.e4(t('repl.bilinmiyor'))}</li>
        <li>${x.temBook.e5(t('repl.bilinmiyor'))}</li>
      </ul>
    </aside>
`;
};

export function createTemPanel(env: Env, host: HTMLElement): PanelApi {
  const { scope, id, $, S, need, touch, setBar, makeSlider, toggles, makeTransport, tiles, yGrid, poly, clipRect } = env;
  host.innerHTML = TEM_HTML();

  // --- 2a Temas
  const cs = $<SVGElement>('ctStage');
const CP = { ax: 80, bx: 280, y0: 28, dy: 21, dx: 14 };
  const cpos = (g: 0 | 1, i: number): [number, number] => [(g ? CP.bx : CP.ax) + (i % 2 ? CP.dx : -CP.dx), CP.y0 + Math.floor(i / 2) * CP.dy];
  svgText(cs, { class: 'tl', x: CP.ax, y: 12, 'text-anchor': 'middle' }, L().ct.groupA);
  svgText(cs, { class: 'tl', x: CP.bx, y: 12, 'text-anchor': 'middle' }, L().ct.groupB);
  const ctLinks = svg('g', {}, cs);
  const ctDots = [0, 1].map((g) => Array.from({ length: CT.n }, (_, i) => { const [x, y] = cpos(g as 0 | 1, i); return svg('circle', { class: 'ct-dot', cx: x, cy: y, r: 8 }, cs); }));
  const ctMid = svgText(cs, { class: 'tl', x: 180, y: 146, 'text-anchor': 'middle' }, '');
  let runC: ContactRun, refNone: ContactRun, refAll: ContactRun;
  const CC = { x0: 34, x1: 346, top: 12, bot: 128 };
  const cch = $<SVGElement>('ctChart');
  const crx = (t: number): number => CC.x0 + ((CC.x1 - CC.x0) * t) / CT.rounds;
  const cry = (v: number): number => CC.bot - (CC.bot - CC.top) * v;
  yGrid(cch, CC.x0, CC.x1, cry, [0, 0.5, 1], pc);
  for (let t = 0; t <= CT.rounds; t += 10) svgText(cch, { class: 'ax', x: crx(t), y: CC.bot + 14, 'text-anchor': t === 0 ? 'start' : 'middle' }, String(t));
  svgText(cch, { class: 'ax', x: (CC.x0 + CC.x1) / 2, y: CC.bot + 30, 'text-anchor': 'middle' }, L().ct.axRound);
  svg('line', { class: 'offline', x1: crx(CT.program), x2: crx(CT.program), y1: CC.top, y2: CC.bot }, cch);
  svgText(cch, { class: 'ax', x: crx(CT.program) + 4, y: CC.top + 9 }, L().ct.programEnds);
  const ctRefN = svg('polyline', { class: 'ln ref-amy' }, cch), ctRefA = svg('polyline', { class: 'ln ref-pfc' }, cch);
  const ctClip = clipRect(cch, `${id}-clipC`, 172);
  const ctLine = svg('polyline', { class: 'ln cur', 'clip-path': `url(#${id}-clipC)` }, cch);
  const ctCur = svg('circle', { class: 'cur-dot', r: 4.5 }, cch);
  const lineOf = (r: ContactRun): string => poly(r.mean.map((m, t) => [crx(t), cry(m)]));
  function drawContact(t: number): void {
    ctDots.forEach((arr, g) => arr.forEach((c, i) => c.setAttribute('fill-opacity', (0.12 + 0.88 * runC.agents[t][g * CT.n + i]).toFixed(2))));
    ctLinks.replaceChildren();
    runC.pairs[t].forEach((b, i) => { if (b >= 0) { const [x1, y1] = cpos(0, i), [x2, y2] = cpos(1, b); svg('line', { class: 'ct-link', x1: x1 + 8, y1, x2: x2 - 8, y2 }, ctLinks); } });
    ctMid.textContent = t === 0 ? '' : t > CT.program && runC.p.follow < 0.5 ? L().ct.midCut : t > CT.program ? L().ct.midOn : '';
    ctClip.setAttribute('width', (crx(t) + 1).toFixed(1));
    ctCur.setAttribute('cx', String(crx(t))); ctCur.setAttribute('cy', String(cry(runC.mean[t])));
    cs.setAttribute('aria-label', describeContact(runC, t));
  }
  const tC = makeTransport($('tp2'), { max: CT.rounds + 1, speed: 3, unit: 'round', seed: () => { S.cseed++; need.c = true; } });
  const ctSl = $('ctSl');
  const setC = (patch: Partial<ContactParams>) => {
    S.c = { ...S.c, ...patch };
    if (patch.status !== undefined) hSt.set(Math.round(patch.status * 100));
    if (patch.goal !== undefined) hGo.set(Math.round(patch.goal * 100));
    if (patch.support !== undefined) hSu.set(Math.round(patch.support * 100));
    if (patch.follow !== undefined) hFo.set(Math.round(patch.follow * 100));
    need.c = true; touch(); S.focus = 'ct';
  };
  const hSt = makeSlider(ctSl, { name: L().ct.status.name, hint: L().ct.status.hint, min: 0, max: 100, step: 10, val: 100, fmt: pctFmt, cb: (v) => setC({ status: v / 100 }), color: 'var(--pfc)' });
  const hGo = makeSlider(ctSl, { name: L().ct.goal.name, hint: L().ct.goal.hint, min: 0, max: 100, step: 10, val: 100, fmt: pctFmt, cb: (v) => setC({ goal: v / 100 }), color: 'var(--pfc)' });
  const hSu = makeSlider(ctSl, { name: L().ct.support.name, hint: L().ct.support.hint, min: 0, max: 100, step: 10, val: 100, fmt: pctFmt, cb: (v) => setC({ support: v / 100 }), color: 'var(--pfc)' });
  const hFo = makeSlider(ctSl, { name: L().ct.follow.name, hint: L().ct.follow.hint, min: 0, max: 100, step: 1, val: 100, fmt: pctFmt, cb: (v) => setC({ follow: v / 100 }), color: 'var(--dop)' });
  const CT_PRE = [{ k: 'none', name: L().ct.preNone, v: [0, 0, 0] }, { k: 'one', name: L().ct.preOne, v: [1, 0, 0] }, { k: 'all', name: L().ct.preAll, v: [1, 1, 1] }];
  const syncCtPre = toggles($('ctChips'), CT_PRE.map((p) => ({ k: p.k, name: p.name })), () => CT_PRE.find((p) => p.v[0] === S.c.status && p.v[1] === S.c.goal && p.v[2] === S.c.support)?.k ?? null, (k) => { const p = CT_PRE.find((x) => x.k === k)!; setC({ status: p.v[0], goal: p.v[1], support: p.v[2] }); });
  const syncStr = toggles($('ctStrength'), [{ k: '1', name: L().ct.strAvg }, { k: '0.4', name: L().ct.strCaution }], () => String(S.c.strength), (k) => setC({ strength: Number(k) }));
  const refOf = (p: Partial<ContactParams>): ContactRun => simulateContact({ ...S.c, ...p }, S.cseed);

  // --- 2b Orman
  const FS = { x0: 36, x1: 346, top: 12, bot: 148 };
  const fsc = $<SVGElement>('foScatter');
  const fx = (w: number): number => FS.x0 + (FS.x1 - FS.x0) * w, fy = (v: number): number => FS.bot - (FS.bot - FS.top) * v;
  yGrid(fsc, FS.x0, FS.x1, fy, [0, 0.5, 1], pc);
  for (const w of [0, 0.25, 0.5, 0.75, 1]) svgText(fsc, { class: 'ax', x: fx(w), y: FS.bot + 14, 'text-anchor': w === 0 ? 'start' : w === 1 ? 'end' : 'middle' }, pc(w));
  svgText(fsc, { class: 'ax', x: (FS.x0 + FS.x1) / 2, y: FS.bot + 30, 'text-anchor': 'middle' }, L().fo.axWilling);
  svgText(fsc, { class: 'ax', x: FS.x0, y: 8 }, L().fo.axStock(FO.years));
  const fsDots = svg('g', {}, fsc), fsMe = svg('circle', { class: 'me-dot', r: 6 }, fsc);
  const FL = { x0: 36, x1: 346, top: 8, bot: 90 };
  const fln = $<SVGElement>('foLine');
  const lx = (y: number): number => FL.x0 + ((FL.x1 - FL.x0) * y) / FO.years, ly = (v: number): number => FL.bot - (FL.bot - FL.top) * v;
  yGrid(fln, FL.x0, FL.x1, ly, [0, 0.5, 1], pc);
  for (let y = 0; y <= FO.years; y += 10) svgText(fln, { class: 'ax', x: lx(y), y: FL.bot + 14, 'text-anchor': y === 0 ? 'start' : 'middle' }, String(y));
  svgText(fln, { class: 'ax', x: (FL.x0 + FL.x1) / 2, y: FL.bot + 28, 'text-anchor': 'middle' }, L().fo.axYear);
  const flLine = svg('polyline', { class: 'ln cur' }, fln);
  let runV: ReturnType<typeof simulateVillage>, vil: ReturnType<typeof simulateVillages> = [];
  let vilCost = -1;
  const foSl = $('foSl');
  const setV = (patch: Partial<VillageParams>) => {
    S.v = { ...S.v, ...patch };
    if (patch.free !== undefined) hFr.set(Math.round(patch.free * 100));
    if (patch.willing !== undefined) hWi.set(Math.round(patch.willing * 100));
    if (patch.cost !== undefined) hCo.set(Math.round(patch.cost * 100));
    need.v = true; touch(); S.focus = 'fo';
  };
  const hFr = makeSlider(foSl, { name: L().fo.free.name, hint: L().fo.free.hint, min: 0, max: 60, step: 5, val: S.v.free * 100, fmt: pctFmt, cb: (v) => setV({ free: v / 100 }), color: 'var(--amy)' });
  const hWi = makeSlider(foSl, { name: L().fo.willing.name, hint: L().fo.willing.hint, min: 0, max: 100, step: 5, val: S.v.willing * 100, fmt: pctFmt, cb: (v) => setV({ willing: v / 100 }), color: 'var(--pfc)' });
  const hCo = makeSlider(foSl, { name: L().fo.cost.name, hint: L().fo.cost.hint, min: 0, max: 100, step: 5, val: S.v.cost * 100, fmt: pctFmt, cb: (v) => setV({ cost: v / 100 }), color: 'var(--dop)' });
  function drawForest(): void {
    if (vilCost !== S.v.cost) {
      vilCost = S.v.cost; vil = simulateVillages(S.v.cost, S.vseed);
      fsDots.replaceChildren();
      for (const p of vil) svg('circle', { class: 'v-dot', cx: fx(p.willing), cy: fy(p.end), r: 3 }, fsDots);
    }
    fsMe.setAttribute('cx', String(fx(S.v.willing))); fsMe.setAttribute('cy', String(fy(runV.end)));
    flLine.setAttribute('points', poly(runV.stock.map((v, y) => [lx(y), ly(v)])));
    const r = correlation(vil.map((p) => p.willing), vil.map((p) => p.end));
    $('foRead').innerHTML = tiles([[L().fo.tPatrol, `${runV.patrollers} / ${Math.round((1 - S.v.free) * FO.n)}`], [L().fo.tCover, pc(runV.coverage)], [L().fo.tStock(FO.years), pc(runV.end)], [L().fo.tCorr(BOOK.villages), num(r, 2)]]);
  }

  // --- 2c Fotoğraf
  const PC = { x0: 108, cw: 62, bw: 34, top: 28, rh: 36 };
  const LBL: Record<Cond, string[]> = L().py.rowLbl;
  const pyc = $<SVGElement>('pyChart');
  const METS: { k: 'sales' | 'avgPaid' | 'profit' | 'donation'; name: string; color: string }[] = [
    { k: 'sales', name: L().py.metSales, color: 'var(--pfc)' }, { k: 'avgPaid', name: L().py.metPaid, color: 'var(--dop)' },
    { k: 'profit', name: L().py.metProfit, color: 'var(--ink)' }, { k: 'donation', name: L().py.metDonation, color: 'var(--gld)' },
  ];
  METS.forEach((m, j) => svgText(pyc, { class: 'tl', x: PC.x0 + j * PC.cw, y: 16 }, m.name));
  const pyRows = CONDS.map((c, i) => {
    const y = PC.top + i * PC.rh, g = svg('g', {}, pyc);
    const hl = svg('rect', { class: 'py-hl', x: 1, y: y - 4, width: 358, height: PC.rh - 2, rx: 6 }, g);
    LBL[c].forEach((part, k, a) => svgText(g, { class: 'tk', x: 6, y: y + 18 + (k - (a.length - 1) / 2) * 12 }, part));
    const cells = METS.map((m, j) => ({ b: svg('rect', { class: 'py-bar', x: PC.x0 + j * PC.cw, y: y + 4, width: 0, height: 12, rx: 2, fill: m.color }, g), t: svgText(g, { class: 'pv', x: PC.x0 + j * PC.cw, y: y + 28 }, '') }));
    return { hl, cells };
  });
  let outP: ReturnType<typeof simulatePay>;
  const pySl = $('pySl');
  const setY = (patch: Partial<PayParams>) => {
    S.y = { ...S.y, ...patch };
    if (patch.share !== undefined) hSh.set(Math.round(patch.share * 100));
    if (patch.glow !== undefined) hGl.set(Math.round(patch.glow * 100));
    if (patch.norm !== undefined) hNo.set(Math.round(patch.norm * 100));
    need.y = true; touch(); S.focus = 'py';
  };
  const hSh = makeSlider(pySl, { name: L().py.share.name, hint: L().py.share.hint, min: 0, max: 100, step: 10, val: S.y.share * 100, fmt: pctFmt, cb: (v) => setY({ share: v / 100 }), color: 'var(--gld)' });
  const hGl = makeSlider(pySl, { name: L().py.glow.name, hint: L().py.glow.hint, min: 0, max: 100, step: 10, val: S.y.glow * 100, fmt: pctFmt, cb: (v) => setY({ glow: v / 100 }), color: 'var(--gld)' });
  const hNo = makeSlider(pySl, { name: L().py.norm.name, hint: L().py.norm.hint, min: 10, max: 100, step: 10, val: S.y.norm * 100, fmt: pctFmt, cb: (v) => setY({ norm: v / 100 }), color: 'var(--dop)' });
  const syncCond = toggles<Cond>($('pyChips'), CONDS.map((c) => ({ k: c, name: condName(c) })), () => S.cond, (k) => { S.cond = k; S.focus = 'py'; });
  function drawPay(): void {
    METS.forEach((m, j) => {
      const mx = Math.max(1e-9, ...CONDS.map((c) => Math.abs(outP[c][m.k])));
      CONDS.forEach((c, i) => {
        const v = outP[c][m.k], cell = pyRows[i].cells[j];
        cell.b.setAttribute('width', (Math.max(1.5, (Math.abs(v) / mx) * PC.bw)).toFixed(1));
        cell.b.setAttribute('fill', v < 0 ? 'var(--amy)' : m.color);
        cell.t.textContent = `${v < 0 ? '−' : ''}${f1(Math.abs(v))}`;
      });
    });
    pyRows.forEach((r, i) => r.hl.setAttribute('class', `py-hl${CONDS[i] === S.cond ? ' on' : ''}`));
    pyc.setAttribute('aria-label', `${L().py.chartPrefix} ${describePay(outP, S.cond)}`);
  }

  function barTemas(): void {
    if (S.focus === 'ct') {
      const t = tC.idx(), m = runC.mean[t];
      setBar(describeContact(runC, t), [
        { label: L().ct.meterPrej, text: pc(m), frac: m, color: 'var(--amy)' },
        { label: L().ct.meterCond, text: `${conditionsMet(S.c)}/3`, frac: conditionsMet(S.c) / 3, color: 'var(--pfc)' },
        { label: L().ct.meterRound, text: `${t}/${CT.rounds}`, frac: t / CT.rounds, color: 'var(--ink)' },
      ]);
    } else if (S.focus === 'fo') {
      setBar(describeVillage(runV, S.v), [
        { label: L().fo.meterStock, text: pc(runV.end), frac: runV.end, color: 'var(--pfc)' },
        { label: L().fo.meterCover, text: pc(runV.coverage), frac: runV.coverage, color: 'var(--dop)' },
        { label: L().fo.meterFree, text: pc(S.v.free), frac: S.v.free / 0.6, color: 'var(--amy)' },
      ]);
    } else {
      const r = outP[S.cond];
      setBar(describePay(outP, S.cond), [
        { label: L().py.meterSales, text: f1(r.sales), frac: r.sales / 50, color: 'var(--pfc)' },
        { label: L().py.meterPaid, text: f1(r.avgPaid), frac: r.avgPaid / 10, color: 'var(--dop)' },
        { label: L().py.meterProfit, text: f1(r.profit), frac: Math.max(0, r.profit) / 80, color: 'var(--ink)' },
      ]);
    }
  }
  function renderTemas(): void {
    if (need.c) { runC = simulateContact(S.c, S.cseed); refNone = refOf({ status: 0, goal: 0, support: 0 }); refAll = refOf({ status: 1, goal: 1, support: 1 }); ctRefN.setAttribute('points', lineOf(refNone)); ctRefA.setAttribute('points', lineOf(refAll)); ctLine.setAttribute('points', lineOf(runC)); need.c = false; }
    if (need.v) { runV = simulateVillage(S.v, S.vseed); need.v = false; }
    if (need.y) { outP = simulatePay(S.y, 7); need.y = false; }
    drawContact(tC.idx()); drawForest(); drawPay();
    syncCtPre(); syncStr(); syncCond(); tC.sync(); barTemas();
  }

  const seekC = (t: number, play = false) => tC.set(t, play);
  const apply2: (() => void)[] = [
    () => { S.focus = 'ct'; S.cseed = 5; setC({ status: 0, goal: 0, support: 0, follow: 1, strength: 1 }); seekC(0, true); },
    () => { S.focus = 'ct'; S.cseed = 5; setC({ status: 1, goal: 1, support: 1, follow: 1, strength: 1 }); seekC(CT.rounds); },
    () => { S.focus = 'ct'; S.cseed = 5; setC({ status: 1, goal: 1, support: 1, follow: 0.09, strength: 1 }); seekC(CT.rounds); },
    () => { S.focus = 'fo'; setV({ free: 0.2, willing: 0.15, cost: 0.4 }); },
    () => { setY({ ...PAY_DEFAULT }); S.cond = 'pwyw'; },
    () => { setY({ ...PAY_DEFAULT }); S.cond = 'pwywHayir'; },
  ];
  const tour2 = createTour(scope, L().tour2.map((st, i) => ({ ...st, apply: apply2[i] })));
  $('tour2').appendChild(tour2.el);
  return { render: renderTemas, tp: tC };
}
