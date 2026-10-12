import '../sim.css';
import './view.css';
import { Scope, pct, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  FAST_DEFAULT, KINDS, MASK_MS, STIM, STREET_DEFAULT, T_END, compare, decide, describeFast, describeStreet,
  disorderOf, newStreet, simulateFast, times,
  type Comparison, type FastInputs, type FastResult, type Kind, type Stim, type StreetCfg, type StreetState,
} from './model';

const SLOW = 0.25;
const kindName: Record<Kind, string> = { flyer: 'İlan atma', shortcut: 'Yasak aralık', steal: 'Zarfı alma' };
const STIMS: Stim[] = ['fear', 'calm', 'sign', 'faceB', 'faceW'];

const TEMPLATE = (id: string) => `
<div class="sim sim-sq">
  <p class="lede">Farkına bile varmadığımız duyusal ve sosyal ipuçları, birkaç saniye içinde kararlarımızı nasıl değiştirir? İki mekanizma: beyne fark edilmeden ulaşan hızlı alarm ve çevredeki düzensizliğin bulaşması.</p>
  <div class="tabs" role="tablist" aria-label="Mekanizma seçimi">
    <button type="button" role="tab" class="chip" id="${id}-t-fast" aria-controls="${id}-p-fast" data-tab="fast">Hızlı yol ve düşünce</button>
    <button type="button" role="tab" class="chip" id="${id}-t-norm" aria-controls="${id}-p-norm" data-tab="norm">Norm ihlallerinin yayılması</button>
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık çıktılar">
    <div class="sim-bar-in">
      <p class="say" data-ref="say"></p>
      <div class="meters">
        ${[0, 1, 2].map((i) => `<div class="m" data-ref="m${i}"><div class="m-top"><span data-ref="ml${i}"></span><b data-ref="mv${i}"></b></div><div class="track"><b data-ref="mb${i}"></b></div></div>`).join('')}
      </div>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section role="tabpanel" id="${id}-p-fast" aria-labelledby="${id}-t-fast" data-ref="p-fast" class="panel">
    <div class="chips" data-ref="f-presets" role="group" aria-label="Hazır durumlar"></div>
    <div class="stage">
      <svg viewBox="0 0 360 180" role="img" aria-label="Ekranda kısa süre gösterilen uyaran, hızlı amigdala yolu ve yavaş frontal fren" data-ref="f-stage">
        <defs>
          <marker id="${id}-ax" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path class="mk" d="M0,1 L10,5 L0,9 z"/></marker>
          <marker id="${id}-ai" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path class="mk-bar" d="M5,0 L5,10"/></marker>
        </defs>
        <rect class="scr" x="10" y="26" width="120" height="100" rx="6"/>
        <g data-ref="f-stim"></g>
        <g data-ref="f-mask"></g>
        <text x="70" y="144" text-anchor="middle" data-ref="f-time">ekran</text>
        <path class="edge fast" d="M132,66 L186,56" marker-end="url(#${id}-ax)"/>
        <path class="edge slow" d="M132,100 Q150,142 186,138" marker-end="url(#${id}-ax)"/>
        <path class="edge inh" d="M215,114 L215,84" marker-end="url(#${id}-ai)"/>
        <text x="146" y="50">hızlı</text><text x="150" y="156">yavaş</text>
        <g class="node amy"><circle class="base" cx="215" cy="56" r="26"/><circle class="fill" cx="215" cy="56" r="25" fill-opacity="0" data-ref="f-na"/><text class="ab" x="215" y="53" text-anchor="middle">AMG</text><text class="pct" x="215" y="66" text-anchor="middle" data-ref="f-pa"></text></g>
        <g class="node pfc"><circle class="base" cx="215" cy="138" r="26"/><circle class="fill" cx="215" cy="138" r="25" fill-opacity="0" data-ref="f-nf"/><text class="ab" x="215" y="135" text-anchor="middle">ACC</text><text class="pct" x="215" y="148" text-anchor="middle" data-ref="f-pf"></text></g>
        <text class="cap" x="250" y="52">Amigdala</text><text x="250" y="65">hızlı alarm</text>
        <text class="cap" x="250" y="134">ACC / dlPFC</text><text x="250" y="147">frontal fren</text>
      </svg>
      <p class="tally" data-ref="f-tally"></p>
    </div>
    <div class="row">
      <button type="button" class="btn btn-go" data-ref="f-play">Göster</button>
      <button type="button" class="btn" data-ref="f-slow" aria-pressed="false">Yavaş çekim (¼ hız)</button>
    </div>
    <section class="chart" aria-label="Zaman grafiği">
      <h3 class="sim-h">İlk 1,6 saniye</h3>
      <svg viewBox="0 0 360 180" role="img" aria-label="Amigdala ve frontal korteks tepkisinin zaman içindeki değişimi" data-ref="f-chart"></svg>
    </section>
    <section aria-label="Girdiler">
      <h3 class="sim-h">Girdiler</h3>
      <div class="field"><span class="sl-name" id="${id}-st">Uyaran</span>
        <div class="chips" role="group" aria-labelledby="${id}-st" data-ref="f-stims"></div>
        <p class="sl-hint">Korkulu göz: Whalen. Yüzlerde kategoriler çalışmaların terimidir; katılımcı Beyaz kabul edilir.</p></div>
      <div class="field"><div class="row"><button type="button" class="btn" data-ref="f-mask-btn" aria-pressed="true"></button></div>
        <p class="sl-hint">Maske: uyaranın hemen ardından gelen desen, uyaranın bilinçli görülmesini engeller.</p></div>
      <div class="sliders" data-ref="f-sliders"></div>
    </section>
    <details class="how">
      <summary>Irk ipucu çalışmaları ne gösterir, ne göstermez?</summary>
      <p>Siyah ve Beyaz yüzler, Beyaz katılımcılarda kısa gösterimde farklı amigdala tepkisi uyandırabiliyor ve bu fark örtük önyargı puanıyla birlikte artıyor (kitaptaki aktarım). Bu otomatik, <b>öğrenilmiş</b> ve bağlama duyarlı bir tepkidir; kişinin bilinçli tutumunu ya da doğuştan bir özelliği göstermez. Eleştirel derlemeler, tepkinin "ırkçılığı" değil kültürel olarak öğrenilmiş tehdit çağrışımlarını yansıttığını savunur. Kategori yeniden çizilebilir (Bölüm 11) ve tanıdıklık etkiyi azaltır; modeldeki tanıdıklık kaydırıcısı bu yönü gösterir.</p>
      <p>Ito ve Urland'ın kaynak çalışması EEG'dir (~100 ms'de dikkat farkı); amigdala iddiası Phelps ve Cunningham'ın fMRI çalışmalarına dayanır. Etkiler küçük ve bağlama duyarlıdır; replikasyon durumu karışık.</p>
    </details>
  </section>

  <section role="tabpanel" id="${id}-p-norm" aria-labelledby="${id}-t-norm" data-ref="p-norm" class="panel" hidden>
    <div class="chips" data-ref="n-cues" role="group" aria-label="Görünür ihlaller"></div>
    <div class="stage">
      <svg viewBox="0 0 360 192" role="group" aria-label="Sanal yayaların geçtiği sokak: duvar, yasak aralıklı çit ve posta kutusu" data-ref="n-street"></svg>
      <p class="tally" data-ref="n-tally"></p>
      <div class="legend"><span><i class="lg-walker"></i>yaya</span><span><i class="lg-viol"></i>ihlal eden yaya (!)</span><span>eşleşme: grafiti → ilan, bisikletler → yasak aralık, çöp → zarf</span></div>
    </div>
    <div class="row">
      <button type="button" class="btn" data-ref="n-pause" aria-pressed="false">Duraklat</button>
      <button type="button" class="btn" data-ref="n-rerun">Yeniden çalıştır</button>
    </div>
    <section class="chart" aria-label="Oran karşılaştırması">
      <h3 class="sim-h">Düzenli ve mevcut ortam</h3>
      <svg viewBox="0 0 360 176" role="img" aria-label="Üç davranış için düzenli ve mevcut ortamdaki ihlal oranları" data-ref="n-bars"></svg>
    </section>
    <section class="chart" aria-label="Zaman grafiği">
      <h3 class="sim-h">Ortamın düzensizliği (son 60 yaya)</h3>
      <svg viewBox="0 0 360 84" role="img" aria-label="Zaman içinde ortamdaki görünür düzensizlik düzeyi" data-ref="n-hist"></svg>
    </section>
    <section aria-label="Girdiler">
      <h3 class="sim-h">Girdiler</h3>
      <div class="sliders" data-ref="n-sliders"></div>
      <div class="field"><div class="row"><button type="button" class="btn" data-ref="n-chain" aria-pressed="true"></button></div>
        <p class="sl-hint">Zincirleme: yere atılan ilanlar ortamı bozar, sonraki yayaların davranışını etkiler.</p></div>
    </section>
  </section>

  <details class="how">
    <summary>Model nasıl çalışıyor?</summary>
    <p><b>Hızlı yol.</b> Uyaran amigdalaya hızlı bir kısa yoldan ulaşır (modelin varsayımı: ~50 ms gecikme, hızlı yükselme, yavaş sönme). Uyaran bilinçli görülürse (kitap: ~100 ms'nin üzeri; maskesiz uyaran biraz daha uzun kalır) ACC ve dlPFC amigdala alarmından ~150 ms sonra devreye girer ve amigdalanın girdisini kısar. Frontal güç, bilişsel yükle azalır (modelin varsayımı). Kesikli eğri, frenin olmadığı durumu gösterir.</p>
    <p><b>Norm ihlalleri.</b> Her yaya üç istasyonda karar verir. Taban olasılık (modelin varsayımı) görünür ihlalle çarpılır: eşleşen ihlal olasılığı yaklaşık iki katına çıkarır (kitaptan), eşleşmeyen ipucu daha az etkiler (varsayım: 0,35). Görünür denetim ihlalleri azaltır (varsayım). Zincirleme açıkken atılan ilanlar sekiz yaya boyunca yerde kalır ve çöp ipucunu güçlendirir.</p>
    <p>Varsayımlar: yayalar birbirinden bağımsız, her karar ortamın o anki görüntüsüne bağlıdır. Gerçek insanlarda bağlam, kişilik ve toplumsal normlar çok daha çeşitlidir.</p>
  </details>

  <aside class="book" aria-label="Kitapta">
    <h3 class="sim-h">Kitapta</h3>
    <ul>
      <li><a href="#/bolum/ch03?deney=ch03-e3">Maskeli korkulu göz akları (Whalen)</a>: fark edilmeyen gözler amigdalayı etkinleştirdi. Replikasyon: bilinmiyor; maskenin farkındalığı gerçekten engelleyip engellemediği tartışılıyor.</li>
      <li><a href="#/bolum/ch03?deney=ch03-e1">Kısa gösterilen yüzlerde ırkın erken işlenmesi</a>: Siyah yüzlerde ~100 ms'de elektriksel fark, amigdala etkinliği örtük önyargı puanıyla artıyor. Replikasyon: karışık; etkiler küçük ve bağlama duyarlı. Ayrıca <a href="#/bolum/ch03?deney=ch03-e2">ateş etme görevi (Correll)</a>: ırk yanlılığı meta-analizde sağlam, gerçek polis kararlarına genellenmesi tartışmalı. Simüle edilmedi.</li>
      <li><a href="#/bolum/ch03?deney=ch03-e12">Norm ihlallerinin yayılması (Keizer)</a>: bir ihlal işareti, ihlal olasılığını yaklaşık iki katına çıkardı. Replikasyon: karışık; 84 alan deneyli büyük çalışmada etki daha küçük ve mahalleye göre değişken. "Etki gücü" kaydırıcısıyla denenebilir. Kırık pencere kuramının suça etkisi de tartışmalı.</li>
      <li>Bölümün diğer deneyleri: <a href="#/bolum/ch03?deney=ch03-e4">göz resimleri (Bateson; karışık)</a>, <a href="#/bolum/ch03?deney=ch03-e6">korku teri kokusu (Mujica-Parodi; bilinmiyor)</a>, <a href="#/bolum/ch03?deney=ch03-e8">oyunun adı (Liberman; karışık)</a>. <a href="#/bolum/ch03?deney=ch03-e7">Ego tükenmesi ve glukoz (Gailliot)</a> tartışmalı: büyük replikasyonlarda etki sıfıra yakın çıktı, bu yüzden bilişsel yük kaydırıcısı ona değil, genel bir "frontal kapasite paylaşılıyor" varsayımına dayanır.</li>
    </ul>
  </aside>

  <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler: amigdala yanıtının ~100 ms'de görülmesi ve 100 ms altında gösterimde de etkinleşmesi, frontal korteksin bilinçli algıdan sonra devreye girmesi, ihlal işaretinin davranış olasılığını ~iki kat yapması. Gecikmeler, zaman sabitleri, taban oranlar, denetim ve zincirleme etkileri modelin varsayımıdır.</p>
</div>`;

interface SliderDef { key: string; name: string; hint: string; cls: string; get: () => number; set: (v: number) => void; fmt: (v: number) => string; to?: (v: number) => number; from?: (p: number) => number }

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('sq');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const live = $('live'), sayEl = $('say');
  let tab: 'fast' | 'norm' = 'fast';
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mkSlider = (parent: HTMLElement, d: SliderDef, onChange: () => void): (() => void) => {
    const w = document.createElement('div');
    w.className = d.cls;
    w.innerHTML = `<div class="sl-top"><label class="sl-name" for="${id}-s-${d.key}">${d.name}</label><span class="sl-val"></span></div><input type="range" id="${id}-s-${d.key}" min="0" max="100" step="1"><p class="sl-hint">${d.hint}</p>`;
    parent.appendChild(w);
    const inp = w.querySelector('input')!, val = w.querySelector('.sl-val')!;
    const sync = () => { const v = d.get(); inp.value = String(Math.round(d.to ? d.to(v) : v * 100)); val.textContent = d.fmt(v); inp.setAttribute('aria-valuetext', d.fmt(v)); };
    scope.on(inp, 'input', () => { const p = Number(inp.value); d.set(d.from ? d.from(p) : p / 100); sync(); onChange(); });
    sync();
    return sync;
  };
  const bar = (i: number, label: string, valText: string, frac: number, color: string) => {
    $(`ml${i}`).textContent = label; $(`mv${i}`).textContent = valText;
    $(`mb${i}`).style.width = pct(frac) + '%'; $(`m${i}`).style.setProperty('--c', color);
  };
  const setHidden = (el: Element, h: boolean) => { (el as HTMLElement).hidden = h; };

  // =================================================================== 1) Hızlı yol
  const F: FastInputs = { ...FAST_DEFAULT };
  let R: FastResult = simulateFast(F);
  const fStim = $<SVGElement>('f-stim'), fMask = $<SVGElement>('f-mask');
  const skin: Record<string, string> = { faceB: 'var(--skin-d)', faceW: 'var(--skin-l)' };
  const stimEls = {} as Record<Stim, SVGElement>;
  for (const s of STIMS) stimEls[s] = svg('g', { class: 'stim', display: 'none' }, fStim);
  // Korkulu göz akları: geniş açık gözler
  for (const x of [48, 92]) { svg('ellipse', { class: 'sclera', cx: x, cy: 76, rx: 17, ry: 11 }, stimEls.fear); svg('circle', { class: 'pupil', cx: x, cy: 76, r: 4.5 }, stimEls.fear); }
  svg('path', { class: 'line', d: 'M32,58 Q48,52 62,58 M78,58 Q92,52 108,58' }, stimEls.fear);
  // Nötr yüz
  svg('circle', { class: 'outl', cx: 70, cy: 76, r: 32 }, stimEls.calm);
  svg('circle', { class: 'pupil2', cx: 58, cy: 70, r: 3 }, stimEls.calm); svg('circle', { class: 'pupil2', cx: 82, cy: 70, r: 3 }, stimEls.calm);
  svg('path', { class: 'line', d: 'M58,90 L82,90' }, stimEls.calm);
  // Soyut uyarı işareti
  svg('path', { class: 'tri', d: 'M70,44 L102,100 L38,100 Z' }, stimEls.sign);
  svg('path', { class: 'bangp', d: 'M70,62 L70,82 M70,91 L70,92' }, stimEls.sign);
  // Şematik yüzler: yalnızca ten tonu farklı, özellikler aynı
  for (const s of ['faceB', 'faceW'] as const) {
    svg('ellipse', { class: 'face', cx: 70, cy: 76, rx: 27, ry: 34, fill: skin[s] }, stimEls[s]);
    svg('circle', { class: 'pupil', cx: 60, cy: 70, r: 3 }, stimEls[s]); svg('circle', { class: 'pupil', cx: 80, cy: 70, r: 3 }, stimEls[s]);
    svg('path', { class: 'line2', d: 'M61,92 L79,92' }, stimEls[s]);
  }
  for (let r = 0; r < 10; r++) for (let c = 0; c < 12; c++) {
    if ((r * 7 + c * 13 + r * c) % 3 === 0) svg('rect', { class: 'mk-c', x: 10 + c * 10, y: 26 + r * 10, width: 10, height: 10 }, fMask);
  }
  fMask.setAttribute('display', 'none');

  const fChart = $<SVGElement>('f-chart');
  const CX0 = 34, CX1 = 350, CTOP = 26, CBOT = 120;
  const xOf = (t: number) => CX0 + (t / T_END) * (CX1 - CX0), yOf = (v: number) => CBOT - (CBOT - CTOP) * v;
  for (const v of [0, 0.5, 1]) { svg('line', { class: 'grid', x1: CX0, x2: CX1, y1: yOf(v), y2: yOf(v) }, fChart); svgText(fChart, { x: CX0 - 5, y: yOf(v) + 3.5, 'text-anchor': 'end' }, String(pct(v))); }
  for (const t of [0, 400, 800, 1200, 1600]) svgText(fChart, { x: xOf(t), y: 135, 'text-anchor': t === 0 ? 'start' : t === T_END ? 'end' : 'middle' }, t + (t === T_END ? ' ms' : ''));
  const stimBar = svg('rect', { class: 'stim-bar', x: CX0, y: 8, width: 3, height: 7 }, fChart);
  svgText(fChart, { x: CX0 + 52, y: 15, class: 'sm' }, 'uyaran · maske');
  const maskBar = svg('rect', { class: 'mask-bar', x: CX0, y: 8, width: 0, height: 7 }, fChart);
  const lFree = svg('polyline', { class: 'ln free', points: '' }, fChart);
  const lAmy = svg('polyline', { class: 'ln amy', points: '' }, fChart);
  const lFro = svg('polyline', { class: 'ln fro', points: '' }, fChart);
  const head = svg('line', { class: 'head', x1: CX0, x2: CX0, y1: CTOP - 4, y2: CBOT }, fChart);
  head.setAttribute('display', 'none');
  [['amy', 'Amigdala', 34], ['fro', 'Frontal (ACC/dlPFC)', 112], ['free', 'Fren olmasa', 252]].forEach(([c, n, x]) => {
    svg('line', { class: 'ln ' + c, x1: x as number, x2: (x as number) + 16, y1: 160, y2: 160 }, fChart);
    svgText(fChart, { x: (x as number) + 21, y: 164 }, n as string);
  });
  const pts = (a: Float32Array) => { const o: string[] = []; for (let t = 0; t < T_END; t += 8) o.push(`${xOf(t).toFixed(1)},${yOf(a[t]).toFixed(1)}`); return o.join(' '); };

  const dSlider: SliderDef = {
    key: 'dur', name: 'Gösterim süresi', hint: 'Whalen düzeneği 30 ms civarıdır; ~100 ms üzeri bilinçli görülür', cls: 'sl-amy',
    get: () => F.dur, set: (v) => { F.dur = v; },
    fmt: (v) => (v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + ' sn' : v + ' ms'),
    to: (v) => (100 * Math.log(v / 30)) / Math.log(2000 / 30),
    from: (p) => { const v = 30 * Math.pow(2000 / 30, p / 100); return v < 100 ? Math.round(v / 5) * 5 : Math.round(v / 10) * 10; },
  };
  const fSync: Array<() => void> = [];
  const fSliders = $('f-sliders');
  const fDefs: SliderDef[] = [
    dSlider,
    { key: 'load', name: 'Bilişsel yük', hint: 'Aklında yedi haneli bir sayı tutmak gibi: frontal kapasiteyi meşgul eder', cls: 'sl-pfc', get: () => F.load, set: (v) => { F.load = v; }, fmt: (v) => pct(v) + '%' },
    { key: 'frontal', name: 'Frontal güç', hint: 'Sağlıklı, dinlenmiş yetişkin yüksek; yorgun ya da stresli beyin düşük', cls: 'sl-pfc', get: () => F.frontal, set: (v) => { F.frontal = v; }, fmt: (v) => pct(v) + '%' },
    { key: 'assoc', name: 'Öğrenilmiş çağrışım', hint: 'Yalnızca Siyah yüzde: kültürel olarak öğrenilmiş tehdit çağrışımının gücü', cls: 'sl-amy', get: () => F.assoc, set: (v) => { F.assoc = v; }, fmt: (v) => pct(v) + '%' },
    { key: 'fam', name: 'Tanıdıklık', hint: 'Başka gruptan insanlara aşinalık çağrışımın etkisini azaltır', cls: 'sl-pfc', get: () => F.fam, set: (v) => { F.fam = v; }, fmt: (v) => pct(v) + '%' },
  ];
  const fWraps: HTMLElement[] = [];
  for (const d of fDefs) { fSync.push(mkSlider(fSliders, d, () => { fChanged(false); })); fWraps.push(fSliders.lastElementChild as HTMLElement); }

  // Oynatma durumu: t = ekran zamanı (ms), null = boşta
  let ft: number | null = null;
  let slow = false;
  let fDirty = true;
  const stimBtns: Record<string, HTMLButtonElement> = {};
  for (const s of STIMS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = STIM[s].name; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => { F.stim = s; fChanged(true); });
    $('f-stims').appendChild(b); stimBtns[s] = b;
  }
  const maskBtn = $<HTMLButtonElement>('f-mask-btn');
  scope.on(maskBtn, 'click', () => { F.masked = !F.masked; fChanged(true); });
  scope.on($('f-play'), 'click', () => play());
  const slowBtn = $('f-slow');
  scope.on(slowBtn, 'click', () => { slow = !slow; slowBtn.setAttribute('aria-pressed', String(slow)); play(); });

  const FP: Array<{ name: string; u: Partial<FastInputs> }> = [
    { name: 'Whalen: maskeli, 30 ms', u: { dur: 30, masked: true, stim: 'fear', load: 0 } },
    { name: 'Aynısı maskesiz', u: { dur: 30, masked: false, stim: 'fear', load: 0 } },
    { name: 'Uzun gösterim (1 sn)', u: { dur: 1000, masked: false, stim: 'fear', load: 0 } },
    { name: 'Yük altında', u: { dur: 1000, masked: false, stim: 'fear', load: 0.9 } },
  ];
  const presetBtns = FP.map((p) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = p.name; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => { Object.assign(F, FAST_DEFAULT, p.u); fSync.forEach((f) => f()); fChanged(true); });
    $('f-presets').appendChild(b); return b;
  });

  function play(): void { if (reduced) { ft = null; } else ft = 0; fDirty = true; }
  function fChanged(replay: boolean): void {
    R = simulateFast(F);
    fSync.forEach((f) => f());
    for (const s of STIMS) stimBtns[s].setAttribute('aria-pressed', String(F.stim === s));
    maskBtn.textContent = F.masked ? 'Maske açık' : 'Maske kapalı';
    maskBtn.setAttribute('aria-pressed', String(F.masked));
    FP.forEach((p, i) => presetBtns[i].setAttribute('aria-pressed', String(Object.entries({ ...FAST_DEFAULT, ...p.u }).every(([k, v]) => (F as unknown as Record<string, unknown>)[k] === v))));
    setHidden(fWraps[3], F.stim !== 'faceB'); setHidden(fWraps[4], F.stim !== 'faceB');
    stimBar.setAttribute('width', String(Math.max(2, xOf(Math.min(F.dur, T_END)) - CX0)));
    maskBar.setAttribute('x', String(xOf(Math.min(F.dur, T_END)))); maskBar.setAttribute('width', F.masked && F.dur < T_END ? String(xOf(MASK_MS) - CX0) : '0');
    lAmy.setAttribute('points', pts(R.amy)); lFro.setAttribute('points', pts(R.fro)); lFree.setAttribute('points', pts(R.free));
    $('f-tally').textContent = `Algı: ${R.awareness >= 0.5 ? 'uyaran bilinçli görüldü' : 'uyaran fark edilmedi'} (%${pct(R.awareness)}). Frenleme: %${pct(R.brake)}.`;
    if (replay) play(); else { ft = null; }
    fDirty = true;
    if (tab === 'fast') renderBar();
  }
  function drawFast(): void {
    const t = ft;
    const a = t === null ? R.peakA : R.amy[Math.min(T_END - 1, Math.floor(t))];
    const f = t === null ? R.peakF : R.fro[Math.min(T_END - 1, Math.floor(t))];
    $('f-na').setAttribute('fill-opacity', (0.06 + 0.94 * a).toFixed(2));
    $('f-nf').setAttribute('fill-opacity', (0.06 + 0.94 * f).toFixed(2));
    $('f-pa').textContent = pct(a) + '%'; $('f-pf').textContent = pct(f) + '%';
    const showStim = t !== null && t < F.dur;
    const showMask = t !== null && F.masked && t >= F.dur && t < F.dur + MASK_MS;
    for (const s of STIMS) stimEls[s].setAttribute('display', showStim && s === F.stim ? '' : 'none');
    fMask.setAttribute('display', showMask ? '' : 'none');
    $('f-time').textContent = t === null ? `ekran boş · gösterim ${dSlider.fmt(F.dur)}` : `t = ${Math.round(t)} ms`;
    if (t === null) head.setAttribute('display', 'none');
    else { head.setAttribute('display', ''); head.setAttribute('x1', String(xOf(t))); head.setAttribute('x2', String(xOf(t))); }
  }

  // =================================================================== 2) Norm ihlalleri
  const N: StreetCfg = { ...STREET_DEFAULT };
  let S: StreetState = newStreet(N, 7);
  let seed = 7;
  let C: Comparison = compare(N, 600, 1);
  let hist: number[] = [];
  const W = 360, LANE = 115, X = { flyer: 70, shortcut: 170, steal: 270 };
  const st = $<SVGElement>('n-street');
  svg('rect', { class: 'walk', x: 0, y: 100, width: W, height: 30 }, st);
  svg('rect', { class: 'wall', x: 20, y: 24, width: 130, height: 68, rx: 3 }, st);
  svgText(st, { x: 85, y: 18, 'text-anchor': 'middle' }, 'duvar');
  const graf = svg('g', { class: 'graf' }, st);
  svg('path', { d: 'M32,70 Q44,38 56,66 T80,60 M90,44 L112,78 M112,44 L90,78 M122,40 Q140,56 124,84', class: 'g1' }, graf);
  svg('path', { d: 'M30,84 Q60,76 86,86 T140,82', class: 'g2' }, graf);
  svg('rect', { class: 'fence', x: 150, y: 152, width: 40, height: 4 }, st); svg('rect', { class: 'fence', x: 215, y: 152, width: 45, height: 4 }, st);
  svgText(st, { x: 202, y: 180, 'text-anchor': 'middle' }, 'yasak aralık');
  svg('circle', { class: 'ban', cx: 202, cy: 166, r: 7 }, st); svg('path', { class: 'ban', d: 'M197,171 L207,161' }, st);
  const bikes = svg('g', { class: 'bikes' }, st);
  for (const x of [160, 238]) { svg('circle', { cx: x, cy: 146, r: 5 }, bikes); svg('circle', { cx: x + 14, cy: 146, r: 5 }, bikes); svg('path', { d: `M${x},146 L${x + 7},138 L${x + 14},146 M${x + 7},138 L${x + 5},134` }, bikes); }
  svg('rect', { class: 'mbox', x: 282, y: 70, width: 22, height: 30, rx: 3 }, st);
  const env = svg('g', { class: 'env' }, st);
  svg('rect', { x: 276, y: 86, width: 20, height: 11, rx: 1 }, env); svgText(env, { x: 286, y: 95, 'text-anchor': 'middle' }, '5€');
  svgText(st, { x: 70, y: 180, 'text-anchor': 'middle' }, 'ilan');
  svgText(st, { x: 292, y: 180, 'text-anchor': 'middle' }, 'posta kutusu');
  const litterG = svg('g', { class: 'litter' }, st);
  const agentsG = svg('g', {}, st);
  const spot = (cls: string, x: number, y: number, w: number, h: number, label: string, fn: () => void) => {
    const r = svg('rect', { class: 'hot', x, y, width: w, height: h, tabindex: 0, role: 'button', 'aria-label': label }, st);
    scope.on(r as unknown as HTMLElement, 'click', fn);
    scope.on(r as unknown as HTMLElement, 'keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fn(); } });
    void cls;
  };
  const toggle = (k: 'graffiti' | 'litter' | 'bikes') => { N[k] = !N[k]; nChanged(); };
  spot('w', 20, 24, 130, 68, 'Duvardaki grafitiyi ekle ya da kaldır', () => toggle('graffiti'));
  spot('b', 150, 134, 112, 24, 'Çite bağlı bisikletleri ekle ya da kaldır', () => toggle('bikes'));
  spot('l', 200, 108, 80, 22, 'Sokaktaki çöpü ekle ya da kaldır', () => toggle('litter'));

  const cueBtns: Record<string, HTMLButtonElement> = {};
  for (const [k, n] of [['graffiti', 'Grafiti'], ['litter', 'Çöp'], ['bikes', 'Yasak çitte bisikletler']] as const) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = n; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => toggle(k));
    $('n-cues').appendChild(b); cueBtns[k] = b;
  }
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button'; clearBtn.className = 'chip'; clearBtn.textContent = 'Hepsini temizle';
  scope.on(clearBtn, 'click', () => { N.graffiti = N.litter = N.bikes = false; nChanged(); });
  $('n-cues').appendChild(clearBtn);

  const nSync: Array<() => void> = [];
  nSync.push(mkSlider($('n-sliders'), { key: 'str', name: 'Etki gücü', hint: '%100 = özgün bulgu (≈ iki kat). Büyük replikasyon daha küçük etki buldu', cls: 'sl-amy', get: () => N.strength, set: (v) => { N.strength = v; }, fmt: (v) => pct(v) + '%' }, () => nChanged()));
  nSync.push(mkSlider($('n-sliders'), { key: 'ovs', name: 'Görünür denetim', hint: 'Görevli ya da kamera: ihlalleri azaltır (modelin varsayımı)', cls: 'sl-pfc', get: () => N.oversight, set: (v) => { N.oversight = v; }, fmt: (v) => pct(v) + '%' }, () => nChanged()));
  const chainBtn = $<HTMLButtonElement>('n-chain');
  scope.on(chainBtn, 'click', () => { N.chain = !N.chain; nChanged(); });
  let paused = false;
  const pauseBtn = $('n-pause');
  scope.on(pauseBtn, 'click', () => { paused = !paused; pauseBtn.setAttribute('aria-pressed', String(paused)); pauseBtn.textContent = paused ? 'Devam et' : 'Duraklat'; });
  scope.on($('n-rerun'), 'click', () => { seed++; nChanged(); });

  interface Agent { x: number; g: SVGElement; dot: SVGElement; bang: SVGElement; fl: SVGElement; d: number; sc: boolean; viol: boolean }
  let agents: Agent[] = [];
  let spawnT = 0, envUntil = 0, nTime = 0;
  let litterKey = '';

  const barsSvg = $<SVGElement>('n-bars');
  const histSvg = $<SVGElement>('n-hist');
  const hLine = svg('polyline', { class: 'ln dis', points: '' }, histSvg);
  for (const v of [0, 1]) { svg('line', { class: 'grid', x1: 34, x2: 350, y1: 66 - 54 * v, y2: 66 - 54 * v }, histSvg); svgText(histSvg, { x: 29, y: 70 - 54 * v, 'text-anchor': 'end' }, String(pct(v))); }
  svgText(histSvg, { x: 34, y: 80 }, 'eski'); svgText(histSvg, { x: 350, y: 80, 'text-anchor': 'end' }, 'şimdi');

  function drawBars(): void {
    barsSvg.replaceChildren();
    KINDS.forEach((k, i) => {
      const y = i * 48 + 4;
      svgText(barsSvg, { x: 6, y: y + 10, class: 'lab' }, kindName[k]);
      const w = (v: number) => Math.max(1.5, v * 230);
      svg('rect', { class: 'b-ord', x: 6, y: y + 15, width: w(C.orderly[k]), height: 10 }, barsSvg);
      svgText(barsSvg, { x: 10 + w(C.orderly[k]), y: y + 24 }, `düzenli %${pct(C.orderly[k])}`);
      svg('rect', { class: 'b-cur', x: 6, y: y + 28, width: w(C.current[k]), height: 10 }, barsSvg);
      svgText(barsSvg, { x: 10 + w(C.current[k]), y: y + 37, class: 'em' }, `mevcut %${pct(C.current[k])} · ${times(C.ratio[k])}`);
    });
    svg('rect', { class: 'b-ord', x: 6, y: 156, width: 9, height: 9 }, barsSvg); svgText(barsSvg, { x: 20, y: 164 }, 'Düzenli ortam (ipucu yok)');
    svg('rect', { class: 'b-cur', x: 178, y: 156, width: 9, height: 9 }, barsSvg); svgText(barsSvg, { x: 192, y: 164 }, 'Mevcut ortam');
  }
  function drawLitter(): void {
    const key = `${N.litter}|${S.drops.length}|${S.made}`;
    if (key === litterKey) return;
    litterKey = key;
    litterG.replaceChildren();
    if (N.litter) for (const [x, y] of [[212, 124], [238, 119], [262, 125]]) svg('path', { d: `M${x},${y} l7,-2 l2,6 l-8,2 z` }, litterG);
    for (const d of S.drops) svg('rect', { x: 30 + d.pos * 220, y: 106 + ((d.pos * 7) % 1) * 18, width: 8, height: 6, transform: `rotate(${Math.round(d.pos * 120 - 40)} ${34 + d.pos * 220} 110)`, opacity: 1 - d.age / 12 }, litterG);
  }
  function tallyText(): string {
    return KINDS.map((k) => `${kindName[k]}: ${S.v[k]}/${S.n[k]}`).join(' · ');
  }
  function drawStatic(): void {
    graf.setAttribute('display', N.graffiti ? '' : 'none');
    bikes.setAttribute('display', N.bikes ? '' : 'none');
    for (const k of ['graffiti', 'litter', 'bikes']) cueBtns[k].setAttribute('aria-pressed', String(N[k as 'graffiti']));
    chainBtn.textContent = N.chain ? 'Zincirleme açık' : 'Zincirleme kapalı';
    chainBtn.setAttribute('aria-pressed', String(N.chain));
    drawBars();
    litterKey = ''; drawLitter();
  }
  function nChanged(): void {
    C = compare(N, 600, 1);
    S = newStreet({ ...N }, seed);
    hist = [];
    for (const a of agents) a.g.remove();
    agents = []; spawnT = 0.4;
    nSync.forEach((f) => f());
    drawStatic();
    $('n-tally').textContent = tallyText();
    hLine.setAttribute('points', '');
    if (tab === 'norm') renderBar();
  }
  function spawn(): void {
    const g = svg('g', { class: 'ag' }, agentsG);
    const fl = svg('rect', { class: 'flyer', x: 4, y: -9, width: 6, height: 8 }, g);
    const dot = svg('circle', { r: 6 }, g);
    const bang = svg('path', { class: 'bang2', d: 'M0,-3.5 L0,1 M0,3.2 L0,3.4' }, g);
    bang.setAttribute('display', 'none');
    agents.push({ x: -10, g, dot, bang, fl, d: 0, sc: false, viol: false });
  }
  function stepNorm(dt: number): void {
    nTime += dt;
    spawnT -= dt;
    if (spawnT <= 0) { spawn(); spawnT = 1.1; }
    for (const a of agents) {
      a.x += 52 * dt;
      if (a.d < 1 && a.x >= X.flyer) { a.d = 1; if (decide(S, 'flyer')) { a.viol = true; a.fl.setAttribute('display', 'none'); } hist.push(disorderOf(S.cfg, S.drops)); if (hist.length > 60) hist.shift(); }
      if (a.d < 2 && a.x >= X.shortcut) { a.d = 2; a.sc = decide(S, 'shortcut'); if (a.sc) a.viol = true; }
      if (a.d < 3 && a.x >= X.steal) { a.d = 3; if (decide(S, 'steal')) { a.viol = true; envUntil = nTime + 1.2; } }
      const u = (a.x - 175) / 55;
      const y = a.sc && u >= 0 && u <= 1 ? LANE + 36 * Math.sin(Math.PI * u) : LANE;
      a.g.setAttribute('transform', `translate(${a.x.toFixed(1)},${y.toFixed(1)})`);
      a.dot.setAttribute('class', a.viol ? 'viol' : 'walker');
      a.bang.setAttribute('display', a.viol ? '' : 'none');
    }
    for (const a of agents) if (a.x > W + 12) a.g.remove();
    agents = agents.filter((a) => a.x <= W + 12);
    env.setAttribute('display', nTime < envUntil ? 'none' : '');
    drawLitter();
    $('n-tally').textContent = tallyText();
    const o: string[] = [];
    hist.forEach((v, i) => o.push(`${(34 + (i / Math.max(1, hist.length - 1)) * 316).toFixed(1)},${(66 - 54 * v).toFixed(1)}`));
    hLine.setAttribute('points', o.join(' '));
  }

  // =================================================================== Ortak: çubuk, sekmeler
  function renderBar(): void {
    if (tab === 'fast') {
      sayEl.textContent = describeFast(F, R);
      bar(0, 'Amigdala tepe', pct(R.peakA) + '%', R.peakA, 'var(--amy)');
      bar(1, 'Frontal fren', pct(R.brake) + '%', R.brake, 'var(--pfc)');
      bar(2, 'Farkındalık', pct(R.awareness) + '%', R.awareness, 'var(--ink)');
    } else {
      sayEl.textContent = describeStreet(N, C);
      KINDS.forEach((k, i) => bar(i, kindName[k], `${pct(C.current[k])}% ${times(C.ratio[k])}`, C.current[k], 'var(--amy)'));
    }
  }
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  function setTab(t: 'fast' | 'norm'): void {
    tab = t;
    tabs.forEach((b) => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-pressed', String(on)); b.tabIndex = on ? 0 : -1; });
    setHidden($('p-fast'), t !== 'fast'); setHidden($('p-norm'), t !== 'norm');
    renderBar();
  }
  tabs.forEach((b, i) => {
    scope.on(b, 'click', () => setTab(b.dataset.tab as 'fast' | 'norm'));
    scope.on(b, 'keydown', (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const nb = tabs[(i + 1) % tabs.length];
      nb.focus(); setTab(nb.dataset.tab as 'fast' | 'norm');
    });
  });
  const poke = scope.announcer(live, () => sayEl.textContent ?? '');
  scope.on(root, 'click', poke);
  scope.on(root, 'input', poke);

  fChanged(false);
  nChanged();
  setTab('fast');
  drawFast();

  // =================================================================== Tur
  const setF = (u: Partial<FastInputs>) => { Object.assign(F, FAST_DEFAULT, u); fChanged(true); };
  const setN = (u: Partial<StreetCfg>) => { Object.assign(N, STREET_DEFAULT, u); seed = 7; nChanged(); };
  const tour = createTour(scope, [
    {
      title: 'Görmeden korkmak',
      text: 'Korkulu göz 30 ms gösterilip maskeleniyor; katılımcı görmediğini söyler. Whalen\'in çalışmasında amigdala yine de tepki verdi. Frontal korteks yavaş olduğu için fren yetişmez.',
      look: 'Kırmızı eğri yükselir, mavi eğri neredeyse hiç kalkmaz.',
      apply: () => { setTab('fast'); setF({}); },
    },
    {
      title: 'Süre uzayınca fren devreye girer',
      text: 'Gösterim 1 saniyeye çıkınca uyaran bilinçli görülür. Frontal korteks (ACC, dlPFC) amigdalayı yaklaşık 150 ms gecikmeyle frenler.',
      look: 'Mavi eğrinin kırmızıdan geç yükselmesi ve kırmızının kesikli eğrinin altına inmesi.',
      apply: () => { setTab('fast'); setF({ dur: 1000, masked: false }); },
    },
    {
      title: 'Yük freni zayıflatır',
      text: 'Aynı uyaran, ama frontal kapasite başka bir işle meşgul (örneğin aklında bir sayı tutuluyor). Fren zayıflar ve tepki daha uzun sürer.',
      look: 'Frontal frenin yüzdesi düşer, kırmızı eğri kesikliye yaklaşır.',
      apply: () => { setTab('fast'); setF({ dur: 1000, masked: false, load: 0.9 }); },
    },
    {
      title: 'Düzenli sokak',
      text: 'Sanal yayalar üç yerde bir normu bozma fırsatı bulur: ilanı yere atma, yasak aralıktan geçme, posta kutusundaki zarfı alma. Ortam düzenliyken oranlar düşüktür.',
      look: 'Alt çubuktaki üç oran ve çubuk grafikte yalnızca mavi çubuklar.',
      apply: () => { setTab('norm'); setN({}); },
    },
    {
      title: 'Bir ihlal başkasını çağırır',
      text: 'Duvara grafiti eklenince ilan atma yaklaşık iki katına çıkar (Keizer). Yere düşen ilanlar çöp ipucuna dönüşür ve zarf alma da artar.',
      look: 'Kırmızı çubuğun mavi çubuğun yaklaşık iki katı olması; yerde biriken ilanlar.',
      apply: () => { setTab('norm'); setN({ graffiti: true }); },
    },
    {
      title: 'Gerçek etki daha küçük olabilir',
      text: 'Hollanda\'daki büyük replikasyon etkiyi buldu ama özgün çalışmadan daha küçük ve mahalleye göre değişken. Etki gücünü düşürüp tüm ihlalleri ekleyince oranların nasıl daraldığına bak.',
      look: 'Etki gücü %40 iken kırmızı çubukların yine mavilerin üstünde ama çok daha yakın olması.',
      apply: () => { setTab('norm'); setN({ graffiti: true, litter: true, bikes: true, strength: 0.4 }); },
    },
  ]);
  root.querySelector('.lede')!.after(tour.el);

  // =================================================================== Döngü
  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (tab === 'fast') {
      if (ft !== null) {
        ft += dt * 1000 * (slow ? SLOW : 1);
        if (ft >= T_END) ft = null;
        drawFast();
      } else if (fDirty) drawFast();
      fDirty = false;
    } else if (!paused) stepNorm(dt);
  }
  scope.loop(frame, { root, onResume: () => { last = performance.now(); fDirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
