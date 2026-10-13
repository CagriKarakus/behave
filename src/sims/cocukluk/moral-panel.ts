// Sekme 3: Ahlaki gelişim (Kohlberg): Heinz ikilemi, yaşa göre aşama dağılımı, eleştiriler ve Blake'in adalet çalışması.
import { Scope } from '../kit';
import { actProb, fairness, levelOf, levelShares, stageDist } from './model';
import { bookBox, chipRow, el, makeSlider, pc, type Ctx, type Meter, type Panel } from '../ui';
import { t } from '../../i18n/t';
import { L } from './text';

type Stance = 'yes' | 'no';
type Crit = 'culture' | 'gender' | 'action';
type Society = 'late' | 'none';
const LEVEL_COLORS = ['var(--dop)', 'var(--pfc)', 'var(--pit)'];

export function createMoralPanel(ctx: Ctx, host: HTMLElement) {
  const T = L().moral;
  const REASONS: Record<Stance, string[]> = { yes: T.reasonsYes, no: T.reasonsNo };
  let age = 30, stance: Stance = 'yes', stage = 3, crit: Crit = 'culture', society: Society = 'late', pressure = 0.3, fAge = 10;
  let dirty = true;

  host.innerHTML =
    `<p class="note">${T.note}</p>` +
    `<div class="card"><h3 class="sim-h">${T.heinzH}</h3><p>${T.heinz}</p>` +
    `<div class="chips" data-ref="stance"></div><div class="chips" data-ref="stage"></div>` +
    `<blockquote class="quote"><b data-ref="qhead"></b><span data-ref="qtext"></span></blockquote>` +
    `<p class="note">${T.heinzNote}</p></div>` +
    `<div class="card"><h3 class="sim-h">${T.distH}</h3><div class="sliders" data-ref="ctl"></div>` +
    `<div class="chart"><svg viewBox="0 0 320 150" role="img" aria-label="${T.distAria}" data-ref="dist"></svg></div>` +
    `<div class="legend"><span><i style="background:var(--dop)"></i>${T.legend[0]}</span><span><i style="background:var(--pfc)"></i>${T.legend[1]}</span><span><i style="background:var(--pit)"></i>${T.legend[2]}</span></div></div>` +
    `<div class="card"><h3 class="sim-h">${T.critH}</h3><div class="chips" data-ref="crit"></div><div class="critbody" data-ref="cbody"></div></div>` +
    bookBox([
      { id: 'ch07-e4', text: T.book[0] },
      { id: 'ch07-e3', text: T.book[1] },
      { id: 'ch07-e1', text: T.book[2] },
      { id: 'ch07-e2', text: T.book[3] },
    ]) +
    `<details class="more"><summary>${t('sim.how')}</summary><p>${T.how[0]}</p><p>${T.how[1]}</p></details>`;

  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;

  const setStance = chipRow(q('stance'), ctx, [{ key: 'yes', label: T.stanceYes }, { key: 'no', label: T.stanceNo }], (k) => { stance = k as Stance; dirty = true; }, T.stanceGroup);
  const setStage = chipRow(q('stage'), ctx, [1, 2, 3, 4, 5, 6].map((n) => ({ key: String(n), label: L().stageN(n) })), (k) => { stage = +k; dirty = true; }, T.stageGroup);
  const ageSl = makeSlider(ctx, q('ctl'), 'mage', T.ageName, T.ageHint, 5, 70, age, (v) => { age = v; dirty = true; }, (v) => L().ageFmt(v), 'var(--pfc)');
  const setCrit = chipRow(q('crit'), ctx, [{ key: 'culture', label: T.critCulture }, { key: 'gender', label: T.critGender }, { key: 'action', label: T.critAction }], (k) => { crit = k as Crit; buildCrit(); dirty = true; }, T.critGroup);

  /* ---- Eleştiri paneli ---- */
  const cbody = q('cbody');
  let fairSvg: SVGSVGElement | null = null, actEls: Array<{ b: HTMLElement; v: HTMLElement }> = [];
  // Eleştiri sekmesi her değişimde yeniden kurulur; dinleyiciler ana kapsama birikmesin diye kendi kapsamı var.
  let critScope: Scope | null = null;
  ctx.scope.onDispose(() => critScope?.dispose());
  function buildCrit(): void {
    critScope?.dispose();
    critScope = new Scope();
    const cctx: Ctx = { ...ctx, scope: critScope };
    fairSvg = null; actEls = [];
    cbody.innerHTML = '';
    if (crit === 'culture') {
      el(cbody, 'p', '', T.cultureP);
      const row = el(cbody, 'div', 'chips');
      const setSoc = chipRow(row, cctx, [{ key: 'late', label: T.socLate }, { key: 'none', label: T.socNone }], (k) => { society = k as Society; setSoc(society); dirty = true; }, T.socGroup);
      setSoc(society);
      const ch = el(cbody, 'div', 'chart', `<svg viewBox="0 0 320 150" role="img" aria-label="${T.fairAria}"></svg>`);
      fairSvg = ch.firstChild as SVGSVGElement;
      const age2 = makeSlider(cctx, cbody, 'fage', T.fageName, T.fageHint, 4, 15, fAge, (v) => { fAge = v; dirty = true; }, (v) => L().ageFmt(v), 'var(--dop)');
      void age2;
      el(cbody, 'p', 'note', T.cultureNote);
    } else if (crit === 'gender') {
      el(cbody, 'p', '', T.genderP);
      el(cbody, 'blockquote', 'quote', `<b>${T.voiceJusticeH}</b><span>${T.voiceJustice}</span>`);
      el(cbody, 'blockquote', 'quote', `<b>${T.voiceCareH}</b><span>${T.voiceCare}</span>`);
      el(cbody, 'p', 'note', T.genderNote);
    } else {
      el(cbody, 'p', '', T.actP);
      makeSlider(cctx, cbody, 'press', T.pressName, T.pressHint, 0, 100, Math.round(pressure * 100), (v) => { pressure = v / 100; dirty = true; }, (v) => T.pressWords[v < 30 ? 0 : v > 70 ? 2 : 1], 'var(--red)');
      const lst = el(cbody, 'div', 'actlist');
      actEls = [1, 2, 3, 4, 5, 6].map((n) => {
        const row = el(lst, 'div', 'arow', `<span>${L().stageN(n)}</span><div class="track"><b></b></div><b class="av"></b>`);
        return { b: row.querySelector('.track > b') as HTMLElement, v: row.querySelector('.av') as HTMLElement };
      });
      el(cbody, 'p', 'note', T.actNote);
    }
  }
  buildCrit();

  function draw(): boolean {
    if (!dirty) return false;
    dirty = false;
    setStance(stance); setStage(String(stage)); setCrit(crit);
    q('qhead').textContent = T.qhead(L().levelNames[levelOf(stage)], stage);
    q('qtext').textContent = REASONS[stance][stage - 1];
    // Aşama dağılımı
    const d = stageDist(age);
    const X0 = 14, W = 292, bw = W / 6, base = 112, H = 88;
    let s = `<line class="grid" x1="${X0}" y1="${base}" x2="${X0 + W}" y2="${base}"/>`;
    d.forEach((p, i) => {
      const h = Math.max(1, p * H * 1.4), x = X0 + i * bw + 6;
      s += `<rect x="${x}" y="${base - h}" width="${bw - 12}" height="${h}" rx="3" fill="${LEVEL_COLORS[levelOf(i + 1)]}"/><text class="v-lbl" x="${x + (bw - 12) / 2}" y="${base - h - 4}" text-anchor="middle">${pc(p)}</text><text x="${x + (bw - 12) / 2}" y="${base + 13}" text-anchor="middle">${i + 1}</text>`;
    });
    s += `<text class="ax-t" x="${X0 + W / 2}" y="${base + 30}" text-anchor="middle">${T.distAxis}</text>`;
    q<SVGSVGElement>('dist').innerHTML = s;
    if (fairSvg) {
      const X = 34, WW = 272, Y0 = 10, HH = 104, px = (a: number) => X + ((a - 4) / 11) * WW, py = (v: number) => Y0 + HH - v * HH;
      const line = (f: (a: number) => number) => Array.from({ length: 45 }, (_, i) => { const a = 4 + (i * 11) / 44; return `${i ? 'L' : 'M'}${px(a).toFixed(1)} ${py(f(a)).toFixed(1)}`; }).join('');
      const me = fairness(fAge, society);
      let t = `<line class="grid" x1="${X}" y1="${Y0 + HH}" x2="${X + WW}" y2="${Y0 + HH}"/><line class="grid" x1="${X}" y1="${Y0}" x2="${X}" y2="${Y0 + HH}"/>`;
      t += `<path d="${line((a) => fairness(a, society).self)}" fill="none" stroke="var(--amy)" stroke-width="2.6"/><path d="${line((a) => fairness(a, society).other)}" fill="none" stroke="var(--pit)" stroke-width="2.6" stroke-dasharray="6 4"/>`;
      t += `<line x1="${px(fAge)}" y1="${Y0}" x2="${px(fAge)}" y2="${Y0 + HH}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="2 3"/><circle cx="${px(fAge)}" cy="${py(me.self)}" r="4.5" fill="var(--amy)"/><circle cx="${px(fAge)}" cy="${py(me.other)}" r="4.5" fill="var(--pit)"/>`;
      for (let a = 4; a <= 15; a += 2) t += `<text x="${px(a)}" y="${Y0 + HH + 12}" text-anchor="middle">${a}</text>`;
      t += `<text x="${X + 6}" y="${Y0 + 12}" fill="var(--red-text)" class="lbl-self">${T.fairSelf}</text><text x="${X + 6}" y="${Y0 + 26}" class="lbl-other">${T.fairOther}</text>`;
      t += `<text class="ax-t" x="${X + WW / 2}" y="${Y0 + HH + 28}" text-anchor="middle">${T.fairAxisX}</text><text class="ax-t" x="10" y="${Y0 + HH / 2}" text-anchor="middle" transform="rotate(-90 10 ${Y0 + HH / 2})">${T.fairAxisY}</text>`;
      fairSvg.innerHTML = t;
    }
    actEls.forEach((e, i) => { const p = actProb(i + 1, pressure); e.b.style.width = `${Math.round(p * 100)}%`; e.b.style.background = 'var(--red)'; e.v.textContent = pc(p); });
    return true;
  }
  void ageSl;

  return {
    draw,
    say: () => {
      const [a, b, c] = levelShares(stageDist(age));
      return T.say(age, pc(a), pc(b), pc(c), c < 0.07);
    },
    meters: (): Meter[] => {
      const sh = levelShares(stageDist(age));
      return L().levelShort.map((n, i) => ({ label: n, value: pc(sh[i]), frac: sh[i], color: LEVEL_COLORS[i] }));
    },
    set(p: { age?: number; stance?: Stance; stage?: number; crit?: Crit }): void {
      if (p.age !== undefined) { age = p.age; ageSl.set(age); }
      if (p.stance) stance = p.stance;
      if (p.stage) stage = p.stage;
      if (p.crit && p.crit !== crit) { crit = p.crit; buildCrit(); }
      dirty = true;
    },
  } satisfies Panel & { set(p: object): void };
}
