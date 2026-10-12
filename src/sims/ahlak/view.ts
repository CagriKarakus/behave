import { mulberry32 } from '../rng';
import { lazyNotes, slider } from '../ui';
import '../sim.css';
import './view.css';
import { Scope, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  BIG_MARKET, BOOK, FACES, HADZA, MIXES, PG, PROFILES, SCENARIOS, N_AGENTS, antiFraction, avgContribution, avgPay, bestOf,
  bestOffer, clamp, describeDice, describePG, describeTrolley, dictatorOffer, dimsOf, expectedDist, expectedPay, honestShare,
  deviation, normMix, pReject, payOf, profile, rejectThreshold, sampleByType, scenarioP, simulate,
  systems, type Answers, type Dims, type Intent, type Market, type Mix, type Round, type ScenarioId, type Society,
} from './model';

type Tab = 'tro' | 'pg' | 'dice';
const f1 = (x: number): string => x.toFixed(1).replace('.', ',');
const pc = (x: number): string => `%${Math.round(x * 100)}`;
const band = (b: [number, number] | null): string => (!b ? 'sayı yok' : b[0] === b[1] ? `~${pc(b[0])}` : `${pc(b[0])}-${b[1] * 100}`);

const sv = (w: number, h: number, inner: string): string => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
const arrow = (c: string, dash: string): string => sv(26, 10, `<path d="M1 5H19" stroke="${c}" stroke-width="2.2"${dash}/><path d="M17 1L25 5L17 9z" fill="${c}"/>`);
const dotI = (c: string): string => `<i style="background:${c}"></i>`;
const key = (...a: [string, string][]): string => `<div class="legend">${a.map(([i, t]) => `<span>${i}${t}</span>`).join('')}</div>`;
const TEMPLATE = (id: string) => `
<div class="sim sim-ahl">
  <p class="lede">Ahlaki kararlarımızı akıl mı verir, sezgi mi; ve kültürler "adil"i neden farklı tanımlar?</p>
  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    <button class="tab" role="tab" id="${id}-tab-tro" data-pane="tro" aria-controls="${id}-pane-tro" aria-selected="true" type="button">Trolley</button>
    <button class="tab" role="tab" id="${id}-tab-pg" data-pane="pg" aria-controls="${id}-pane-pg" aria-selected="false" tabindex="-1" type="button">Kamu malı ve ceza</button>
    <button class="tab" role="tab" id="${id}-tab-dice" data-pane="dice" aria-controls="${id}-pane-dice" aria-selected="false" tabindex="-1" type="button">Zar ve dürüstlük</button>
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık çıktılar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- ============ 1 · Trolley ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-tro" data-pane="tro" aria-labelledby="${id}-tab-tro">
    <div data-ref="tour1"></div>
    <div class="chips" role="group" aria-label="Senaryolar" data-ref="scChips"></div>
    <section class="card" aria-label="Senaryo ve karar">
      <p class="sc-text" data-ref="scText"></p>
      <div class="row decide" role="group" data-ref="decide">
        <button class="btn btn-yes" type="button" data-ref="yes">Evet</button>
        <button class="btn btn-no" type="button" data-ref="no">Hayır</button>
      </div>
      <p class="sc-res" data-ref="scRes"></p>
    </section>

    <section aria-label="İki sistem">
      <h3 class="sim-h">İki sistem</h3>
      <div class="sys">
        <div class="sys-box cold">
          <p class="sys-t">Soğuk hesap</p><p class="sys-s">dlPFC · faydacı</p>
          <div class="track"><b data-ref="coldB"></b></div>
          <p class="sys-n" data-ref="coldT"></p>
        </div>
        <div class="sys-box hot">
          <p class="sys-t">Sıcak sezgi</p><p class="sys-s">vmPFC · amigdala · insula</p>
          <div class="track"><b data-ref="hotB"></b></div>
          <ul class="parts" data-ref="parts"></ul>
        </div>
      </div>
    </section>

    <section aria-label="Senaryo karşılaştırması">
      <h3 class="sim-h">Evet oranı: model ve kitap</h3>
      <div class="stage">
        <svg viewBox="0 0 360 232" role="group" aria-label="Beş senaryo ve ayarların için model tahmini ile kitaptaki evet oranları" data-ref="plot"></svg>
        ${key([sv(14, 12, '<circle cx="7" cy="6" r="4.5" fill="var(--ink)"/>'), 'model (ortalama kişi)'], [sv(16, 12, '<rect x="1" y="2" width="14" height="8" rx="2" fill="var(--dop)" fill-opacity=".55" stroke="var(--dop)"/>'), 'kitaptaki oran'], [sv(14, 12, '<path d="M7 1.5L12 6L7 10.5L2 6z" fill="none" stroke="var(--ink)" stroke-width="1.6"/>'), 'tutarlı niyet kuralı'])}
      </div>
    </section>

    <section aria-label="Girdiler">
      <h3 class="sim-h">Girdiler: üç boyut</h3>
      <div class="dims" data-ref="dims"></div>
      <div class="sliders" data-ref="savedSl"></div>
    </section>


    <section class="card" aria-label="Sonuç">
      <h3 class="sim-h">Sonuç: kararların ve kitap</h3>
      <ul class="res" data-ref="res"></ul>
      <p class="note" data-ref="prof"></p>
      <div class="seg" role="group" aria-label="Greene'in iki sorun türü">
        <button class="btn" type="button" aria-pressed="true" data-ref="gMe">Ben mi, Biz mi?</button>
        <button class="btn" type="button" aria-pressed="false" data-ref="gThem">Biz mi, Onlar mı?</button>
      </div>
      <p class="note" data-ref="gText"></p>
    </section>

    <section class="card" aria-label="Knobe etkisi">
      <h3 class="sim-h">Knobe etkisi: niyet yargısı</h3>
      <div class="seg" role="group" aria-label="Senaryo"><button class="btn" type="button" aria-pressed="true" data-ref="kHarm">Plan zarar verir</button><button class="btn" type="button" aria-pressed="false" data-ref="kHelp">Plan yarar sağlar</button></div>
      <p class="note" data-ref="kText"></p>
      <div class="row decide"><button class="btn" type="button" data-ref="kYes">İsteyerek yaptı</button><button class="btn" type="button" data-ref="kNo">İsteyerek yapmadı</button></div>
      <div class="kn" data-ref="kRes" hidden></div>
    </section>

    <div class="notes" data-notes="tro"></div>
  </section>

  <!-- ============ 2 · Kamu malı ve ceza ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-pg" data-pane="pg" aria-labelledby="${id}-tab-pg" hidden>
    <div data-ref="tour2"></div>
    <section class="card" aria-label="Kamu malı oyunu ve ceza">
      <h3 class="sim-h">1 · Kamu malı oyunu ve ceza (Herrmann)</h3>
      <p class="note">16 oyuncu, her biri 4 kişilik bir grupta, ${PG.rounds} tur. Her turda 0-${PG.E} jeton ortak havuza girer; sonra isteyen, diğerlerini ceza puanıyla cezalandırır.</p>
      <div class="chips" role="group" aria-label="Toplum" data-ref="socChips"></div>
      <div class="chips" role="group" aria-label="Ceza aşaması" data-ref="punChips"></div>
      <div class="stage">
        <svg viewBox="0 0 360 306" role="img" aria-label="Dört grup ve oyuncular: dolgu katkıyı, oklar cezayı gösterir" data-ref="groups"></svg>
        ${key([sv(16, 14, '<circle cx="8" cy="7" r="6" fill="none" stroke="var(--pfc)" stroke-width="1.6"/><circle cx="8" cy="7" r="3" fill="var(--pfc)"/>'), 'normal oyuncu'], [sv(16, 14, '<path d="M8 .8L15 7L8 13.2L1 7z" fill="none" stroke="var(--amy)" stroke-width="1.6"/><circle cx="8" cy="7" r="2.6" fill="var(--amy)"/>'), 'antisosyal eğilimli'], [arrow('var(--pfc)', ''), 'bedava binene ceza'], [arrow('var(--amy)', ' stroke-dasharray="4 2"'), 'işbirlikçiye ceza'])}
      </div>
      <div class="row play"><button class="btn" type="button" data-ref="replay">Yeniden oyna</button><button class="btn" type="button" data-ref="reseed">Başka oyuncular</button></div>
      <div class="sliders" data-ref="roundSl"></div>
      <div class="chart" aria-label="Katkı grafiği"><h4 class="sim-h">Ortalama katkı</h4>
        <svg viewBox="0 0 360 188" role="img" aria-label="Turlara göre ortalama katkı: cezalı ve cezasız oyun" data-ref="chart1"></svg></div>
      <div class="chart" aria-label="Ceza grafiği"><h4 class="sim-h">Ceza puanları</h4>
        <svg viewBox="0 0 360 150" role="img" aria-label="Turlara göre ceza puanları: bedava binene ve işbirlikçiye" data-ref="chart2"></svg></div>
      <div class="sliders" data-ref="socSl"></div>
    </section>

    <section class="card" aria-label="Adalet eğrisi">
      <h3 class="sim-h">2 · Adalet pazarla ve topluluk büyüklüğüyle değişir (Henrich)</h3>
      <div class="chips" role="group" aria-label="Topluluk" data-ref="mkChips"></div>
      <div class="chart"><svg viewBox="0 0 360 206" role="img" aria-label="Teklif edilen paya göre reddedilme olasılığı: seçili topluluk ve iki referans" data-ref="chart3"></svg></div>
      <div class="readout" data-ref="mkRead"></div>
      <div class="sliders" data-ref="mkSl"></div>
    </section>


    <div class="notes" data-notes="pg"></div>
  </section>

  <!-- ============ 3 · Zar ve dürüstlük ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-dice" data-pane="dice" aria-labelledby="${id}-tab-dice" hidden>
    <div data-ref="tour3"></div>
    <section class="card" aria-label="Tek bir atış">
      <h3 class="sim-h">1 · Zar iki kez atılır, yalnızca ilki sayılır</h3>
      <div class="row play"><button class="btn tour-next" type="button" data-ref="roll">Zarları at</button></div>
      <div class="dice" data-ref="dice" role="group" aria-label="Atılan zarlar"></div>
      <ul class="res" data-ref="rollRes"></ul>
    </section>
    <section class="card" aria-label="Toplumun bildirdiği dağılım">
      <h3 class="sim-h">2 · ${300} kişinin bildirdiği sonuçlar</h3>
      <div class="chips" role="group" aria-label="Toplum" data-ref="mixChips"></div>
      <div class="stage">
        <svg viewBox="0 0 360 232" role="img" aria-label="Bildirilen sayıların dağılımı; tipe göre renkli sütunlar" data-ref="hist"></svg>
        ${key([dotI('var(--pfc)'), 'dürüst'], [dotI('var(--dop)'), 'haklı dürüstlük'], [dotI('var(--amy)'), 'tam yalan'], [sv(24, 10, '<path d="M1 5H23" stroke="var(--ink)" stroke-width="1.6" stroke-dasharray="4 3"/>'), 'düz dağılım (%17)'])}
      </div>
      <div class="readout" data-ref="diceRead"></div>
      <div class="sliders" data-ref="mixSl"></div>
      <div class="row play"><button class="btn" type="button" data-ref="rerun">Yeniden çalıştır</button></div>
    </section>


    <div class="notes" data-notes="dice"></div>
  </section>

  <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan: trolley oranları, Knobe %85 ve %23, Hadza %73, pazar ~%90, 50 ve 5000 kişi eşikleri, ceza ve sosyal sermaye yönü, zarın iki atış düzeni. Oyun parametreleri, ağırlıklar, hazır karışımlar ve eğri biçimleri modelin varsayımıdır.</p>
</div>`;

interface SliderHandle { inp: HTMLInputElement; set: (v: number) => void }

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('ahl');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let slN = 0;

  /* ---------- Durum ---------- */
  interface State {
    tab: Tab;
    dims: Dims; sel: ScenarioId | null; ans: Answers; g: 'me' | 'them'; knobe: 'zarar' | 'yarar'; kAns: boolean | null;
    seed: number; soc: Society; pun: boolean; rev: number; acc: number;
    mk: Market; offer: number;
    mix: Mix; dseed: number; roll: [number, number] | null; rollSeed: number;
  }
  const S: State = {
    tab: 'tro',
    dims: dimsOf(SCENARIOS[0]), sel: 'anahtar', ans: {}, g: 'me', knobe: 'zarar', kAns: null,
    seed: 3, soc: { ...PROFILES.yuksek }, pun: true, rev: PG.rounds, acc: 0,
    mk: { ...HADZA }, offer: 0.3,
    mix: { ...MIXES[2].mix }, dseed: 1, roll: null, rollSeed: 1,
  };
  let dirty = true;
  let lastSay = '';

  /* ---------- Yardımcılar ---------- */
  function makeSlider(parent: HTMLElement, o: { name: string; hint: string; min: number; max: number; step: number; val: number; fmt: (v: number) => string; cb: (v: number) => void; color?: string }): SliderHandle {
    const h = slider(scope, parent, { id: `${id}-s${++slN}`, name: o.name, hint: o.hint, min: o.min, max: o.max, step: o.step, value: o.val, fmt: o.fmt, color: o.color, cls: 'sl', onInput: o.cb });
    return { inp: h.inp, set: (v) => h.set(v) };
  }
  function toggles<T extends string>(parent: HTMLElement, items: { k: T; name: string }[], get: () => T | null, pick: (k: T) => void): () => void {
    const btns = items.map((it) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = parent.classList.contains('chips') ? 'chip' : 'btn'; b.textContent = it.name; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => { pick(it.k); dirty = true; });
      parent.appendChild(b);
      return b;
    });
    return () => items.forEach((it, i) => btns[i].setAttribute('aria-pressed', String(get() === it.k)));
  }
  const yGrid = (parent: Element, x0: number, x1: number, y: (v: number) => number, vals: number[], fmt: (v: number) => string): void => {
    for (const v of vals) { svg('line', { class: 'grid', x1: x0, x2: x1, y1: y(v), y2: y(v) }, parent); svgText(parent, { class: 'ax', x: x0 - 6, y: y(v) + 3.5, 'text-anchor': 'end' }, fmt(v)); }
  };
  const tiles = (xs: [string, string][]): string => xs.map(([l, v]) => `<div class="ro"><span>${l}</span><b>${v}</b></div>`).join('');
  const setW = (el: HTMLElement, frac: number) => { el.style.width = `${(clamp(frac) * 100).toFixed(1)}%`; };

  /* ---------- Sekmeler ---------- */
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  function showTab(t: Tab, focus = false): void {
    S.tab = t; dirty = true;
    for (const b of tabBtns) {
      const on = b.dataset.pane === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const p of panes) p.hidden = p.dataset.pane !== t;
    if (t === 'pg' && S.rev === 0) S.acc = 0;
  }
  for (const b of tabBtns) {
    scope.on(b, 'click', () => showTab(b.dataset.pane as Tab));
    scope.on(b, 'keydown', (ev) => {
      const i = tabBtns.indexOf(b);
      const j = ev.key === 'ArrowRight' ? (i + 1) % tabBtns.length : ev.key === 'ArrowLeft' ? (i + tabBtns.length - 1) % tabBtns.length : -1;
      if (j >= 0) { ev.preventDefault(); showTab(tabBtns[j].dataset.pane as Tab, true); }
    });
  }

  /* ---------- Çıktı çubuğu ---------- */
  interface Meter { label: string; text: string; frac: number; color: string }
  const meterWrap = $('meters');
  const meterEls = [0, 1, 2].map(() => {
    const d = document.createElement('div');
    d.className = 'm';
    d.innerHTML = '<div class="m-top"><span></span><b></b></div><div class="track"><b></b></div>';
    meterWrap.appendChild(d);
    return { d, l: d.querySelector('span')!, t: d.querySelector<HTMLElement>('.m-top b')!, f: d.querySelector<HTMLElement>('.track b')! };
  });
  function setBar(say: string, ms: Meter[]): void {
    $('say').textContent = say;
    lastSay = say;
    ms.forEach((m, i) => {
      const e = meterEls[i];
      e.d.style.setProperty('--c', m.color);
      e.l.textContent = m.label; e.t.textContent = m.text; setW(e.f, m.frac);
    });
  }

  /* =====================================================================
     1 · Trolley
     ===================================================================== */
  const KNOBE_TXT = {
    zarar: 'Bir çalışan patrona kâr getirecek bir plan önerir; plan çevreye zarar verecektir. Patron "çevreyi umursamıyorum, yap" der. Plan uygulanır ve çevre zarar görür.',
    yarar: 'Bir çalışan patrona kâr getirecek bir plan önerir; plan çevreye yarar sağlayacaktır. Patron "çevreyi umursamıyorum, yap" der. Plan uygulanır ve çevre yarar görür.',
  };
  const GREENE_TXT = {
    me: 'Ben mi, Biz mi: bencilliğin grubu bozduğu ortak mal sorunları. Hızlı ahlaki sezgiler burada iyi işler; çoğu zaman yeter.',
    them: 'Biz mi, Onlar mı: farklı grupların kendi sezgilerinin çatıştığı sorunlar. Her taraf kendi sezgisini doğru bulur; yavaş, bilinçli akıl yürütme gerekir.',
  };
  const scChips = $('scChips');
  const scBtns = SCENARIOS.map((sc) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = sc.short; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => selectScenario(sc.id));
    scChips.appendChild(b);
    return b;
  });
  function selectScenario(sid: ScenarioId, saved = 5): void {
    const sc = SCENARIOS.find((s) => s.id === sid)!;
    S.sel = sid; S.dims = dimsOf(sc, saved); dirty = true;
  }
  const INTENTS: { k: Intent; name: string }[] = [{ k: 'kaza', name: 'Kaza' }, { k: 'yan', name: 'Yan etki' }, { k: 'arac', name: 'Araç' }];
  const dimsEl = $('dims');
  const mkGroup = (label: string): HTMLElement => {
    const g = document.createElement('div'); g.className = 'dg';
    g.innerHTML = `<p class="dg-l">${label}</p><div class="seg" role="group" aria-label="${label}"></div>`;
    dimsEl.appendChild(g);
    return g.querySelector('.seg')!;
  };
  const edit = (f: () => void) => { f(); S.sel = null; };
  const syncForce = toggles(mkGroup('Kişisel güç'), [{ k: '0', name: 'Yok' }, { k: '1', name: 'Kasla' }], () => String(S.dims.force), (k) => edit(() => { S.dims = { ...S.dims, force: Number(k) as 0 | 1 }; }));
  const syncProx = toggles(mkGroup('Yakınlık'), [{ k: '0', name: 'Uzak' }, { k: '1', name: 'Yakın' }], () => String(S.dims.prox), (k) => edit(() => { S.dims = { ...S.dims, prox: Number(k) as 0 | 1 }; }));
  const syncIntent = toggles(mkGroup('Niyet'), INTENTS, () => S.dims.intent, (k) => edit(() => { S.dims = { ...S.dims, intent: k }; }));
  const savedSl = makeSlider($('savedSl'), {
    name: 'Kurtarılan kişi sayısı', hint: 'Karşısında hep tek kişi var. Hesap sayıyla büyür, sezgi büyümez (modelin varsayımı).',
    min: 2, max: 30, step: 1, val: 5, fmt: (v) => String(v), cb: (v) => { S.dims = { ...S.dims, saved: v }; if (v !== 5) S.sel = null; dirty = true; }, color: 'var(--pfc)',
  });

  // Karşılaştırma grafiği
  const PL = { x0: 108, x1: 296, top: 26, row: 33 };
  const px = (p: number): number => PL.x0 + (PL.x1 - PL.x0) * p;
  const plot = $<SVGElement>('plot');
  for (const v of [0, 0.5, 1]) {
    svg('line', { class: 'grid', x1: px(v), x2: px(v), y1: PL.top - 8, y2: PL.top + 6 * PL.row - 14 }, plot);
    svgText(plot, { class: 'ax', x: px(v), y: 12, 'text-anchor': 'middle' }, pc(v));
  }
  interface PRow { g: SVGElement; hl: SVGElement; band: SVGElement; dot: SVGElement; dia: SVGElement; you: SVGElement }
  const rows: PRow[] = [...SCENARIOS.map((s) => s.short), 'Ayarların'].map((name, i) => {
    const y = PL.top + i * PL.row;
    const custom = i === SCENARIOS.length;
    const g = svg('g', { class: 'prow' + (custom ? ' custom' : ''), ...(custom ? { role: 'img' } : { tabindex: '0', role: 'button', 'aria-pressed': 'false', 'aria-label': name }) }, plot);
    const hl = svg('rect', { class: 'hl', x: 2, y: y - 14, width: 356, height: 28, rx: 6 }, g);
    svgText(g, { class: 'rl', x: 6, y: y + 3.5 }, name);
    svg('line', { class: 'trk', x1: px(0), x2: px(1), y1: y, y2: y }, g);
    const band = svg('rect', { class: 'band', y: y - 6, height: 12, rx: 3, x: 0, width: 0 }, g);
    const dia = svg('path', { class: 'dia', d: `M0,-6 L6,0 L0,6 L-6,0 z`, transform: `translate(0,${y})`, opacity: 0 }, g);
    const dot = svg('circle', { class: 'mdot', r: 5.5, cx: px(0), cy: y }, g);
    const you = svgText(g, { class: 'you', x: 356, y: y + 3.5, 'text-anchor': 'end' }, '');
    if (!custom) {
      const sc = SCENARIOS[i];
      scope.on(g as unknown as HTMLElement, 'click', () => selectScenario(sc.id));
      scope.on(g as unknown as HTMLElement, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectScenario(sc.id); } });
    }
    return { g, hl, band, dot, dia, you };
  });
  const noNum = svgText(plot, { class: 'rl muted', x: px(0.5), y: PL.top + 3 * PL.row + 3.5 }, 'kitapta sayı yok');

  const resEl = $('res');
  function drawTrolley(): void {
    const sy = systems(S.dims);
    const sc = S.sel ? SCENARIOS.find((s) => s.id === S.sel)! : null;
    scBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(S.sel === SCENARIOS[i].id)));
    $('scText').textContent = sc ? sc.text : 'Özel ayar: boyutları ve sayıyı değiştirerek sezgiyle hesabın nasıl çekiştiğine bak. Karar vermek için bir senaryo seç.';
    const ans = sc ? S.ans[sc.id] : undefined;
    const yes = $<HTMLButtonElement>('yes'), no = $<HTMLButtonElement>('no');
    yes.disabled = no.disabled = !sc;
    yes.setAttribute('aria-pressed', String(ans === true)); no.setAttribute('aria-pressed', String(ans === false));
    yes.textContent = 'Evet'; no.textContent = 'Hayır';
    $('decide').setAttribute('aria-label', sc ? sc.ask : 'Karar');
    const res = $('scRes');
    if (sc && ans !== undefined) {
      const mp = sy.pYes;
      res.textContent = `${ans ? 'Evet' : 'Hayır'} dedin. Kitapta bu senaryoda onay: ${band(sc.book)}; model: ${pc(mp)}.` +
        (sc.id === 'dongu' ? ` Mantıken ${pc(BOOK.loopLogical)} beklenirdi.` : '');
    } else res.textContent = sc ? sc.ask : '';
    // iki sistem
    setW($('coldB'), sy.cold / 3.6); setW($('hotB'), sy.hot / 3.6);
    $('coldT').textContent = `${S.dims.saved} kişi kurtarmak, 1 kişiyi kaybetmek: net kazanç hesabı ${S.dims.saved - 1}. Sayı arttıkça çekim yavaşça büyür.`;
    const hp = sy.hotParts;
    $('parts').innerHTML =
      `<li><span>Ölümü seçmek</span><b>${hp.choice > 0 ? 'var' : 'yok'}</b></li>` +
      `<li><span>Kasla araç yapmak</span><b>${hp.force > 0 ? 'güçlü' : 'yok'}</b></li>` +
      `<li><span>Yakınlık</span><b>${hp.prox > 0 ? 'küçük' : 'yok'}</b></li>`;
    // grafik
    SCENARIOS.forEach((s, i) => {
      const r = rows[i], p = scenarioP(s), cons = systems(dimsOf(s)).pConsistent;
      r.dot.setAttribute('cx', String(px(p)));
      if (s.book) {
        const [lo, hi] = s.book;
        const x0 = px(lo) - (hi === lo ? 3 : 0), w = hi === lo ? 6 : px(hi) - px(lo);
        r.band.setAttribute('x', String(x0)); r.band.setAttribute('width', String(w));
      } else r.band.setAttribute('width', '0');
      const showDia = Math.abs(cons - p) > 0.05;
      r.dia.setAttribute('opacity', showDia ? '1' : '0');
      if (showDia) r.dia.setAttribute('transform', `translate(${px(cons)},${PL.top + i * PL.row})`);
      const a = S.ans[s.id];
      r.you.textContent = a === undefined ? '' : a ? 'Sen: evet' : 'Sen: hayır';
      r.g.classList.toggle('sel', S.sel === s.id);
      r.g.setAttribute('aria-pressed', String(S.sel === s.id));
      r.g.setAttribute('aria-label', `${s.short}: model ${pc(p)}, kitap ${band(s.book)}${a === undefined ? '' : a ? ', senin kararın evet' : ', senin kararın hayır'}`);
    });
    noNum.setAttribute('opacity', '1');
    rows[5].dot.setAttribute('cx', String(px(sy.pYes)));
    rows[5].you.textContent = pc(sy.pYes);
    rows[5].g.setAttribute('aria-label', `Ayarların: model ${pc(sy.pYes)}`);
    rows[5].g.classList.toggle('sel', S.sel === null);
    // girdiler
    syncForce(); syncProx(); syncIntent(); savedSl.set(S.dims.saved);
    // sonuç
    resEl.innerHTML = SCENARIOS.map((s) => {
      const a = S.ans[s.id];
      return `<li><span>${s.short}</span><span class="v">${a === undefined ? '—' : a ? 'evet' : 'hayır'}</span><span class="v bk">${band(s.book)}${s.id === 'dongu' ? ` (mantıken ~${pc(BOOK.loopLogical)})` : ''}</span></li>`;
    }).join('');
    const pf = profile(S.ans);
    const gap = S.ans.anahtar === true && S.ans.kopru === false ? ' Anahtara evet, itmeye hayır: kitaptaki ana örüntü, kişisel güç farkı.' : '';
    $('prof').textContent = pf === 'bekliyor'
      ? 'Beş senaryoyu da yanıtla. Kitapta deneklerin yaklaşık %30\'u tutarlı deontolog, %30\'u tutarlı faydacı; kalanlar senaryoya göre değişiyor.'
      : pf === 'faydaci' ? 'Beşine de evet: tutarlı faydacı örüntü. Kitapta deneklerin yaklaşık %30\'u böyle.' + gap
        : pf === 'deontolog' ? 'Beşine de hayır: tutarlı deontolog örüntü. Kitapta deneklerin yaklaşık %30\'u böyle.' + gap
          : 'Senaryoya göre değiştin; kitaptaki deneklerin kalanı da böyle.' + gap;
    $('gMe').setAttribute('aria-pressed', String(S.g === 'me'));
    $('gThem').setAttribute('aria-pressed', String(S.g === 'them'));
    $('gText').textContent = GREENE_TXT[S.g];
    // Knobe
    $('kHarm').setAttribute('aria-pressed', String(S.knobe === 'zarar'));
    $('kHelp').setAttribute('aria-pressed', String(S.knobe === 'yarar'));
    $('kText').textContent = KNOBE_TXT[S.knobe] + (S.knobe === 'zarar' ? ' Patron çevreye zarar vermeyi isteyerek mi yaptı?' : ' Patron çevreye yardım etmeyi isteyerek mi yaptı?');
    const kr = $('kRes');
    kr.hidden = S.kAns === null;
    if (S.kAns !== null) {
      const rate = S.knobe === 'zarar' ? BOOK.knobe.zarar : BOOK.knobe.yarar;
      kr.innerHTML = `<p>${S.kAns ? '"İsteyerek yaptı"' : '"İsteyerek yapmadı"'} dedin. Kitapta ${S.knobe === 'zarar' ? 'zarar' : 'yarar'} senaryosunda ${pc(rate)} "isteyerek" dedi.</p>` +
        `<div class="kb"><span>Zarar</span><div class="track" style="--c:var(--amy)"><b style="width:${BOOK.knobe.zarar * 100}%"></b></div><b>${pc(BOOK.knobe.zarar)}</b></div>` +
        `<div class="kb"><span>Yarar</span><div class="track" style="--c:var(--pfc)"><b style="width:${BOOK.knobe.yarar * 100}%"></b></div><b>${pc(BOOK.knobe.yarar)}</b></div>` +
        '<p>Aynı patron, aynı kayıtsızlık; niyet yargısı sonucun iyi ya da kötü olmasına göre kayıyor.</p>';
    }
  }
  const answer = (v: boolean) => { if (S.sel) { S.ans = { ...S.ans, [S.sel]: v }; dirty = true; } };
  scope.on($('yes'), 'click', () => answer(true));
  scope.on($('no'), 'click', () => answer(false));
  scope.on($('gMe'), 'click', () => { S.g = 'me'; dirty = true; });
  scope.on($('gThem'), 'click', () => { S.g = 'them'; dirty = true; });
  scope.on($('kHarm'), 'click', () => { S.knobe = 'zarar'; S.kAns = null; dirty = true; });
  scope.on($('kHelp'), 'click', () => { S.knobe = 'yarar'; S.kAns = null; dirty = true; });
  scope.on($('kYes'), 'click', () => { S.kAns = true; dirty = true; });
  scope.on($('kNo'), 'click', () => { S.kAns = false; dirty = true; });
  function barTrolley(): void {
    const sy = systems(S.dims);
    const word = (v: number) => (v < 0.9 ? 'düşük' : v < 1.8 ? 'orta' : 'yüksek');
    setBar(describeTrolley(S.dims), [
      { label: 'Evet olasılığı', text: pc(sy.pYes), frac: sy.pYes, color: 'var(--ink)' },
      { label: 'Soğuk çekim', text: word(sy.cold), frac: sy.cold / 3.6, color: 'var(--pfc)' },
      { label: 'Sıcak alarm', text: word(sy.hot), frac: sy.hot / 3.6, color: 'var(--amy)' },
    ]);
  }

  /* =====================================================================
     2 · Kamu malı ve ceza
     ===================================================================== */
  let runNone = simulate(S.seed, S.soc, false);
  let runPun = simulate(S.seed, S.soc, true);
  const resim = () => { runNone = simulate(S.seed, S.soc, false); runPun = simulate(S.seed, S.soc, true); dirty = true; };
  const play = () => { S.rev = reduced ? PG.rounds : 0; S.acc = 0; dirty = true; };
  const socItems = [{ k: 'yuksek', name: 'Yüksek sosyal sermaye ve hukuk' }, { k: 'orta', name: 'Orta' }, { k: 'dusuk', name: 'Düşük sosyal sermaye ve hukuk' }];
  const SOC: Record<string, Society> = { yuksek: PROFILES.yuksek, orta: { capital: 0.5, law: 0.5 }, dusuk: PROFILES.dusuk };
  const socKey = (): string | null => socItems.find((it) => SOC[it.k].capital === S.soc.capital && SOC[it.k].law === S.soc.law)?.k ?? null;
  const syncSoc = toggles($('socChips'), socItems, socKey, (k) => setSociety(SOC[k]));
  const syncPun = toggles($('punChips'), [{ k: 'on', name: 'Ceza aşaması açık' }, { k: 'off', name: 'Ceza aşaması kapalı' }], () => (S.pun ? 'on' : 'off'), (k) => { S.pun = k === 'on'; });
  let capSl: SliderHandle, lawSl: SliderHandle, roundSl: SliderHandle;
  function setSociety(s: Society): void { S.soc = { ...s }; capSl.set(Math.round(s.capital * 100)); lawSl.set(Math.round(s.law * 100)); resim(); play(); }
  capSl = makeSlider($('socSl'), { name: 'Sosyal sermaye', hint: 'İnsanlara ve kurumlara güven; düştükçe antisosyal ceza artar', min: 0, max: 100, step: 5, val: 85, fmt: (v) => `%${v}`, cb: (v) => { S.soc = { ...S.soc, capital: v / 100 }; resim(); play(); }, color: 'var(--pfc)' });
  lawSl = makeSlider($('socSl'), { name: 'Hukukun üstünlüğü', hint: 'Kurallar ve yaptırımlar ne kadar işler', min: 0, max: 100, step: 5, val: 85, fmt: (v) => `%${v}`, cb: (v) => { S.soc = { ...S.soc, law: v / 100 }; resim(); play(); }, color: 'var(--pfc)' });
  roundSl = makeSlider($('roundSl'), { name: 'Gösterilen tur', hint: 'Turları tek tek gez; oklar o turdaki cezayı gösterir', min: 1, max: PG.rounds, step: 1, val: PG.rounds, fmt: (v) => `${v} / ${PG.rounds}`, cb: (v) => { S.rev = v; S.acc = 0; dirty = true; } });
  scope.on($('replay'), 'click', play);
  scope.on($('reseed'), 'click', () => { S.seed++; resim(); play(); });

  // Grup sahnesi
  const gSvg = $<SVGElement>('groups');
  const defs = svg('defs', {}, gSvg);
  const mkMarker = (mid: string, cls: string) => {
    const m = svg('marker', { id: `${id}-${mid}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 8, markerHeight: 8, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
    svg('path', { d: 'M0,1 L10,5 L0,9 z', class: cls }, m);
  };
  mkMarker('mp', 'mk-pro'); mkMarker('ma', 'mk-anti');
  const POS = [[48, 36], [132, 36], [48, 108], [132, 108]];
  const cellXY = (g: number): [number, number] => [(g % 2) * 180, Math.floor(g / 2) * 152];
  const agentXY = (i: number): [number, number] => { const [cx, cy] = cellXY(Math.floor(i / PG.groupSize)); const p = POS[i % PG.groupSize]; return [cx + p[0], cy + p[1]]; };
  const R_A = 17;
  const edgeLayer = svg('g', {}, gSvg);
  const agentEls = Array.from({ length: N_AGENTS }, (_, i) => {
    const [x, y] = agentXY(i);
    const g = svg('g', { transform: `translate(${x},${y})` }, gSvg);
    const ring = svg('circle', { class: 'a-ring', r: R_A }, g);
    const dia = svg('path', { class: 'a-dia', d: `M0,${-R_A - 3} L${R_A + 3},0 L0,${R_A + 3} L${-R_A - 3},0 z` }, g);
    const dot = svg('circle', { class: 'a-dot', r: 2 }, g);
    const t = svgText(g, { class: 'a-t', x: 0, y: R_A + 13, 'text-anchor': 'middle' }, '');
    return { ring, dia, dot, t };
  });
  for (let g = 0; g < PG.groups; g++) {
    const [cx, cy] = cellXY(g);
    svgText(gSvg, { class: 'ax', x: cx + 90, y: cy + 150 - 6, 'text-anchor': 'middle' }, `Grup ${g + 1}`);
  }
  function drawGroups(): void {
    const run = S.pun ? runPun : runNone;
    const r = run.rounds[Math.max(1, S.rev) - 1];
    run.agents.forEach((a, i) => {
      const e = agentEls[i];
      e.ring.setAttribute('class', 'a-ring' + (a.anti ? ' hide' : ''));
      e.dia.setAttribute('class', 'a-dia' + (a.anti ? '' : ' hide'));
      e.dot.setAttribute('r', (2 + 10 * Math.sqrt(r.c[i] / PG.E)).toFixed(1));
      e.dot.setAttribute('class', 'a-dot' + (a.anti ? ' anti' : ''));
      e.t.textContent = String(r.c[i]);
    });
    edgeLayer.replaceChildren();
    for (const p of r.pun) {
      const [x1, y1] = agentXY(p.from), [x2, y2] = agentXY(p.to);
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      const off = 5, ox = -uy * off, oy = ux * off;
      const a = R_A + 5, b = R_A + 7;
      svg('path', {
        class: 'ar' + (p.anti ? ' anti' : ''), 'stroke-width': (1.2 + p.pts * 0.4).toFixed(1),
        d: `M${(x1 + ux * a + ox).toFixed(1)},${(y1 + uy * a + oy).toFixed(1)} L${(x2 - ux * b + ox).toFixed(1)},${(y2 - uy * b + oy).toFixed(1)}`,
        'marker-end': `url(#${id}-${p.anti ? 'ma' : 'mp'})`,
      }, edgeLayer);
    }
    gSvg.setAttribute('aria-label', `${Math.max(1, S.rev)}. tur, ${S.pun ? 'ceza aşaması açık' : 'ceza aşaması kapalı'}: oyuncuların katkıları ortalama ${f1(avgContribution(r))}, ceza oku ${r.pun.length}`);
  }

  // Zaman grafikleri
  const C1 = { x0: 34, x1: 346, top: 12, bot: 148 };
  const c1 = $<SVGElement>('chart1');
  const rx = (t: number, c = C1): number => c.x0 + ((c.x1 - c.x0) * (t - 1)) / (PG.rounds - 1);
  const c1y = (v: number): number => C1.bot - ((C1.bot - C1.top) * v) / PG.E;
  yGrid(c1, C1.x0, C1.x1, c1y, [0, 10, 20], String);
  for (let t = 1; t <= PG.rounds; t += t === 1 ? 2 : 2) svgText(c1, { class: 'ax', x: rx(t), y: C1.bot + 14, 'text-anchor': 'middle' }, String(t));
  svgText(c1, { class: 'ax', x: (C1.x0 + C1.x1) / 2, y: C1.bot + 28, 'text-anchor': 'middle' }, 'tur');
  const lnNone = svg('polyline', { class: 'ln none', points: '' }, c1), lnPun = svg('polyline', { class: 'ln pun', points: '' }, c1);
  const lbNone = svgText(c1, { class: 'lb', x: 0, y: 0 }, 'cezasız'), lbPun = svgText(c1, { class: 'lb', x: 0, y: 0 }, 'cezalı');
  const mkPts = (rs: Round[], upTo: number): string => rs.slice(0, upTo).map((r, i) => `${rx(i + 1).toFixed(1)},${c1y(avgContribution(r)).toFixed(1)}`).join(' ');

  const C2 = { x0: 34, x1: 346, top: 20, bot: 112 };
  const c2 = $<SVGElement>('chart2');
  const c2Grid = svg('g', {}, c2), c2Bars = svg('g', {}, c2);
  for (let t = 1; t <= PG.rounds; t += 2) svgText(c2, { class: 'ax', x: rx(t, C2), y: C2.bot + 14, 'text-anchor': 'middle' }, String(t));
  svgText(c2, { class: 'ax', x: (C2.x0 + C2.x1) / 2, y: C2.bot + 28, 'text-anchor': 'middle' }, 'tur');
  const c2Leg = svgText(c2, { class: 'ax', x: C2.x0, y: 9 }, '');
  function drawCharts(): void {
    const n = Math.max(S.rev, 0);
    lnNone.setAttribute('points', mkPts(runNone.rounds, n)); lnPun.setAttribute('points', mkPts(runPun.rounds, n));
    lnNone.setAttribute('class', 'ln none' + (S.pun ? '' : ' act')); lnPun.setAttribute('class', 'ln pun' + (S.pun ? ' act' : ''));
    const last = Math.max(1, n);
    const yN = c1y(avgContribution(runNone.rounds[last - 1])), yP = c1y(avgContribution(runPun.rounds[last - 1]));
    const punUp = yP <= yN;
    for (const [el, y, up] of [[lbNone, yN, !punUp], [lbPun, yP, punUp]] as const) { el.setAttribute('x', String(C1.x1)); el.setAttribute('text-anchor', 'end'); el.setAttribute('y', String(up ? y - 6 : y + 14)); }
    lbNone.setAttribute('opacity', n ? '1' : '0'); lbPun.setAttribute('opacity', n ? '1' : '0');
    const mx = Math.max(20, ...runPun.rounds.map((r) => r.proSpend + r.antiSpend));
    const top = Math.ceil(mx / 20) * 20;
    c2Grid.replaceChildren(); c2Bars.replaceChildren();
    yGrid(c2Grid, C2.x0, C2.x1, (v) => C2.bot - ((C2.bot - C2.top) * v) / top, [0, top / 2, top], String);
    const bw = 18;
    runPun.rounds.slice(0, n).forEach((r, i) => {
      const x = rx(i + 1, C2) - bw / 2, h1 = ((C2.bot - C2.top) * r.proSpend) / top, h2 = ((C2.bot - C2.top) * r.antiSpend) / top;
      svg('rect', { class: 'b-pro', x, y: C2.bot - h1, width: bw, height: h1 }, c2Bars);
      svg('rect', { class: 'b-anti', x, y: C2.bot - h1 - h2, width: bw, height: h2 }, c2Bars);
    });
    c2Leg.textContent = 'mavi bedava binene, kırmızı işbirlikçiye';
  }

  // Henrich
  const mkItems = [{ k: 'hadza', name: 'Hadza benzeri' }, { k: 'big', name: 'Büyük, pazara bağlı' }];
  const MK: Record<string, Market> = { hadza: HADZA, big: BIG_MARKET };
  const mkKey = (): string | null => mkItems.find((it) => { const m = MK[it.k]; return m.market === S.mk.market && m.size === S.mk.size && m.religion === S.mk.religion; })?.k ?? null;
  const syncMk = toggles($('mkChips'), mkItems, mkKey, (k) => setMarket(MK[k]));
  const sizeOf = (t: number): number => Math.round(Math.pow(10, 1 + 3 * t));
  const tOf = (size: number): number => (Math.log10(size) - 1) / 3;
  let mSl: SliderHandle, zSl: SliderHandle, rSl: SliderHandle;
  const fmtSize = (t: number): string => { const s = sizeOf(t); return s >= 1000 ? `~${(Math.round(s / 100) / 10).toString().replace('.', ',')} bin kişi` : `~${s} kişi`; };
  function setMarket(m: Market): void {
    S.mk = { ...m };
    mSl.set(Math.round(m.market * 100)); zSl.set(Math.round(tOf(m.size) * 100) / 100); rSl.set(Math.round(m.religion * 100)); dirty = true;
  }
  const mkSlH = $('mkSl');
  mSl = makeSlider(mkSlH, { name: 'Pazar entegrasyonu', hint: 'Kalorinin ne kadarı satın alınıyor (kitapta 0 ile ~%90 arası)', min: 0, max: 90, step: 5, val: 0, fmt: (v) => `%${v}`, cb: (v) => { S.mk = { ...S.mk, market: v / 100 }; dirty = true; }, color: 'var(--dop)' });
  zSl = makeSlider(mkSlH, { name: 'Topluluk büyüklüğü', hint: 'Kitapta 50 kişiden küçük gruplar ile 5000+ kişilik topluluklar karşılaştırılır', min: 0, max: 1, step: 0.01, val: tOf(40), fmt: fmtSize, cb: (v) => { S.mk = { ...S.mk, size: sizeOf(v) }; dirty = true; }, color: 'var(--dop)' });
  rSl = makeSlider(mkSlH, { name: 'Dünya dinine mensup oranı', hint: 'Arttıkça üçüncü taraf cezası artar (kitapta; her ölçümde tutarlı değil)', min: 0, max: 100, step: 5, val: 0, fmt: (v) => `%${v}`, cb: (v) => { S.mk = { ...S.mk, religion: v / 100 }; dirty = true; }, color: 'var(--dop)' });
  makeSlider(mkSlH, { name: 'Senin teklifin', hint: 'Karşıya önerdiğin pay; eğri reddedilme olasılığını gösterir', min: 0, max: 50, step: 1, val: 30, fmt: (v) => `%${v}`, cb: (v) => { S.offer = v / 100; dirty = true; }, color: 'var(--ink)' });

  const C3 = { x0: 34, x1: 346, top: 12, bot: 148 };
  const c3 = $<SVGElement>('chart3');
  const ox = (o: number): number => C3.x0 + ((C3.x1 - C3.x0) * o) / 0.5;
  const oy = (p: number): number => C3.bot - (C3.bot - C3.top) * p;
  yGrid(c3, C3.x0, C3.x1, oy, [0, 0.5, 1], pc);
  for (const v of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) svgText(c3, { class: 'ax', x: ox(v), y: C3.bot + 14, 'text-anchor': v === 0 ? 'start' : v === 0.5 ? 'end' : 'middle' }, pc(v));
  svgText(c3, { class: 'ax', x: (C3.x0 + C3.x1) / 2, y: C3.bot + 28, 'text-anchor': 'middle' }, 'karşıya önerilen pay');
  const curve = (m: Market): string => Array.from({ length: 51 }, (_, i) => { const o = i / 100; return `${ox(o).toFixed(1)},${oy(pReject(o, m)).toFixed(1)}`; }).join(' ');
  svg('polyline', { class: 'ln ref1', points: curve(HADZA) }, c3);
  svg('polyline', { class: 'ln ref2', points: curve(BIG_MARKET) }, c3);
  const lnCur = svg('polyline', { class: 'ln cur', points: '' }, c3);
  const offLine = svg('line', { class: 'offline', y1: C3.top, y2: C3.bot }, c3);
  const offDot = svg('circle', { class: 'cur-dot', r: 4.5 }, c3);
  const lgY = 198;
  svg('line', { class: 'ln ref1', x1: C3.x0, x2: C3.x0 + 18, y1: lgY - 4, y2: lgY - 4 }, c3); svgText(c3, { class: 'ax lgt', x: C3.x0 + 23, y: lgY }, 'Hadza benzeri');
  svg('line', { class: 'ln ref2', x1: C3.x0 + 104, x2: C3.x0 + 122, y1: lgY - 4, y2: lgY - 4 }, c3); svgText(c3, { class: 'ax lgt', x: C3.x0 + 127, y: lgY }, 'büyük, pazara bağlı');
  svg('line', { class: 'ln cur', x1: C3.x0 + 232, x2: C3.x0 + 250, y1: lgY - 4, y2: lgY - 4 }, c3); svgText(c3, { class: 'ax lgt', x: C3.x0 + 255, y: lgY }, 'seçili');
  function drawMarket(): void {
    lnCur.setAttribute('points', curve(S.mk));
    offLine.setAttribute('x1', String(ox(S.offer))); offLine.setAttribute('x2', String(ox(S.offer)));
    offDot.setAttribute('cx', String(ox(S.offer))); offDot.setAttribute('cy', String(oy(pReject(S.offer, S.mk))));
    $('mkRead').innerHTML = tiles([['Diktatör: karşıya verilen', pc(dictatorOffer(S.mk))], ['Bu payın altı reddedilir', pc(rejectThreshold(S.mk))],
      ['Senin teklifin reddedilir', pc(pReject(S.offer, S.mk))], ['En kârlı teklif', pc(bestOffer(S.mk))]]);
    syncMk();
  }
  function barPG(): void {
    const run = S.pun ? runPun : runNone;
    const n = Math.max(1, S.rev);
    const r = run.rounds[n - 1];
    setBar(S.pun ? describePG(runNone, runPun, n, S.soc) : `${n}. tur, ceza aşaması kapalı: ortalama katkı ${Math.round(avgContribution(r))}/${PG.E}. Bedava binenler cezasız kalınca katkılar erir.`, [
      { label: 'Ortalama katkı', text: `${Math.round(avgContribution(r))}/${PG.E}`, frac: avgContribution(r) / PG.E, color: 'var(--pfc)' },
      { label: 'Antisosyal ceza', text: S.pun ? pc(antiFraction(runPun, n)) : '—', frac: S.pun ? antiFraction(runPun, n) : 0, color: 'var(--amy)' },
      { label: 'Ort. kazanç', text: f1(avgPay(r)), frac: avgPay(r) / 32, color: 'var(--ink)' },
    ]);
  }

  /* =====================================================================
     3 · Zar ve dürüstlük
     ===================================================================== */
  const mixKey = (): string | null => MIXES.find((m) => Math.abs(m.mix.justified - S.mix.justified) < 1e-9 && Math.abs(m.mix.liar - S.mix.liar) < 1e-9)?.id ?? null;
  const syncMix = toggles($('mixChips'), MIXES.map((m) => ({ k: m.id, name: m.name })), mixKey, (k) => setMix(MIXES.find((m) => m.id === k)!.mix));
  let jSl: SliderHandle, lSl: SliderHandle;
  function setMix(m: Mix): void { S.mix = { ...m }; jSl.set(Math.round(m.justified * 100)); lSl.set(Math.round(m.liar * 100)); dirty = true; }
  jSl = makeSlider($('mixSl'), { name: 'Haklı dürüstlük', hint: 'İki atıştan daha çok kazandıranı bildirenler', min: 0, max: 100, step: 5, val: 65, fmt: (v) => `%${v}`, cb: (v) => { S.mix = normMix({ ...S.mix, justified: v / 100 }); lSl.set(Math.round(S.mix.liar * 100)); dirty = true; }, color: 'var(--dop)' });
  lSl = makeSlider($('mixSl'), { name: 'Tam yalan', hint: 'Atışa bakmadan hep 5 bildirenler. Kalanlar dürüst', min: 0, max: 100, step: 1, val: 5, fmt: (v) => `%${v}`, cb: (v) => { S.mix = normMix({ ...S.mix, liar: v / 100 }); dirty = true; }, color: 'var(--amy)' });
  scope.on($('rerun'), 'click', () => { S.dseed++; dirty = true; });
  const N_DICE = 300;
  const H = { x0: 34, x1: 346, top: 18, bot: 172 };
  const hist = $<SVGElement>('hist');
  const hGrid = svg('g', {}, hist), hBars = svg('g', {}, hist);
  const hx = (f: number): number => H.x0 + ((H.x1 - H.x0) * (f - 0.5)) / 6;
  const hFlat = svg('line', { class: 'flat', x1: H.x0, x2: H.x1 }, hist);
  const hExp = svg('g', {}, hist);
  FACES.forEach((f) => {
    svgText(hist, { class: 'ax', x: hx(f), y: H.bot + 14, 'text-anchor': 'middle' }, String(f));
    svgText(hist, { class: 'ax', x: hx(f), y: H.bot + 27, 'text-anchor': 'middle' }, `ödeme ${payOf(f)}`);
  });
  const DICE_CLS = ['d0', 'd1', 'd2'];
  function drawHist(): void {
    const m = normMix(S.mix);
    const bt = sampleByType(S.dseed, N_DICE, m);
    const tot = FACES.map((_, i) => bt[0][i] + bt[1][i] + bt[2][i]);
    const exp = expectedDist(m);
    const ymax = [0.3, 0.6, 1].find((v) => v >= Math.max(...tot.map((x) => x / N_DICE), ...exp)) ?? 1;
    const y = (p: number) => H.bot - ((H.bot - H.top) * p) / ymax;
    hGrid.replaceChildren(); hBars.replaceChildren(); hExp.replaceChildren();
    yGrid(hGrid, H.x0, H.x1, y, [0, ymax / 2, ymax], pc);
    hFlat.setAttribute('y1', String(y(1 / 6))); hFlat.setAttribute('y2', String(y(1 / 6)));
    const bw = 32;
    FACES.forEach((f, i) => {
      let acc = 0;
      for (let t = 0; t < 3; t++) {
        const p = bt[t][i] / N_DICE;
        if (p <= 0) continue;
        svg('rect', { class: `hb ${DICE_CLS[t]}`, x: hx(f) - bw / 2, y: y(acc + p), width: bw, height: y(acc) - y(acc + p) }, hBars);
        acc += p;
      }
      svgText(hBars, { class: 'hv', x: hx(f), y: y(acc) - 4, 'text-anchor': 'middle' }, `%${Math.round(acc * 100)}`);
      svg('line', { class: 'expt', x1: hx(f) - bw / 2 - 3, x2: hx(f) + bw / 2 + 3, y1: y(exp[i]), y2: y(exp[i]) }, hExp);
    });
    const e = expectedDist(m);
    $('diceRead').innerHTML = tiles([['Beklenen ödeme', expectedPay(e).toFixed(2).replace('.', ',')], ['Dürüstken', '2,50'],
      ['Düz dağılımdan sapma', pc(deviation(e))], ['Dürüst oyuncu payı', pc(honestShare(m))]]);
      `<div class="ro"><span>Dürüst oyuncu payı</span><b>${pc(honestShare(m))}</b></div>`;
    hist.setAttribute('aria-label', `Bildirilen sayılar: ${FACES.map((f, i) => `${f} için %${Math.round((tot[i] / N_DICE) * 100)}`).join(', ')}`);
    syncMix();
  }
  const diceEl = $('dice');
  function drawRoll(): void {
    const rr = $('rollRes');
    if (!S.roll) { diceEl.innerHTML = '<p class="note">Zarları at: ilk atış ödüllendirilir, ikincisi zarın düzgün olduğunu sınamak içindir.</p>'; rr.innerHTML = ''; return; }
    const [a, b] = S.roll, best = bestOf(a, b);
    diceEl.innerHTML = `<div class="die" role="img" aria-label="İlk atış: ${a}"><small>İlk atış</small><b>${a}</b></div><div class="die" role="img" aria-label="İkinci atış: ${b}"><small>İkinci atış</small><b>${b}</b></div>`;
    rr.innerHTML =
      `<li><span>Dürüst</span><span class="v">${a} bildirir</span><span class="v bk">ödeme ${payOf(a)}</span></li>` +
      `<li><span>Haklı dürüstlük</span><span class="v">${best} bildirir</span><span class="v bk">ödeme ${payOf(best)}</span></li>` +
      `<li><span>Tam yalan</span><span class="v">5 bildirir</span><span class="v bk">ödeme 5</span></li>`;
  }
  scope.on($('roll'), 'click', () => {
    const r = mulberry32(S.rollSeed++ * 97 + 11);
    S.roll = [1 + Math.floor(r() * 6), 1 + Math.floor(r() * 6)];
    drawRoll();
    announce();
  });
  function barDice(): void {
    const m = normMix(S.mix), e = expectedDist(m);
    setBar(describeDice(m), [
      { label: 'Beklenen ödeme', text: expectedPay(e).toFixed(2).replace('.', ','), frac: expectedPay(e) / 5, color: 'var(--ink)' },
      { label: 'Düz dağılımdan sapma', text: pc(deviation(e)), frac: deviation(e), color: 'var(--dop)' },
      { label: '5 bildirenler', text: pc(e[4]), frac: e[4], color: 'var(--amy)' },
    ]);
  }

  /* ---------- Rehberli turlar ---------- */
  const tour1 = createTour(scope, [
    { title: 'Anahtar: hesap kazanır', text: 'Tramvay beş kişiye gidiyor; anahtar tek kişiye çeviriyor. Kitapta çevirenler %60-70.',
      look: 'Mavi çubuk kırmızıdan uzun, "evet" ~%67.', apply: () => selectScenario('anahtar') },
    { title: 'Köprüden itme: sezgi kazanır', text: 'Aynı 5\'e karşı 1, ama kişiyi elinle itmek gerekiyor. Kişisel güçle araç yapmak sıcak sistemi çalıştırıyor; kitapta onay ~%30.',
      look: 'Kırmızı çubuk maviyi geçiyor, "evet" ~%30.', apply: () => selectScenario('kopru') },
    { title: 'Sopa mesafeyi açmıyor', text: 'Sopayla itmek temas mesafesini artırır ama kişisel gücü kaldırmaz. Kitapta direnç azalmadı.',
      look: 'Kırmızı çubuk hâlâ uzun, model ~%34.', apply: () => selectScenario('sopa') },
    { title: 'Döngü: sezgi niyeti görmüyor', text: 'Kişinin ölümü araç, ama anahtarla yapılıyor. Mantıken itmeyle aynı (~%30) olmalı; kitapta %60-70 kaldı.',
      look: 'İçi boş baklava (tutarlı kural) ile dolu nokta arasındaki boşluk.', apply: () => selectScenario('dongu') },
    { title: 'Sayı hesabı büyütür', text: 'Köprüde kurtarılan sayısı artınca soğuk çekim büyür, sıcak alarm aynı kalır. Eğri modelin varsayımı; kitapta yalnızca 5\'e karşı 1 var.',
      look: 'Mavi çubuk uzar, "evet" yükselir.', apply: () => selectScenario('kopru', 30) },
    { title: 'Ne zaman sezgi, ne zaman akıl?', text: 'Greene: hızlı sezgi "Ben mi, Biz mi" sorunlarında iyi işler; "Biz mi, Onlar mı" çatışmasında yavaş akıl gerekir.',
      look: 'Sonuç kartındaki iki düğme.', apply: () => { selectScenario('anahtar'); S.g = 'them'; } },
  ]);
  $('tour1').appendChild(tour1.el);

  const tour2 = createTour(scope, [
    { title: 'Cezasız: katkılar erir', text: 'Başta herkes havuza koyar; bedava binen kazanır, koşullu işbirlikçiler ona uyar ve katkılar düşer.',
      look: 'Kesikli "cezasız" çizgi iniyor.', apply: () => { S.pun = false; setSociety(PROFILES.yuksek); } },
    { title: 'Yüksek sosyal sermaye: ceza işler', text: 'Düşük katkı verenler cezalanıp katkılarını artırıyor. Kitapta ABD ve Avustralya\'da antisosyal ceza neredeyse yoktu.',
      look: 'Mavi çizgi yükseliyor, ceza çubukları mavi.', apply: () => { S.pun = true; setSociety(PROFILES.yuksek); } },
    { title: 'Düşük sosyal sermaye: ceza geri teper', text: 'Elmas simgeli oyuncular kendilerinden fazla verenleri cezalandırıyor. Kitapta Umman ve Yunanistan\'da cömertliği cezalandırmak bencilliği cezalandırmaktan fazla paraya mal oldu.',
      look: 'Kırmızı kesikli oklar ve çubuklar; katkı geriliyor.', apply: () => { S.pun = true; setSociety(PROFILES.dusuk); } },
    { title: 'Adalet evrensel değil: Hadza', text: 'Pazarı olmayan küçük bir topluluk: Diktatör Oyunu\'nda ortalama %27 veriliyor, sıfırın üstündeki hemen her teklif kabul.',
      look: 'Reddetme eğrisi sol dipte.', apply: () => setMarket(HADZA) },
    { title: 'Pazar ve büyük topluluk', text: 'Pazar ~%90 ve topluluk 5000+ kişi olunca teklifler 50:50\'ye yaklaşıyor, adaletsiz teklifler reddediliyor.',
      look: 'Eğri sağa kayıyor, en kârlı teklif yükseliyor.', apply: () => setMarket(BIG_MARKET) },
  ]);
  $('tour2').appendChild(tour2.el);

  const tour3 = createTour(scope, [
    { title: 'Herkes dürüstse', text: 'İlk atış bildirilirse her sayı altıda bir çıkar; sütunlar düz çizgiye yakın, örneklem küçük olduğu için biraz dalgalanır.',
      look: 'Sütunlar kesikli %17 çizgisinin etrafında.', apply: () => setMix(MIXES[0].mix) },
    { title: 'Haklı dürüstlük', text: 'Herkes iki atıştan daha çok kazandıranı bildirirse 5 payı 11/36, 6 payı 1/36 olur. Kimse yalan söylemiyor sayılır; kendini aklıyor.',
      look: 'Sütunlar soldan sağa yükseliyor, 6 neredeyse yok.', apply: () => setMix({ justified: 1, liar: 0 }) },
    { title: 'Düşük ve yüksek ihlalli toplum', text: 'Kitapta kural ihlali arttıkça yalan arttı. Hazır karışımlar yalnızca bu yönü gösterir; oranlar varsayım.',
      look: 'Yüksek ihlalde beklenen ödeme belirgin yüksek.', apply: () => setMix(MIXES[2].mix) },
    { title: 'Tam yalan nadir', text: 'Kitapta hiçbir kültürde en çok kazandıran sayı sık uydurulmadı; çoğu iki atıştan yükseğini bildirdi.',
      look: 'Kırmızı pay küçük; tam yalan %100 olunca tek sütun.', apply: () => setMix({ justified: 0.65, liar: 0.05 }) },
  ]);
  $('tour3').appendChild(tour3.el);

  /* ---------- Başlangıç ---------- */
  S.rev = PG.rounds;
  roundSl.set(S.rev);
  drawRoll();
  const poke = scope.announcer($('live'), () => lastSay);
  const onAction = () => { if (dirty) { dirty = false; render(); } poke(); };
  function announce(): void { poke(); }
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);

  let last = performance.now();
  function render(): void {
    if (S.tab === 'tro') { drawTrolley(); barTrolley(); }
    else if (S.tab === 'pg') { drawGroups(); drawCharts(); drawMarket(); syncSoc(); syncPun(); roundSl.set(Math.max(1, S.rev)); barPG(); }
    else { drawHist(); barDice(); }
  }
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (S.tab === 'pg' && S.rev < PG.rounds) {
      S.acc += dt;
      if (S.acc >= 0.55) { S.acc = 0; S.rev++; dirty = true; }
    }
    if (dirty) { dirty = false; render(); }
  }
  render();
  // Sayfa altı notları (nasıl çalışıyor + Kitapta) ayrı parçadan gelir; etkileşimli kısım daha küçük açılır.
  lazyNotes(scope, root, () => import('./notes').then((m) => m.NOTES));
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
