import '../sim.css';
import './view.css';
import { Scope, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  CASES, FACTORS, LIBET, RESPS, RP_ONSET, SCH, artefactShare, clamp, clockAngle, defaultShares, evaluate,
  judgments, makePlayers, markAngle, outcome, punishStats, punishes, quadrant, quintiles, recommend, rpGap, rpLibet, runSchurger, sample,
  trueGap, vetoWindow, wFromAngles, wtp, type Resp, type SchParams, type SchRun,
} from './model';

type Tab = 'lib' | 'cok' | 'ceza';
type View = 'libet' | 'sch' | 'both';

const ms = (v: number): string => `${v < 0 ? '−' : ''}${Math.abs(Math.round(v))} ms`;
const pc = (x: number): string => `%${Math.round(x * 100)}`;
const f2 = (x: number): string => x.toFixed(2).replace('.', ',');
const FCOL = ['var(--pit)', 'var(--amy)', 'var(--dop)', 'var(--gld)', 'var(--pfc)', 'var(--lesion)'];

const sv = (w: number, h: number, inner: string): string => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
const lg = (...a: [string, string][]): string => `<div class="legend">${a.map(([i, t]) => `<span>${i}${t}</span>`).join('')}</div>`;
const line = (c: string, dash = ''): string => sv(26, 10, `<path d="M1 5H25" stroke="${c}" stroke-width="2.4"${dash}/>`);
const swatch = (c: string, o = 1): string => sv(16, 12, `<rect x="1" y="2" width="14" height="8" rx="2" fill="${c}" fill-opacity="${o}" stroke="${c}"/>`);
const dotS = (filled: boolean): string => sv(14, 12, `<circle cx="7" cy="6" r="4.4" fill="${filled ? 'var(--amy)' : 'none'}" stroke="${filled ? 'var(--amy)' : 'var(--edge)'}" stroke-width="1.5"/>`);

const TEMPLATE = (id: string) => `
<div class="sim sim-ozg">
  <p class="lede">Davranışın biyolojik nedenlerini anladıkça "suçlu" kavramına ne olur?</p>
  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    <button class="tab" role="tab" id="${id}-tab-lib" data-pane="lib" aria-controls="${id}-pane-lib" aria-selected="true" type="button">Libet</button>
    <button class="tab" role="tab" id="${id}-tab-cok" data-pane="cok" aria-controls="${id}-pane-cok" aria-selected="false" tabindex="-1" type="button">Çok etkenli tahmin</button>
    <button class="tab" role="tab" id="${id}-tab-ceza" data-pane="ceza" aria-controls="${id}-pane-ceza" aria-selected="false" tabindex="-1" type="button">Ceza ve tatmin</button>
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık çıktılar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- ============ 1 · Libet ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-lib" data-pane="lib" aria-labelledby="${id}-tab-lib">
    <div data-ref="tour1"></div>
    <section class="card" aria-label="Saat oyunu">
      <h3 class="sim-h">1 · Saat oyunu: niyeti işaretle</h3>
      <p class="note" data-ref="clockNote"></p>
      <div class="chart"><svg viewBox="0 0 360 220" role="img" aria-label="Saat: dönen nokta, hareket anı ve işaretlenen niyet anı" data-ref="clock"></svg></div>
      ${lg([swatch('var(--pfc)'), 'nokta / hareket anı (M)'], [sv(14, 12, '<path d="M7 1L12.5 6L7 11L1.5 6z" fill="var(--dop)" stroke="var(--ink)" stroke-width="1"/>'), 'niyetin hissedildiği an (W)'])}
      <div class="row"><button class="btn btn-go" type="button" data-ref="go">Başlat</button><button class="btn" type="button" data-ref="save" disabled>İşareti kaydet</button></div>
      <div class="sliders" data-ref="wSl"></div>
      <p class="note" data-ref="tries"></p>
    </section>

    <section class="card" aria-label="Hazırlık potansiyeli">
      <h3 class="sim-h">2 · Hazırlık potansiyeli (RP): iki yorum</h3>
      <div class="chips" role="group" aria-label="Yorum" data-ref="viewChips"></div>
      <div class="chart"><svg viewBox="0 0 360 214" role="img" aria-label="Hazırlık potansiyeli eğrisi" data-ref="rp"></svg></div>
      <div data-ref="rpKey"></div>
      <div class="sliders" data-ref="schSl"></div>
      <div class="row" data-ref="schRow"><button class="btn" type="button" data-ref="rerun">Yeniden çalıştır</button></div>
    </section>

    <section class="card" aria-label="Veto penceresi">
      <h3 class="sim-h">3 · Veto penceresi ve ölçüm kayması</h3>
      <div class="sliders" data-ref="vetoSl"></div>
      <div class="readout" data-ref="vetoRead"></div>
    </section>

    <details class="how">
      <summary>Model nasıl çalışıyor?</summary>
      <div class="how-in">
        <p>Libet eğrisi kitaptaki ilişkiye oturtuldu: RP, bildirilen niyetten yaklaşık yarım saniye önce başlıyor. W'nin başlangıç değeri (-200 ms), saatin tur süresi (2,5 sn), eğrinin biçimi ve veto için geri dönüşsüz son aralık (100 ms) modelin varsayımıdır.</p>
        <p>Schurger tarzı model: bir birikim değişkeni sürüklenmeyle yükselir, sızıntıyla geri çekilir, gürültüyle dalgalanır; eşiğe varınca hareket başlar. Binlerce denemenin eşik öncesi izleri geçişe hizalanıp ortalanınca RP benzeri bir yükseliş çıkar; hizalanmayan ortalama düz kalır. Parametreler gerçek veriye oturtulmadı.</p>
        <p>Kayma: bildirim gerçek niyetten geç ise gerçek niyet daha erkendir ve RP ile aradaki gerçek süre kısalır. Artefakt payı, kaymanın ölçülen aralığa oranıdır.</p>
      </div>
    </details>
    <section class="book" aria-label="Kitapta">
      <h3 class="sim-h">Kitapta</h3>
      <ul class="book-list">
        <li><a href="#/bolum/ch16?deney=ch16-e2">Libet ve ark. (1983)</a>: RP, bildirilen niyetten yaklaşık yarım saniye önce başladı; Libet, aradaki sürede vetoyu mümkün gördü. Eleştirmenler gecikmeyi saatin okunmasına ve dikkate bağlar. Replikasyon: tartışmalı. RP önce başlıyor bulgusu tekrarlandı; Schurger ve ark. (2012) RP'nin karar sinyali değil, rastgele dalgalanmaların birikimi olabileceğini gösterdi.</li>
      </ul>
    </section>
  </section>

  <!-- ============ 2 · Çok etkenli tahmin ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-cok" data-pane="cok" aria-labelledby="${id}-tab-cok" hidden>
    <div data-ref="tour2"></div>
    <section class="card" aria-label="Etkenler">
      <h3 class="sim-h">1 · Hangi etkenler biliniyor?</h3>
      <div class="fgrid" role="group" aria-label="Bilinen etkenler" data-ref="facts"></div>
      <div class="sliders" data-ref="geneSl"></div>
    </section>
    <section class="card" aria-label="Öngörü gücü">
      <h3 class="sim-h">2 · Öngörü gücü</h3>
      <div class="chart"><svg viewBox="0 0 360 100" role="img" aria-label="Bilinen etkenlerin açıkladığı pay" data-ref="stack"></svg></div>
    </section>
    <section class="card" aria-label="Yüz kişi">
      <h3 class="sim-h">3 · Aynı etkenler, 100 kişi</h3>
      <p class="note">Her halka bir kişi. Satırlar, bilinen etkenlere göre sıralanan beşte birler; üstte en riskli olanlar.</p>
      <div class="chart"><svg viewBox="0 0 360 196" role="img" aria-label="Yüz kişi, risk gruplarına göre" data-ref="grid"></svg></div>
      ${lg([dotS(true), 'davranışı gösterdi'], [dotS(false), 'göstermedi'])}
      <div class="row"><button class="btn" type="button" data-ref="reseedC">Başka örneklem</button></div>
      <div class="readout" data-ref="cokRead"></div>
    </section>
    <details class="how">
      <summary>Model nasıl çalışıyor?</summary>
      <div class="how-in">
        <p>Her etkenin payı birbirinden bağımsız varsayılır; öngörü gücü, bilinen etkenlerin açıkladığı payların toplamıdır. Gizli bir eğilim, etkenlerin katkısı ile açıklanamayan rastlantının toplamından oluşur; üst %20'de olan kişi davranışı gösterir (oran modelin varsayımı).</p>
        <p>İlk üç pay kitabın %10, %25 ve %40 basamaklarına oturtuldu. Kortizol, kültür ve frontal hasar payları ile etkenlerin yaygınlığı modelin varsayımıdır; toplam bilerek %50'nin hemen altında tutuldu. Kitap, diğer etkenlerle %50'nin üstüne çıkılabileceğini de söyler; ama davranış sonuçlarının çoğunda %50'nin altını vurgular. Kitaptaki tahminlerin kendisi kabadır.</p>
        <p>Rakamlar sabit tohumlu 4000 kişilik bir örneklemden gelir. Halkalar ise 100 kişilik örneklemdir ve "Başka örneklem" ile değişir; aynı örneklemde kişiler ve sonuçlar sabit kalır, yalnızca bilinen etkenler değişir.</p>
      </div>
    </details>
    <section class="book" aria-label="Kitapta">
      <h3 class="sim-h">Kitapta</h3>
      <ul class="book-list">
        <li><a href="#/bolum/ch16?deney=ch16-e5">Sapolsky'nin hesap örneği</a>: yalnızca gen ~%10, ebeveyn kaybıyla ~%25, yoksulluk ve yalnızlıkla ~%40; ağır frontal hasarda bile belirli davranış sonuçlarının öngörülebilirliği çoğunlukla %50'nin altında. Sayılar kitapta da kaba tahmindir; kitap diğer etkenlerle %50'nin üstüne çıkılabileceğini de belirtir, model toplamı %50'nin hemen altında tutar. Replikasyon: tartışmalı. Dayandığı gen × stres etkileşimi büyük ortak analizlerde tekrarlanamadı (38.000'den fazla kişi).</li>
      </ul>
    </section>
  </section>

  <!-- ============ 3 · Ceza ve tatmin ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-ceza" data-pane="ceza" aria-labelledby="${id}-tab-ceza" hidden>
    <div data-ref="tour3"></div>
    <section class="card" data-card="pun" aria-label="Cezanın tatmini">
      <h3 class="sim-h">1 · Ceza neden tatmin eder?</h3>
      <p class="note">Her nokta bir oyuncu. Yatay eksen: bedelsiz cezalandırırken ödül devresinin (striatumdaki kaudat) etkinliği. Dikey eksen: bedelli durumda ödemeye razı olduğu en yüksek bedel.</p>
      <div class="chart"><svg viewBox="0 0 360 230" role="img" aria-label="Kaudat etkinliğine göre ödemeye razı olunan bedel" data-ref="scat"></svg></div>
      ${lg([dotS(true), 'cezalandırıyor'], [dotS(false), 'cezalandırmıyor'], [line('var(--ink)', ' stroke-dasharray="4 3"'), 'cezanın bedeli'])}
      <div class="sliders" data-ref="punSl"></div>
      <div class="row"><button class="btn" type="button" data-ref="reseedP">Başka oyuncular</button></div>
      <div class="readout" data-ref="punRead"></div>
    </section>

    <section class="card" data-card="case" aria-label="Sorumluluk ve ceza kararı">
      <h3 class="sim-h">2 · Sorumluluk kararı ile ceza kararı ayrı devreler</h3>
      <div class="chips" role="group" aria-label="Vaka" data-ref="caseChips"></div>
      <p class="note" data-ref="caseText"></p>
      <div class="sliders" data-ref="bioSl"></div>
      <div class="dual" data-ref="dual"></div>
      <p class="note" data-ref="dualNote"></p>
    </section>

    <section class="card" data-card="case" aria-label="Suçlama ve tehlikelilik">
      <h3 class="sim-h">3 · Aynı vaka, iki ayrı soru</h3>
      <p class="note">Freni bozuk bir araç yoldan çekilir ve onarılır; kimse arabayı suçlamaz. Aynı vakada "ne kadar suçlu?" ile "ne kadar tehlikeli?" ayrı sorulardır; her biri için puan ver.</p>
      <div class="sliders" data-ref="rateSl"></div>
      <div class="seg" role="group" aria-label="Önlem" data-ref="resps"></div>
      <div class="dual" data-ref="outs"></div>
      <p class="note" data-ref="advice"></p>
      <div class="chart"><svg viewBox="0 0 360 250" role="img" aria-label="Vakaların suçlama ve tehlikelilik puanları" data-ref="quad"></svg></div>
      <div data-ref="quadKey"></div>
    </section>

    <details class="how">
      <summary>Model nasıl çalışıyor?</summary>
      <div class="how-in">
        <p>Ödemeye razılık = adaletsizlik x (norm payı + ödül ağırlığı x kaudat etkinliği + bireysel fark). Kitaptan yalnızca yön gelir: bedelsiz cezada ödül devresi ne kadar etkinse, bedelli durumda o kadar çok ödenir. Dağılımlar ve ağırlıklar modelin varsayımıdır.</p>
        <p>Sorumluluk kararı (dlPFC, bilişsel) biyolojik açıklama arttıkça düşer. Ceza dürtüsü (vmPFC, amigdala, insula; duygusal) zarara bağlıdır ve bilgiyle çok az düşer. Yön Buckholtz'un bulgusundan gelir; ağırlıklar varsayımdır.</p>
        <p>Vakalar kurgudur ve kitapta bu adla yoktur. Önlemlerin güvenlik, neden giderme ve tatmin katsayıları modelin varsayımıdır; amaç, suçlama ile tehlikeliliğin ayrı sorular olduğunu göstermektir. Tehlikelilik önerisi yalnızca tehlikelilik puanına ve tedavi edilebilirliğe bakar.</p>
      </div>
    </details>
    <section class="book" aria-label="Kitapta">
      <h3 class="sim-h">Kitapta</h3>
      <ul class="book-list">
        <li><a href="#/bolum/ch16?deney=ch16-e7">de Quervain ve ark. (2004)</a>: bedelsiz cezalandırmada ödül sistemi ne kadar etkinse, katılımcı cezalandırmak için o kadar çok ödemeye razıydı. Replikasyon: karışık. Striatum etkinleşmesi desteklendi, ama bunun intikam hazzı mı yoksa hedef beklentisi mi olduğu tartışmalı; örneklem küçüktü.</li>
        <li><a href="#/bolum/ch16?deney=ch16-e6">Buckholtz ve ark. (2008)</a>: sorumluluk kararı dlPFC ile, ceza miktarı vmPFC, amigdala ve insulayla ilişkiliydi. Replikasyon: bilinmiyor; dlPFC rolü sonradan TMS ile küçük örneklemlerde sınandı.</li>
        <li><a href="#/bolum/ch16?deney=ch16-e1">Steinberg ve ark. (2009)</a>, ergen vakası: ergen frontal korteksinin olgunlaşmamışlığı saniyelik dürtü kontrolü için belirleyicidir. Replikasyon: sağlam. Modellenmedi: <a href="#/bolum/ch16?deney=ch16-e3">Dweck</a> (tartışmalı), <a href="#/bolum/ch16?deney=ch16-e4">TMS ile ahlaki karar</a> (bilinmiyor).</li>
      </ul>
    </section>
  </section>

  <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan: RP'nin niyetten yaklaşık yarım saniye önce başlaması; öngörü basamakları ~%10, ~%25, ~%40 ve tüm etkenlerle bile %50 dolayında kalması (kaba tahmin); bedelsiz cezada ödül devresi etkinliğinin ödeme isteğini öngörmesi; sorumluluk için dlPFC, ceza miktarı için duygusal bölgeler. Saatin devri, geri dönüşsüz aralık, Schurger parametreleri, etken payları ve yaygınlıkları, oyuncu dağılımları, vakalar ve önlem katsayıları modelin varsayımıdır.</p>
</div>`;

interface SliderHandle { inp: HTMLInputElement; set: (v: number) => void }
interface Meter { label: string; text: string; frac: number; color: string }

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('ozg');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  let slN = 0;

  /* ---------- Durum ---------- */
  const S = {
    tab: 'lib' as Tab,
    // 1 · Libet
    clock: 'idle' as 'idle' | 'run' | 'done', t0: 0, press: 0, w: LIBET.wRef as number, tries: [] as number[],
    view: 'libet' as View, sch: { ...SCH } as SchParams, seed: 3, noReturn: LIBET.noReturn as number, shift: 0,
    // 2 · Çok etkenli
    known: FACTORS.map(() => false), gene: FACTORS[0].share, seedC: 1,
    // 3 · Ceza
    seedP: 2, unfair: 1, cost: 2, wRew: 3, caseId: 'tumor', bio: CASES[0].bio, resp: 'onarim' as Resp, focus: 'pun' as 'pun' | 'case',
    rates: Object.fromEntries(CASES.map((c) => [c.id, { b: 50, d: 50, t: false }])) as Record<string, { b: number; d: number; t: boolean }>,
  };
  let dirty = true, lastSay = '', lastNow = performance.now(), saved = false;
  const curCase = () => CASES.find((c) => c.id === S.caseId)!;

  /* ---------- Yardımcılar ---------- */
  function makeSlider(parent: HTMLElement, o: { name: string; hint: string; min: number; max: number; step: number; val: number; fmt: (v: number) => string; cb: (v: number) => void; color?: string }): SliderHandle {
    const sid = `${id}-s${++slN}`;
    const wrap = document.createElement('div');
    wrap.className = 'sl';
    if (o.color) wrap.style.setProperty('--c', o.color);
    wrap.innerHTML = `<div class="sl-top"><label class="sl-name" for="${sid}">${o.name}</label><span class="sl-val"></span></div><input type="range" id="${sid}" min="${o.min}" max="${o.max}" step="${o.step}"><p class="sl-hint">${o.hint}</p>`;
    parent.appendChild(wrap);
    const inp = wrap.querySelector('input')!, val = wrap.querySelector<HTMLElement>('.sl-val')!;
    const set = (v: number) => { inp.value = String(v); val.textContent = o.fmt(v); inp.setAttribute('aria-valuetext', o.fmt(v)); };
    set(o.val);
    scope.on(inp, 'input', () => { const v = Number(inp.value); set(v); o.cb(v); dirty = true; });
    return { inp, set };
  }
  function toggles<T extends string>(parent: HTMLElement, items: { k: T; name: string }[], get: () => T, pick: (k: T) => void, cls = 'btn'): () => void {
    const btns = items.map((it) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = cls; b.textContent = it.name; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => { pick(it.k); dirty = true; });
      parent.appendChild(b);
      return b;
    });
    return () => items.forEach((it, i) => btns[i].setAttribute('aria-pressed', String(get() === it.k)));
  }
  const tiles = (xs: [string, string][]): string => xs.map(([l, v]) => `<div class="ro"><span>${l}</span><b>${v}</b></div>`).join('');
  const setW = (el: HTMLElement, frac: number) => { el.style.width = `${(clamp(frac) * 100).toFixed(1)}%`; };
  /** Etiket + iz + değer satırları; her satır için bir ayarlayıcı döner. */
  function barRows(parent: HTMLElement, rows: { label: string; color: string }[]): ((frac: number, text: string) => void)[] {
    return rows.map((r) => {
      const d = document.createElement('div');
      d.className = 'brow';
      d.style.setProperty('--c', r.color);
      d.innerHTML = `<span class="bl">${r.label}</span><div class="track"><b></b></div><b class="bv"></b>`;
      parent.appendChild(d);
      const fill = d.querySelector<HTMLElement>('.track b')!, val = d.querySelector<HTMLElement>('.bv')!;
      return (frac: number, text: string) => { setW(fill, frac); val.textContent = text; };
    });
  }

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
  const meterWrap = $('meters');
  const meterEls = [0, 1, 2].map(() => {
    const d = document.createElement('div');
    d.className = 'm';
    d.innerHTML = '<div class="m-top"><span></span><b></b></div><div class="track"><b></b></div>';
    meterWrap.appendChild(d);
    return { d, l: d.querySelector('span')!, t: d.querySelector<HTMLElement>('.m-top b')!, f: d.querySelector<HTMLElement>('.track b')! };
  });
  function setBar(say: string, ms3: Meter[]): void {
    $('say').textContent = say;
    lastSay = say;
    ms3.forEach((m, i) => {
      const e = meterEls[i];
      e.d.style.setProperty('--c', m.color);
      e.l.textContent = m.label; e.t.textContent = m.text; setW(e.f, m.frac);
    });
  }

  /* =====================================================================
     1 · Libet
     ===================================================================== */
  const CX = 180, CY = 108, R = 80;
  const pos = (deg: number, r: number): [number, number] => [CX + r * Math.sin((deg * Math.PI) / 180), CY - r * Math.cos((deg * Math.PI) / 180)];
  const clockSvg = $<SVGSVGElement>('clock');
  let dotEl: SVGElement | null = null;
  const NOTE = {
    idle: 'Başlat\'a bas; nokta saatte dönmeye başlar. Hareket etme isteği doğduğu an Hareket düğmesine bas.',
    run: 'Nokta dönüyor. Hareket etme isteği doğduğu an Hareket düğmesine bas (Boşluk tuşu da olur).',
    done: 'Niyet ilk hissedildiğinde nokta neredeydi? Halkaya dokun ya da kaydırıcıyı oynat, sonra kaydet.',
  };

  function drawClock(): void {
    clockSvg.replaceChildren();
    const g = svg('g', {}, clockSvg);
    svg('circle', { class: 'ring', cx: CX, cy: CY, r: R }, g);
    for (let i = 0; i < 25; i++) {
      const a = (i / 25) * 360, [x1, y1] = pos(a, R - (i % 5 === 0 ? 11 : 6)), [x2, y2] = pos(a, R);
      svg('line', { class: i % 5 === 0 ? 'tk big' : 'tk', x1, y1, x2, y2 }, g);
    }
    const done = S.clock === 'done';
    const pressDeg = done ? S.press : 0;
    if (done) {
      const mk = markAngle(S.press, S.w), [ax, ay] = pos(mk, R), [bx, by] = pos(S.press, R);
      svg('path', { class: 'arc', d: `M${ax.toFixed(1)} ${ay.toFixed(1)}A${R} ${R} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}` }, g);
      const [wx, wy] = pos(mk, R);
      svg('path', { class: 'wmk', d: `M${wx} ${wy - 8}L${wx + 7} ${wy}L${wx} ${wy + 8}L${wx - 7} ${wy}z` }, g);
      const [lx, ly] = pos(mk, R + 17), [mx, my] = pos(S.press, R + 17);
      svgText(g, { class: 'lb w', x: lx, y: ly + 4, 'text-anchor': 'middle' }, 'W');
      svgText(g, { class: 'lb', x: mx, y: my + 4, 'text-anchor': 'middle' }, 'M');
      svgText(g, { class: 'big-n', x: CX, y: CY + 4, 'text-anchor': 'middle' }, ms(S.w));
      svgText(g, { class: 'sub', x: CX, y: CY + 22, 'text-anchor': 'middle' }, 'harekete göre');
    } else {
      svgText(g, { class: 'sub', x: CX, y: CY + 4, 'text-anchor': 'middle' }, S.clock === 'run' ? 'saat çalışıyor' : 'hazır');
    }
    const [dx, dy] = pos(pressDeg, R);
    dotEl = svg('circle', { class: done ? 'dot frozen' : 'dot', cx: dx, cy: dy, r: 7 }, g);
    clockSvg.setAttribute('aria-label', done ? `Saat: hareket anı ile niyet anı arasında ${ms(S.w)}` : 'Saat: dönen nokta');
  }

  const goBtn = $<HTMLButtonElement>('go'), saveBtn = $<HTMLButtonElement>('save');
  function clockGo(): void {
    if (S.clock === 'run') {
      S.press = clockAngle(Math.max(0, lastNow - S.t0));
      S.clock = 'done';
    } else { S.t0 = lastNow; S.clock = 'run'; }
    saved = false; dirty = true;
  }
  scope.on(goBtn, 'click', clockGo);
  scope.on(saveBtn, 'click', () => {
    S.tries.push(S.w); saved = true; dirty = true;
  });
  scope.on(clockSvg, 'pointerdown', (ev) => {
    if (S.clock !== 'done') return;
    const e = ev as PointerEvent, r = clockSvg.getBoundingClientRect();
    if (!r.width) return;
    const k = r.width / 360;
    const deg = ((Math.atan2(e.clientX - (r.left + CX * k), -(e.clientY - (r.top + CY * k))) * 180) / Math.PI + 360) % 360;
    const w = wFromAngles(S.press, deg);
    if (w !== null) { S.w = w; wSl.set(w); saved = false; dirty = true; }
  });

  const wSl = makeSlider($('wSl'), {
    name: 'Niyetin hissedildiği an (W)', hint: `Hareketten ne kadar önce? Başlangıç ${ms(LIBET.wRef)} (modelin varsayımı).`, min: LIBET.wMin, max: 0, step: 10, val: S.w, color: 'var(--dop)',
    fmt: ms, cb: (v) => { S.w = v; saved = false; },
  });

  /* ---- RP grafiği ---- */
  const rpSvg = $<SVGSVGElement>('rp');
  const X = (t: number) => 30 + (t + 1000) * 0.2564, Y = (a: number) => 170 - clamp(a, -0.05, 1.05) * 130;
  const pathOf = (xs: number[], f: (i: number) => number): string => 'M' + xs.map((t, i) => `${X(t).toFixed(1)} ${Y(f(i)).toFixed(1)}`).join('L');
  const schMemo: { key: string; run: SchRun | null } = { key: '', run: null };
  function schRun(): SchRun {
    const k = `${S.sch.drive}|${S.sch.noise}|${S.seed}`;
    if (schMemo.key !== k || !schMemo.run) { schMemo.key = k; schMemo.run = runSchurger(S.sch, S.seed); }
    return schMemo.run;
  }
  const gapNow = () => rpGap(S.w);
  function drawRP(): void {
    rpSvg.replaceChildren();
    const sch = S.view !== 'libet' ? schRun() : null;
    const g = svg('g', {}, rpSvg);
    for (const t of [-1000, -750, -500, -250, 0]) {
      svg('line', { class: 'grid', x1: X(t), x2: X(t), y1: 40, y2: 170 }, g);
      svgText(g, { class: 'ax', x: X(t), y: 186, 'text-anchor': 'middle' }, t === 0 ? '0' : `${t}`.replace('-', '−'));
    }
    svg('line', { class: 'base', x1: 30, x2: 312, y1: 170, y2: 170 }, g);
    svgText(g, { class: 'ax', x: 171, y: 204, 'text-anchor': 'middle' }, 'ms (hareket = 0)');
    // veto penceresi
    const vw = vetoWindow(S.w, S.noReturn);
    if (vw > 0) svg('rect', { class: 'veto', x: X(S.w), y: 40, width: X(-S.noReturn) - X(S.w), height: 130 }, g);
    // eğriler
    const ts: number[] = []; for (let t = RP_ONSET; t <= 0; t += 10) ts.push(t);
    if (S.view !== 'sch') svg('path', { class: 'ln libet', d: pathOf(ts, (i) => rpLibet(ts[i])) }, g);
    if (sch) {
      sch.examples.forEach((ex) => svg('path', { class: 'ln ex', d: pathOf(sch.t, (i) => ex[i]) }, g));
      svg('path', { class: 'ln flat', d: pathOf(sch.t, (i) => sch.unlocked[i]) }, g);
      svg('path', { class: 'ln sch', d: pathOf(sch.t, (i) => sch.locked[i]) }, g);
    }
    // işaretler
    svg('line', { class: 'mline', x1: X(0), x2: X(0), y1: 34, y2: 170 }, g);
    svgText(g, { class: 'lb', x: X(0) + 4, y: 30, 'text-anchor': 'start' }, 'hareket');
    svg('line', { class: 'wline', x1: X(S.w), x2: X(S.w), y1: 34, y2: 170 }, g);
    svgText(g, { class: 'lb w', x: X(S.w), y: 30, 'text-anchor': 'middle' }, 'W');
    // aralık oku
    const from = S.view === 'sch' && sch && sch.onset ? sch.onset : RP_ONSET;
    const gap = S.w - from;
    if (gap > 0) {
      svg('path', { class: 'brk', d: `M${X(from)} 19V13H${X(S.w)}V19` }, g);
      svgText(g, { class: 'lb', x: (X(from) + X(S.w)) / 2, y: 9, 'text-anchor': 'middle' }, `${S.view === 'sch' ? 'yükseliş' : 'RP'} → W: ${Math.round(gap)} ms`);
    }
    rpSvg.setAttribute('aria-label', S.view === 'sch' ? 'Rastgele birikim modelinde eşik geçişlerine hizalanmış ortalama' : 'Libet yorumuyla RP eğrisi, niyet anı ve veto penceresi');
    $('rpKey').innerHTML = lg(
      ...(S.view !== 'sch' ? [[line('var(--pfc)'), 'Libet: RP'] as [string, string]] : []),
      ...(sch ? [[line('var(--pit)'), 'Schurger: hizalı ortalama'] as [string, string], [line('var(--muted)', ' stroke-dasharray="4 3"'), 'hizalanmamış ortalama'] as [string, string]] : []),
      [line('var(--dop)', ' stroke-dasharray="3 3"'), 'W niyet'], [swatch('var(--dop)', 0.3), 'veto penceresi'],
    );
  }
  const viewHandles = toggles($('viewChips'), [{ k: 'libet' as View, name: 'Libet yorumu' }, { k: 'sch' as View, name: 'Schurger yorumu' }, { k: 'both' as View, name: 'Karşılaştır' }], () => S.view, (k) => { S.view = k; }, 'chip');
  const schSl = $('schSl'), schRow = $('schRow');
  makeSlider(schSl, { name: 'Sürüklenme', hint: 'Hazırlık eğilimi yükselince eşik daha çabuk aşılır.', min: 0.4, max: 0.75, step: 0.05, val: S.sch.drive, fmt: f2, color: 'var(--pit)', cb: (v) => { S.sch.drive = v; } });
  makeSlider(schSl, { name: 'Gürültü', hint: 'Dalgalanma büyüdükçe geçişler sıklaşır.', min: 0.2, max: 0.5, step: 0.05, val: S.sch.noise, fmt: f2, color: 'var(--pit)', cb: (v) => { S.sch.noise = v; } });
  scope.on($('rerun'), 'click', () => { S.seed++; dirty = true; });

  /* ---- Veto ve kayma ---- */
  const noRetSl = makeSlider($('vetoSl'), { name: 'Geri dönüşsüz son aralık', hint: `Bu kadar süre kala hareket artık durdurulamaz (varsayım, başlangıç ${LIBET.noReturn} ms).`, min: 0, max: 300, step: 10, val: S.noReturn, fmt: (v) => `${v} ms`, color: 'var(--dop)', cb: (v) => { S.noReturn = v; } });
  const shiftSl = makeSlider($('vetoSl'), { name: 'Saat ve dikkat kayması', hint: 'Bildirim gerçek niyetten ne kadar geç? Eleştirmenlerin öne sürdüğü artefakt.', min: 0, max: 500, step: 10, val: S.shift, fmt: (v) => `${v} ms`, color: 'var(--red)', cb: (v) => { S.shift = v; } });
  const libetNums = () => {
    const gap = gapNow(), tg = trueGap(gap, S.shift), vw = vetoWindow(S.w, S.noReturn), art = artefactShare(gap, S.shift);
    return { gap, tg, vw, art };
  };
  function drawVeto(): void {
    const { gap, tg, vw, art } = libetNums();
    $('vetoRead').innerHTML = tiles([['RP → W (ölçülen)', `${Math.round(gap)} ms`], ['Gerçek aralık', `${Math.round(tg)} ms`], ['Artefakt payı', pc(art)], ['Veto penceresi', `${vw} ms`], ['Veto mümkün mü?', vw > 0 ? 'Evet' : 'Hayır']]);
  }
  function barLib(): void {
    const { gap, tg, vw, art } = libetNums();
    let say: string;
    if (S.view === 'sch') {
      const r = schRun();
      say = `Rastgele birikimde eşik geçişlerine hizalı ortalama ${r.onset ? ms(r.onset) : 'baştan'} civarından yükseliyor; hizalanmayan ortalama düz. Hareket için ortalama bekleme ${r.meanWait.toFixed(1).replace('.', ',')} sn.`;
    } else {
      say = `RP ${ms(RP_ONSET)} civarında başlıyor, niyet ${ms(S.w)}'de hissediliyor: RP niyetten ${Math.round(gap)} ms önce.${S.shift ? ` Kayma ${S.shift} ms ise gerçek aralık ${Math.round(tg)} ms.` : ''} Veto penceresi ${vw} ms: ${vw > 0 ? 'vetoya pay var.' : 'vetoya pay yok.'}`;
    }
    setBar(say, [
      { label: 'RP → W', text: `${Math.round(gap)} ms`, frac: gap / 900, color: 'var(--pfc)' },
      { label: 'Veto penceresi', text: `${vw} ms`, frac: vw / 400, color: 'var(--dop)' },
      { label: 'Artefakt payı', text: pc(art), frac: art, color: 'var(--red)' },
    ]);
  }
  function drawLib(): void {
    const note = $('clockNote');
    note.textContent = NOTE[S.clock];
    saveBtn.disabled = S.clock !== 'done' || saved;
    goBtn.textContent = S.clock === 'idle' ? 'Başlat' : S.clock === 'run' ? 'Hareket!' : 'Yeniden dene';
    drawClock();
    const n = S.tries.length;
    $('tries').textContent = n
      ? `Denemeler: ${n} · ortalama W ${ms(S.tries.reduce((a, b) => a + b, 0) / n)}. Kitapta RP, bildirilen niyetten yaklaşık yarım saniye önce başlar.`
      : 'Henüz kayıt yok. Birkaç deneme, tek denemeden daha anlamlı bir ortalama verir.';
    viewHandles();
    const sch = S.view !== 'libet';
    schSl.hidden = !sch; schRow.hidden = !sch;
    drawRP(); drawVeto(); barLib();
  }

  /* =====================================================================
     2 · Çok etkenli tahmin
     ===================================================================== */
  const factsBox = $('facts');
  const factBtns = FACTORS.map((f, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn fbtn'; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<i style="background:${FCOL[i]}"></i><span class="fn">${f.name}<small>${f.hint}</small></span><b></b>`;
    scope.on(b, 'click', () => { S.known[i] = !S.known[i]; dirty = true; });
    factsBox.appendChild(b);
    return b;
  });
  const geneSl = makeSlider($('geneSl'), {
    name: 'Gen varyantının katkısı', hint: 'Kitaptaki hesapta %10. Gen × stres etkileşimi tekrarlanamadı: sıfıra çekip toplamı gör.', min: 0, max: 0.1, step: 0.01, val: S.gene, color: 'var(--pit)',
    fmt: (v) => pc(v), cb: (v) => { S.gene = v; },
  });
  scope.on($('reseedC'), 'click', () => { S.seedC++; dirty = true; });
  const stackSvg = $<SVGSVGElement>('stack'), gridSvg = $<SVGSVGElement>('grid');
  const ROWS = ['En riskli', 'Yüksek', 'Orta', 'Düşük', 'En güvenli'];
  const cokNums = () => {
    const shares = defaultShares(S.gene), ev = evaluate(S.known, shares);
    return { shares, ev, k: S.known.filter(Boolean).length };
  };
  function drawCok(): void {
    const { shares, ev, k } = cokNums();
    factBtns.forEach((b, i) => {
      b.setAttribute('aria-pressed', String(S.known[i]));
      b.querySelector('b')!.textContent = `${S.known[i] ? '✓ ' : ''}${pc(shares[i])}`;
    });
    // yığılmış çubuk
    stackSvg.replaceChildren();
    const x0 = 16, W = 328, g = svg('g', {}, stackSvg);
    svg('rect', { class: 'rest', x: x0, y: 36, width: W, height: 26, rx: 3 }, g);
    let acc = 0;
    FACTORS.forEach((_, i) => {
      if (!S.known[i] || shares[i] <= 0) return;
      svg('rect', { x: x0 + acc * W, y: 36, width: shares[i] * W, height: 26, fill: FCOL[i], class: 'sg' }, g);
      acc += shares[i];
    });
    svg('line', { class: 'half', x1: x0 + W / 2, x2: x0 + W / 2, y1: 28, y2: 70 }, g);
    svgText(g, { class: 'ax', x: x0, y: 22, 'text-anchor': 'start' }, '0');
    svgText(g, { class: 'ax', x: x0 + W / 2, y: 22, 'text-anchor': 'middle' }, '%50');
    svgText(g, { class: 'ax', x: x0 + W, y: 22, 'text-anchor': 'end' }, '%100: kesinlik');
    svgText(g, { class: 'lb', x: x0, y: 86, 'text-anchor': 'start' }, `açıklanan ${pc(ev.r2)}`);
    svgText(g, { class: 'ax', x: x0 + W, y: 86, 'text-anchor': 'end' }, `açıklanamayan ${pc(ev.unknown)}`);
    stackSvg.setAttribute('aria-label', `Bilinen ${k} etken öngörünün ${pc(ev.r2)} kadarını açıklıyor, ${pc(ev.unknown)} açıklanamıyor`);
    // 100 kişi
    gridSvg.replaceChildren();
    const gg = svg('g', {}, gridSvg);
    const qs = quintiles(sample(S.known, shares, S.seedC, 100));
    for (let row = 0; row < 5; row++) {
      const q = qs[4 - row], y = 22 + row * 36;
      svgText(gg, { class: 'ax', x: 6, y: y + 3.5, 'text-anchor': 'start' }, ROWS[row]);
      for (let c = 0; c < q.size; c++) {
        const hit = c < q.hit, cx = 96 + c * 10.4;
        svg('circle', { class: hit ? 'pd hit' : 'pd', cx, cy: y, r: 4 }, gg);
      }
      svgText(gg, { class: 'lb', x: 354, y: y + 3.5, 'text-anchor': 'end' }, `${q.hit}/${q.size}`);
    }
    $('cokRead').innerHTML = tiles([['Öngörü gücü', pc(ev.r2)], ['Belirsizlik payı', pc(ev.unknown)], ['En riskli beşte bir', `${pc(ev.top)} gösterdi`], ['En güvenli beşte bir', `${pc(ev.bottom)} gösterdi`]]);
    const say = k === 0
      ? 'Hiçbir etken bilinmiyor: beş grupta da davranışın görülme oranı aynı (yaklaşık %20), öngörü yok.'
      : `${k} etken biliniyor: öngörü gücü kabaca ${pc(ev.r2)}, ${pc(ev.unknown)} açıklanamıyor. En riskli beşte birde davranış ${pc(ev.top)}, en güvenlide ${pc(ev.bottom)} oranında görülüyor; kesinliğe ulaşılmıyor.`;
    setBar(say, [
      { label: 'Öngörü gücü', text: pc(ev.r2), frac: ev.r2, color: 'var(--pit)' },
      { label: 'Belirsizlik', text: pc(ev.unknown), frac: ev.unknown, color: 'var(--lesion)' },
      { label: 'En riskli grup', text: pc(ev.top), frac: ev.top, color: 'var(--amy)' },
    ]);
  }

  /* =====================================================================
     3 · Ceza ve tatmin
     ===================================================================== */
  const scatSvg = $<SVGSVGElement>('scat'), quadSvg = $<SVGSVGElement>('quad');
  const punSl = $('punSl');
  const unfSl = makeSlider(punSl, { name: 'Teklifin adaletsizliği', hint: 'Sıfırda teklif adil: kimse cezalandırmaz.', min: 0, max: 1, step: 0.05, val: S.unfair, fmt: pc, color: 'var(--amy)', cb: (v) => { S.unfair = v; S.focus = 'pun'; } });
  const costSl = makeSlider(punSl, { name: 'Cezanın bedeli', hint: 'Cezalandırmak için oyuncunun kendi cebinden ödediği puan.', min: 0, max: 8, step: 0.5, val: S.cost, fmt: (v) => `${f2(v)} puan`, color: 'var(--ink)', cb: (v) => { S.cost = v; S.focus = 'pun'; } });
  const rewSl = makeSlider(punSl, { name: 'Ödül ağırlığı', hint: 'Cezalandırmanın ödül devresini ne kadar çalıştırdığı. Sıfırda bağ kopar.', min: 0, max: 6, step: 0.5, val: S.wRew, fmt: f2, color: 'var(--dop)', cb: (v) => { S.wRew = v; S.focus = 'pun'; } });
  scope.on($('reseedP'), 'click', () => { S.seedP++; S.focus = 'pun'; dirty = true; });
  const SX = (c: number) => 40 + (c / 2) * 300, SY = (w: number) => 196 - (clamp(w, 0, 12) / 12) * 176;
  function drawPun(): void {
    const players = makePlayers(S.seedP), st = punishStats(players, S.unfair, S.wRew, S.cost);
    scatSvg.replaceChildren();
    const g = svg('g', {}, scatSvg);
    for (const v of [0, 4, 8, 12]) { svg('line', { class: 'grid', x1: 40, x2: 340, y1: SY(v), y2: SY(v) }, g); svgText(g, { class: 'ax', x: 34, y: SY(v) + 3.5, 'text-anchor': 'end' }, String(v)); }
    for (const v of [0, 1, 2]) svgText(g, { class: 'ax', x: SX(v), y: 212, 'text-anchor': 'middle' }, String(v));
    svgText(g, { class: 'ax', x: 190, y: 226, 'text-anchor': 'middle' }, 'kaudat etkinliği (bedelsiz ceza, birimsiz)');
    svgText(g, { class: 'ax', x: 40, y: 12, 'text-anchor': 'start' }, 'razı olunan bedel (puan)');
    const yc = SY(S.cost + 0.2);
    svg('line', { class: 'cost', x1: 40, x2: 340, y1: yc, y2: yc }, g);
    svgText(g, { class: 'lb', x: 338, y: yc - 4, 'text-anchor': 'end' }, 'ceza bedeli');
    for (const p of players) svg('circle', { class: punishes(p, S.unfair, S.wRew, S.cost) ? 'pd hit' : 'pd', cx: SX(p.caudate), cy: SY(wtp(p, S.unfair, S.wRew)), r: 4 }, g);
    $('punRead').innerHTML = tiles([['Cezalandıran', `${st.count}/${st.total}`], ['Ödenen toplam', `${f2(st.paid)} puan`], ['Kaudat ↔ razılık (r)', f2(st.r)]]);
    scatSvg.setAttribute('aria-label', `${st.count} oyuncudan ${st.count === 0 ? 'hiçbiri' : st.count} cezalandırıyor; kaudat etkinliği ile ödeme isteği ilişkisi r = ${f2(st.r)}`);
    if (S.focus === 'pun') {
      const say = st.count === 0
        ? 'Kimse cezalandırmıyor: teklif adil ya da bedel çok yüksek.'
        : `${st.total} oyuncudan ${st.count}'i cezalandırıyor (bedel ${f2(S.cost)} puan), toplam ${f2(st.paid)} puan ödeniyor. Kaudat etkinliği ile ödemeye razılık arasındaki ilişki r = ${f2(st.r)}${S.wRew === 0 ? ': ödül bağı yok' : ''}.`;
      setBar(say, [
        { label: 'Cezalandıran', text: `${st.count}/${st.total}`, frac: st.count / st.total, color: 'var(--amy)' },
        { label: 'Ödenen', text: `${f2(st.paid)} puan`, frac: st.paid / 120, color: 'var(--ink)' },
        { label: 'Ödül bağı (r)', text: f2(st.r), frac: Math.max(0, st.r), color: 'var(--dop)' },
      ]);
    }
  }

  /* ---- Vakalar ---- */
  const caseHandles = toggles($('caseChips'), CASES.map((c) => ({ k: c.id, name: c.short })), () => S.caseId, (k) => selectCase(k), 'chip');
  function selectCase(k: string): void {
    S.caseId = k; S.bio = curCase().bio; bioSl.set(Math.round(S.bio * 100)); syncRate(); S.focus = 'case';
  }
  const bioSl = makeSlider($('bioSl'), {
    name: 'Biyolojik açıklamanın bilinen payı', hint: 'Bilgi arttıkça ne olur? Kaydırıcıyı artır ve iki çubuğa bak.', min: 0, max: 100, step: 5, val: Math.round(S.bio * 100), color: 'var(--pit)',
    fmt: (v) => `%${v}`, cb: (v) => { S.bio = v / 100; S.focus = 'case'; },
  });
  const dualSet = barRows($('dual'), [{ label: 'Sorumluluk kararı (dlPFC, bilişsel)', color: 'var(--pfc)' }, { label: 'Ceza dürtüsü (vmPFC, amigdala, insula, duygusal)', color: 'var(--amy)' }]);
  const outSet = barRows($('outs'), [{ label: 'Toplumun güvenliği', color: 'var(--gld)' }, { label: 'Nedenin giderilmesi', color: 'var(--pfc)' }, { label: 'Ceza tatmini', color: 'var(--amy)' }]);
  const rateSl = $('rateSl');
  const blameSl = makeSlider(rateSl, { name: 'Suçlama', hint: 'Bu kişi ne kadar suçlu tutulmalı?', min: 0, max: 100, step: 5, val: 50, fmt: (v) => `${v}/100`, color: 'var(--amy)', cb: (v) => { const r = S.rates[S.caseId]; r.b = v; r.t = true; S.focus = 'case'; } });
  const dangerSl = makeSlider(rateSl, { name: 'Tehlikelilik', hint: 'Serbest kalırsa yeniden zarar verme riski ne kadar?', min: 0, max: 100, step: 5, val: 50, fmt: (v) => `${v}/100`, color: 'var(--gld)', cb: (v) => { const r = S.rates[S.caseId]; r.d = v; r.t = true; S.focus = 'case'; } });
  function syncRate(): void { const r = S.rates[S.caseId]; blameSl.set(r.b); dangerSl.set(r.d); }
  const respHandles = toggles($('resps'), RESPS.map((r) => ({ k: r.k, name: r.name })), () => S.resp, (k) => { S.resp = k; S.focus = 'case'; });
  const ADV_TXT = { tamir: 'Suçlama düşük, tehlikelilik yüksek: tamir bölgesi. Suçlama olmadan da önlem gerekir.', intikam: 'Suçlama yüksek, tehlikelilik düşük: ceza korunma sağlamıyor, yalnızca ceza dürtüsünü doyuruyor.', ikisi: 'İkisi de yüksek: önlemi tehlikelilik belirler; suçlama puanı önlemin türünü değiştirmez, yalnızca ceza dürtüsünü besler.', hicbiri: 'İkisi de düşük: yakın izleme dışında önlem gerekmeyebilir.' };
  const REC_TXT = { izleme: 'Tehlikelilik odaklı öneri: yakın izleme.', onarim: 'Tehlikelilik odaklı öneri: onarım (neden tedavi edilebilir).', karantina: 'Tehlikelilik odaklı öneri: karantina ve gözetim (neden şimdilik tedavi edilemiyor).' };
  const QX = (b: number) => 40 + (b / 100) * 300, QY = (d: number) => 214 - (d / 100) * 190;
  function drawCase(): void {
    const c = curCase(), j = judgments(c, S.bio), o = outcome(c, S.bio, S.resp), r = S.rates[c.id];
    caseHandles(); respHandles();
    $('caseText').textContent = c.text;
    dualSet[0](j.cold, pc(j.cold)); dualSet[1](j.hot, pc(j.hot));
    $('dualNote').textContent = S.bio >= 0.5
      ? `Biyolojik açıklama ${pc(S.bio)} bilinince sorumluluk kararı ${pc(j.cold)}'e iner, ceza dürtüsü ${pc(j.hot)}'te kalır: soğuk devre vazgeçiyor, duygusal devre ısrar ediyor.`
      : `Biyolojik açıklama azken iki çubuk birbirine yakın. Kitabın savı: bu, nedenin olmadığını değil, henüz bilinmediğini gösterir.`;
    outSet[0](o.safety, pc(o.safety)); outSet[1](o.cause, pc(o.cause)); outSet[2](o.satisf, pc(o.satisf));
    const q = quadrant(r.b, r.d), rec = recommend(r.d / 100, c.treat);
    $('advice').textContent = r.t ? `${REC_TXT[rec]} ${ADV_TXT[q]}` : 'Suçlama ve tehlikelilik için puan ver; vaka aşağıdaki grafiğe düşer.';
    // çeyrek grafiği
    quadSvg.replaceChildren();
    const g = svg('g', {}, quadSvg);
    svg('rect', { class: 'qbg', x: 40, y: 24, width: 300, height: 190 }, g);
    svg('line', { class: 'half', x1: QX(50), x2: QX(50), y1: 24, y2: 214 }, g);
    svg('line', { class: 'half', x1: 40, x2: 340, y1: QY(50), y2: QY(50) }, g);
    svgText(g, { class: 'ax', x: 46, y: 38, 'text-anchor': 'start' }, 'Tamir bölgesi');
    svgText(g, { class: 'ax', x: 46, y: 49, 'text-anchor': 'start' }, 'tehlikeli, suçlu değil');
    svgText(g, { class: 'ax', x: 334, y: 38, 'text-anchor': 'end' }, 'İkisi de yüksek');
    svgText(g, { class: 'ax', x: 334, y: 208, 'text-anchor': 'end' }, 'Yalnız ceza dürtüsü');
    svgText(g, { class: 'ax', x: 46, y: 208, 'text-anchor': 'start' }, 'İkisi de düşük');
    svgText(g, { class: 'ax', x: 190, y: 236, 'text-anchor': 'middle' }, 'suçlama →');
    svgText(g, { class: 'ax', x: 40, y: 14, 'text-anchor': 'start' }, '↑ tehlikelilik');
    CASES.forEach((cs, i) => {
      const rr = S.rates[cs.id];
      if (!rr.t) return;
      const sel = cs.id === S.caseId, cx = QX(rr.b), cy = QY(rr.d);
      svg('circle', { class: sel ? 'qp sel' : 'qp', cx, cy, r: 10 }, g);
      svgText(g, { class: sel ? 'qn sel' : 'qn', x: cx, y: cy + 4, 'text-anchor': 'middle' }, String(i + 1));
    });
    $('quadKey').innerHTML = `<p class="note">${CASES.map((cs, i) => `${i + 1} ${cs.short}`).join(' · ')}</p>`;
    quadSvg.setAttribute('aria-label', 'Vakaların suçlama ve tehlikelilik puanları');
    if (S.focus === 'case') {
      const nm = RESPS.find((x) => x.k === S.resp)!.name.toLowerCase();
      setBar(`${c.short}: sorumluluk kararı ${pc(j.cold)}, ceza dürtüsü ${pc(j.hot)}. Seçili önlem ${nm}: toplumun güvenliği ${pc(o.safety)}, nedenin giderilmesi ${pc(o.cause)}, ceza tatmini ${pc(o.satisf)}.`, [
        { label: 'Sorumluluk', text: pc(j.cold), frac: j.cold, color: 'var(--pfc)' },
        { label: 'Ceza dürtüsü', text: pc(j.hot), frac: j.hot, color: 'var(--amy)' },
        { label: 'Güvenlik', text: pc(o.safety), frac: o.safety, color: 'var(--gld)' },
      ]);
    }
  }
  function drawCeza(): void { drawPun(); drawCase(); }

  /* ---------- Turlar ---------- */
  const setView = (v: View) => { S.view = v; };
  const setW0 = (w: number) => { S.w = w; wSl.set(w); };
  const tour1 = createTour(scope, [
    { title: 'Libet\'in kurgusu', text: 'Katılımcı canı istediğinde bileğini oynatır ve niyeti ilk hissettiği anı saatten okur. EEG, hareketten önce yükselen hazırlık potansiyelini (RP) kaydeder.',
      look: 'Mavi eğri RP, turuncu çizgi niyet (W), sağdaki çizgi hareket.', apply: () => { setView('libet'); setW0(LIBET.wRef); S.shift = 0; S.noReturn = LIBET.noReturn; syncVeto(); dirty = true; } },
    { title: 'RP niyetten önce başlıyor', text: 'Kitapta RP, bildirilen niyetten yaklaşık yarım saniye önce ortaya çıktı. Beyin, farkındalıktan önce hazırlanıyor gibi görünüyor.',
      look: 'Üstteki köşeli ok: RP → W, 500 ms.', apply: () => { setView('libet'); setW0(LIBET.wRef); S.shift = 0; syncVeto(); dirty = true; } },
    { title: 'Veto penceresi', text: 'Libet\'e göre niyet ile hareket arasında hareketi durdurma payı kalıyor. Son kısa aralık geri dönüşsüz sayılır (modelin varsayımı).',
      look: 'Turuncu bant, veto penceresi; alttaki okumada "Veto mümkün mü?"', apply: () => { setView('libet'); setW0(LIBET.wRef); S.noReturn = LIBET.noReturn; syncVeto(); dirty = true; } },
    { title: 'Eleştiri: saat ve dikkat', text: 'Saati okumak dikkat ister; bildirim geç kalırsa gerçek niyet daha erkendir. Örnekte 300 ms kayma, 500 ms\'lik aralığın büyük kısmını artefakta çeviriyor.',
      look: 'Çıktı çubuğunda artefakt payı yükseliyor, gerçek aralık kısalıyor.', apply: () => { setView('libet'); setW0(LIBET.wRef); S.shift = 300; syncVeto(); dirty = true; } },
    { title: 'Schurger: RP karar olmayabilir', text: 'Gürültülü bir birikim eşiği aşınca hareket başlıyor. Geçişlere hizalayıp ortalama alınca RP benzeri bir yükseliş çıkıyor; hizalamazsan düz kalıyor.',
      look: 'Mor eğri yükseliyor, gri kesikli çizgi düz.', apply: () => { setView('both'); S.shift = 0; syncVeto(); setW0(LIBET.wRef); dirty = true; } },
    { title: 'Sonuç: tartışma açık', text: 'RP önce başlıyor bulgusu tekrarlandı ama yorumu tartışmalı. Bu deney tek başına "özgür irade yok" kanıtı sayılmaz; kitap sınırın nerede çizileceğini açık soru bırakır.',
      look: 'İki eğri aynı eksende; hangisi kararı, hangisi gürültüyü anlatıyor?', apply: () => { setView('both'); S.shift = 0; syncVeto(); dirty = true; } },
  ]);
  $('tour1').appendChild(tour1.el);
  function syncVeto(): void { noRetSl.set(S.noReturn); shiftSl.set(S.shift); }

  const setKnown = (...ix: number[]) => { S.known = FACTORS.map((_, i) => ix.includes(i)); };
  const tour2 = createTour(scope, [
    { title: 'Hiçbir şey bilinmiyor', text: 'Davranış toplumun yaklaşık %20\'sinde görülüyor (modelin varsayımı). Hiçbir etken bilinmeyince beş risk grubunda da oran aynı: öngörü yok.',
      look: 'Beş satırda da dolu halka oranı benzer.', apply: () => { setKnown(); geneSl.set(0.1); S.gene = 0.1; dirty = true; } },
    { title: 'Yalnızca gen: yaklaşık %10', text: 'Kitabın kaba hesabına göre tek bir gen varyantı yaklaşık %10 öngörü verir. Satırlar belli belirsiz ayrışıyor.',
      look: 'Çubukta mor dilim %10; üst satır biraz daha dolu.', apply: () => { setKnown(0); geneSl.set(0.1); S.gene = 0.1; dirty = true; } },
    { title: 'Yaşam etkenleri ekleniyor', text: 'Çocuklukta kayıp ya da istismar eklenince öngörü yaklaşık %25\'e, yoksulluk ve yalnız yaşam da eklenince yaklaşık %40\'a çıkıyor.',
      look: 'Çubuk uzuyor; üst ve alt satır arasındaki fark büyüyor.', apply: () => { setKnown(0, 1, 2); geneSl.set(0.1); S.gene = 0.1; dirty = true; } },
    { title: 'Hepsi bilinse de kesinlik yok', text: 'Modelde altı etkenin hepsiyle bile öngörü %50\'nin altında kalıyor; kitaba göre davranış sonuçlarının çoğunda da böyle. En riskli satırda herkes davranışı göstermiyor, en güvenli satırda bazıları gösteriyor.',
      look: 'Üst satırda boş halkalar, alt satırda dolu halkalar var.', apply: () => { setKnown(0, 1, 2, 3, 4, 5); geneSl.set(0.1); S.gene = 0.1; dirty = true; } },
    { title: 'Gen katkısı çökerse', text: 'Gen × stres etkileşimi büyük analizlerde tekrarlanamadı. Gen katkısını sıfıra çekince toplam yaklaşık %38\'e iner; yaşam etkenleri payı taşır.',
      look: 'Mor dilim kayboluyor, açıklanamayan pay büyüyor.', apply: () => { setKnown(0, 1, 2, 3, 4, 5); geneSl.set(0); S.gene = 0; dirty = true; } },
  ]);
  $('tour2').appendChild(tour2.el);

  const tour3 = createTour(scope, [
    { title: 'Ceza ödüllendirir', text: 'Haksızlık edene bedelsiz ceza verirken ödül devresi (kaudat) çalışıyor. Ödül devresi ne kadar etkinse, oyuncu cezalandırmak için o kadar çok ödemeye razı.',
      look: 'Noktalar yukarı eğimli; r pozitif.', apply: () => { S.unfair = 1; S.cost = 2; S.wRew = 3; syncPun(); S.focus = 'pun'; dirty = true; } },
    { title: 'Bedel arttıkça', text: 'Ceza pahalılaşınca cezalandıranlar azalıyor; kalanlar çoğunlukla ödül devresi en duyarlı olanlar.',
      look: 'Kesikli çizgi yükseliyor, dolu noktalar azalıyor.', apply: () => { S.unfair = 1; S.cost = 5; S.wRew = 3; syncPun(); S.focus = 'pun'; dirty = true; } },
    { title: 'Ödül bağı olmasaydı', text: 'Ödül ağırlığını sıfıra çekince kaudat etkinliği ile ödemeye razılık arasındaki bağ kayboluyor. Kitaptaki bulgu bu bağı gösteriyor; "hazzın" mı beklentinin mi olduğu tartışmalı.',
      look: 'Noktalar yataya dağılıyor, r sıfıra yaklaşıyor.', apply: () => { S.unfair = 1; S.cost = 2; S.wRew = 0; syncPun(); S.focus = 'pun'; dirty = true; } },
    { title: 'Sorumluluk ve ceza ayrı devreler', text: 'Sorumluluk kararı bilişsel dlPFC ile, ceza miktarı duygusal bölgelerle ilişkili. Biyolojik açıklama arttıkça soğuk karar düşüyor, duygusal dürtü neredeyse yerinde kalıyor.',
      look: 'Mavi çubuk kısalıyor, kırmızı çubuk kısalmıyor.', apply: () => { selectCase('tumor'); S.bio = 0.9; bioSl.set(90); } },
    { title: 'Araba tamiri', text: 'Freni bozuk araç yoldan çekilip onarılır; kimse arabayı suçlamaz. Suçlamayı 10, tehlikeliliği 70 verince vaka tamir bölgesine düşüyor ve önlem hâlâ gerekiyor.',
      look: 'Grafikte vaka sol üstte; önerilen önlem onarım.', apply: () => { selectCase('tumor'); const r = S.rates.tumor; r.b = 10; r.d = 70; r.t = true; syncRate(); S.resp = 'onarim'; } },
    { title: 'Neden bulunamayınca', text: 'Nedeni bilinmeyen vakada suçlama dürtüsü yüksek kalıyor. Kitabın savı: bu nedenin yokluğunu değil bilgi eksikliğini gösterir; bilgi arttıkça suçluluk anlayışı değişecek.',
      look: 'Kaydırıcıyı %10\'dan artır: sorumluluk çubuğu düşer.', apply: () => { selectCase('bilinmez'); S.bio = 0.1; bioSl.set(10); } },
  ]);
  $('tour3').appendChild(tour3.el);
  function syncPun(): void { unfSl.set(S.unfair); costSl.set(S.cost); rewSl.set(S.wRew); }

  /* ---------- Başlangıç ---------- */
  const poke = scope.announcer($('live'), () => lastSay);
  function render(): void {
    if (S.tab === 'lib') drawLib();
    else if (S.tab === 'cok') drawCok();
    else drawCeza();
  }
  const onAction = (ev: Event) => {
    const card = (ev.target as Element | null)?.closest<HTMLElement>('[data-card]');
    if (card) S.focus = card.dataset.card as 'pun' | 'case';
    if (dirty) { dirty = false; render(); }
    poke();
  };
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);

  function frame(now: number): void {
    lastNow = now;
    if (S.tab === 'lib' && S.clock === 'run' && dotEl) {
      const [x, y] = pos(clockAngle(Math.max(0, now - S.t0)), R);
      dotEl.setAttribute('cx', x.toFixed(1)); dotEl.setAttribute('cy', y.toFixed(1));
    }
    if (dirty) { dirty = false; render(); }
  }
  render();
  scope.loop(frame, { root, onResume: () => { lastNow = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
