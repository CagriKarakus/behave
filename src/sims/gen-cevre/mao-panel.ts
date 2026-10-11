// Sekme 2: MAO-A varyantı × çocuklukta kötü muamele (Caspi tarzı etkileşim). Fikri öğretir; kesin risk hesabı değildir.
import { svg, svgText } from '../kit';
import { CASPI_RATIO, describeMao, maoPopulationRisk, maoRisk } from './model';
import { bookBox, chipRow, makeSlider, pc, type Ctx, type Meter, type Panel, type SliderHandle } from './ui';

const SCEN = [
  { key: 'caspi', label: 'İlk bulgu (Caspi 2002): ≈3 kat', ratio: CASPI_RATIO },
  { key: 'small', label: 'Daha küçük etki (sembolik 1,5 kat)', ratio: 1.5 },
  { key: 'none', label: 'Etkileşim yok (1 kat)', ratio: 1 },
];

const TEMPLATE = () => `
<div class="callout" role="note">
  <p><strong>Replikasyon durumu: karışık.</strong> Meta-analizler küçük ama anlamlı bir etkileşim bildirdi (Kim-Cohen 2006; Byrd ve Manuck 2014). Buna karşın bazı büyük çalışmalar bunu tekrarlayamadı; aday gen × çevre etkileşimi araştırmaları yayın yanlılığı ve düşük istatistiksel güç nedeniyle ağır biçimde eleştirildi (Duncan ve Keller 2011).</p>
  <p>Bu sekme gen-çevre etkileşimi <em>fikrini</em> öğretir. Gösterilen riskler sembolik; kimsenin gerçek riskini hesaplamaz.</p>
</div>
<p class="note">Soru: MAO-A geninin düşük aktiviteli varyantı, yetişkinlikte antisosyal davranışı tek başına mı öngörür, yoksa çocukluktaki kötü muameleyle birlikte mi? Dunedin kohortunda (Yeni Zelanda, 26 yaşına kadar izlendi) varyant tek başına bir şey öngörmedi; düşük aktiviteli varyant yalnızca ağır çocukluk istismarı geçmişi olanlarda antisosyal davranış olasılığını yaklaşık üç katına çıkardı.</p>
<div class="chips" data-ref="scen" role="group" aria-label="Etkileşim gücü senaryoları"></div>

<div class="stage">
  <svg data-ref="chart" viewBox="0 0 360 230" role="img" aria-label="Etkileşim grafiği: çocuklukta kötü muamele düzeyine göre iki MAO-A varyantında antisosyal davranış riski"></svg>
  <div class="legend" aria-label="Varyantlar">
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="var(--amy)" stroke-width="2.4"/><circle cx="13" cy="5" r="3.4" fill="var(--amy)"/></svg>Düşük aktiviteli varyant</span>
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="0" y1="5" x2="26" y2="5" stroke="var(--pfc)" stroke-width="2.4" stroke-dasharray="5 3"/><rect x="9.6" y="1.6" width="6.8" height="6.8" fill="var(--pfc)"/></svg>Yüksek aktiviteli varyant</span>
  </div>
</div>

<section class="card" aria-label="Yüz kişide kaç kişi">
  <h3 class="sim-h">Yüz kişiden kaçı?</h3>
  <p class="note">Her nokta bir kişi; dolu nokta, yetişkinlikte antisosyal davranış gösteren (sembolik). Seçili kötü muamele düzeyi için.</p>
  <div class="grids">
    <figure><svg data-ref="gridLow" viewBox="0 0 110 110" role="img" aria-label="Düşük aktiviteli varyant: yüz kişilik nokta ızgarası"></svg><figcaption data-ref="capLow"></figcaption></figure>
    <figure><svg data-ref="gridHigh" viewBox="0 0 110 110" role="img" aria-label="Yüksek aktiviteli varyant: yüz kişilik nokta ızgarası"></svg><figcaption data-ref="capHigh"></figcaption></figure>
  </div>
  <table class="gx" data-ref="tbl"></table>
</section>

<section aria-label="MAO-A girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="sliders"></div></section>

<details class="more"><summary>Model nasıl çalışıyor?</summary>
  <p>Yüksek aktiviteli varyantta risk, temel riskten başlar ve kötü muamele arttıkça yükselir (iki varyant için de, sembolik olarak ağır düzeyde iki kat). Düşük aktiviteli varyantta risk bunun üstüne bir çarpan alır. Çarpan, kötü muamele düzeyi yaklaşık %30'u aşana kadar 1'dir ve ağır düzeyde seçtiğin orana (kitapta ≈3) ulaşır.</p>
  <p>Böylece kötü muamele yokken iki çizgi üst üste biner; ağır kötü muamelede ayrılır. Çizgiler paralel değilse etkileşim vardır. "Etkileşim yok" senaryosunda çarpan 1'dir: kötü muamele iki varyantı da aynı oranda etkiler.</p>
  <p>Popülasyon satırı, ağır kötü muamele görenlerin payını kaydırıcıdan alır; geri kalanlar hiç görmemiş sayılır. Pay küçükken varyantın tek başına yarattığı fark da küçük görünür.</p>
</details>

${bookBox([
    { id: 'ch08-e9', text: 'MAO-A varyantı ve çocuklukta kötü muamele (Caspi ve ark., 2002): replikasyon karışık' },
    { id: 'ch08-e6', text: 'MAO-A mutasyonu taşıyan Hollandalı aile (Brunner, 1993)' },
    { id: 'ch08-e8', text: 'Düşük aktiviteli MAO-A varyantı ve beyin tepkileri (2006): replikasyon karışık' },
  ], '<p class="note">Hollandalı ailedeki mutasyon enzimi tümüyle yok eden nadir bir mutasyondu; yaygın düşük aktiviteli varyanta genellenemez. Kitap "savaşçı gen" etiketini de eleştirir.</p>')}
<p class="foot">Nitel model. Kitaptan gelen tek sayı "yaklaşık üç kat" (ağır istismar geçmişi olanlarda düşük aktiviteli varyantta). Temel risk (%8), kötü muamelenin genel etkisi ve ara düzeylerdeki eğri sembolik; kitap bu sayıları vermiyor. Kitap ayrıca kızlarda daha zayıf etki ve bazı gruplarda hiç görülmemesi gibi sınırlılıkları not eder.</p>`;

export interface MaoPanel extends Panel {
  set(p: { level?: number; ratio?: number; share?: number }): void;
}

export function createMaoPanel(ctx: Ctx, host: HTMLElement): MaoPanel {
  host.innerHTML = TEMPLATE();
  const $ = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const S = { level: 0.9, ratio: CASPI_RATIO, share: 0.1, dirty: true };
  const sl: Record<string, SliderHandle> = {};

  const setChip = chipRow($('scen'), ctx, SCEN.map((s) => ({ key: s.key, label: s.label })), (k) => {
    S.ratio = SCEN.find((s) => s.key === k)!.ratio; sl.ratio.set(Math.round(S.ratio * 10)); S.dirty = true; setChip(k);
  });
  const chipFor = () => SCEN.find((s) => Math.abs(s.ratio - S.ratio) < 0.01)?.key ?? null;
  const slH = $('sliders');
  sl.level = makeSlider(ctx, slH, 'lvl', 'Çocuklukta kötü muamele düzeyi', 'Solda hiç yok, sağda ağır ve süregelen. Etkileşim yalnızca ağır uçta ortaya çıkıyor.', 0, 100, Math.round(S.level * 100),
    (v) => { S.level = v / 100; S.dirty = true; }, (v) => (v < 5 ? 'yok' : v < 30 ? `hafif (%${v})` : v < 70 ? `orta (%${v})` : `ağır (%${v})`), 'var(--red)');
  sl.ratio = makeSlider(ctx, slH, 'ratio', 'Ağır kötü muamelede düşük/yüksek aktivite oranı', 'Kitaptaki ilk bulgu ≈3 kat. Tekrarlayamayan çalışmalar 1\'e yakın bir oran görür.', 10, 50, Math.round(S.ratio * 10),
    (v) => { S.ratio = v / 10; S.dirty = true; setChip(chipFor()); }, (v) => `${(v / 10).toFixed(1).replace('.', ',')} kat`, 'var(--amy)', 1);
  sl.share = makeSlider(ctx, slH, 'share', 'Popülasyonda ağır kötü muamele görenlerin payı', 'Tek başına varyanta bakan bir çalışma, ağır grubun küçük payı yüzünden etkiyi seyreltilmiş görür.', 0, 40, Math.round(S.share * 100),
    (v) => { S.share = v / 100; S.dirty = true; }, (v) => `%${v}`, 'var(--lesion)');
  setChip(chipFor());

  const ch = $<SVGElement>('chart');
  const R = { l: 38, r: 16, t: 14, b: 44 };
  const xAt = (l: number) => R.l + l * (360 - R.l - R.r);
  const yAt = (v: number) => 230 - R.b - v * (230 - R.b - R.t);
  function drawChart(): void {
    ch.innerHTML = '';
    for (const v of [0, 0.25, 0.5, 0.75, 1]) { svg('line', { class: 'grid', x1: R.l, x2: 360 - R.r, y1: yAt(v), y2: yAt(v) }, ch); svgText(ch, { x: R.l - 6, y: yAt(v) + 3.5, 'text-anchor': 'end' }, String(Math.round(v * 100))); }
    for (const [l, nm] of [[0, 'yok'], [0.5, 'orta'], [1, 'ağır']] as const) { svgText(ch, { x: xAt(l), y: 230 - R.b + 15, 'text-anchor': l === 0 ? 'start' : l === 1 ? 'end' : 'middle' }, nm); }
    svgText(ch, { x: (R.l + 360 - R.r) / 2, y: 224, 'text-anchor': 'middle', class: 'ax-t' }, 'Çocuklukta kötü muamele');
    svgText(ch, { x: 6, y: 10, 'text-anchor': 'start', class: 'ax-t' }, 'Antisosyal davranış, yüz kişide (sembolik)');
    const pts = (low: boolean) => Array.from({ length: 51 }, (_, i) => `${xAt(i / 50).toFixed(1)},${yAt(maoRisk(low, i / 50, S.ratio)).toFixed(1)}`).join(' ');
    svg('polyline', { class: 'ln', stroke: 'var(--pfc)', 'stroke-dasharray': '6 3', points: pts(false) }, ch);
    svg('polyline', { class: 'ln', stroke: 'var(--amy)', points: pts(true) }, ch);
    svg('line', { x1: xAt(S.level), x2: xAt(S.level), y1: yAt(0), y2: yAt(1), stroke: 'var(--ink)', 'stroke-width': 1.2, 'stroke-dasharray': '2 3' }, ch);
    const hi = maoRisk(false, S.level, S.ratio), lo = maoRisk(true, S.level, S.ratio);
    svg('rect', { x: xAt(S.level) - 4.5, y: yAt(hi) - 4.5, width: 9, height: 9, fill: 'var(--pfc)', stroke: 'var(--panel)', 'stroke-width': 1.4 }, ch);
    svg('circle', { cx: xAt(S.level), cy: yAt(lo), r: 5, fill: 'var(--amy)', stroke: 'var(--panel)', 'stroke-width': 1.4 }, ch);
    const flip = S.level > 0.7;
    const anchor = flip ? 'end' : 'start', dx = flip ? -10 : 10;
    svgText(ch, { x: xAt(S.level) + dx, y: yAt(lo) - 8, 'text-anchor': anchor, style: 'fill:var(--ink)' }, pc(lo));
    if (Math.abs(yAt(hi) - yAt(lo)) > 9) svgText(ch, { x: xAt(S.level) + dx, y: yAt(hi) + 15, 'text-anchor': anchor, style: 'fill:var(--ink)' }, pc(hi));
  }
  function drawGrid(svgEl: SVGElement, risk: number, color: string, square: boolean): void {
    svgEl.innerHTML = '';
    const k = Math.round(risk * 100);
    for (let i = 0; i < 100; i++) {
      const cx = 7 + (i % 10) * 10.6, cy = 7 + Math.floor(i / 10) * 10.6, on = i < k;
      const a = { fill: on ? color : 'none', stroke: on ? color : 'var(--control-border)', 'stroke-width': on ? 1 : 0.9 };
      if (square) svg('rect', { x: cx - 3.6, y: cy - 3.6, width: 7.2, height: 7.2, ...a }, svgEl);
      else svg('circle', { cx, cy, r: 3.8, ...a }, svgEl);
    }
  }
  function drawTable(): void {
    const row = (nm: string, low: boolean) => `<tr><th scope="row">${nm}</th><td>${pc(maoRisk(low, 0, S.ratio))}</td><td>${pc(maoRisk(low, 1, S.ratio))}</td><td>${pc(maoPopulationRisk(low, S.share, S.ratio))}</td></tr>`;
    $('tbl').innerHTML = `<thead><tr><th><span class="sr-only">Varyant</span></th><th scope="col">Hiç kötü muamele yok</th><th scope="col">Ağır kötü muamele</th><th scope="col">Herkes birlikte (ağır payı ${pc(S.share)})</th></tr></thead><tbody>${row('Düşük aktiviteli', true)}${row('Yüksek aktiviteli', false)}</tbody>`;
  }

  return {
    set(p) {
      if (p.level !== undefined) { S.level = p.level; sl.level.set(Math.round(p.level * 100)); }
      if (p.ratio !== undefined) { S.ratio = p.ratio; sl.ratio.set(Math.round(p.ratio * 10)); setChip(chipFor()); }
      if (p.share !== undefined) { S.share = p.share; sl.share.set(Math.round(p.share * 100)); }
      S.dirty = true;
    },
    say: () => describeMao(S.level, S.ratio, S.share),
    meters: (): Meter[] => {
      const lo = maoRisk(true, S.level, S.ratio), hi = maoRisk(false, S.level, S.ratio);
      return [
        { label: 'Düşük aktiviteli: risk', value: pc(lo), frac: lo, color: 'var(--amy)' },
        { label: 'Yüksek aktiviteli: risk', value: pc(hi), frac: hi, color: 'var(--pfc)' },
        { label: 'Oran (düşük/yüksek)', value: `${(lo / hi).toFixed(1).replace('.', ',')} kat`, frac: Math.min(1, (lo / hi - 1) / 4), color: 'var(--lesion)' },
      ];
    },
    draw(): boolean {
      if (!S.dirty) return false;
      S.dirty = false;
      drawChart();
      const lo = maoRisk(true, S.level, S.ratio), hi = maoRisk(false, S.level, S.ratio);
      drawGrid($('gridLow'), lo, 'var(--amy)', false); drawGrid($('gridHigh'), hi, 'var(--pfc)', true);
      $('capLow').textContent = `Düşük aktiviteli: ${Math.round(lo * 100)} / 100`;
      $('capHigh').textContent = `Yüksek aktiviteli: ${Math.round(hi * 100)} / 100`;
      drawTable();
      return true;
    },
  };
}
