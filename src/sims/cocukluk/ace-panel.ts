// Sekme 2: Çocukluk adversitesi birikimi, koruyucu etkenler ve yetişkinlik riski (doz-yanıt).
import { ACES, DEFAULT_ACE, OUTCOMES, THRESHOLD, buffer, instLoad, levelWord, levelWordLow, mechanisms, pHigh, pRef, pdf, shift, type AceInput, type Outcome } from './model';
import { bookBox, chipRow, el, f1, makeSlider, type Ctx, type Meter, type Panel } from '../ui';
import { percent } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { L } from './text';

const OUTS = Object.keys(OUTCOMES) as Outcome[];
const wordOf3 = (v: number): string => L().words3[v < 0.35 ? 0 : v < 0.6 ? 1 : 2];

export function createAcePanel(ctx: Ctx, host: HTMLElement) {
  const T = L().ace;
  const a: AceInput = { ...DEFAULT_ACE };
  let out: Outcome = 'dep';
  const T_ACES = L().aces;
  const checks: boolean[] = ACES.map(() => false);
  let dirty = true;

  host.innerHTML =
    `<p class="note">${T.note}</p>` +
    `<div class="chips" data-ref="presets"></div>` +
    `<div class="card"><h3 class="sim-h">${T.listH} <span data-ref="cnt"></span></h3><div class="acelist" data-ref="list"></div>` +
    `<div class="row"><button type="button" class="btn" data-ref="clear">${T.clear}</button></div></div>` +
    `<div class="card"><h3 class="sim-h">${T.ctlH}</h3><div class="sliders" data-ref="ctl"></div></div>` +
    `<div class="card"><h3 class="sim-h">${T.outH}</h3><div class="chips" data-ref="outs"></div>` +
    `<div class="chart"><svg viewBox="0 0 320 150" role="img" aria-label="${T.doseAria}" data-ref="dose"></svg></div>` +
    `<div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h24" stroke="var(--amy)" stroke-width="2.4"/></svg>${T.legendProt}</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h24" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 3"/></svg>${T.legendBare}</span><span><i style="background:var(--ink)"></i>${T.legendLoad}</span></div>` +
    `<div class="chart"><svg viewBox="0 0 320 120" role="img" aria-label="${T.densAria}" data-ref="dens"></svg></div>` +
    `<p class="note" data-ref="densNote"></p></div>` +
    `<div class="card"><h3 class="sim-h">${T.mechH}</h3><div class="mech" data-ref="mech"></div></div>` +
    `<div class="callout"><strong>${T.calloutHead}</strong><span>${T.calloutBody}</span></div>` +
    bookBox([
      { id: 'ch07-e9', text: T.book[0] },
      { id: 'ch07-e10', text: T.book[1] },
      { id: 'ch07-e12', text: T.book[2] },
      { id: 'ch07-e6', text: T.book[3] },
    ]) +
    `<details class="more"><summary>${t('sim.how')}</summary><p>${T.how[0]}</p><p>${T.how[1]}</p></details>`;

  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const count = () => checks.filter(Boolean).length;
  a.n = 0;

  /* ---- Onay kutuları ---- */
  const list = q('list');
  const boxes: HTMLInputElement[] = T_ACES.map((label, i) => {
    const row = el(list, 'label', 'ck');
    const cb = el(row, 'input');
    cb.type = 'checkbox';
    el(row, 'span', '', label);
    ctx.scope.on(cb, 'change', () => { checks[i] = cb.checked; a.n = count(); dirty = true; ctx.touch(); });
    return cb;
  });
  function setN(n: number): void { checks.fill(false); for (let i = 0; i < n; i++) checks[i] = true; boxes.forEach((b, i) => (b.checked = checks[i])); a.n = count(); }
  ctx.scope.on(q('clear'), 'click', () => { setN(0); dirty = true; ctx.touch(); });

  /* ---- Kaydırıcılar ve çipler ---- */
  const ctl = q('ctl');
  const sl: Record<string, ReturnType<typeof makeSlider>> = {};
  const pct = (v: number) => percent(String(v));
  sl.intensity = makeSlider(ctx, ctl, 'int', T.intName, T.intHint, 60, 140, 100, (v) => { a.intensity = v / 100; dirty = true; }, (v) => T.intWords[v < 90 ? 0 : v > 110 ? 2 : 1], 'var(--amy)');
  sl.inst = makeSlider(ctx, ctl, 'inst', T.instName, T.instHint, 0, 48, 0, (v) => { a.instMonths = v; dirty = true; }, T.months, 'var(--amy)');
  sl.attach = makeSlider(ctx, ctl, 'att', T.attName, T.attHint, 0, 100, 0, (v) => { a.attach = v / 100; dirty = true; }, pct, 'var(--gld)');
  sl.adult = makeSlider(ctx, ctl, 'adu', T.aduName, T.aduHint, 0, 100, 0, (v) => { a.adult = v / 100; dirty = true; }, pct, 'var(--gld)');
  sl.ses = makeSlider(ctx, ctl, 'ses', T.sesName, T.sesHint, 0, 100, 50, (v) => { a.ses = v / 100; dirty = true; }, (v) => T.sesWords[v < 35 ? 0 : v > 65 ? 2 : 1], 'var(--gld)');

  const PRESETS: Array<{ key: string; label: string; p: () => void }> = [
    { key: 'ref', label: T.presets[0], p: () => apply({ n: 0 }) },
    { key: 'pov', label: T.presets[1], p: () => apply({ n: 2, ses: 0.1 }) },
    { key: 'rom', label: T.presets[2], p: () => apply({ n: 0, inst: 30 }) },
    { key: 'rom6', label: T.presets[3], p: () => apply({ n: 0, inst: 6 }) },
    { key: 'prot', label: T.presets[4], p: () => apply({ n: 5, attach: 1, adult: 0.8, ses: 0.7 }) },
  ];
  const setPreset = chipRow(q('presets'), ctx, PRESETS.map((p) => ({ key: p.key, label: p.label })), (k) => { PRESETS.find((p) => p.key === k)!.p(); setPreset(k); }, T.presetsGroup);
  const setOut = chipRow(q('outs'), ctx, OUTS.map((o) => ({ key: o, label: OUTCOMES[o].short })), (k) => { out = k as Outcome; dirty = true; }, T.outsGroup);
  setOut(out);

  function apply(p: { n?: number; intensity?: number; inst?: number; attach?: number; adult?: number; ses?: number; out?: Outcome }): void {
    setN(p.n ?? 0);
    a.intensity = p.intensity ?? 1; a.instMonths = p.inst ?? 0; a.attach = p.attach ?? 0; a.adult = p.adult ?? 0; a.ses = p.ses ?? 0.5;
    if (p.out) { out = p.out; setOut(out); }
    sl.intensity.set(Math.round(a.intensity * 100)); sl.inst.set(a.instMonths); sl.attach.set(Math.round(a.attach * 100));
    sl.adult.set(Math.round(a.adult * 100)); sl.ses.set(Math.round(a.ses * 100));
    dirty = true;
  }

  /* ---- Çizim ---- */
  const dose = q<SVGSVGElement>('dose'), dens = q<SVGSVGElement>('dens'), mech = q('mech');
  mech.innerHTML = [['frontal', T.mech[0], 'var(--pfc)'], ['gc', T.mech[1], 'var(--dop)'], ['amy', T.mech[2], 'var(--amy)']]
    .map(([k, l, c]) => `<div class="mrow"><div class="m-top"><span>${l}</span><b data-ref="mw-${k}"></b></div><div class="track"><b data-ref="mb-${k}" style="background:${c}"></b></div></div>`).join('') +
    `<p class="note">${T.mechNote}</p>`;

  function draw(): boolean {
    if (!dirty) return false;
    dirty = false;
    const o = OUTCOMES[out];
    q('cnt').textContent = `(${a.n} / ${ACES.length})`;
    // Doz-yanıt
    const X0 = 34, W = 276, Y0 = 8, H = 110, MAXN = ACES.length;
    const px = (n: number) => X0 + (n / MAXN) * W, py = (p: number) => Y0 + H - Math.min(1, p) * H;
    const bare: AceInput = { ...a, attach: 0, adult: 0, ses: 0.5 };
    const path = (inp: AceInput) => Array.from({ length: MAXN + 1 }, (_, n) => `${n ? 'L' : 'M'}${px(n).toFixed(1)} ${py(pHigh(out, { ...inp, n })).toFixed(1)}`).join('');
    let s = `<line class="grid" x1="${X0}" y1="${Y0 + H}" x2="${X0 + W}" y2="${Y0 + H}"/><line class="grid" x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0 + H}"/>`;
    s += `<line x1="${X0}" y1="${py(pRef)}" x2="${X0 + W}" y2="${py(pRef)}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 4"/><text x="${X0 + W}" y="${py(pRef) - 3}" text-anchor="end">${T.refLabel}</text>`;
    s += `<path d="${path(bare)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/><path d="${path(a)}" fill="none" stroke="var(--amy)" stroke-width="2.6" stroke-linecap="round"/>`;
    const cx = px(a.n), cy = py(pHigh(out, a));
    s += `<circle cx="${cx}" cy="${cy}" r="5" fill="var(--ink)"/>`;
    for (let n = 0; n <= MAXN; n += 2) s += `<text x="${px(n)}" y="${Y0 + H + 12}" text-anchor="middle">${n}</text>`;
    s += `<text class="ax-t" x="${X0 + W / 2}" y="${Y0 + H + 26}" text-anchor="middle">${T.axisN}</text><text class="ax-t" x="10" y="${Y0 + H / 2}" text-anchor="middle" transform="rotate(-90 10 ${Y0 + H / 2})">${T.axisY}</text>`;
    dose.innerHTML = s;
    // Dağılım
    const D0 = 12, DW = 296, DY = 100, DH = 80, lo = -3, hi = 4.2, dx = (v: number) => D0 + ((v - lo) / (hi - lo)) * DW;
    const sh = shift(out, a);
    const curve = (mu: number) => { let p = ''; for (let v = lo; v <= hi + 1e-9; v += 0.1) p += `${p ? 'L' : 'M'}${dx(v).toFixed(1)} ${(DY - pdf(v, mu) * DH * 2.4).toFixed(1)}`; return p; };
    let area = `M${dx(THRESHOLD)} ${DY}`;
    for (let v = THRESHOLD; v <= hi + 1e-9; v += 0.1) area += `L${dx(v).toFixed(1)} ${(DY - pdf(v, sh) * DH * 2.4).toFixed(1)}`;
    area += `L${dx(hi)} ${DY}Z`;
    s = `<line class="grid" x1="${D0}" y1="${DY}" x2="${D0 + DW}" y2="${DY}"/><path d="${area}" fill="var(--amy)" fill-opacity=".3"/>` +
      `<path d="${curve(0)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/><path d="${curve(sh)}" fill="none" stroke="var(--amy)" stroke-width="2.6"/>` +
      `<line x1="${dx(THRESHOLD)}" y1="${DY - 62}" x2="${dx(THRESHOLD)}" y2="${DY}" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="3 3"/>` +
      `<text x="${dx(THRESHOLD) + 4}" y="${DY - 52}">${T.zone}</text><text class="ax-t" x="${D0 + DW / 2}" y="${DY + 16}" text-anchor="middle">${T.densAxis(o.label)}</text>`;
    dens.innerHTML = s;
    const p = pHigh(out, a);
    q('densNote').textContent = a.n === 0 && a.instMonths === 0 && sh < 0.15 ? T.densRef
      : p < 0.5 ? T.densMid
        : T.densHigh;
    // Mekanizma
    const m = mechanisms(a);
    for (const k of ['frontal', 'gc', 'amy'] as const) {
      q(`mw-${k}`).textContent = wordOf3(m[k]);
      q(`mb-${k}`).style.width = `${Math.round(m[k] * 100)}%`;
    }
    return true;
  }

  const bufWord = () => (buffer(a) < 0.95 ? T.bufProt : buffer(a) > 1.05 ? T.bufSes : '');
  return {
    draw,
    say: () => {
      const load = a.instMonths ? T.loadInst(a.n, f1(instLoad(a.instMonths))) : T.loadPlain(a.n);
      return T.say(load, L().outcomes[out].low, levelWordLow(shift(out, a)), pHigh(out, a) < 0.5, bufWord());
    },
    meters: (): Meter[] => OUTS.map((o) => ({ label: OUTCOMES[o].short, value: levelWord(shift(o, a)), frac: Math.min(1, pHigh(o, a) / 0.7), color: 'var(--amy)' })),
    set(p: { n?: number; intensity?: number; inst?: number; attach?: number; adult?: number; ses?: number; out?: Outcome }): void { apply(p); setPreset(null); },
  } satisfies Panel & { set(p: object): void };
}
