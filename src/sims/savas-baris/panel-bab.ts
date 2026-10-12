// Savaş ve barış, "Babunlar" sekmesi: ayrı (tembel yüklenen) parça; sekme seçilince yüklenir.
import { svg, svgText } from '../kit';
import { createTour } from '../tour';
import { BABOON_DEFAULT, BB, approachDays, describeBaboons, simulateBaboons, type BabParams, type BabRun } from './model';
import { LG, cls, f1, key, pc, pctFmt, sv, type Env, type PanelApi } from './env';

export const BAB_HTML = (): string => `
    <div data-ref="tour3"></div>
    <section class="card" aria-label="Babun sürüsü">
      <h3 class="sim-h">Garbage Dump sürüsü: salgın ve yeni gelenler</h3>
      <div class="chips" role="group" aria-label="Senaryo" data-ref="bbChips"></div>
      <div class="stage">
        <svg viewBox="0 0 360 212" role="img" aria-label="Sürü" data-ref="bbStage"></svg>
        ${key([sv(14, 12, '<circle cx="7" cy="6" r="5" fill="var(--dop)" fill-opacity=".7" stroke="var(--ink)"/>'), 'dişi (koyu = gergin)'], [sv(14, 12, '<rect x="2" y="1" width="10" height="10" fill="var(--amy)" fill-opacity=".7" stroke="var(--ink)"/>'), 'erkek (koyu = saldırgan)'], [sv(14, 12, '<rect x="2" y="1" width="10" height="10" fill="var(--amy)" fill-opacity=".7" stroke="var(--ink)" stroke-width="2.4" stroke-dasharray="3 2"/>'), 'çöplükçü erkek'], [sv(14, 12, '<path d="M7 1L13 6L7 11L1 6z" fill="var(--amy)" fill-opacity=".7" stroke="var(--pfc)" stroke-width="2"/>'), 'yeni gelen'], [sv(14, 12, '<circle cx="7" cy="6" r="3" fill="var(--pfc)"/>'), 'dişi yaklaştı'])}
      </div>
      <div data-ref="tp3"></div>
      <div class="chart"><svg viewBox="0 0 360 184" role="img" aria-label="Aylara göre erkek saldırganlığı, dişi gerginliği ve yeni gelenlerin saldırganlığı" data-ref="bbChart"></svg>
        ${key([LG.line('var(--amy)'), 'erkek saldırganlığı'], [LG.line('var(--dop)', ' stroke-dasharray="5 3"'), 'dişi gerginliği'], [LG.line('var(--pfc)'), 'yeni gelenler'])}
      </div>
      <div class="readout" data-ref="bbRead"></div>
      <div class="sliders" data-ref="bbSl"></div>
    </section>

    <details class="how">
      <summary>Model nasıl çalışıyor?</summary>
      <div class="how-in">
        <p>Sürüde 24 dişi, 12 çöplükçü, 12 sakin erkek var. Salgında çöplükçülerin seçilen payı ölür, geri kalanların yarısı da ölür (oranlar varsayım). Tümü ölürse dişi:erkek 2:1 olur, kitaptaki gibi.</p>
        <p>Dişi gerginliği erkek saldırganlığıyla artar; gergin dişiler yeni erkeğe geç yaklaşır (tipik sürüde iki aydan uzun, salgın sonrası günler-haftalar: kitaptaki iki uç). Yeni gelen dişiyle temas kurunca saldırganlığı sürünün ortalamasına kayar. Kitap doğrudan öğretim kanıtı olmadığını, en olası yolun rahat dişiler olduğunu söyler; model bu yolu kullanır. Yeni gelenler de ortalamaya katılır, bu yüzden çok hızlı göç kültürü seyreltir (modelin sonucu).</p>
      </div>
    </details>

    <aside class="book" aria-label="Kitapta">
      <h3 class="sim-h">Kitapta</h3>
      <ul>
        <li><a href="#/bolum/ch17?deney=ch17-e11">Sapolsky ve Share (2004)</a>: çöplük sürüsünde salgın, çöplüğe giden erkeklerin tümü öldü; dişi:erkek 2:1, saldırganlık düştü; yeni erkekler ~6 ayda uydu, dişiler günler-haftalar içinde yaklaştı (tipik: 2 aydan uzun). Tek sürü, replikasyon yok.</li>
      </ul>
    </aside>
`;

export function createBabPanel(env: Env, host: HTMLElement): PanelApi {
  const { scope, id, $, S, need, touch, setBar, makeSlider, toggles, makeTransport, tiles, yGrid, poly, clipRect } = env;
  host.innerHTML = BAB_HTML();

  const bs = $<SVGElement>('bbStage');
  svgText(bs, { class: 'tl', x: 4, y: 12 }, 'dişiler');
  svgText(bs, { class: 'tl', x: 4, y: 98 }, 'erkekler');
  svgText(bs, { class: 'tl', x: 4, y: 178 }, 'yeni gelenler');
  const rpos = (i: number, sex: 'F' | 'M'): [number, number] => { const j = sex === 'F' ? i : i - BB.females; return [30 + (j % 8) * 43, (sex === 'F' ? 28 : 108) + Math.floor(j / 8) * 26]; };
  let runB: BabRun;
  interface BEl { g: SVGElement; shape: SVGElement; x: SVGElement }
  let resEls: BEl[] = [], newEls: { g: SVGElement; shape: SVGElement; badge: SVGElement }[] = [];
  const bbLayer = svg('g', {}, bs);
  function buildBabStage(): void {
    bbLayer.replaceChildren();
    resEls = runB.residents.map((r, i) => {
      const [x, y] = rpos(i, r.sex), g = svg('g', {}, bbLayer);
      const shape = r.sex === 'F' ? svg('circle', { class: 'b-f', cx: x, cy: y, r: 8 }, g)
        : svg('rect', { class: r.kind === 'dump' ? 'b-m b-dump' : 'b-m', x: x - 7.5, y: y - 7.5, width: 15, height: 15 }, g);
      const xx = svg('path', { class: 'b-x hide', d: `M${x - 5},${y - 5}L${x + 5},${y + 5}M${x + 5},${y - 5}L${x - 5},${y + 5}` }, g);
      return { g, shape, x: xx };
    });
    const n = runB.newcomers.length, step = Math.min(34, 300 / Math.max(1, n)), r = n > 14 ? 5 : 8;
    newEls = runB.newcomers.map((_, i) => {
      const x = 30 + i * step, y = 196, g = svg('g', { class: 'hide' }, bbLayer);
      const shape = svg('path', { class: 'b-n', d: `M${x},${y - r}L${x + r},${y}L${x},${y + r}L${x - r},${y}z` }, g);
      const badge = svg('circle', { class: 'b-badge hide', cx: x + r, cy: y - r, r: 3 }, g);
      return { g, shape, badge };
    });
  }
  const BC = { x0: 34, x1: 346, top: 12, bot: 136 };
  const bch = $<SVGElement>('bbChart');
  const bx = (d: number): number => BC.x0 + ((BC.x1 - BC.x0) * d) / (BB.days - 1), by = (v: number): number => BC.bot - (BC.bot - BC.top) * v;
  yGrid(bch, BC.x0, BC.x1, by, [0, 0.5, 1], pc);
  for (let m = 0; m <= 18; m += 3) svgText(bch, { class: 'ax', x: bx(m * 30), y: BC.bot + 14, 'text-anchor': m === 0 ? 'start' : 'middle' }, String(m));
  svgText(bch, { class: 'ax', x: (BC.x0 + BC.x1) / 2, y: BC.bot + 30, 'text-anchor': 'middle' }, 'ay');
  svg('line', { class: 'offline', x1: bx(BB.outbreak), x2: bx(BB.outbreak), y1: BC.top, y2: BC.bot }, bch);
  svgText(bch, { class: 'ax', x: bx(BB.outbreak) + 4, y: BC.top + 9 }, 'salgın');
  const bClip = clipRect(bch, `${id}-clipB`, 184);
  const bG = svg('g', { 'clip-path': `url(#${id}-clipB)` }, bch);
  const bLM = svg('polyline', { class: 'ln b-male' }, bG), bLS = svg('polyline', { class: 'ln b-str' }, bG), bLN = svg('polyline', { class: 'ln b-new' }, bG);
  const bTicks = svg('path', { class: 'b-tick' }, bch);
  const bCur = svg('line', { class: 'cursor', y1: BC.top, y2: BC.bot }, bch);
  function drawBab(d: number): void {
    const stress = runB.stress[d];
    resEls.forEach((e, i) => {
      const r = runB.residents[i], dead = r.diesDay !== null && d >= r.diesDay;
      e.shape.setAttribute('fill-opacity', dead ? '0' : (0.15 + 0.8 * (r.sex === 'F' ? stress : r.agg)).toFixed(2));
      e.shape.setAttribute('class', `${r.sex === 'F' ? 'b-f' : r.kind === 'dump' ? 'b-m b-dump' : 'b-m'}${dead ? ' dead' : ''}`);
      cls(e.x, 'b-x', dead);
    });
    runB.newcomers.forEach((nc, i) => {
      const e = newEls[i], here = d >= nc.arrive;
      cls(e.g, '', here);
      if (here) { e.shape.setAttribute('fill-opacity', (0.15 + 0.8 * nc.a[d]).toFixed(2)); cls(e.badge, 'b-badge', nc.contact !== null && d >= nc.contact); }
    });
    bClip.setAttribute('width', bx(d + 1).toFixed(1));
    bCur.setAttribute('x1', bx(d).toFixed(1)); bCur.setAttribute('x2', bx(d).toFixed(1));
    bs.setAttribute('aria-label', describeBaboons(runB, d));
  }
  function buildBabChart(): void {
    bLM.setAttribute('points', poly(runB.maleAgg.map((v, d) => [bx(d), by(v)])));
    bLS.setAttribute('points', poly(runB.stress.map((v, d) => [bx(d), by(v)])));
    bLN.setAttribute('points', poly(runB.newAgg.flatMap((v, d) => (Number.isNaN(v) ? [] : [[bx(d), by(v)] as [number, number]]))));
    bTicks.setAttribute('d', runB.newcomers.map((n) => `M${bx(n.arrive).toFixed(1)},${BC.bot}v-7`).join(''));
  }
  const tB = makeTransport($('tp3'), { max: BB.days, speed: 30, unit: 'Gün', seed: () => { S.bseed++; need.b = true; } });
  const bbSl = $('bbSl');
  const setB = (patch: Partial<BabParams>) => {
    S.b = { ...S.b, ...patch };
    if (patch.kill !== undefined) hKi.set(Math.round(patch.kill * 100));
    if (patch.gap !== undefined) hGa.set(patch.gap);
    if (patch.months !== undefined) hMo.set(patch.months);
    need.b = true; touch();
  };
  const hKi = makeSlider(bbSl, { name: 'Salgında ölen çöplükçü erkek payı', hint: 'Kitapta çöplüğe giden erkeklerin tümü öldü (%100). Düşürünce kültür değişmez', min: 0, max: 100, step: 5, val: 100, fmt: pctFmt, cb: (v) => setB({ kill: v / 100 }), color: 'var(--amy)' });
  const hGa = makeSlider(bbSl, { name: 'Yeni gelen aralığı', hint: 'Kaç günde bir yeni erkek katılır. Çok sık gelirse kültür seyrelir (modelin sonucu)', min: 10, max: 180, step: 5, val: S.b.gap, fmt: (v) => `${v} gün`, cb: (v) => setB({ gap: v }), color: 'var(--pfc)' });
  const hMo = makeSlider(bbSl, { name: 'Uyum süresi', hint: 'Yaklaşan dişiyle temastan sonra yeni gelenin davranışının sürüye oturması (kitapta yaklaşık 6 ay)', min: 3, max: 12, step: 1, val: S.b.months, fmt: (v) => `${v} ay`, cb: (v) => setB({ months: v }), color: 'var(--pfc)' });
  const syncBb = toggles($('bbChips'), [{ k: 'no', name: 'Salgın çöplükçülere dokunmasaydı' }, { k: 'yes', name: 'Çöplükçüler öldü (kitaptaki)' }], () => (S.b.kill === 0 ? 'no' : S.b.kill === 1 ? 'yes' : null), (k) => setB({ kill: k === 'yes' ? 1 : 0 }));
  function readBab(d: number): void {
    const f = runB.females[d], m = runB.resMales[d];
    const typical = approachDays(runB.stress[0]);
    $('bbRead').innerHTML = tiles([
      ['Dişi:erkek (yerleşik)', `${m ? f1(f / m) : '-'}:1`], ['Dişiler yaklaşınca (gün)', String(Math.round(approachDays(runB.stress[d])))],
      ['Salgından önce (gün)', String(Math.round(typical))], ['Yeni gelenler (saldırganlık)', Number.isNaN(runB.newAgg[d]) ? '-' : pc(runB.newAgg[d])],
    ]);
  }
  function barBab(): void {
    const d = tB.idx();
    setBar(describeBaboons(runB, d), [
      { label: 'Erkek saldırganlığı', text: pc(runB.maleAgg[d]), frac: runB.maleAgg[d], color: 'var(--amy)' },
      { label: 'Dişi gerginliği', text: pc(runB.stress[d]), frac: runB.stress[d], color: 'var(--dop)' },
      { label: 'Yaklaşma süresi', text: `${Math.round(approachDays(runB.stress[d]))} gün`, frac: approachDays(runB.stress[d]) / 120, color: 'var(--pfc)' },
    ]);
  }
  function renderBab(): void {
    if (need.b) { runB = simulateBaboons(S.b, S.bseed); buildBabStage(); buildBabChart(); need.b = false; }
    const d = tB.idx();
    drawBab(d); readBab(d); syncBb(); tB.sync(); barBab();
  }

  const seekB = (d: number, play = false) => tB.set(d, play);
  const tour3 = createTour(scope, [
    { title: 'Salgından önce', text: 'Çöplükçü erkekler saldırgan, dişiler gergin. Tipik sürüde dişilerin yeni erkeğe yaklaşması iki aydan uzun sürer (kitap).',
      look: 'Koyu kırmızı kareler ve koyu turuncu daireler; "salgından önce" kutusu.', apply: () => { setB({ ...BABOON_DEFAULT }); S.bseed = 4; seekB(80); } },
    { title: 'Salgın', text: 'Salgın çöplüğe giden erkekleri ve sürünün çoğunu öldürdü. Dişi:erkek 2:1 kalıyor.',
      look: 'Çarpılı kareler; erkek saldırganlığı ve dişi gerginliği çizgileri düşer.', apply: () => { setB({ ...BABOON_DEFAULT }); S.bseed = 4; seekB(135); } },
    { title: 'Yeni gelen erkek', text: 'Dışarıdan bir erkek yüksek saldırganlıkla katılıyor. Gerginliği düşük dişiler ona günler içinde yaklaşıyor.',
      look: 'Alttaki elmas koyu; mavi nokta yaklaşıldığını gösterir.', apply: () => { setB({ ...BABOON_DEFAULT }); S.bseed = 4; seekB(175); } },
    { title: 'Altı ay sonra', text: 'Yeni gelenler ~6 ayda sürünün kültürüne uyuyor. Kitap: öğretim kanıtı yok, en olası yol rahat dişiler.',
      look: 'Mavi çizgi erkek saldırganlığı çizgisine iner.', apply: () => { setB({ ...BABOON_DEFAULT }); S.bseed = 4; seekB(400); } },
    { title: 'Salgın olmasaydı', text: 'Çöplükçüler hayatta kalsaydı dişiler gergin kalır, yeni gelene geç yaklaşır; erkekler saldırgan kalırdı.',
      look: 'Kırmızı çizgi yüksekte, mavi çizgi inmiyor.', apply: () => { setB({ ...BABOON_DEFAULT, kill: 0 }); S.bseed = 4; seekB(BB.days - 1); } },
    { title: 'Çok hızlı göç kültürü seyreltir', text: 'Sık gelen yeni erkekler ortalamayı yükseltip dişileri yeniden geriyor (modelin sonucu, kitapta yok).',
      look: 'Salgından sonra bile kırmızı çizgi yeniden yükselir.', apply: () => { setB({ ...BABOON_DEFAULT, gap: 10 }); S.bseed = 4; seekB(BB.days - 1); } },
  ]);
  $('tour3').appendChild(tour3.el);
  return { render: renderBab, tp: tB };
}
