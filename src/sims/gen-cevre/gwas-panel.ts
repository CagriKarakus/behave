// Sekme 3: boy gibi poligenik bir özellik: çok sayıda küçük etkili varyant + çevre, ve bir GWAS'ın bulabildikleri.
import { svg, svgText } from '../kit';
import {
  BINS, GWAS_N, HEIGHT_MEAN, HEIGHT_SD, M_STEPS, N_PEOPLE, Z_RANGE, describeGwas, discovery, simulateGwas, type Discovery, type GwasSim,
} from './model';
import { bookBox, chipRow, makeSlider, pc, pc1, type Ctx, type Meter, type Panel, type SliderHandle } from './ui';

const fmtN = (n: number): string => n.toLocaleString('tr-TR');
const REF_M = M_STEPS.length - 1;

const TEMPLATE = () => `
<p class="note">Boy, kalıtılabilirliği yüksek bir özelliktir; yine de tek bir "boy geni" yok. Burada her varyant küçük bir pay verir, çevre (beslenme, hastalık, çocukluk koşulları) üstüne eklenir. Kaydırıcılarla varyant sayısını ve çevrenin payını değiştir, dağılımın nasıl değiştiğine bak.</p>
<div class="stage">
  <svg data-ref="hist" viewBox="0 0 360 220" role="img" aria-label="Simüle edilen boy dağılımı histogramı"></svg>
  <div class="legend" aria-label="Histogram göstergesi">
    <span><i style="background:var(--hyp);opacity:.6;border-radius:2px"></i>Boy (genler + çevre)</span>
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 8 H8 V2 H18 V8 H25" fill="none" stroke="var(--ink)" stroke-width="1.8"/></svg>Yalnızca genlerin katkısı</span>
  </div>
</div>

<section aria-label="Boy girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="sliders"></div>
  <div class="row" style="margin-top:12px"><button class="btn" type="button" data-ref="book">Kitaptaki ayar</button><button class="btn" type="button" data-ref="rerun">Yeniden çalıştır</button></div>
</section>

<section class="card" aria-label="GWAS ne buluyor?">
  <h3 class="sim-h">Bir GWAS (genom çapında tarama) ne bulur?</h3>
  <p class="note">Tarama, çok sayıda kişide hangi varyantların boyla birlikte değiştiğine bakar. Örneklem büyüdükçe daha küçük etkiler de seçilir.</p>
  <div class="chips" data-ref="sample" role="group" aria-label="GWAS örneklemi"></div>
  <div class="readout3" data-ref="read"></div>
  <p class="note" data-ref="cmp"></p>
</section>

<details class="more"><summary>Model nasıl çalışıyor?</summary>
  <p>Her varyantın farkın ne kadarını açıkladığı log-normal bir dağılımdan gelir: çoğu çok küçük, birkaçı görece büyük. Tüm varyantların payı toplamı, genetik payı (1 − çevre payı) verir. Çevre, genlerden bağımsız rastlantısal bir terimdir.</p>
  <p>Histogram ${fmtN(N_PEOPLE)} sanal kişiden çıkar. En güçlü 200 varyant kişi başına tek tek çekilir (her kişi her varyantın 0, 1 ya da 2 kopyasını taşır); kalan çok sayıda küçük varyantın toplamı merkezi limit teoremiyle bir normal terim olarak eklenir. Varyant sayısı 1 iken yalnızca üç boy kümesi çıkması, Mendel tarzı tek genin sonucudur.</p>
  <p>GWAS'ın bir varyantı "bulması" için etkisinin örneklem büyüklüğüyle çarpımı bir eşiği aşmalıdır (genom çapında anlamlılık, p &lt; 5×10⁻⁸). Bu yüzden küçük örneklemde yalnızca büyük etkililer bulunur.</p>
</details>

${bookBox([
    { id: 'ch08-e10', text: 'Boy için genom çapında ilişkilendirme çalışması (Lango Allen ve ark., 2010): replikasyon sağlam' },
    { id: 'ch08-e11', text: 'Beden kitle indeksi için GWAS (2010): en iyi varyant farkın %0,3\'ü' },
    { id: 'ch08-e12', text: 'Eğitim düzeyi için GWAS (2013): en iyi varyant farkın %0,02\'si' },
  ], '<p class="note">Kitaba göre 183.727 kişinin genomu tarandı; yüzlerce varyant boyla ilişkili bulundu, yalnızca bir avucu bilinen iskelet büyümesi genlerindeydi. En güçlü tek varyant boy farklılığının yalnızca %0,4\'ünü, hepsi birlikte yaklaşık %10\'unu açıkladı. Sonraki çalışma (5,4 milyon kişi, 2022) 12.000\'den fazla varyant buldu; bunlar Avrupa kökenlilerde boy farkının yaklaşık %40-45\'ini açıklıyor. Eğitim düzeyinde poligenik skorların bir kısmı aile ortamı gibi dolaylı etkileri de yansıtıyor.</p>')}
<p class="foot">Nitel model. Kitaptan gelen sayılar: 183.727 kişilik tarama, en güçlü varyant ≈%0,4, hepsi ≈%10, "yüzlerce" varyant ve 2022'de &gt;12.000 varyant, ≈%40-45. Kitap gerçek etkili varyant sayısını vermez: 300.000 ve etki dağılımı 2010 bulgusuna uydurmak için seçilmiş varsayımdır, 2022 sonucunda model kitaptan yüksek çıkar. Boy ölçeği (ortalama ${HEIGHT_MEAN}, standart sapma ${HEIGHT_SD} cm) ve genetik pay (%80) örnek amaçlı. Modelde gen × çevre etkileşimi yok.</p>`;

export interface GwasPanel extends Panel {
  set(p: { mIdx?: number; env?: number; sample?: 'y2010' | 'y2022' }): void;
}

export function createGwasPanel(ctx: Ctx, host: HTMLElement): GwasPanel {
  host.innerHTML = TEMPLATE();
  const $ = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const S = { mIdx: 4, env: 0.2, sample: 'y2010' as 'y2010' | 'y2022', seed: 1, dirty: true, sim: null as unknown as GwasSim, disc: null as unknown as Discovery };
  const sl: Record<string, SliderHandle> = {};
  const M = () => M_STEPS[S.mIdx];

  const slH = $('sliders');
  sl.m = makeSlider(ctx, slH, 'm', 'Boyu etkileyen varyant sayısı', 'Bir varyanttan yüz binlercesine. Logaritmik kaydırıcı.', 0, REF_M, S.mIdx, (v) => { S.mIdx = v; S.dirty = true; }, (v) => fmtN(M_STEPS[v]), 'var(--hyp)');
  sl.env = makeSlider(ctx, slH, 'env', 'Çevrenin katkısı', 'Beslenme, hastalık, çocukluk koşulları: boy farkının ne kadarı çevreden geliyor.', 0, 100, Math.round(S.env * 100), (v) => { S.env = v / 100; S.dirty = true; }, (v) => `%${v}`, 'var(--gld)', 5);
  const setSample = chipRow($('sample'), ctx, [{ key: 'y2010', label: '2010: 183.727 kişi' }, { key: 'y2022', label: '2022: 5,4 milyon kişi' }], (k) => { S.sample = k as 'y2010' | 'y2022'; S.dirty = true; setSample(k); });
  setSample(S.sample);
  ctx.scope.on($('rerun'), 'click', () => { S.seed++; S.dirty = true; });
  ctx.scope.on($('book'), 'click', () => api.set({ mIdx: REF_M, env: 0.2, sample: 'y2010' }));

  const hist = $<SVGElement>('hist');
  const L = 30, Rr = 14, T = 12, B = 44, W = 360, H = 220;
  function drawHist(): void {
    hist.innerHTML = '';
    const { pHist, gHist } = S.sim;
    const peak = Math.max(...pHist, ...gHist, 1);
    const bw = (W - L - Rr) / BINS, y = (c: number) => H - B - (c / peak) * (H - B - T);
    svg('line', { class: 'grid', x1: L, x2: W - Rr, y1: y(0), y2: y(0) }, hist);
    for (let b = 0; b < BINS; b++) {
      const h = (pHist[b] / peak) * (H - B - T);
      if (h > 0) svg('rect', { x: L + b * bw + 0.5, y: y(pHist[b]), width: bw - 1, height: h, fill: 'var(--hyp)', opacity: 0.6 }, hist);
    }
    // yalnızca genler: basamaklı kontur
    let d = '';
    for (let b = 0; b < BINS; b++) d += `${b === 0 ? 'M' : 'L'}${(L + b * bw).toFixed(1)},${y(gHist[b]).toFixed(1)} L${(L + (b + 1) * bw).toFixed(1)},${y(gHist[b]).toFixed(1)} `;
    svg('path', { d, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6, 'stroke-linejoin': 'round' }, hist);
    for (const z of [-3, -2, -1, 0, 1, 2, 3]) {
      const x = L + ((z + Z_RANGE) / (2 * Z_RANGE)) * (W - L - Rr);
      svg('line', { x1: x, x2: x, y1: y(0), y2: y(0) + 4, stroke: 'var(--muted)' }, hist);
      if (z % 1 === 0 && Math.abs(z) !== 2) svgText(hist, { x, y: y(0) + 16, 'text-anchor': 'middle' }, String(Math.round(HEIGHT_MEAN + z * HEIGHT_SD)));
    }
    svgText(hist, { x: (L + W - Rr) / 2, y: H - 6, 'text-anchor': 'middle', class: 'ax-t' }, 'Boy (cm, sembolik ölçek)');
    svgText(hist, { x: 6, y: 10, 'text-anchor': 'start', class: 'ax-t' }, `Kişi sayısı (toplam ${fmtN(N_PEOPLE)})`);
  }

  function drawRead(): void {
    const d = S.disc, ref = S.sample === 'y2010';
    const cell = (k: string, v: string, hint: string) => `<div class="ro"><span class="k">${k}</span><span class="v">${v}</span><span class="k">${hint}</span></div>`;
    $('read').innerHTML =
      cell('Bulunan varyant', fmtN(d.count), ref ? 'kitap: yüzlerce' : 'kitap: 12.000\'den fazla') +
      cell('En güçlü tek varyant', pc1(d.top), ref ? 'kitap: ≈%0,4' : `kopya başına ≈${d.topCm.toFixed(1).replace('.', ',')} cm`) +
      cell('Bulunanların toplamı', pc1(d.sum), ref ? 'kitap: ≈%10' : 'kitap: ≈%40-45');
    $('cmp').textContent = M() === M_STEPS[REF_M] && Math.abs(S.env - 0.2) < 0.001
      ? (ref ? 'Kitaptaki ayar: model kitabın sayılarına yakın çıkar.' : 'Kitaptaki ayar: daha büyük örneklem çok daha fazla varyant ve çok daha yüksek bir pay bulur. Model bu pay için kitaptan yüksek çıkar (varsayım).')
      : 'Kitap karşılaştırması, "Kitaptaki ayar" düğmesindeki değerler (300.000 varyant, çevre %20) için anlamlıdır.';
  }

  function recompute(): void {
    S.sim = simulateGwas(M(), S.env, S.seed);
    S.disc = discovery(M(), 1 - S.env, GWAS_N[S.sample]);
  }

  const api: GwasPanel = {
    set(p) {
      if (p.mIdx !== undefined) { S.mIdx = p.mIdx; sl.m.set(p.mIdx); }
      if (p.env !== undefined) { S.env = p.env; sl.env.set(Math.round(p.env * 100)); }
      if (p.sample) { S.sample = p.sample; setSample(p.sample); }
      S.dirty = true;
    },
    say: () => describeGwas(M(), S.env, S.disc),
    meters: (): Meter[] => [
      { label: 'Genetik pay (simüle)', value: pc(S.sim.varG / S.sim.varP), frac: S.sim.varG / S.sim.varP, color: 'var(--hyp)' },
      { label: 'En güçlü tek varyant', value: pc1(S.disc.top), frac: S.disc.top, color: 'var(--pit)' },
      { label: 'GWAS\'ın bulduklarının toplamı', value: pc1(S.disc.sum), frac: S.disc.sum, color: 'var(--gld)' },
    ],
    draw(): boolean {
      if (!S.dirty) return false;
      S.dirty = false;
      recompute(); drawHist(); drawRead();
      return true;
    },
  };
  return api;
}
