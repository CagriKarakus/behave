// Sekme 3: Konformasyon ve işlev. Bir protein, bağlanan moleküle göre açık ve kapalı şekil arasında geçer (anahtar-kilit; enzim ya da reseptör).
import { mulberry32 } from '../rng';
import { svg, svgText } from '../kit';
import { chips, el, f1, pc, slider, type Ctx, type Meter } from '../ui';
import { CONF_DEFAULT, confOut, stepConf, ST, type ConfP, type Lig } from './model';

const HIST = 240;       // 24 sn (0,1 sn aralıkla)
const LIGS: Array<{ key: Lig; label: string }> = [
  { key: 'none', label: 'Molekül yok' }, { key: 'good', label: 'Doğru molekül (anahtar)' }, { key: 'like', label: 'Benzer ama uymayan' },
];
const CX0 = 44, CX1 = 350;

export function createConfPanel(ctx: Ctx, host: HTMLElement) {
  const P: ConfP = { ...CONF_DEFAULT };
  const rnd = mulberry32(3);
  let st: number = ST.EO, c = 0, last = -1, flash = -1e9, paused = false, dirty = true, turns = 0;
  let hist: Array<{ c: number; t: boolean }> = [];
  let acc = 0;

  host.innerHTML =
    '<p class="note">Protein, şekline göre iş görür. Uyan molekül bağlanınca iki lob kapanır; ürün çıkınca yeniden açılır. Ekranda tek bir molekül, çubukta ise beklenen ortalama var.</p>' +
    '<div class="chips" data-ref="lg"></div>' +
    '<div class="stage"><svg viewBox="0 0 360 190" role="img" aria-label="Protein: iki lob, bağlanma çukuru, serbest moleküller" data-ref="pr"></svg>' +
    '<div class="legend"><span><i style="background:var(--eff)"></i>doğru molekül (çukura uyar)</span><span><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 0L12 6L6 12L0 6Z" fill="var(--red)"/></svg>benzer molekül (uymaz)</span><span><i style="background:var(--gld)"></i>ürün</span></div></div>' +
    '<div class="chart"><h4 class="sim-h">Tek molekülün şeklinin zamanla değişimi</h4><svg viewBox="0 0 360 110" role="img" aria-label="Açık ve kapalı şekil arasındaki geçişlerin zaman çizgisi" data-ref="tr"></svg></div>' +
    '<div class="row" data-ref="ac"></div>' +
    '<div class="card"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="sl"></div></div>';
  const q = <T extends HTMLElement | SVGElement = HTMLElement>(k: string): T => host.querySelector<T>(`[data-ref="${k}"]`) as T;
  const mark = (): void => { dirty = true; ctx.touch(); };

  const setLg = chips(q('lg'), ctx.scope, LIGS, (k) => { P.lig = k as Lig; setLg(k); mark(); }, 'Bağlanan molekül');
  setLg(P.lig);
  const sl = q('sl');
  const hs = {
    conc: slider(ctx.scope, sl, { id: `${ctx.id}-conc`, name: 'Molekül derişimi', hint: 'Fazla molekül bağlanmayı sıklaştırır, ama bir noktadan sonra doyar.', min: 0, max: 10, step: 0.5, value: P.conc, cls: 'sl', color: 'var(--eff)', fmt: (v) => f1(v), onInput: (v) => { P.conc = v; mark(); } }),
    temp: slider(ctx.scope, sl, { id: `${ctx.id}-temp`, name: 'Sıcaklık', hint: 'Isınınca hızlanır, çok ısınınca şekil bozulur (modelin varsayımı).', min: 0, max: 60, value: P.temp, cls: 'sl', color: 'var(--red)', fmt: (v) => `${v} °C`, onInput: (v) => { P.temp = v; mark(); } }),
    ph: slider(ctx.scope, sl, { id: `${ctx.id}-ph`, name: 'Asitlik (pH)', hint: 'Nötre yakın en iyi; asidik ya da bazik uçta şekil kayar.', min: 4, max: 10, step: 0.1, value: P.ph, cls: 'sl', color: 'var(--pit)', fmt: (v) => f1(v), onInput: (v) => { P.ph = v; mark(); } }),
  };
  const ac = q('ac');
  const pauseB = el(ac, 'button', 'btn', 'Duraklat'); pauseB.type = 'button'; pauseB.setAttribute('aria-pressed', 'false');
  ctx.scope.on(pauseB, 'click', () => { paused = !paused; pauseB.setAttribute('aria-pressed', String(paused)); pauseB.textContent = paused ? 'Devam' : 'Duraklat'; dirty = true; ctx.touch(); });
  const resetB = el(ac, 'button', 'btn', 'Sıfırla'); resetB.type = 'button';
  ctx.scope.on(resetB, 'click', () => { reset(); mark(); });

  function reset(): void { st = ST.EO; c = 0; hist = []; turns = 0; acc = 0; flash = -1e9; dirty = true; }

  /* ---------- Sahne ---------- */
  const s = q<SVGElement>('pr');
  svg('path', { d: 'M62 104h6', class: 'dna' }, s);
  svgText(s, { x: 60, y: 108, 'text-anchor': 'end' }, 'menteşe');
  const top = svg('g', {}, s);
  svg('rect', { x: 70, y: 44, width: 150, height: 54, rx: 20, class: 'lobe' }, top);
  const botG = svg('g', {}, s);
  const bot = svg('rect', { x: 70, y: 102, width: 150, height: 54, rx: 20, class: 'lobe' }, botG);
  svg('circle', { cx: 176, cy: 102, r: 13, class: 'pocket' }, s);
  svgText(s, { x: 176, y: 174, 'text-anchor': 'middle' }, 'bağlanma çukuru');
  const stateT = svgText(s, { x: 8, y: 16, class: 'st' }, '');
  const warpT = svgText(s, { x: 8, y: 30 }, '');
  const bound = svg('g', {}, s);
  const free = svg('g', {}, s);
  const prod = svg('circle', { r: 5, class: 'prod', cx: 176, cy: 102, opacity: 0 }, s);
  const FREE = 7;
  const diamond = (x: number, y: number): string => `M${x} ${y - 12}L${x + 12} ${y}L${x} ${y + 12}L${x - 12} ${y}Z`;
  const shape = (g: SVGElement, x: number, y: number, kind: Lig): void => {
    if (kind === 'like') svg('path', { d: diamond(x, y), class: 'lg like' }, g);
    else svg('circle', { cx: x, cy: y, r: 11, class: 'lg good' }, g);
  };

  /* ---------- Zaman çizgisi ---------- */
  const tr = q<SVGElement>('tr');
  const yC = 26, yO = 70;
  svg('line', { x1: CX0, x2: CX1, y1: yC, y2: yC, class: 'grid' }, tr);
  svg('line', { x1: CX0, x2: CX1, y1: yO, y2: yO, class: 'grid' }, tr);
  svgText(tr, { x: CX0 - 6, y: yC + 3, 'text-anchor': 'end' }, 'kapalı');
  svgText(tr, { x: CX0 - 6, y: yO + 3, 'text-anchor': 'end' }, 'açık');
  svgText(tr, { x: CX0, y: 100 }, '24 sn önce');
  svgText(tr, { x: CX1, y: 100, 'text-anchor': 'end' }, 'şimdi');
  const line = svg('path', { class: 'ln tr-ln', d: '' }, tr);
  const dots = svg('g', {}, tr);
  svgText(tr, { x: CX1, y: 11, 'text-anchor': 'end' }, 'yeşil nokta: bir ürün çıktı');

  function renderSlow(): void {
    // Serbest moleküller: derişime göre sayı; bağlıyken çukurda biri durur.
    free.innerHTML = '';
    bound.innerHTML = '';
    const n = P.lig === 'none' ? 0 : Math.ceil((P.conc / 10) * FREE);
    for (let i = 0; i < n; i++) shape(free as SVGElement, 0, 0, P.lig);
    const g = free.children;
    for (let i = 0; i < g.length; i++) g[i].setAttribute('data-i', String(i));
    if ((st === ST.SO || st === ST.SC) && P.lig !== 'none') shape(bound as SVGElement, 176, 103, P.lig);
  }
  let lastKey = '';
  function render(now: number): void {
    const key = `${P.lig}|${P.conc}|${st}`;
    if (key !== lastKey) { lastKey = key; renderSlow(); }
    const { shape: sh } = confOut(P);
    const warp = 1 - sh;
    const closedT = st === ST.EC || st === ST.SC ? 1 : 0;
    const open = (1 - c) * 16;
    top.setAttribute('transform', `rotate(${-open} 70 100)`);
    botG.setAttribute('transform', `rotate(${warp * 10} 70 129)`);
    bot.classList.toggle('warp', warp > 0.3);
    top.classList.toggle('warp', warp > 0.3);
    stateT.textContent = `şekil: ${closedT ? 'kapalı' : 'açık'}${st === ST.SC ? ' (aktif)' : ''}`;
    warpT.textContent = warp > 0.05 ? `şekil bozulması: ${pc(warp)}` : '';
    const g = free.children;
    for (let i = 0; i < g.length; i++) {
      const x = 270 + (i % 3) * 28 + Math.sin(now / 700 + i * 2.1) * 10;
      const y = 50 + Math.floor(i / 3) * 40 + Math.cos(now / 900 + i * 1.7) * 10;
      const e = g[i];
      if (P.lig === 'like') e.setAttribute('d', diamond(x, y)); else { e.setAttribute('cx', x.toFixed(1)); e.setAttribute('cy', y.toFixed(1)); }
    }
    const age = (now - flash) / 700;
    prod.setAttribute('opacity', age >= 0 && age < 1 ? String(1 - age) : '0');
    prod.setAttribute('cx', String(176 + age * 100)); prod.setAttribute('cy', String(100 - age * 40));
    // Zaman çizgisi
    const n = hist.length;
    const xs = (i: number): number => CX1 - (n - 1 - i) * ((CX1 - CX0) / (HIST - 1));
    let d = '';
    hist.forEach((h, i) => { const y = h.c ? yC : yO; d += `${i ? `H${xs(i).toFixed(1)}V${y}` : `M${xs(i).toFixed(1)} ${y}`}`; });
    line.setAttribute('d', d);
    dots.innerHTML = '';
    hist.forEach((h, i) => { if (h.t) svg('circle', { cx: xs(i), cy: 14, r: 3, class: 'prod' }, dots as Element); });
  }

  function say(): string {
    const o = confOut(P);
    const who = P.lig === 'none' ? 'Molekül yok' : P.lig === 'good' ? `Doğru molekül, derişim ${f1(P.conc)}` : `Benzer ama uymayan molekül, derişim ${f1(P.conc)}`;
    const warp = o.shape < 0.95 ? ` Şekil %${Math.round((1 - o.shape) * 100)} bozuk.` : '';
    return `${who}: beklenen kapalı şekil payı ${pc(o.closed)}, işlev hızı ${f1(o.rate)} tur/sn.${warp}`;
  }

  return {
    say,
    meters(): Meter[] {
      const o = confOut(P);
      return [
        { label: 'Kapalı şekil payı', value: pc(o.closed), frac: o.closed, color: 'var(--pit)' },
        { label: 'İşlev hızı', value: `${f1(o.rate)} tur/sn`, frac: o.rate / 1.1, color: 'var(--gld)' },
        { label: 'Şeklin sağlamlığı', value: pc(o.shape), frac: o.shape, color: 'var(--pfc)' },
      ];
    },
    draw(now = performance.now()): boolean {
      if (last < 0) last = now;
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      if (!paused) {
        const r = stepConf(st, dt, P, rnd);
        st = r.state;
        if (r.turn) { turns++; flash = now; }
        c += ((st === ST.EC || st === ST.SC ? 1 : 0) - c) * Math.min(1, dt * 10);
        acc += dt;
        let tflag = r.turn;
        while (acc >= 0.1) { acc -= 0.1; hist.push({ c: st === ST.EC || st === ST.SC ? 1 : 0, t: tflag }); tflag = false; if (hist.length > HIST) hist.shift(); }
      } else if (!dirty) return false;
      render(now);
      dirty = false;
      return true;
    },
    resume(): void { last = -1; },
    set(p: Partial<ConfP>): void {
      Object.assign(P, p);
      if (p.lig !== undefined) setLg(p.lig);
      if (p.conc !== undefined) hs.conc.set(p.conc);
      if (p.temp !== undefined) hs.temp.set(p.temp);
      if (p.ph !== undefined) hs.ph.set(p.ph);
      reset();
    },
    get turns(): number { return turns; },
  };
}
