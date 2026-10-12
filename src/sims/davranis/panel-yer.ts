// Sekme 3: Yer değiştirme saldırganlığı (ch01-e1). Basit bir sosyal hiyerarşi ajan modeli ve stres hormonu göstergesi.
import { ref, svg, svgText } from '../kit';
import { createTour } from '../tour';
import { makeSlider, pc, type Ctx, type Meter, type Panel } from '../ui';
import { TROOP_DEFAULT, meanD, meanH, newTroop, rankMean, ratExperiment, stepTroop, type Ev, type Troop, type TroopParams } from './model';
import { bars } from './bars';

const N = 8, STEP_S = 0.4, AX = (k: number): number => 28 + k * 43.4, Y_BASE = 176, H_MAX = 70, ARCS = 24;
const reduced = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface YerPanel extends Panel { setup(p: Partial<TroopParams>, warm: number): void }

export function createYerPanel(ctx: Ctx, host: HTMLElement): YerPanel {
  const P: TroopParams = { ...TROOP_DEFAULT };
  let seed = 7, troop: Troop = newTroop(seed);
  let running = !reduced(), dirty = true, acc = 0, last = 0;
  let evs: Array<{ e: Ev; ttl: number }> = [];

  host.innerHTML =
    `<div class="row"><button type="button" class="btn" data-ref="run" aria-pressed="${running}">${running ? 'Duraklat' : 'Başlat'}</button><button type="button" class="btn" data-ref="step">Bir adım</button><button type="button" class="btn" data-ref="new">Yeni topluluk</button></div>` +
    `<div class="stage"><svg viewBox="0 0 360 202" role="img" aria-label="Sekiz babunluk hiyerarşi: rütbe sırasıyla daireler, altlarında stres hormonu çubukları, üstlerinde saldırı okları" data-ref="troop"></svg>` +
    `<div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5 H25" stroke="var(--edge)" stroke-width="2" stroke-dasharray="4 3" fill="none"/></svg>statü yenilgisi (üstten alta)</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5 H25" stroke="var(--amy)" stroke-width="2.6" fill="none"/></svg>yer değiştirme saldırısı</span><span><i style="background:var(--gld)"></i>stres hormonu (çizgi: zaman ortalaması)</span></div></div>` +
    `<div class="card"><h3 class="sim-h">Saldırının ardından stres hormonu</h3>` +
    `<svg viewBox="0 0 360 112" class="chart" role="img" aria-label="Yer değiştirenler ve tutanlar için olay sonrası ortalama stres hormonu, zamana göre" data-ref="chart"></svg>` +
    `<div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5 H25" stroke="var(--amy)" stroke-width="2.6" fill="none"/></svg>yenilgiden sonra saldıranlar</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5 H25" stroke="var(--pfc)" stroke-width="2.6" stroke-dasharray="5 3" fill="none"/></svg>saldırmayıp tutanlar</span></div></div>` +
    `<div class="card"><h3 class="sim-h">Şoklanan sıçan (200 sanal sıçan)</h3><div class="sys" data-ref="rat"></div><p class="note">Şok şiddeti, yenilgi stresi kaydırıcısıyla orantılıdır. Sıçanın ısırma olasılığı yer değiştirme eğilimine eşittir.</p></div>` +
    `<section><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="sl"></div></section>` +
    `<div class="notes" data-notes="n3"></div>`;
  const $ = <T extends Element = HTMLElement>(n: string) => ref<T>(host, n);

  /* ---- Sahne ---- */
  const T = $<SVGElement>('troop');
  svg('line', { x1: 10, x2: 350, y1: Y_BASE, y2: Y_BASE, class: 'base' }, T);
  svgText(T, { x: 6, y: 96, class: 'ax-t' }, 'Stres hormonu');
  svgText(T, { x: 6, y: 197, class: 'ax-t' }, 'En üst rütbe');
  svgText(T, { x: 354, y: 197, class: 'ax-t', 'text-anchor': 'end' }, 'En alt rütbe');
  const arcs = Array.from({ length: ARCS }, () => {
    const g = svg('g', { class: 'arc', opacity: 0 }, T);
    return { g, p: svg('path', { fill: 'none' }, g), c: svg('circle', { r: 3.2 }, g) };
  });
  const ag = Array.from({ length: N }, (_, k) => {
    const x = AX(k);
    const bar = svg('rect', { x: x - 9, width: 18, class: 'sbar' }, T);
    const tick = svg('line', { x1: x - 13, x2: x + 13, class: 'tick2' }, T);
    svg('circle', { cx: x, cy: 66, r: 13, class: 'ag' }, T);
    svgText(T, { x, y: 70.5, 'text-anchor': 'middle', class: 'agn' }, String(k + 1));
    return { bar, tick };
  });

  /* ---- Zaman grafiği ---- */
  const C = $<SVGElement>('chart');
  const CX0 = 34, CX1 = 352, CY0 = 92, CY1 = 8;
  svg('line', { x1: CX0, x2: CX1, y1: CY0, y2: CY0, class: 'grid' }, C);
  svg('line', { x1: CX0, x2: CX1, y1: CY1, y2: CY1, class: 'grid' }, C);
  svgText(C, { x: 30, y: CY0 + 3, 'text-anchor': 'end' }, '0');
  const topLbl = svgText(C, { x: 30, y: CY1 + 3, 'text-anchor': 'end' }, '');
  svgText(C, { x: CX1, y: 108, 'text-anchor': 'end' }, 'zaman →');
  const lnD = svg('polyline', { class: 'ln', stroke: 'var(--amy)' }, C);
  const lnH = svg('polyline', { class: 'ln', stroke: 'var(--pfc)', 'stroke-dasharray': '6 4' }, C);
  const noData = svgText(C, { x: 190, y: 54, 'text-anchor': 'middle' }, 'Henüz veri yok: Başlat ya da Bir adım');

  const ratSet = bars($('rat'), [{ label: 'Yanında küçük sıçan var', color: 'var(--gld)' }, { label: 'Yanında kimse yok', color: 'var(--gld)' }]);

  /* ---- Kaydırıcılar ---- */
  const sFreq = makeSlider(ctx, $('sl'), 'f', 'Yenilgi sıklığı', 'Her adımda kaç çatışma yaşanıyor.', 1, 4, P.freq, (v) => { P.freq = v; dirty = true; }, (v) => `${v} / adım`, 'var(--ink)');
  const sHit = makeSlider(ctx, $('sl'), 'h', 'Yenilgi stresi', 'Bir yenilginin stres hormonunu ne kadar yükselttiği; sıçan kartındaki şok da bununla orantılı.', 3, 20, Math.round(P.hit * 100), (v) => { P.hit = v / 100; dirty = true; }, (v) => `%${v}`, 'var(--gld)');
  const sDis = makeSlider(ctx, $('sl'), 'd', 'Yer değiştirme eğilimi', 'Yenilenin kendinden zayıf birine saldırma olasılığı.', 0, 100, Math.round(P.displace * 100), (v) => { P.displace = v / 100; dirty = true; }, (v) => `%${v}`, 'var(--amy)');
  const sRel = makeSlider(ctx, $('sl'), 'r', 'Saldırının rahatlatma etkisi', 'Saldıran bireyin stres hormonunun ne kadarı düşüyor. Sıfırda saldırmak stresi değiştirmez (modelin varsayımı).', 0, 100, Math.round(P.relief * 100), (v) => { P.relief = v / 100; dirty = true; }, (v) => `%${v}`, 'var(--pfc)');
  const syncSl = (): void => { sFreq.set(P.freq); sHit.set(Math.round(P.hit * 100)); sDis.set(Math.round(P.displace * 100)); sRel.set(Math.round(P.relief * 100)); };

  /* ---- Düğmeler ---- */
  const runBtn = $<HTMLButtonElement>('run');
  const setRun = (on: boolean): void => { running = on; runBtn.setAttribute('aria-pressed', String(on)); runBtn.textContent = on ? 'Duraklat' : 'Başlat'; last = 0; };
  ctx.scope.on(runBtn, 'click', () => { setRun(!running); ctx.touch(); });
  const advance = (): void => { evs = evs.filter((x) => --x.ttl > 0); for (const e of stepTroop(troop, P)) evs.push({ e, ttl: 2 }); dirty = true; };
  ctx.scope.on($('step'), 'click', () => { advance(); ctx.touch(); });
  ctx.scope.on($('new'), 'click', () => { seed++; troop = newTroop(seed); evs = []; dirty = true; ctx.touch(); });

  function setup(p: Partial<TroopParams>, warm: number): void {
    Object.assign(P, p);
    syncSl();
    troop = newTroop(seed); evs = [];
    for (let i = 0; i < warm; i++) stepTroop(troop, P);
    dirty = true; ctx.touch();
  }

  /* ---- Çizim ---- */
  const lastVal = (a: number[]): number => { for (let i = a.length - 1; i >= 0; i--) if (!Number.isNaN(a[i])) return a[i]; return NaN; };
  function render(): void {
    troop.gc.forEach((v, k) => {
      const h = Math.max(1, v * H_MAX);
      ag[k].bar.setAttribute('y', (Y_BASE - h).toFixed(1)); ag[k].bar.setAttribute('height', h.toFixed(1));
      const ty = Y_BASE - Math.max(0, rankMean(troop, k)) * H_MAX;
      ag[k].tick.setAttribute('y1', ty.toFixed(1)); ag[k].tick.setAttribute('y2', ty.toFixed(1));
    });
    arcs.forEach((a, i) => {
      const x = evs[i];
      if (!x) { a.g.setAttribute('opacity', '0'); return; }
      const xi = AX(x.e.from), xj = AX(x.e.to), up = 44 - 8 - Math.abs(xj - xi) * 0.16;
      a.p.setAttribute('d', `M${xi} 52 Q${(xi + xj) / 2} ${up} ${xj} 52`);
      a.g.setAttribute('class', `arc ${x.e.kind}`);
      a.c.setAttribute('cx', String(xj)); a.c.setAttribute('cy', '52');
      a.g.setAttribute('opacity', x.ttl >= 2 ? '1' : '0.45');
    });
    // Grafik
    const sd = troop.seriesD, sh = troop.seriesH, n = sd.length;
    let mx = 0.2;
    for (const v of [...sd, ...sh]) if (!Number.isNaN(v) && v > mx) mx = v;
    mx = Math.min(1, Math.ceil(mx * 10) / 10);
    topLbl.textContent = String(mx).replace('.', ',');
    const pts = (a: number[]): string => a.map((v, i) => (Number.isNaN(v) ? '' : `${(CX0 + (n > 1 ? i / (n - 1) : 0) * (CX1 - CX0)).toFixed(1)},${(CY0 - v / mx * (CY0 - CY1)).toFixed(1)}`)).filter(Boolean).join(' ');
    lnD.setAttribute('points', pts(sd)); lnH.setAttribute('points', pts(sh));
    noData.setAttribute('opacity', n > 1 && !Number.isNaN(lastVal(sd)) ? '0' : '1');
    // Sıçan
    const r = ratExperiment(seed, Math.min(0.9, P.hit * 6), P.displace, P.relief);
    ratSet([r.present, r.absent]);
  }

  const say = (): string => {
    const d = meanD(troop), h = meanH(troop);
    if (!troop.step) return 'Henüz veri yok. Başlat ya da Bir adım: yenilen birey kendinden aşağıdakine saldırabilir ya da tutabilir.';
    if (Number.isNaN(d) || Number.isNaN(h)) return `Adım ${troop.step}: ${Number.isNaN(d) ? 'kimse alttakine saldırmıyor' : 'herkes saldırıyor'}; stres hormonu en alt rütbede %${Math.round(troop.gc[N - 1] * 100)}, en üst rütbede %${Math.round(troop.gc[0] * 100)}.`;
    const diff = h - d;
    return `Adım ${troop.step}: yenilgiden sonra saldıranların stres hormonu %${Math.round(d * 100)}, tutanlarınki %${Math.round(h * 100)} ` +
      (diff > 0.02 ? '(saldıranda daha düşük).' : diff < -0.02 ? '(saldıranda daha yüksek).' : '(fark yok).') + ` En alt rütbede %${Math.round(troop.gc[N - 1] * 100)}.`;
  };
  const panel: YerPanel = {
    say,
    meters(): Meter[] {
      const d = meanD(troop), h = meanH(troop), z = (v: number): number => (Number.isNaN(v) ? 0 : v);
      return [
        { label: 'Saldıranın stresi', value: Number.isNaN(d) ? '—' : pc(d), frac: z(d), color: 'var(--amy)' },
        { label: 'Tutanın stresi', value: Number.isNaN(h) ? '—' : pc(h), frac: z(h), color: 'var(--pfc)' },
        { label: 'En alt rütbe', value: pc(troop.gc[N - 1]), frac: troop.gc[N - 1], color: 'var(--gld)' },
      ];
    },
    draw(now = 0): boolean {
      if (running) {
        const dt = last ? Math.min(0.5, Math.max(0, (now - last) / 1000)) : 0;
        last = now;
        acc += dt;
        while (acc >= STEP_S) { acc -= STEP_S; advance(); }
      }
      if (!dirty) return false;
      dirty = false; render(); return true;
    },
    resume() { last = 0; acc = 0; },
    setup,
  };

  const tour = createTour(ctx.scope, [
    { title: 'Yer değiştirme yok', text: 'Sekiz babun, rütbe sırasıyla. Yenilgi stresi rastgele düşer; yenilen kimse alttakine saldırmıyor. Alt rütbeler daha sık yenilir, stres hormonları daha yüksektir.',
      look: 'Sağa doğru yükselen çubuklar.', apply: () => setup({ displace: 0, relief: 0.4 }, 250) },
    { title: 'Yenilen alttakine saldırıyor', text: 'Yenilen birey kendinden aşağıdakini kovalıyor (beta erkek, en alttaki omega erkeği). Saldırabilen bireyin stres hormonu daha az yükselir.',
      look: 'Kırmızı çizginin (saldıranlar) mavi kesikli çizginin altında kalması.', apply: () => setup({ displace: 0.6, relief: 0.4 }, 250) },
    { title: 'Fark nereden geliyor?', text: 'Rahatlatma etkisi sıfırlanırsa iki çizgi birleşir. Yani fark, saldırmanın stresi düşürdüğü varsayımından gelir; kitapta bu, hayvan çalışmalarının bulgusudur.',
      look: 'İki çizginin üst üste binmesi.', apply: () => setup({ displace: 0.6, relief: 0 }, 250) },
    { title: 'Şoklanan sıçan', text: 'Ayağına şok verilen sıçanın yanında küçük bir sıçan varsa ısırabilir ve stres yanıtı daha az yükselir. Yanında kimse yoksa stres olduğu gibi kalır.',
      look: 'Aşağıdaki sıçan kartında iki çubuk arasındaki fark.', apply: () => setup({ displace: 0.8, relief: 0.4, hit: 0.1 }, 100) },
    { title: 'Stres ortadan kalkmıyor, aşağı akıyor', text: 'Her saldırı alttakine yeni bir yenilgi yükler. Yer değiştirme eğilimi tam olunca ortadakilerin stresi düşer, en alttakinin stresi artar.',
      look: 'En sağdaki çubuk ve zaman ortalaması çizgisi.', apply: () => setup({ displace: 1, relief: 0.4 }, 250) },
  ]);
  host.prepend(tour.el);
  return panel;
}
