// Sekme 3: Devre. Yanal inhibisyon (uzayda keskinleştirme), negatif geri bildirim (sinyali kısaltır), ileri beslemeli inhibisyon (zamanda keskinleştirir).
import { svg, svgText } from '../kit';
import { DT_C, N_UNITS, T_MAX, clamp, edgeStats, f1, f2, feedback, feedforward, lateral, pattern, tInput, tStats, type SPat, type TPat } from './model';
import { chipRow, gridY, linePath, makeSlider, type Ctx, type Meter, type SliderHandle } from './ui';

export type Motif = 'lat' | 'fb' | 'ff';
export interface CircSet { motif: Motif; sp?: SPat; tp?: TPat; g?: number; reach?: number; delay?: number }
const MOTIFS: Array<{ key: Motif; label: string }> = [{ key: 'lat', label: 'Yanal inhibisyon' }, { key: 'fb', label: 'Negatif geri bildirim' }, { key: 'ff', label: 'İleri beslemeli' }];
const COL = (i: number): number => 14 + i * 21.5;
const CT = { x0: 34, x1: 352, top: 10, h: 130, ymax: 1.2 };
const cx = (ms: number): number => CT.x0 + ms / T_MAX * (CT.x1 - CT.x0);
const cy = (v: number): number => CT.top + (1 - clamp(v / CT.ymax)) * CT.h;

/** Eğri bir bağlantı: uyarıcı ok (amber) ya da engelleyici çubuk (mavi). */
function link(parent: Element, p: [number, number, number, number, number, number], kind: 'e' | 'i', w: number): void {
  const [x1, y1, qx, qy, x2, y2] = p;
  const col = kind === 'e' ? 'var(--dop)' : 'var(--pfc)';
  svg('path', { d: `M${x1} ${y1}Q${qx} ${qy} ${x2} ${y2}`, fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round' }, parent);
  const a = Math.atan2(y2 - qy, x2 - qx), c = Math.cos(a), s = Math.sin(a);
  if (kind === 'e') svg('path', { d: `M${x2} ${y2}L${x2 - 9 * c + 5 * s} ${y2 - 9 * s - 5 * c}L${x2 - 9 * c - 5 * s} ${y2 - 9 * s + 5 * c}Z`, fill: col }, parent);
  else svg('path', { d: `M${x2 - 6 * s} ${y2 + 6 * c}L${x2 + 6 * s} ${y2 - 6 * c}`, stroke: col, 'stroke-width': 3.2, 'stroke-linecap': 'round' }, parent);
}
function node(parent: Element, x: number, y: number, t: string): void {
  svg('circle', { cx: x, cy: y, r: 15, class: 'nd' }, parent);
  svgText(parent, { x, y: y + 4, 'text-anchor': 'middle', class: 'ndt' }, t);
}

export function createCircPanel(ctx: Ctx, host: HTMLElement) {
  const S = { motif: 'lat' as Motif, sp: 'basamak' as SPat, tp: 'uzun' as TPat, glat: 1, reach: 2, gfb: 2, gff: 1, delay: 10 };
  let dirty = true;

  host.innerHTML =
    '<p class="note">Üç küçük devre sinyali farklı yerden keskinleştirir. Devre ve giriş deseni seç, gücü ayarla.</p>' +
    '<div class="chips" data-ref="motif"></div>' +
    '<div class="chips" data-ref="sp"></div><div class="chips" data-ref="tp" hidden></div>' +
    '<div class="stage" data-ref="latBox"><svg viewBox="0 0 360 258" role="img" aria-label="On altı nöron: giriş ve çıkış çubukları, komşu bastırma" data-ref="lat"></svg>' +
    '<div class="legend"><span><i style="background:var(--edge);opacity:.6;border-radius:2px"></i>giriş</span><span><i style="background:var(--dop);border-radius:2px"></i>çıkış</span><span><i style="background:var(--pfc)"></i>komşuyu bastırma</span><span>kesikli çizgi: girişin kendisi</span></div></div>' +
    '<div class="stage" data-ref="tBox" hidden><svg viewBox="0 0 360 118" role="img" aria-label="Devre şeması" data-ref="diag"></svg>' +
    '<div class="legend"><span><i style="background:var(--dop)"></i>uyarıcı bağlantı</span><span><i style="background:var(--pfc)"></i>engelleyici bağlantı</span><span>G girdi, H hedef nöron, A ara nöron</span></div></div>' +
    '<div class="chart" data-ref="tChart" hidden><h4 class="sim-h">Hedef nöronun çıkışı (ms)</h4><svg viewBox="0 0 360 160" role="img" aria-label="Girdi ve hedef nöron çıkışı" data-ref="tc"></svg>' +
    '<div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5H25" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="4 3"/></svg>girdi</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5H25" stroke="var(--lesion)" stroke-width="1.8" stroke-dasharray="1 3"/></svg>inhibisyon yok</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5H25" stroke="var(--ink)" stroke-width="2.6"/></svg>çıkış</span></div></div>' +
    '<div class="card"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="sl"></div></div>' +
    '<details class="more"><summary>Model nasıl çalışıyor?</summary>' +
    '<p>Kitaptan: negatif geri bildirim sinyali kısaltır, ileri beslemeli inhibisyon zamanda keskinleştirir, yanal inhibisyon komşuları susturarak mekansal kontrastı artırır. Melzack ve Wall\'ın ağrı kapısı devresi burada modellenmedi.</p>' +
    '<p>Yanal inhibisyon: her birim menzildeki komşularının çıkışıyla orantılı bastırılır (yakın komşu daha çok), ağ sonuca oturur. Kenarın parlak yanı az, karanlık yanı çok bastırılır; bedeli düz bölgelerin zayıflamasıdır. Kenar zıtlığı = kenardaki komşu çıkış farkı / düz bölgeler arası fark (inhibisyonsuz 1). Geri bildirimde çıkış yavaş bir ara nöronu uyarır, o da çıkışı bastırır; ileri beslemelide aynı girdi ara nöronu uyarır ve baskı gecikmeyle gelir. Yanıt süresi: çıkışın girdi genliğinin yarısının üstünde kaldığı süre. Zaman sabitleri (8, 25, 3 ms), desenler ve güçler varsayımdır.</p></details>';

  const q = <T extends Element = HTMLElement>(k: string) => host.querySelector<T>(`[data-ref="${k}"]`)!;
  const sync = { m: (_k: string | null) => {}, s: (_k: string | null) => {}, t: (_k: string | null) => {} };
  sync.m = chipRow(q('motif'), ctx, MOTIFS, (k) => { S.motif = k as Motif; dirty = true; }, 'Devre');
  sync.s = chipRow(q('sp'), ctx, [{ key: 'basamak', label: 'Basamak (kenar)' }, { key: 'cubuk', label: 'Çubuk' }, { key: 'gurultu', label: 'Gürültülü kenar' }], (k) => { S.sp = k as SPat; dirty = true; }, 'Giriş deseni');
  sync.t = chipRow(q('tp'), ctx, [{ key: 'kisa', label: 'Kısa vuru' }, { key: 'uzun', label: 'Uzun basamak' }, { key: 'iki', label: 'İki vuru' }], (k) => { S.tp = k as TPat; dirty = true; }, 'Giriş deseni');

  const sl = q('sl');
  const hs: Record<string, SliderHandle> = {};
  hs.glat = makeSlider(ctx, sl, 'glat', 'Yanal inhibisyon gücü', 'Her nöron komşularını ne kadar susturuyor?', 0, 15, 10, (v) => { S.glat = v / 10; dirty = true; }, (v) => f1(v / 10), 'var(--pfc)');
  hs.reach = makeSlider(ctx, sl, 'reach', 'Komşuluk menzili', 'Kaç komşuya kadar bastırma uzanıyor.', 1, 4, 2, (v) => { S.reach = v; dirty = true; }, (v) => `${v} birim`, 'var(--pfc)');
  hs.gfb = makeSlider(ctx, sl, 'gfb', 'Geri bildirim gücü', 'Ara nöron çıkışı ne kadar sert baskılıyor.', 0, 30, 20, (v) => { S.gfb = v / 10; dirty = true; }, (v) => f1(v / 10), 'var(--pfc)');
  hs.gff = makeSlider(ctx, sl, 'gff', 'İleri inhibisyon gücü', '1 iken gecikmeden sonra çıkış tamamen susar.', 0, 12, 10, (v) => { S.gff = v / 10; dirty = true; }, (v) => f1(v / 10), 'var(--pfc)');
  hs.delay = makeSlider(ctx, sl, 'dl', 'Baskının gecikmesi', 'Yanıtın genişliğini belirler.', 2, 40, 10, (v) => { S.delay = v; dirty = true; }, (v) => `${v} ms`, 'var(--ink)');

  /* ---------- Yanal inhibisyon ---------- */
  const lat = q<SVGSVGElement>('lat');
  svgText(lat, { x: 6, y: 12, class: 'lb' }, 'Giriş (ör. ışık şiddeti)');
  svgText(lat, { x: 6, y: 118, class: 'lb' }, 'Nöronlar');
  svgText(lat, { x: 6, y: 160, class: 'lb' }, 'Çıkış (ateşleme)');
  const arcs = [1, 2, 3, 4].map(() => svg('path', { class: 'arc', d: '' }, lat));
  const inB: SVGElement[] = [], outB: SVGElement[] = [];
  for (let i = 0; i < N_UNITS; i++) {
    inB.push(svg('rect', { class: 'bin', x: COL(i), width: 15, y: 96, height: 0, rx: 2 }, lat));
    svg('circle', { class: 'nd', cx: COL(i) + 7.5, cy: 128, r: 6.5 }, lat);
    outB.push(svg('rect', { class: 'bout', x: COL(i), width: 15, y: 246, height: 0, rx: 2 }, lat));
  }
  svg('line', { class: 'grid', x1: 8, x2: 352, y1: 96, y2: 96 }, lat);
  svg('line', { class: 'grid', x1: 8, x2: 352, y1: 246, y2: 246 }, lat);
  const outline = svg('path', { class: 'olin', d: '' }, lat);
  const edgeL = svg('line', { class: 'edge', y1: 20, y2: 250 }, lat);
  const edgeT = svgText(lat, { class: 'lb', y: 32 }, 'kenar');
  let latStats = { contrast: 1, plateau: 1, overshoot: 0 };
  function drawLat(): void {
    const p = pattern(S.sp), out = lateral(p.v, S.glat, S.reach);
    latStats = edgeStats(p, out);
    for (let i = 0; i < N_UNITS; i++) {
      const hi = 62 * p.v[i] / 0.85, ho = 72 * out[i] / 0.85;
      inB[i].setAttribute('y', String(96 - hi)); inB[i].setAttribute('height', hi.toFixed(1));
      outB[i].setAttribute('y', String(246 - ho)); outB[i].setAttribute('height', ho.toFixed(1));
    }
    outline.setAttribute('d', linePath(p.v.flatMap((v, i) => [[COL(i), 246 - 72 * v / 0.85], [COL(i) + 15, 246 - 72 * v / 0.85]] as Array<[number, number]>)));
    const ex = COL(p.e) + 18.25;
    edgeL.setAttribute('x1', String(ex)); edgeL.setAttribute('x2', String(ex));
    edgeT.setAttribute('x', String(ex + 3));
    arcs.forEach((a, k) => {
      const d = k + 1;
      if (d > S.reach || S.glat === 0) { a.setAttribute('d', ''); return; }
      let path = '';
      for (let i = 0; i + d < N_UNITS; i++) path += `M${COL(i) + 7.5} 134Q${COL(i) + 7.5 + d * 10.75} ${136 + 9 * d} ${COL(i + d) + 7.5} 134`;
      a.setAttribute('d', path);
      a.setAttribute('opacity', String(0.12 + 0.55 * Math.min(1, S.glat / 1.5) * (S.reach + 1 - d) / S.reach));
    });
  }

  /* ---------- Zaman devreleri ---------- */
  const tc = q<SVGSVGElement>('tc'), diag = q<SVGSVGElement>('diag');
  for (const v of [0, 0.5, 1]) gridY(tc, CT.x0, CT.x1, cy(v), f1(v));
  [0, 60, 120, 180, 240].forEach((t, i) => svgText(tc, { x: cx(t), y: 156, 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle' }, i === 4 ? '240 ms' : String(t)));
  const inP = svg('path', { class: 'tin', d: '' }, tc), refP = svg('path', { class: 'tref', d: '' }, tc), outP = svg('path', { class: 'tout', d: '' }, tc);
  let tS = { peak: 0, dur: 0, tail: 0 }, inDur = 0;
  function drawTime(): void {
    const inp = tInput(S.tp);
    const out = S.motif === 'fb' ? feedback(inp, S.gfb) : feedforward(inp, S.gff, S.delay);
    const ref = S.motif === 'fb' ? feedback(inp, 0) : feedforward(inp, 0, S.delay);
    tS = tStats(out, inp); inDur = inp.reduce((a, u) => a + (u > 0 ? DT_C : 0), 0);
    const path = (a: number[]) => linePath(a.map((v, i) => [cx(i * DT_C), cy(v)] as [number, number]));
    inP.setAttribute('d', path(inp)); refP.setAttribute('d', path(ref)); outP.setAttribute('d', path(out));
    diag.innerHTML = '';
    node(diag, 34, 58, 'G'); node(diag, S.motif === 'fb' ? 140 : 210, 46, 'H');
    svg('path', { d: `M${S.motif === 'fb' ? 156 : 226} 46H280`, stroke: 'var(--ink)', 'stroke-width': 2.4, fill: 'none' }, diag);
    svg('path', { d: 'M280 40L292 46L280 52Z', fill: 'var(--ink)' }, diag);
    svgText(diag, { x: 296, y: 50, class: 'lb' }, 'çıkış');
    if (S.motif === 'fb') {
      link(diag, [49, 54, 90, 48, 124, 46], 'e', 2.4);
      node(diag, 190, 92, 'A');
      link(diag, [150, 60, 156, 90, 174, 92], 'e', 2.4);
      link(diag, [175, 100, 134, 108, 134, 62], 'i', 1 + S.gfb * 1.2);
      svgText(diag, { x: 6, y: 112, class: 'lb' }, 'çıkış ara nöronu uyarır, o da çıkışı bastırır');
    } else {
      link(diag, [49, 52, 120, 40, 194, 44], 'e', 2.4);
      node(diag, 120, 94, 'A');
      link(diag, [48, 64, 70, 94, 104, 94], 'e', 2.4);
      link(diag, [135, 90, 190, 84, 208, 62], 'i', 1 + S.gff * 2.4);
      svgText(diag, { x: 150, y: 112, class: 'lb' }, `baskı ${S.delay} ms gecikmeyle gelir`);
    }
  }

  const apply = (): void => {
    const lt = S.motif === 'lat';
    q('latBox').hidden = !lt; q('tBox').hidden = lt; q('tChart').hidden = lt;
    q('sp').hidden = !lt; q('tp').hidden = lt;
    hs.glat.wrap.hidden = hs.reach.wrap.hidden = !lt;
    hs.gfb.wrap.hidden = S.motif !== 'fb';
    hs.gff.wrap.hidden = hs.delay.wrap.hidden = S.motif !== 'ff';
    sync.m(S.motif); sync.s(S.sp); sync.t(S.tp);
    if (lt) drawLat(); else drawTime();
  };
  apply();
  const half = (): string => (S.motif === 'fb' ? 'ara nöron çıkışı bastırıyor' : 'gecikmeli baskı geliyor');
  return {
    resume: () => { dirty = true; },
    draw(): boolean { if (!dirty) return false; dirty = false; apply(); return true; },
    say(): string {
      if (S.motif === 'lat') {
        const st = latStats;
        return S.glat === 0 ? 'Yanal inhibisyon yok: çıkış girişin aynısı, kenar olduğu kadar belirgin.'
          : `Komşular birbirini bastırıyor: kenarda zıtlık ${f1(st.contrast)} kat, parlak tarafta %${Math.round(st.overshoot * 100)} aşım, karanlık tarafta çukur. Düz bölgeler zayıfladı (girişin %${Math.round(st.plateau * 100)}'i).`;
      }
      const g = S.motif === 'fb' ? S.gfb : S.gff;
      if (g === 0) return 'Baskı yok: çıkış girdiyi gecikmeli izliyor, girdi sürdükçe sürüyor.';
      return S.motif === 'fb'
        ? `Çıkış arttıkça ${half()}: zirve ${f2(tS.peak)}, yanıt ${Math.round(tS.dur)} ms yarım düzeyin üstünde kalıyor (girdi ${Math.round(inDur)} ms). Sinyal kısalıyor.`
        : `Aynı girdi ara nöronu da uyarıyor, ${half()}: yanıt ${Math.round(tS.dur)} ms (girdi ${Math.round(inDur)} ms). Zamanda keskinleşiyor, gecikme ${S.delay} ms.`;
    },
    meters(): Meter[] {
      if (S.motif === 'lat') {
        const st = latStats;
        return [
          { label: 'Kenar zıtlığı', value: `${f1(st.contrast)} kat`, frac: (st.contrast - 1) / 1.5, color: 'var(--pfc)' },
          { label: 'Düz bölge düzeyi (girişe göre)', value: `%${Math.round(st.plateau * 100)}`, frac: st.plateau, color: 'var(--dop)' },
          { label: 'Parlak kenarda aşım', value: `%${Math.round(st.overshoot * 100)}`, frac: st.overshoot / 0.8, color: 'var(--ink)' },
        ];
      }
      return [
        { label: 'Çıkış zirvesi', value: f2(tS.peak), frac: tS.peak, color: 'var(--ink)' },
        { label: 'Yanıt süresi (yarım düzeyin üstü)', value: `${Math.round(tS.dur)} ms`, frac: tS.dur / 160, color: 'var(--pfc)' },
        { label: 'Girdi sürerken sondaki yanıt', value: f2(tS.tail), frac: tS.tail, color: 'var(--dop)' },
      ];
    },
    /** Rehberli tur için. */
    scene(c: CircSet): void {
      S.motif = c.motif;
      if (c.sp) S.sp = c.sp;
      if (c.tp) S.tp = c.tp;
      const g = c.g ?? (c.motif === 'lat' ? 1 : c.motif === 'fb' ? 2 : 1);
      if (c.motif === 'lat') S.glat = g; else if (c.motif === 'fb') S.gfb = g; else S.gff = g;
      if (c.reach) S.reach = c.reach;
      if (c.delay) S.delay = c.delay;
      hs.glat.set(Math.round(S.glat * 10)); hs.reach.set(S.reach); hs.gfb.set(Math.round(S.gfb * 10)); hs.gff.set(Math.round(S.gff * 10)); hs.delay.set(S.delay);
      dirty = true;
    },
  };
}
