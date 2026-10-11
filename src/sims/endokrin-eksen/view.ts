import '../sim.css';
import './view.css';
import { Scope, hideBarWhenAway, pct, ref, svg, svgText, uid } from '../kit';
import {
  U0, hormAt, msOfLog, MS, neuroAt, organ, receptor, settleAxis, stepAxis, describeAxis,
  type AxisInputs, type AxisKey, type AxisState, type ReceptorParams,
} from './model';

type Tab = 'axis' | 'rec' | 'time';

interface StageDef { t: string; h: string; c: string }
interface StructDef { chip: string; stages: StageDef[]; note: string; drive?: [string, string]; pulse: string; series: string[] }

const STRUCT: Record<AxisKey, StructDef> = {
  hpa: {
    chip: 'Stres (HPA)',
    stages: [
      { t: 'Hipotalamus', h: 'CRH (kortikotropin salgılatıcı hormon)', c: '--hyp' },
      { t: 'Hipofiz', h: 'ACTH (adrenokortikotropik hormon)', c: '--pit' },
      { t: 'Böbreküstü bezi', h: 'Glukokortikoid (insanda kortizol)', c: '--gld' },
    ],
    note: 'Stres sırasında hipotalamustaki nöronlar CRH salgılar. CRH hipofiz hücrelerinin ACTH salgılamasına, ACTH da böbreküstü bezlerinin glukokortikoid salgılamasına yol açar. Tek bir sinyal üç basamakta ilerleyip kana karışır ve her yere ulaşır.',
    drive: ['Stres düzeyi', 'Hipotalamustaki CRH nöronlarını uyaran stres'],
    pulse: 'Stres darbesi (30 dk)',
    series: ['CRH', 'ACTH', 'Kortizol'],
  },
  hpg: {
    chip: 'Üreme (HPG)',
    stages: [
      { t: 'Hipotalamus', h: 'GnRH (gonadotropin salgılayan hormon)', c: '--hyp' },
      { t: 'Hipofiz', h: 'LH (luteinizan hormon)', c: '--pit' },
      { t: 'Yumurtalık', h: 'Östrojen', c: '--gld' },
    ],
    note: 'Kitaptaki ikinci örnek: hipotalamus GnRH salgılar, hipofiz LH salgılar, en sonunda yumurtalıklar östrojen salgılar. Aynı üç basamaklı yapı, farklı hormonlarla. (Gerçek döngü dalgalıdır; burada yalnızca yapıyı gösteriyorum.)',
    drive: ['Hipotalamik sürücü', 'GnRH nöronlarına gelen uyarı'],
    pulse: 'Sinyal darbesi (30 dk)',
    series: ['GnRH', 'LH', 'Östrojen'],
  },
  two: {
    chip: 'İki aşamalı',
    stages: [
      { t: 'Hipotalamus', h: 'Hipotalamik hormon', c: '--hyp' },
      { t: 'Hipofiz', h: 'Hipofiz hormonu (örn. büyüme hormonu)', c: '--pit' },
    ],
    note: 'Bazı eksenler iki aşamalıdır: hipotalamus hipofizi yönlendirir ve hipofiz hormonu etkisini doğrudan bütün vücuda yayar. Mesela büyüme hormonu genelde bu yolu izler. Üçüncü bir bez yoktur.',
    drive: ['Hipotalamik sürücü', 'Hipofizi yönlendiren hipotalamik sinyal'],
    pulse: 'Sinyal darbesi (30 dk)',
    series: ['Hipotalamik hormon', 'Hipofiz hormonu'],
  },
  glu: {
    chip: 'Pankreas',
    stages: [
      { t: 'Kandaki glikoz', h: 'Ana düzenleyici (dolaşımdaki glikoz)', c: '--red' },
      { t: 'Pankreas', h: 'İnsülin', c: '--gld' },
    ],
    note: 'Her sistemde düzenleyici beyin değildir. Pankreas ve onun salgıladığı insülinde ana düzenleyici dolaşımdaki glikoz düzeyidir. Beyin yalnızca belli bir beze projeksiyon göndererek salgılanmasına yardımcı olur.',
    pulse: 'Yemek ye (30 dk)',
    series: ['Glikoz', 'İnsülin'],
  },
};
const FOOT: Record<AxisKey, string> = {
  hpa: 'Ek 2 ayrıca şunu söyler: tek bir hipotalamik hormon her zaman tek başına yönetmez. CRH\'nin yanında ACTH\'yi hem uyaran hem engelleyen başka hipotalamik hormonlar vardır ve farklı stres kaynakları farklı kombinasyonlar üretir. "Diğer hipotalamik hormonlar" kaydırıcısı bunu temsil eder. Geri bildirim bu sayfalarda anlatılmıyor; modeli gerçekçi yapmak için ekledim.',
  hpg: 'Geri bildirim bu sayfalarda anlatılmıyor; modeli gerçekçi yapmak için ekledim. Sayılar ölçüm değil, sembolik.',
  two: 'Geri bildirim bu sayfalarda anlatılmıyor; modeli gerçekçi yapmak için ekledim. Sayılar ölçüm değil, sembolik.',
  glu: 'Kitap ayrıca kalp ya da bağırsak gibi beklenmedik yerlerden salgılanan tuhaf hormonlardan söz eder; beyin bunların salgılanmasını dolaylı yollarla düzenler. Bunlar modele dahil değil.',
};

const RPRE: { n: string; v: ReceptorParams }[] = [
  { n: 'Normal', v: { hormone: 0.5, number: 0.6, affinity: 0.5, specificity: 1, other: 0 } },
  { n: 'Reseptör mutasyonu', v: { hormone: 0.9, number: 0, affinity: 0.5, specificity: 1, other: 0 } },
  { n: 'Çok reseptör, az hormon', v: { hormone: 0.15, number: 1, affinity: 0.9, specificity: 1, other: 0 } },
  { n: 'Az reseptör, çok hormon', v: { hormone: 0.95, number: 0.15, affinity: 0.5, specificity: 1, other: 0 } },
  { n: 'Titiz olmayan reseptör', v: { hormone: 0.4, number: 0.6, affinity: 0.5, specificity: 0.15, other: 0.8 } },
];
const RC_DEFS: [keyof ReceptorParams, string, string, string][] = [
  ['hormone', 'Östrojen düzeyi', 'Konuşma sesi: kandaki hormon miktarı.', 'var(--hyp)'],
  ['number', 'Reseptör sayısı', 'Kulak: hücre yüzeyindeki reseptör sayısı.', 'var(--eff)'],
  ['affinity', 'Bağlanma isteği', 'Bağlanma alanının şekli: yüksekse az hormon yeter.', 'var(--eff)'],
  ['specificity', 'Reseptör titizliği', 'Düşükse benzer bir steroid hormon da kilide girebilir.', 'var(--gld)'],
  ['other', 'Benzer hormon (testosteron)', 'Yapısal olarak benzer, farklı bir steroid hormon.', 'var(--red)'],
];

const TEMPLATE = (id: string) => `
<div class="sim sim-endo">
  <p class="lede">Hormonların sinyal zincirini, reseptörün rolünü ve etkinin ne kadar sürdüğünü canlı simüle eden model. Kaydırıcılarla oyna.</p>

  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    <button class="tab" role="tab" id="${id}-tab-axis" data-pane="axis" aria-controls="${id}-pane-axis" aria-selected="true" type="button">Eksen</button>
    <button class="tab" role="tab" id="${id}-tab-rec" data-pane="rec" aria-controls="${id}-pane-rec" aria-selected="false" tabindex="-1" type="button">Reseptör</button>
    <button class="tab" role="tab" id="${id}-tab-time" data-pane="time" aria-controls="${id}-pane-time" aria-selected="false" tabindex="-1" type="button">Süre</button>
  </div>

  <section class="pane" role="tabpanel" id="${id}-pane-axis" data-pane="axis" aria-labelledby="${id}-tab-axis">
    <div class="chips" data-ref="axChips" role="group" aria-label="Eksen yapısı"></div>
    <p class="note" data-ref="axNote"></p>
    <div class="stage"><svg data-ref="axSvg" role="group" aria-label="Hormon ekseni diyagramı"></svg></div>
    <div class="row">
      <button class="btn" data-ref="axPulse" type="button"></button>
      <button class="btn" data-ref="axFb" type="button" aria-pressed="true">Geri bildirim: açık</button>
      <button class="btn" data-ref="axPause" type="button" aria-pressed="false">Duraklat</button>
      <button class="btn" data-ref="axSpeed" type="button">Hız ×1</button>
      <button class="btn" data-ref="axReset" type="button">Sıfırla</button>
    </div>
    <section class="chart" aria-label="Zaman grafiği">
      <h3 class="sim-h">Son 6 saat</h3>
      <svg data-ref="axChart" viewBox="0 0 360 160" role="img" aria-label="Eksenin basamaklarının ve hedef hücre yanıtının zaman içindeki değişimi"></svg>
    </section>
    <section aria-label="Eksen girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="axSliders"></div></section>
    <p class="foot" data-ref="axFoot"></p>
  </section>

  <section class="pane" role="tabpanel" id="${id}-pane-rec" data-pane="rec" aria-labelledby="${id}-tab-rec" hidden>
    <p class="note">Hormon kilide anahtar gibi girer. Her hormonun kendi reseptörü vardır; reseptörün sayısı, bağlanma isteği ve titizliği hücrenin yanıtını belirler. Kitaptaki benzetmeyle: hormon düzeyi konuşma sesi, reseptör düzeyi kulağın duyma keskinliğidir.</p>
    <div class="chips" data-ref="rcChips" role="group" aria-label="Hazır durumlar"></div>
    <div class="stage"><svg data-ref="rcSvg" viewBox="0 0 360 250" role="img" aria-label="Reseptörlü bir hücre; bağlanan hormonlar renkli noktalarla gösterilir"></svg>
      <div class="legend">
        <span><i style="background:var(--hyp)"></i>Östrojen (asıl hormon)</span>
        <span><i style="background:var(--red)"></i>Testosteron (benzer hormon)</span>
      </div>
    </div>
    <div class="meters card" data-ref="rcMeters"></div>
    <section aria-label="Reseptör girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="rcSliders"></div></section>
    <p class="foot">Kitapta örnekler: tiroit hormonu reseptörleri iribaşın yalnızca kuyruk hücrelerinde bulunur; kuyruk kurbağaya dönüşürken kaybolur. Bazı meme kanserleri "ER pozitif"tir: hücrelerinde östrojen reseptörü vardır ve hormonun büyümeyi destekleyen etkisine açıktır. Reseptördeki bir mutasyon yüzünden, hormon salgılansa bile sinyalin ulaşmadığı endokrin hastalıkları da vardır.</p>
  </section>

  <section class="pane" role="tabpanel" id="${id}-pane-time" data-pane="time" aria-labelledby="${id}-tab-time" hidden>
    <div class="card">
      <h3 class="sim-h">Nörotransmitter ve hormon: kapsam ve süre</h3>
      <p class="note">Nörotransmitter yalnızca sinapsın öbür tarafındaki nörona, milisaniyeler içinde etki eder. Hormon kana karışır, vücuttaki trilyonlarca hücreyi etkileme potansiyeline sahiptir ve etkisi saatlerce, günlerce sürebilir. Zaman ekseni logaritmiktir: kaydırıcıyı oynat.</p>
      <svg data-ref="tmSvg" viewBox="0 0 360 170" role="img" aria-label="Nörotransmitter ve hormon etkisinin logaritmik zaman ekseninde karşılaştırması" style="display:block;width:100%;height:auto"></svg>
      <div class="sliders"><div>
        <div class="sl-top"><label class="sl-name" for="${id}-tmSl">Sinyalden bu yana geçen süre</label><span class="sl-val" data-ref="tmVal"></span></div>
        <input type="range" id="${id}-tmSl" data-ref="tmSl" min="0" max="894" step="1" value="40">
      </div></div>
      <div class="readout" data-ref="tmRead"></div>
    </div>

    <div class="card">
      <h3 class="sim-h">Organizasyonel ve aktivasyon etkisi</h3>
      <p class="note">Gelişim döneminde hormonlar beynin yapılandırılma biçimini şekillendirir (organizasyonel etki, kalıcı). Aktivasyon etkisi ise yalnızca saatler ya da günler sürer. İkisi iç içedir: fetüs beynindeki organizasyonel etkiler, yetişkinlikte aynı hormonun ne yapacağını belirler.</p>
      <div class="sliders" data-ref="orSliders"></div>
      <div class="meters" data-ref="orMeters"></div>
      <div class="row"><button class="btn" data-ref="orCut" type="button">Yetişkin hormonunu kes</button></div>
    </div>
    <p class="foot">Süre eğrileri ve organizasyonel etki sayıları sembolik. Yalnızca yönü ve büyüklük sırasını gösterir.</p>
  </section>

  <div class="sim-bar" role="group" aria-label="Anlık açıklama" data-ref="bar"><div class="sim-bar-in"><p class="say" data-ref="say" aria-live="polite"></p></div></div>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('endo');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  /* ---------- Sekmeler ---------- */
  let tab: Tab = 'axis';
  const SAY: Partial<Record<Tab, () => string>> = {};
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  const sayEl = $('say');
  function showTab(t: Tab, focus = false): void {
    tab = t;
    for (const b of tabBtns) {
      const on = b.dataset.pane === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const p of panes) p.hidden = p.dataset.pane !== t;
    say();
  }
  for (const b of tabBtns) {
    scope.on(b, 'click', () => showTab(b.dataset.pane as Tab));
    scope.on(b, 'keydown', (ev) => {
      const i = tabBtns.indexOf(b);
      const j = ev.key === 'ArrowRight' ? (i + 1) % tabBtns.length : ev.key === 'ArrowLeft' ? (i + tabBtns.length - 1) % tabBtns.length : -1;
      if (j >= 0) { ev.preventDefault(); showTab(tabBtns[j].dataset.pane as Tab, true); }
    });
  }
  let lastSay = '';
  function say(): void { const t = SAY[tab]?.() || ''; if (t !== lastSay) { lastSay = t; sayEl.textContent = t; } }

  /* ---------- Ortak kaydırıcı ---------- */
  interface SliderHandle { inp: HTMLInputElement; set: (v: number) => void; wrap: HTMLElement }
  function makeSlider(parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, val: number,
    cb: (v: number) => void, valFmt: ((v: number) => string) | null, color: string): SliderHandle {
    const sid = `${id}-sl-${key}`;
    const w = document.createElement('div');
    w.innerHTML = `<div class="sl-top"><label class="sl-name" for="${sid}">${name}</label><span class="sl-val"></span></div><input type="range" id="${sid}" min="${min}" max="${max}" step="1" value="${val}">` + (hint ? `<p class="sl-hint">${hint}</p>` : '');
    if (color) w.style.setProperty('--c', color);
    parent.appendChild(w);
    const inp = w.querySelector('input') as HTMLInputElement;
    const out = w.querySelector('.sl-val') as HTMLElement;
    const upd = () => { out.textContent = valFmt ? valFmt(+inp.value) : inp.value + '%'; };
    scope.on(inp, 'input', () => { upd(); cb(+inp.value); });
    upd();
    return { inp, set: (v) => { inp.value = String(v); upd(); }, wrap: w };
  }

  /* =====================================================
     EKSEN
     ===================================================== */
  interface AxisState2 { axis: AxisKey; x: AxisState; t: number; hist: Array<{ t: number; x: AxisState }>; lastSample: number; pulseUntil: number; paused: boolean; speed: number; u: AxisInputs }
  const A: AxisState2 = { axis: 'hpa', x: { s: [0, 0, 0], e: 0 }, t: 0, hist: [], lastSample: 0, pulseUntil: -1, paused: false, speed: 1, u: { ...U0 } };
  const cfg = () => STRUCT[A.axis];
  const effU = (): AxisInputs => {
    const pulsing = A.t < A.pulseUntil;
    if (A.axis === 'glu') return { ...A.u, meal: pulsing ? 1 : A.u.meal };
    return { ...A.u, drive: pulsing ? 1 : A.u.drive };
  };
  const resettle = () => { A.x = settleAxis(A.axis, { ...A.u, drive: A.u.drive, meal: A.u.meal }, 900); A.hist = []; A.t = 0; A.lastSample = 0; A.pulseUntil = -1; };

  const axSliders = $('axSliders');
  const axSl: Record<string, SliderHandle> = {};
  function buildAxSliders(): void {
    axSliders.innerHTML = '';
    for (const k in axSl) delete axSl[k];
    if (A.axis === 'glu') {
      axSl.meal = makeSlider(axSliders, 'meal', 'Yemek (glikoz girişi)', 'Kana giren glikoz. Pankreas bunu insülinle karşılar.', 0, 100, pct(A.u.meal), (v) => { A.u.meal = v / 100; }, null, 'var(--red)');
      axSl.brain = makeSlider(axSliders, 'brain', 'Beyin desteği', 'Beynin pankreas salgısına yardımcı olan projeksiyonları.', 0, 100, pct(A.u.brain), (v) => { A.u.brain = v / 100; }, null, 'var(--hyp)');
    } else {
      const [nm, ht] = cfg().drive as [string, string];
      axSl.drive = makeSlider(axSliders, 'drive', nm, ht, 0, 100, pct(A.u.drive), (v) => { A.u.drive = v / 100; }, null, 'var(--hyp)');
      axSl.other = makeSlider(axSliders, 'other', 'Diğer hipotalamik hormonlar', A.axis === 'two' ? 'Hipofizi uyaran (+) ya da engelleyen (−) başka hipotalamik hormonlar.' : 'Kitap isim vermiyor: ACTH\'yi uyaran (+) ya da engelleyen (−) başka hipotalamik hormonlar.', -100, 100, Math.round(A.u.other * 100), (v) => { A.u.other = v / 100; }, (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + '%', 'var(--pit)');
      if (A.axis === 'hpg') (axSl.other.wrap.querySelector('.sl-hint') as HTMLElement).textContent = 'LH\'yi uyaran (+) ya da engelleyen (−) ek hipotalamik sinyaller (sembolik).';
    }
  }

  // ---- Diyagram ----
  interface Diagram {
    n: number; stages: { fill: SVGElement; pc: SVGElement }[]; arrows: SVGElement[]; fbs: SVGElement[];
    blood: SVGElement; cellA: SVGElement; cellAp: SVGElement; brain?: SVGElement;
  }
  let D: Diagram | null = null;
  const BX = 18, BW = 216, BH = 64, GAP = 36, Y0 = 10;
  const axSvg = $<SVGElement>('axSvg');
  function buildDiagram(): void {
    const sv = axSvg;
    sv.innerHTML = '';
    const c = cfg(), n = c.stages.length;
    const bloodY = Y0 + (n - 1) * (BH + GAP) + BH + 28;
    const cellY = bloodY + 34 + 52;
    const H = cellY + 26 + 30;
    sv.setAttribute('viewBox', `0 0 360 ${H}`);
    const defs = svg('defs', {}, sv);
    const m1 = svg('marker', { id: `${id}-ma`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 9, markerHeight: 9, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
    svg('path', { class: 'mk', d: 'M0,1 L10,5 L0,9 z' }, m1);
    const m2 = svg('marker', { id: `${id}-mb`, viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 10, markerHeight: 10, markerUnits: 'userSpaceOnUse', orient: 'auto' }, defs);
    svg('path', { class: 'mk-bar', d: 'M5,0 L5,10' }, m2);
    const d: Diagram = { n, stages: [], arrows: [], fbs: [], blood: null as unknown as SVGElement, cellA: null as unknown as SVGElement, cellAp: null as unknown as SVGElement };

    const stageY = (i: number) => Y0 + i * (BH + GAP);
    c.stages.forEach((s, i) => {
      const y = stageY(i);
      const g = svg('g', {}, sv);
      svg('rect', { class: 'box', x: BX, y, width: BW, height: BH, rx: 10 }, g);
      svg('rect', { x: BX, y: y + 12, width: 4, height: BH - 24, rx: 2, fill: `var(${s.c})` }, g);
      svgText(g, { class: 't-title', x: BX + 14, y: y + 20 }, s.t);
      const hs = s.h.length > 34 ? s.h.slice(0, 33) + '…' : s.h;
      svgText(g, { class: 't-hor', x: BX + 14, y: y + 35 }, hs);
      svg('rect', { class: 'trk', x: BX + 14, y: y + 46, width: 150, height: 7, rx: 3.5 }, g);
      const fill = svg('rect', { x: BX + 14, y: y + 46, width: 0, height: 7, rx: 3.5, fill: `var(${s.c})` }, g);
      const pc = svgText(g, { class: 't-pct', x: BX + BW - 12, y: y + 53 }, '0%');
      d.stages.push({ fill, pc });
      if (i < n - 1) {
        const x = BX + BW / 2;
        d.arrows.push(svg('path', { class: 'arrow', d: `M${x},${y + BH + 3} L${x},${y + BH + GAP - 4}`, 'marker-end': `url(#${id}-ma)` }, sv));
      }
    });
    if (A.axis === 'glu') { // beyin desteği etiketi
      const y = stageY(1);
      d.brain = svgText(sv, { class: 't-hor', x: BX + BW + 12, y: y + 56, style: 'fill:var(--hyp)' }, '');
    }
    // geri bildirim: son basamaktan öncekilere
    const lastC = stageY(n - 1) + BH / 2;
    const targets = A.axis === 'hpa' || A.axis === 'hpg' ? [0, 1] : [0];
    targets.forEach((j, k) => {
      const yj = stageY(j) + BH / 2, bx = 276 + k * 26;
      d.fbs.push(svg('path', { class: 'fbk', d: `M${BX + BW + 2},${lastC + (k ? 10 : -4)} C${bx + 40},${lastC + (k ? 10 : -4)} ${bx + 40},${yj} ${BX + BW + 6},${yj}`, 'marker-end': `url(#${id}-mb)` }, sv));
    });
    svgText(sv, { class: 't-hor', x: BX + BW + 10, y: stageY(n - 1) + BH + 18 }, '↑ geri bildirim');
    // kan dolaşımı
    const lastBottom = stageY(n - 1) + BH;
    svg('path', { class: 'arrow', d: `M${BX + BW / 2},${lastBottom + 3} L${BX + BW / 2},${bloodY - 4}`, 'marker-end': `url(#${id}-ma)` }, sv);
    svg('rect', { class: 'trk', x: BX, y: bloodY, width: 324, height: 28, rx: 14 }, sv);
    d.blood = svg('rect', { x: BX, y: bloodY, width: 0, height: 28, rx: 14, fill: `var(${c.stages[n - 1].c})`, opacity: 0.85 }, sv);
    svgText(sv, { class: 't-title', x: BX + 162, y: bloodY + 18, 'text-anchor': 'middle', fill: 'var(--ink)', style: 'paint-order:stroke;stroke:var(--panel);stroke-width:3px;stroke-linejoin:round' }, 'Kan dolaşımı: hormon her yere ulaşır');
    // hedef hücreler
    const cx1 = 100, cx2 = 260;
    for (const cx of [cx1, cx2]) svg('path', { class: 'arrow', d: `M${cx},${bloodY + 32} L${cx},${cellY - 32}`, 'marker-end': `url(#${id}-ma)` }, sv);
    d.cellA = svg('circle', { cx: cx1, cy: cellY, r: 26, fill: 'var(--eff)', 'fill-opacity': 0.1, stroke: 'var(--eff)', 'stroke-width': 2 }, sv);
    for (let k = 0; k < 6; k++) { // reseptör çentikleri
      const a = (k / 6) * Math.PI * 2;
      svg('rect', { x: cx1 - 3, y: cellY - 26 - 6, width: 6, height: 6, rx: 1.5, fill: 'var(--eff)', transform: `rotate(${(a * 180) / Math.PI} ${cx1} ${cellY})` }, sv);
    }
    d.cellAp = svgText(sv, { class: 't-pct', x: cx1, y: cellY + 4, style: 'text-anchor:middle' }, '0%');
    svgText(sv, { class: 't-cap', x: cx1, y: cellY + 46 }, 'Reseptörü olan hücre');
    svg('circle', { cx: cx2, cy: cellY, r: 26, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.6, 'stroke-dasharray': '4 4' }, sv);
    svgText(sv, { class: 't-pct', x: cx2, y: cellY + 4, style: 'text-anchor:middle;fill:var(--muted)' }, '0%');
    svgText(sv, { class: 't-cap', x: cx2, y: cellY + 46 }, 'Reseptörü olmayan hücre');
    D = d;
  }

  function drawDiagram(): void {
    if (!D) return;
    const s = A.x.s;
    s.forEach((v, i) => { D!.stages[i].fill.setAttribute('width', (150 * v).toFixed(1)); D!.stages[i].pc.textContent = pct(v) + '%'; });
    D.arrows.forEach((a, i) => { const v = s[i]; a.style.strokeWidth = (1 + 2.6 * v).toFixed(2); a.style.opacity = (0.25 + 0.7 * v).toFixed(2); });
    const last = s[s.length - 1], on = A.axis === 'glu' || A.u.feedback;
    D.fbs.forEach((f) => { f.style.strokeWidth = (1 + 2.4 * last).toFixed(2); f.style.opacity = on ? (0.2 + 0.7 * last).toFixed(2) : '0.12'; });
    D.blood.setAttribute('width', (324 * last).toFixed(1));
    D.cellA.setAttribute('fill-opacity', (0.08 + 0.92 * A.x.e).toFixed(2));
    D.cellAp.textContent = pct(A.x.e) + '%';
    if (D.brain) D.brain.textContent = A.u.brain > 0.02 ? `← beyin ${pct(A.u.brain)}%` : '';
  }

  // ---- Grafik ----
  const CH = { x0: 34, x1: 350, top: 10, bot: 108, span: 360 };
  const yOf = (v: number) => CH.bot - (CH.bot - CH.top) * v;
  interface Series { name: string; color: string; get: (x: AxisState) => number; dash?: string; line: SVGElement; dot: SVGElement }
  let chartSeries: Series[] = [];
  const axChart = $<SVGElement>('axChart');
  function buildChart(): void {
    const sv = axChart;
    sv.innerHTML = '';
    for (const v of [0, 0.5, 1]) { svg('line', { class: 'grid', x1: CH.x0, x2: CH.x1, y1: yOf(v), y2: yOf(v) }, sv); svgText(sv, { x: CH.x0 - 6, y: yOf(v) + 3.5, 'text-anchor': 'end' }, String(pct(v))); }
    svgText(sv, { x: CH.x0, y: 124 }, '−6 sa'); svgText(sv, { x: CH.x1, y: 124, 'text-anchor': 'end' }, 'şimdi');
    const c = cfg();
    const defs: { name: string; color: string; get: (x: AxisState) => number; dash?: string }[] =
      c.stages.map((s, i) => ({ name: c.series[i], color: `var(${s.c})`, get: (x: AxisState) => x.s[i] }));
    defs.push({ name: 'Hedef hücre yanıtı', color: 'var(--eff)', get: (x) => x.e, dash: '5 3' });
    chartSeries = [];
    let lx = CH.x0, ly = 138;
    for (const s of defs) {
      const w = 14 + s.name.length * 6.1 + 10;
      if (lx + w > CH.x1 + 4) { lx = CH.x0; ly += 14; }
      svg('rect', { x: lx, y: ly - 8, width: 9, height: 9, rx: 2, fill: s.color }, sv);
      svgText(sv, { x: lx + 14, y: ly }, s.name);
      lx += w;
      const attrs: Record<string, string> = { class: 'ln', stroke: s.color, points: '' };
      if (s.dash) attrs['stroke-dasharray'] = s.dash;
      chartSeries.push({ ...s, line: svg('polyline', attrs, sv), dot: svg('circle', { r: 3.4, fill: s.color, cx: CH.x1, cy: CH.bot }, sv) });
    }
    sv.setAttribute('viewBox', `0 0 360 ${ly + 8}`);
  }
  function drawChart(): void {
    for (const s of chartSeries) {
      const pts = A.hist.map((h) => `${(CH.x1 - ((A.t - h.t) / CH.span) * (CH.x1 - CH.x0)).toFixed(1)},${yOf(s.get(h.x)).toFixed(1)}`);
      s.line.setAttribute('points', pts.join(' '));
      const last = A.hist[A.hist.length - 1];
      if (last) s.dot.setAttribute('cy', yOf(s.get(last.x)).toFixed(1));
    }
  }

  // ---- Eksen kontrolleri ----
  const axFb = $('axFb'), axPause = $('axPause'), axSpeed = $('axSpeed'), axChips = $('axChips');
  function sampleAx(): void { A.hist.push({ t: A.t, x: A.x }); while (A.hist.length && A.t - A.hist[0].t > CH.span) A.hist.shift(); }
  function setAxis(key: AxisKey): void {
    A.axis = key;
    for (const b of Array.from(axChips.children)) b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.k === key));
    $('axNote').textContent = cfg().note;
    $('axFoot').textContent = FOOT[key];
    $('axPulse').textContent = cfg().pulse;
    axFb.hidden = key === 'glu';
    axFb.setAttribute('aria-pressed', String(!!A.u.feedback));
    axFb.textContent = 'Geri bildirim: ' + (A.u.feedback ? 'açık' : 'kapalı');
    resettle();
    buildAxSliders(); buildDiagram(); buildChart();
    sampleAx();
  }
  for (const k of Object.keys(STRUCT) as AxisKey[]) {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.dataset.k = k; b.textContent = STRUCT[k].chip; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => setAxis(k));
    axChips.appendChild(b);
  }
  scope.on($('axPulse'), 'click', () => { A.pulseUntil = A.t + 30; });
  scope.on(axFb, 'click', () => { A.u.feedback = A.u.feedback ? 0 : 1; axFb.setAttribute('aria-pressed', String(!!A.u.feedback)); axFb.textContent = 'Geri bildirim: ' + (A.u.feedback ? 'açık' : 'kapalı'); });
  scope.on(axPause, 'click', () => { A.paused = !A.paused; axPause.setAttribute('aria-pressed', String(A.paused)); axPause.textContent = A.paused ? 'Devam et' : 'Duraklat'; });
  const SPEEDS = [1, 3, 10];
  scope.on(axSpeed, 'click', () => { A.speed = SPEEDS[(SPEEDS.indexOf(A.speed) + 1) % SPEEDS.length]; axSpeed.textContent = 'Hız ×' + A.speed; });
  scope.on($('axReset'), 'click', () => { A.u = { ...U0 }; setAxis(A.axis); });
  SAY.axis = () => describeAxis(A.axis, A.x, effU(), A.t < A.pulseUntil);

  /* =====================================================
     RESEPTÖR
     ===================================================== */
  const RC: ReceptorParams = { hormone: 0.5, number: 0.6, affinity: 0.5, specificity: 1, other: 0 };
  const rcSl = {} as Record<keyof ReceptorParams, SliderHandle>;
  const rcChips = $('rcChips');
  function setRcChip(i: number | null): void { for (const b of Array.from(rcChips.children)) b.setAttribute('aria-pressed', String(Number((b as HTMLElement).dataset.i) === i)); }
  for (const [k, nm, ht, col] of RC_DEFS) rcSl[k] = makeSlider($('rcSliders'), 'rc-' + k, nm, ht, 0, 100, pct(RC[k]), (v) => { RC[k] = v / 100; setRcChip(null); }, null, col);
  RPRE.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.dataset.i = String(i); b.textContent = p.n; b.setAttribute('aria-pressed', String(i === 0));
    scope.on(b, 'click', () => { Object.assign(RC, p.v); for (const [k] of RC_DEFS) rcSl[k].set(pct(RC[k])); setRcChip(i); });
    rcChips.appendChild(b);
  });
  $('rcMeters').innerHTML = ([['Reseptör doluluğu', 'occ', 'var(--hyp)'], ['Hücre yanıtı', 'resp', 'var(--eff)'], ['Yanıtın yanlış hormondan gelen payı', 'wrong', 'var(--red)']] as const)
    .map(([n, k, c]) => `<div style="--c:${c}"><div class="m-top"><span>${n}</span><b data-ref="rm-${k}">0%</b></div><div class="track"><b data-ref="rb-${k}"></b></div></div>`).join('');
  const SLOTS = 24;
  const rcSvg = $<SVGElement>('rcSvg'), CX = 180, CY = 120, CR = 62;
  const rcCell = svg('circle', { cx: CX, cy: CY, r: CR, fill: 'var(--eff)', 'fill-opacity': 0.1, stroke: 'var(--eff)', 'stroke-width': 2 }, rcSvg);
  const rcRecG = svg('g', {}, rcSvg);
  const rcCenter = svgText(rcSvg, { x: CX, y: CY - 2, 'text-anchor': 'middle', style: 'font:500 22px var(--f-mono);fill:var(--ink);paint-order:stroke;stroke:var(--panel);stroke-width:4px;stroke-linejoin:round' }, '0%');
  svgText(rcSvg, { x: CX, y: CY + 16, 'text-anchor': 'middle', style: 'font:400 11px var(--f-body);fill:var(--muted)' }, 'hücre yanıtı');
  function drawReceptor(): void {
    const r = receptor(RC), count = Math.round(RC.number * SLOTS);
    rcCell.setAttribute('fill-opacity', (0.06 + 0.94 * r.response).toFixed(2));
    rcCell.setAttribute('stroke-dasharray', count === 0 ? '5 4' : '');
    rcRecG.innerHTML = '';
    let accT = 0, accW = 0;
    const w = r.occ > 0 ? r.occO / r.occ : 0;
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * 360;
      const g = svg('g', { transform: `rotate(${ang} ${CX} ${CY})` }, rcRecG);
      svg('rect', { x: CX - 5, y: CY - CR - 10, width: 10, height: 11, rx: 2.5, fill: 'var(--eff)' }, g);
      svg('rect', { x: CX - 2.5, y: CY - CR - 10, width: 5, height: 4, fill: 'var(--panel)' }, g); // kilit çentiği
      accT += r.occ;
      if (accT >= 1) { // bu yuva dolu
        accT -= 1; accW += w;
        const wrong = accW >= 1; if (wrong) accW -= 1;
        svg('circle', { cx: CX, cy: CY - CR - 22, r: 6, fill: wrong ? 'var(--red)' : 'var(--hyp)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, g);
      }
    }
    rcCenter.textContent = pct(r.response) + '%';
    const set = (k: string, v: number) => { $('rm-' + k).textContent = pct(v) + '%'; $('rb-' + k).style.width = pct(v) + '%'; };
    set('occ', r.occ); set('resp', r.response); set('wrong', r.wrongShare);
  }
  SAY.rec = () => {
    const r = receptor(RC);
    if (RC.number === 0) return 'Hücrede reseptör yok: hormon bol olsa da sinyal ulaşmıyor. Bazı endokrin hastalıkları böyle işler.';
    if (r.wrongShare > 0.3) return 'Reseptör titiz değil: benzer hormon da kilide girip yanlış sinyal üretiyor.';
    if (r.response < 0.12 && RC.hormone > 0.7) return 'Hormon yüksek ama yanıt zayıf: reseptör düzeyi hormon düzeyi kadar önemli.';
    if (r.response > 0.5 && RC.hormone < 0.25) return 'Hormon az ama yanıt güçlü: çok sayıda ve istekli reseptör az hormonu yeter kılıyor.';
    return 'Yanıt = hormon miktarı × reseptörün sayısı ve bağlanma isteği.';
  };

  /* =====================================================
     SÜRE
     ===================================================== */
  const TM = { x0: 30, x1: 350, top: 12, bot: 124, max: 8.94 };
  const tx = (lv: number) => TM.x0 + (lv / TM.max) * (TM.x1 - TM.x0);
  const ty = (v: number) => TM.bot - (TM.bot - TM.top) * v;
  const tmSvg = $<SVGElement>('tmSvg');
  for (const v of [0, 0.5, 1]) svg('line', { x1: TM.x0, x2: TM.x1, y1: ty(v), y2: ty(v), stroke: 'var(--line)', 'stroke-width': 1 }, tmSvg);
  for (const [lv, lb] of [[0, '1 ms'], [3, '1 sn'], [4.78, '1 dk'], [6.56, '1 sa'], [7.94, '1 g'], [8.94, '10 g']] as [number, string][]) {
    svg('line', { x1: tx(lv), x2: tx(lv), y1: TM.bot, y2: TM.bot + 4, stroke: 'var(--muted)' }, tmSvg);
    svgText(tmSvg, { x: Math.min(tx(lv), 346), y: TM.bot + 15, 'text-anchor': lv === 0 ? 'start' : lv >= 8.9 ? 'end' : 'middle', style: 'font:400 10px var(--f-mono);fill:var(--muted)' }, lb);
  }
  const curve = (fn: (ms: number) => number, color: string) => {
    const pts: string[] = [];
    for (let i = 0; i <= 150; i++) { const lv = (i / 150) * TM.max; pts.push(`${tx(lv).toFixed(1)},${ty(fn(msOfLog(lv))).toFixed(1)}`); }
    svg('polyline', { points: pts.join(' '), fill: 'none', stroke: color, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, tmSvg);
  };
  curve(neuroAt, 'var(--hyp)'); curve(hormAt, 'var(--eff)');
  svgText(tmSvg, { x: tx(0.9), y: 24, style: 'font:500 10.5px var(--f-body);fill:var(--hyp)' }, 'Nörotransmitter');
  svgText(tmSvg, { x: tx(5.4), y: 24, style: 'font:500 10.5px var(--f-body);fill:var(--eff)' }, 'Hormon');
  const tmCur = svg('line', { y1: TM.top - 4, y2: TM.bot, stroke: 'var(--ink)', 'stroke-width': 1.4 }, tmSvg);
  const tmDotN = svg('circle', { r: 4, fill: 'var(--hyp)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, tmSvg);
  const tmDotH = svg('circle', { r: 4, fill: 'var(--eff)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, tmSvg);
  function fmtMs(ms: number): string {
    if (ms < 1000) return (ms < 10 ? ms.toFixed(1) : Math.round(ms)) + ' ms';
    if (ms < MS.min) return (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + ' sn';
    if (ms < MS.h) return Math.round(ms / MS.min) + ' dk';
    if (ms < MS.day) return (ms / MS.h).toFixed(1).replace('.0', '') + ' sa';
    return (ms / MS.day).toFixed(1).replace('.0', '') + ' gün';
  }
  const tmSl = $<HTMLInputElement>('tmSl');
  function drawTime(): void {
    const lv = Number(tmSl.value) / 100, ms = msOfLog(lv), n = neuroAt(ms), h = hormAt(ms);
    $('tmVal').textContent = fmtMs(ms);
    tmSl.setAttribute('aria-valuetext', fmtMs(ms));
    tmCur.setAttribute('x1', String(tx(lv))); tmCur.setAttribute('x2', String(tx(lv)));
    tmDotN.setAttribute('cx', String(tx(lv))); tmDotN.setAttribute('cy', String(ty(n)));
    tmDotH.setAttribute('cx', String(tx(lv))); tmDotH.setAttribute('cy', String(ty(h)));
    $('tmRead').innerHTML =
      `<div class="ro"><span class="k" style="color:var(--hyp)">Nörotransmitter</span><span class="v">etki ${pct(n)}%</span><span class="k">ulaşan: 1 komşu nöron</span></div>` +
      `<div class="ro"><span class="k" style="color:var(--eff)">Hormon</span><span class="v">etki ${pct(h)}%</span><span class="k">ulaşan: reseptörü olan trilyonlarca hücre</span></div>`;
  }
  scope.on(tmSl, 'input', drawTime);
  SAY.time = () => {
    const ms = msOfLog(Number(tmSl.value) / 100);
    if (neuroAt(ms) > 0.3 && hormAt(ms) < 0.05) return 'Milisaniyeler: nörotransmitter etkisini çoktan göstermiş, hormon henüz yoldadır.';
    if (neuroAt(ms) < 0.02 && ms < MS.h) return 'Nörotransmitter sinyali çoktan bitti; hormonun etkisi ise yeni yeni oturuyor.';
    if (neuroAt(ms) < 0.02 && hormAt(ms) > 0.3) return 'Nörotransmitter sinyali bitmiş; hormonun etkisi saatlerdir sürüyor.';
    if (hormAt(ms) > 0.02 && ms > MS.day) return 'Günler sonra: hormon etkisi hâlâ ölçülebilir. Hormon etkileri kalıcı da olabilir.';
    return 'Kaydırıcıyı oynat: nörotransmitter milisaniyede söner, hormon saatlerce günlerce sürer.';
  };

  const OR = { fetal: 0.5, adult: 0.6 };
  const orSl = {} as Record<'fetal' | 'adult', SliderHandle>;
  orSl.fetal = makeSlider($('orSliders'), 'or-fetal', 'Fetüs ve çocukluk döneminde hormon', 'Beynin yapılandırılmasını şekillendirir (kalıcı).', 0, 100, 50, (v) => { OR.fetal = v / 100; drawOrgan(); }, null, 'var(--pit)');
  orSl.adult = makeSlider($('orSliders'), 'or-adult', 'Yetişkinlikte hormon', 'Aktivasyon etkisi: yalnızca saatler ya da günler sürer.', 0, 100, 60, (v) => { OR.adult = v / 100; drawOrgan(); }, null, 'var(--eff)');
  $('orMeters').innerHTML = ([['Kalıcı yapı: hormona duyarlılık', 'st', 'var(--pit)'], ['Anlık etki (aktivasyon)', 'ef', 'var(--eff)']] as const)
    .map(([n, k, c]) => `<div style="--c:${c}"><div class="m-top"><span>${n}</span><b data-ref="om-${k}">0%</b></div><div class="track"><b data-ref="ob-${k}"></b></div></div>`).join('');
  function drawOrgan(): void {
    const o = organ(OR.fetal, OR.adult);
    $('om-st').textContent = pct(o.structure) + '%'; $('ob-st').style.width = pct(o.structure) + '%';
    $('om-ef').textContent = pct(o.effect) + '%'; $('ob-ef').style.width = pct(o.effect) + '%';
  }
  scope.on($('orCut'), 'click', () => { OR.adult = 0; orSl.adult.set(0); drawOrgan(); });

  /* ---------- Döngü ---------- */
  let last = performance.now(), acc = 0, tSay = 0;
  function frame(now: number): void {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (tab === 'axis' && !A.paused) {
      acc += dt * 6 * A.speed; // 1 sn gerçek = 6 dk sim (×1)
      while (acc >= 1) {
        A.x = stepAxis(A.axis, A.x, effU(), 1);
        A.t += 1; acc -= 1;
        if (A.t - A.lastSample >= 2) { A.lastSample = A.t; sampleAx(); }
      }
    }
    if (tab === 'axis') { drawDiagram(); drawChart(); }
    if (tab === 'rec') drawReceptor();
    tSay += dt;
    if (tSay > 0.25) { tSay = 0; say(); }
  }

  setAxis('hpa');
  drawReceptor(); drawTime(); drawOrgan();
  showTab('axis');
  hideBarWhenAway(root, $('bar'), scope);
  scope.loop(frame);

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}

