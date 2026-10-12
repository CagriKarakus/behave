// Sekme 1: Ortalama mı, dağılım mı? Aynı ortalamaya sahip iki popülasyonda eşiği aşanların payı.
import { mulberry32 } from '../rng';
import { createTour } from '../tour';
import { chipRow, f1, makeSlider, type Ctx, type Meter, type Panel } from '../ui';
import {
  HI, LO, ORT_DEFAULT, baseDraw, density, describeOrt, evaluate, histogram, place, popsOf, share,
  type Base, type OrtInputs, type Shape,
} from './model';

const BINS = 25, N = 400;
const X0 = 16, W = 328, PLOT_H = 80, YA = 104, YB = 214;
const px = (v: number): number => X0 + ((v - LO) / (HI - LO)) * W;
const fmtPts = (v: number): string => `${Math.round(v)}`;

const SCENARIOS: Array<{ key: string; label: string; set: Partial<OrtInputs> }> = [
  { key: 'same', label: 'Aynı ortalama', set: { ...ORT_DEFAULT } },
  { key: 'tense', label: 'Gergin bağlam', set: { ...ORT_DEFAULT, ctx: 8 } },
  { key: 'twin', label: 'İki tepeli B', set: { ...ORT_DEFAULT, shapeB: 'twin', thr: 60 } },
  { key: 'far', label: 'Çok uç eşik', set: { ...ORT_DEFAULT, thr: 90 } },
];

export function createOrtPanel(ctx: Ctx, host: HTMLElement) {
  const inp: OrtInputs = { ...ORT_DEFAULT };
  let seed = 1;
  let bases: { A: Base; B: Base } = draw(seed);
  let picked: { a: number; b: number } | null = null;
  let dirty = true;
  const rngPick = mulberry32(99);

  function draw(sd: number): { A: Base; B: Base } {
    const r = mulberry32(sd * 7919);
    return { A: baseDraw(N, r), B: baseDraw(N, r) };
  }

  host.innerHTML =
    '<div data-ref="tour"></div>' +
    '<div class="chips" data-ref="scn"></div>' +
    '<section class="card" aria-label="İki popülasyonun dağılımı">' +
    '<h3 class="sim-h">Aynı ortalama, iki dağılım</h3>' +
    '<div class="stage"><svg viewBox="0 0 360 262" role="img" aria-label="" data-ref="plot"></svg>' +
    '<div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><rect x="2" y="1" width="9" height="8" fill="var(--ink)" fill-opacity=".85"/><rect x="14" y="3" width="9" height="6" fill="none" stroke="var(--edge)" stroke-width="1.4"/></svg>dolu: eşiği aşan, boş: aşmayan</span>' +
    '<span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 8C8 8 9 1 13 1S18 8 25 8" fill="none" stroke="var(--ink)" stroke-width="1.6"/></svg>modelin dağılım eğrisi</span>' +
    '<span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M13 0V10" stroke="var(--ink)" stroke-width="2" stroke-dasharray="3 2"/></svg>eşik</span></div></div>' +
    '<p class="note" data-ref="plotNote"></p>' +
    '<div class="row"><button type="button" class="btn" data-ref="pick">Birer kişi çek</button><button type="button" class="btn" data-ref="reseed">Başka örneklem</button></div>' +
    '<p class="note" data-ref="pickNote" aria-live="polite"></p>' +
    '</section>' +
    '<section class="card" aria-label="Girdiler"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="sl"></div><div class="chips" data-ref="shape"></div></section>' +
    '<div class="notes" data-notes="ort"></div>';

  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const plot = q<SVGSVGElement>('plot');
  const sl: Record<string, ReturnType<typeof makeSlider>> = {};
  const sld = (key: string, name: string, hint: string, min: number, max: number, val: number, cb: (v: number) => void, fmt: (v: number) => string, color: string, step = 1) =>
    (sl[key] = makeSlider(ctx, q('sl'), key, name, hint, min, max, val, (v) => { cb(v); dirty = true; }, fmt, color, step));
  sld('mean', 'Ortalama eğilim', 'İki popülasyonun ortak ortalaması: bir davranışa yatkınlık puanı.', 30, 70, inp.mean, (v) => { inp.mean = v; }, fmtPts, 'var(--ink)');
  sld('sdA', 'A: bireysel yayılım', 'Küçük: herkes birbirine benzer.', 3, 20, inp.sdA, (v) => { inp.sdA = v; }, fmtPts, 'var(--pfc)');
  sld('sdB', 'B: bireysel yayılım', 'Büyük: insanlar birbirinden çok farklı.', 3, 24, inp.sdB, (v) => { inp.sdB = v; }, fmtPts, 'var(--dop)');
  sld('thr', 'Eşik (ör. şiddet eşiği)', 'Bu puanın üstüne çıkan kişi davranışa geçer.', 55, 95, inp.thr, (v) => { inp.thr = v; }, fmtPts, 'var(--ink)');
  sld('ctx', 'Bağlam', 'Sağa: gergin, tehditli ortam. Sola: sakin ortam. İki popülasyonu da aynı miktar kaydırır.', -15, 15, inp.ctx, (v) => { inp.ctx = v; }, (v) => (v > 0 ? `+${v} gergin` : v < 0 ? `${v} sakin` : '0'), 'var(--eff)');
  const setShape = chipRow(q('shape'), ctx, [{ key: 'bell', label: 'B: tek tepeli' }, { key: 'twin', label: 'B: iki tepeli' }], (k) => { inp.shapeB = k as Shape; dirty = true; }, 'B popülasyonunun biçimi');
  setShape(inp.shapeB);
  const setScn = chipRow(q('scn'), ctx, SCENARIOS.map((s) => ({ key: s.key, label: s.label })), (k) => { set(SCENARIOS.find((s) => s.key === k)!.set); setScn(k); }, 'Hazır durumlar');

  function set(p: Partial<OrtInputs>): void {
    Object.assign(inp, p);
    sl.mean.set(inp.mean); sl.sdA.set(inp.sdA); sl.sdB.set(inp.sdB); sl.thr.set(inp.thr); sl.ctx.set(inp.ctx, inp.ctx > 0 ? `+${inp.ctx} gergin` : inp.ctx < 0 ? `${inp.ctx} sakin` : '0');
    setShape(inp.shapeB);
    dirty = true;
  }

  ctx.scope.on(q('pick'), 'click', () => { picked = { a: Math.floor(rngPick() * N), b: Math.floor(rngPick() * N) }; dirty = true; ctx.touch(); });
  ctx.scope.on(q('reseed'), 'click', () => { bases = draw(++seed); picked = null; dirty = true; ctx.touch(); });

  /* ---- Çizim ---- */
  function band(xs: number[], base: number, color: string, thr: number, ymax: number, dens: (x: number) => number, label: string, sh: string, mark: number | null): string {
    const hist = histogram(xs, BINS), bw = (HI - LO) / BINS, barW = W / BINS;
    let s = `<text class="pt" x="${X0}" y="${base - PLOT_H - 6}">${label}</text><text class="pt" x="${X0 + W}" y="${base - PLOT_H - 6}" text-anchor="end">eşiği aşan ${sh}</text>`;
    s += `<line class="grid" x1="${X0}" y1="${base}" x2="${X0 + W}" y2="${base}"/>`;
    hist.forEach((c, i) => {
      const h = Math.min(PLOT_H, (c / N / bw) / ymax * PLOT_H), x = X0 + i * barW, over = LO + i * bw >= thr - 1e-9;
      if (h < 0.3) return;
      s += over
        ? `<rect x="${x + 0.5}" y="${base - h}" width="${barW - 1}" height="${h}" fill="${color}" fill-opacity=".85" stroke="var(--ink)" stroke-width="1"/>`
        : `<rect x="${x + 0.5}" y="${base - h}" width="${barW - 1}" height="${h}" fill="${color}" fill-opacity=".28" stroke="${color}" stroke-width="1"/>`;
    });
    let d = '';
    for (let v = LO; v <= HI + 1e-9; v += 1) d += `${d ? 'L' : 'M'}${px(v).toFixed(1)} ${(base - Math.min(PLOT_H + 4, dens(v) / ymax * PLOT_H)).toFixed(1)}`;
    s += `<path d="${d}" fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round"/>`;
    if (mark !== null) {
      const x = px(xs[mark]);
      s += `<path d="M${x - 5} ${base + 9}L${x + 5} ${base + 9}L${x} ${base + 1}Z" fill="var(--ink)"/>`;
    }
    return s;
  }

  function render(): void {
    const { A, B } = popsOf(inp);
    const xa = place(A, bases.A), xb = place(B, bases.B), r = evaluate(inp);
    const bw = (HI - LO) / BINS;
    let ymax = 0;
    for (const v of [xa, xb]) for (const c of histogram(v, BINS)) ymax = Math.max(ymax, c / N / bw);
    for (let v = LO; v <= HI; v += 1) ymax = Math.max(ymax, density(A, v), density(B, v));
    ymax *= 1.08;
    let s = band(xa, YA, 'var(--pfc)', inp.thr, ymax, (x) => density(A, x), `A: yayılım ${inp.sdA}`, share(r.a), picked ? picked.a : null);
    s += band(xb, YB, 'var(--dop)', inp.thr, ymax, (x) => density(B, x), `B: yayılım ${inp.sdB}${inp.shapeB === 'twin' ? ', iki tepeli' : ''}`, share(r.b), picked ? picked.b : null);
    const mx = px(A.mean), tx = px(inp.thr), near = Math.abs(mx - tx) < 46;
    s += `<line x1="${mx}" y1="${YA - PLOT_H - 2}" x2="${mx}" y2="${YB + 2}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 4"/>`;
    s += `<line x1="${tx}" y1="${YA - PLOT_H - 2}" x2="${tx}" y2="${YB + 2}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 3"/>`;
    for (const t of [0, 25, 50, 75, 100]) s += `<text class="ax" x="${px(t)}" y="${YB + 24}" text-anchor="middle">${t}</text>`;
    const lab = (x: number, other: number, text: string): string => {
      const anch = near ? (x <= other ? 'end' : 'start') : 'middle', dx = near ? (x <= other ? -3 : 3) : 0;
      return `<text class="ax" x="${x + dx}" y="${YB + 38}" text-anchor="${anch}">${text}</text>`;
    };
    s += lab(mx, tx, `ortalama ${Math.round(A.mean)}`) + lab(tx, mx, `eşik ${Math.round(inp.thr)}`);
    plot.innerHTML = s;
    plot.setAttribute('aria-label', `A ve B popülasyonlarının dağılımı. ${describeOrt(inp, r)}`);
    const ratio = r.b / Math.max(r.a, 1e-12);
    q('plotNote').textContent = r.a < 1e-4 && r.b >= 1e-3 ? "A'da eşiği aşan neredeyse yok; B'de belirgin bir kuyruk var. Ortalamalar aynı."
      : ratio >= 2 ? `Eşiği aşanların oranı B'de A'nın yaklaşık ${ratio >= 10 ? Math.round(ratio) : f1(ratio)} katı; ortalamalar aynı.`
        : ratio <= 0.5 ? "Bu ayarda kuyruk A'da daha ağır; ortalamalar aynı." : 'Bu ayarda iki popülasyonun kuyrukları birbirine yakın.';
    const side = (x: number): string => (x >= inp.thr ? 'üstünde' : 'altında');
    q('pickNote').textContent = picked
      ? `Çekilen kişiler: A'dan ${Math.round(xa[picked.a])} (eşiğin ${side(xa[picked.a])}), B'den ${Math.round(xb[picked.b])} (eşiğin ${side(xb[picked.b])}). Ortalama bunu söylemez.`
      : 'Üçgen çekilen kişiyi gösterir; bağlam değişince aynı kişi yer değiştirir.';
  }

  /* ---- Rehberli tur ---- */
  const tour = createTour(ctx.scope, [
    {
      title: 'Aynı ortalama, iki popülasyon',
      text: 'A\'da herkes ortalamaya yakın; B\'de insanlar birbirinden çok farklı. İkisinin ortalaması da 50. Eşik, bir kişinin davranışa geçtiği nokta (ör. şiddet eşiği).',
      look: 'Eşik çizgisinin sağındaki dolu sütunlar: A\'da yok, B\'de var.',
      apply: () => { set({ ...ORT_DEFAULT }); setScn('same'); picked = null; },
    },
    {
      title: 'Ortalama kuyruğu söylemez',
      text: 'Birer kişi çek: ortalamaları aynı olduğu için hangisinin puanı yüksek diye sorsan neredeyse yazı tura. Yine de eşiği aşanların çok büyük kısmı B\'den gelir.',
      look: 'Alt çubuktaki "aşanların B\'den payı" ve üçgen işaretler.',
      apply: () => { set({ ...ORT_DEFAULT }); setScn('same'); picked = { a: 11, b: 3 }; },
    },
    {
      title: 'Bağlam dağılımı kaydırır',
      text: 'Gergin bir ortam herkesi aynı miktar sağa iter. Aşan sayısı en çok geniş dağılımda patlar; dar dağılım hâlâ eşiğin çok altında. Eşiği aşan pay, ortalamadan çok kuyruğa bağlıdır.',
      look: 'A ve B yüzdelerinin ikisi de artar; B ile A arasındaki oran ise çok büyük kalır.',
      apply: () => { set({ ...ORT_DEFAULT, ctx: 8 }); setScn('tense'); picked = { a: 11, b: 3 }; },
    },
    {
      title: 'Biçim de önemli',
      text: 'B\'yi iki tepeli yap: ortalama ve yayılım aynı, ama insanlar iki kümeye ayrılmış ve ortada neredeyse kimse yok. Eşik 60\'ta B\'nin payı A\'nınkinin kat kat üstünde.',
      look: 'Ortalamanın (kesikli çizgi) tam üstünde sütun yok: "ortalama insan" yok.',
      apply: () => { set({ ...ORT_DEFAULT, shapeB: 'twin', thr: 60 }); setScn('twin'); picked = null; },
    },
    {
      title: '"İnsanlar şöyledir" yanıltır',
      text: 'Bulgular çoğu zaman ortalama eğilimi anlatır; bireysel farklılık ve istisna her yerdedir (Sonsöz). Ortalamayı bilmek, kimin hangi uçta olduğunu bilmek değildir.',
      look: 'Kaydırıcıları oyna: ortalamayı değiştirmeden yayılımı artırınca da eşiği aşan pay artıyor.',
      apply: () => { set({ ...ORT_DEFAULT, sdB: 20 }); setScn(null); picked = null; },
    },
  ], { onExit: () => ctx.touch() });
  q('tour').replaceWith(tour.el);

  return {
    draw(): boolean { if (!dirty) return false; dirty = false; render(); return true; },
    say: () => describeOrt(inp, evaluate(inp)),
    meters: (): Meter[] => {
      const r = evaluate(inp);
      return [
        { label: 'A: eşiği aşan', value: share(r.a), frac: r.a, color: 'var(--pfc)' },
        { label: 'B: eşiği aşan', value: share(r.b), frac: r.b, color: 'var(--dop)' },
        { label: 'Aşanların B\'den payı', value: `%${Math.round(r.fromB * 100)}`, frac: r.fromB, color: 'var(--ink)' },
      ];
    },
    set,
  } satisfies Panel & { set(p: Partial<OrtInputs>): void };
}

