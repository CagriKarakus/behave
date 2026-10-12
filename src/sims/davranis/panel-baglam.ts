// Sekme 2: Bağlam kapısı. Aynı motor eylem, hedef ve bağlama göre farklı anlam kazanır (King ve ark., ch01-e3).
import { ref, svg, svgText } from '../kit';
import { createTour } from '../tour';
import { chipRow, el, makeSlider, pc, type Ctx, type Meter, type Panel } from '../ui';
import {
  ACTIONS, ROOM_ACTIONS, ROOM_TARGETS, action, circuit, fit, meaning, verdict, type ActionKey, type Context,
} from './model';
import { bars, wrap } from './bars';

const VCOL = { good: 'var(--pfc)', mid: 'var(--dop)', bad: 'var(--amy)' } as const;
const VWORD = { good: 'uygun', mid: 'tartışmalı', bad: 'uygunsuz' } as const;
const SL: Array<[keyof Context, string, string]> = [
  ['need', 'Hedefin ihtiyacı', 'Yüksek: hedef yaralı, acı çekiyor ya da destek bekliyor.'],
  ['threat', 'Hedefin tehdit düzeyi', 'Yüksek: hedef bir saldırı hazırlığında ya da silahlı.'],
  ['consent', 'Rıza', 'Yüksek: hedef bu eyleme açıkça razı ya da istekli.'],
  ['auth', 'Rol ve yetki', 'Yüksek: eylemi meşru kılan bir rol (hekim, görevli asker) var.'],
];

export interface BaglamPanel extends Panel { set(a: ActionKey, c?: Context): void }

export function createBaglamPanel(ctx: Ctx, host: HTMLElement): BaglamPanel {
  let act: ActionKey = 'kes';
  const cv: Context = { ...action('kes').presets[0].c };
  let dirty = true;

  host.innerHTML =
    `<div class="chips" data-ref="acts"></div>` +
    `<div class="stage"><svg viewBox="0 0 360 172" role="img" aria-label="Aynı motor kalıp bağlam kapısından geçer ve bağlama göre bir anlam alır" data-ref="gate"></svg>` +
    `<div class="legend"><span><i style="background:var(--pfc)"></i>uygun</span><span><i style="background:var(--dop)"></i>tartışmalı</span><span><i style="background:var(--amy)"></i>uygunsuz</span><span>Kapı ne kadar açıksa bağlam eylemi o kadar uygun kılıyor</span></div></div>` +
    `<div class="chips" data-ref="pre"></div>` +
    `<section><h3 class="sim-h">Bağlam</h3><div class="sliders" data-ref="sl"></div></section>` +
    `<div class="card"><h3 class="sim-h">Beyinde ne değişiyor?</h3><div class="sys" data-ref="bars"></div><p class="note">Motor kalıp eyleme göre değişir; karar devresi ise bağlamın uygunluğuyla birlikte yükselir. Kitaba göre eylem uygunken iki farklı eylemde aynı devre çalışır; uygunsuz durumdaki düzey modelin varsayımıdır.</p></div>` +
    `<div class="card"><h3 class="sim-h">Sanal oda: yaralıyı sar ya da uzaylıyı vur</h3><table class="tbl" data-ref="room"></table><p class="note">Hücreye basınca eylem ve hedef yukarıya yüklenir.</p></div>` +
    `<div class="notes" data-notes="n2"></div>`;
  const $ = <T extends Element = HTMLElement>(n: string) => ref<T>(host, n);

  const setAct = chipRow($('acts'), ctx, ACTIONS.map((a) => ({ key: a.key, label: a.name })), (k) => { set(k as ActionKey, action(k as ActionKey).presets[0].c); }, 'Motor eylem');
  const preBox = $('pre');
  const sl = SL.map(([k, name, hint]) => makeSlider(ctx, $('sl'), k, name, hint, 0, 100, 0, (v) => { cv[k] = v / 100; dirty = true; }, (v) => pc(v / 100), 'var(--ink)'));
  const syncSl = (): void => SL.forEach(([k], i) => sl[i].set(Math.round(cv[k] * 100)));

  function buildPresets(): void {
    preBox.innerHTML = '';
    preBox.setAttribute('role', 'group'); preBox.setAttribute('aria-label', 'Hazır bağlamlar');
    for (const p of action(act).presets) {
      const b = el(preBox, 'button', 'chip', p.name) as HTMLButtonElement;
      b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      ctx.scope.on(b, 'click', () => { Object.assign(cv, p.c); syncSl(); dirty = true; ctx.touch(); });
    }
  }
  function set(a: ActionKey, c?: Context): void {
    act = a;
    if (c) Object.assign(cv, c);
    buildPresets(); syncSl(); dirty = true; ctx.touch();
  }

  /* ---- Kapı sahnesi ---- */
  const g = $<SVGElement>('gate');
  const NS = (t: string, a: Record<string, string | number>, p: Element = g) => svg(t, a, p);
  NS('rect', { x: 6, y: 22, width: 104, height: 100, rx: 10, class: 'bx' });
  svgText(g, { x: 14, y: 38, class: 'cap' }, 'MOTOR KALIP');
  const motorT = svgText(g, { x: 14, y: 58, class: 'mt' }, '');
  NS('path', { d: 'M112 72 H146', class: 'arr' }); NS('path', { d: 'M140 66 L148 72 L140 78', class: 'arr' });
  NS('rect', { x: 150, y: 22, width: 36, height: 100, class: 'frame' });
  const top = NS('rect', { x: 150, y: 22, width: 36, height: 50, class: 'shut' });
  const bot = NS('rect', { x: 150, y: 72, width: 36, height: 50, class: 'shut' });
  NS('path', { d: 'M188 72 H222', class: 'arr' }); NS('path', { d: 'M216 66 L224 72 L216 78', class: 'arr' });
  const out = NS('rect', { x: 226, y: 22, width: 128, height: 100, rx: 10, class: 'bx out' });
  svgText(g, { x: 234, y: 38, class: 'cap' }, 'ANLAM');
  const meanT = svgText(g, { x: 234, y: 58, class: 'mn' }, '');
  const verdT = svgText(g, { x: 234, y: 114, class: 'vd' }, '');
  const capT = svgText(g, { x: 180, y: 146, class: 'cap', 'text-anchor': 'middle' }, '');
  svgText(g, { x: 180, y: 164, class: 'cap2', 'text-anchor': 'middle' }, 'Kapı açıklığı = bağlamsal uygunluk');

  function lines(t: SVGElement, ss: string[], dy: number): void {
    t.innerHTML = '';
    ss.forEach((s, i) => { const ts = svg('tspan', { x: t.getAttribute('x')!, dy: i ? dy : 0 }, t); ts.textContent = s; });
  }

  const bset = bars($('bars'), [{ label: 'Motor kalıp (bağlamdan bağımsız)', color: 'var(--lesion)' }, { label: 'Bağlamsal karar devresi (PFC, göreli)', color: 'var(--pfc)' }]);
  const room = $<HTMLTableElement>('room');
  room.innerHTML = `<thead><tr><th scope="col"><span class="sr-only">Hedef</span></th>${ROOM_ACTIONS.map((a) => `<th scope="col">${action(a).name}</th>`).join('')}</tr></thead><tbody></tbody>`;
  const tb = room.querySelector('tbody')!;
  const cells: HTMLButtonElement[][] = ROOM_TARGETS.map((t) => {
    const tr = el(tb, 'tr', '', `<th scope="row">${t.name}</th>`);
    return ROOM_ACTIONS.map((a) => {
      const td = el(tr, 'td');
      const b = el(td, 'button', 'cellb') as HTMLButtonElement;
      b.type = 'button';
      ctx.scope.on(b, 'click', () => set(a, t.c));
      return b;
    });
  });

  const f = (): number => fit(act, cv);
  function render(): void {
    const A = action(act), fv = f(), vd = verdict(fv), col = VCOL[vd];
    lines(motorT, wrap(A.motor, 16), 15);
    lines(meanT, wrap(meaning(act, fv), 19), 15);
    out.setAttribute('class', `bx out ${vd}`);
    verdT.textContent = `${VWORD[vd]} (${pc(fv)})`;
    verdT.setAttribute('class', `vd ${vd}`);
    const h = 50 * (1 - fv);
    top.setAttribute('height', h.toFixed(1));
    bot.setAttribute('y', (122 - h).toFixed(1)); bot.setAttribute('height', h.toFixed(1));
    capT.textContent = `${A.name}: aynı hareket, bağlam değişir`;
    setAct(act);
    [...preBox.children].forEach((b, i) => {
      const p = A.presets[i].c;
      b.setAttribute('aria-pressed', String((Object.keys(p) as Array<keyof Context>).every((k) => Math.abs(p[k] - cv[k]) < 0.005)));
    });
    bset([A.motorLoad, circuit(fv)], [`%${Math.round(A.motorLoad * 100)}`, pc(circuit(fv))]);
    ($('bars').querySelectorAll('b')[1] as HTMLElement).style.background = col;
    ROOM_TARGETS.forEach((t, ti) => ROOM_ACTIONS.forEach((a, ai) => {
      const x = fit(a, t.c), v = verdict(x), b = cells[ti][ai];
      b.dataset.v = v;
      b.innerHTML = `<b>${VWORD[v]}</b><span>devre ${pc(circuit(x))}</span>`;
      b.setAttribute('aria-label', `${t.name}, ${action(a).name}: ${VWORD[v]}, karar devresi ${pc(circuit(x))}`);
      b.setAttribute('aria-pressed', String(a === act && (Object.keys(t.c) as Array<keyof Context>).every((k) => Math.abs(t.c[k] - cv[k]) < 0.005)));
    }));
  }

  const panel: BaglamPanel = {
    say: () => { const fv = f(); return `${action(act).name}: ${meaning(act, fv)} (${VWORD[verdict(fv)]}, uygunluk ${pc(fv)}). Motor kalıp aynı; karar devresi ${pc(circuit(fv))}.`; },
    meters(): Meter[] {
      const fv = f(), A = action(act);
      return [
        { label: 'Bağlamsal uygunluk', value: pc(fv), frac: fv, color: VCOL[verdict(fv)] },
        { label: 'Karar devresi (PFC)', value: pc(circuit(fv)), frac: circuit(fv), color: 'var(--pfc)' },
        { label: 'Motor kalıp', value: pc(A.motorLoad), frac: A.motorLoad, color: 'var(--lesion)' },
      ];
    },
    draw(): boolean { if (!dirty) return false; dirty = false; render(); return true; },
    set,
  };

  const [cerrah, saldirgan] = action('kes').presets, [asker] = action('tetik').presets, [yas] = action('sar').presets;
  const tour = createTour(ctx.scope, [
    { title: 'Bıçak, ameliyat odasında', text: 'Bıçakla kesmek; hekim, hasta ve rıza birlikteyken ameliyattır. Kapı sonuna kadar açıktır ve eylem şifa sayılır.',
      look: 'Kapının açık olması ve sağdaki anlam kutusu.', apply: () => set('kes', cerrah.c) },
    { title: 'Aynı hareket, başka bağlam', text: 'Motor kalıp değişmedi: aynı el, aynı kesme. Ama ihtiyaç, rıza ve yetki yoksa kapı kapanır ve eylem saldırıdır.',
      look: 'Soldaki motor kalıp kutusu aynı kalırken kapının kapanması.', apply: () => set('kes', saldirgan.c) },
    { title: 'Tetik: asker ya da katil', text: 'Tetiği çekmek, görevli askerin tehdide karşı eyleminde "görev" sayılabilir; tehdit ve yetki yokken cinayettir. Kitapta bu ayrım bağlam belirler.',
      look: 'Tehdit ve rol kaydırıcılarını sıfırlayınca kapının kapanması.', apply: () => set('tetik', asker.c) },
    { title: 'Sanal oda deneyi', text: 'King ve ark.: katılımcılar yaralıyı sarabiliyor ya da uzaylıyı vurabiliyordu. İki eylem de uygun olduğunda prefrontal korteksin aynı devresi etkinleşti.',
      look: 'Tablodaki iki "uygun" hücrenin benzer devre düzeyi; yanlış eşleşmelerde düşük.', apply: () => set('bandaj', ROOM_TARGETS[0].c) },
    { title: 'Sarılmak bile bağlama bağlı', text: 'Teselli olan sarılma, rıza yoksa istenmeyen temastır. Kitabın vurgusu: davranışın biyolojisi bağlamdan ayrılamaz.',
      look: 'Rıza kaydırıcısı ve anlam kutusunun değişmesi.', apply: () => set('sar', yas.c) },
  ]);
  host.prepend(tour.el);
  return panel;
}
