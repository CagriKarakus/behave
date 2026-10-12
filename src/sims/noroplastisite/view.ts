import { bookBox } from '../ui';
import '../sim.css';
import './view.css';
import { Scope, ref, svg, uid } from '../kit';
import { createTour } from '../tour';
import {
  caPos, clamp, minutesOfSlider, practiceAt, simulatePractice, simulateStress, stressAt,
  synapse, synDelta, synWeight, SYN, effort,
  type PracticeInputs, type PracticeSeries, type StressInputs, type StressKind, type StressSeries, type SynResult,
} from './model';
import { buildTree, type Tree } from './dendrite';
import {
  Meters, fmtDays, fmtHz, fmtMin, fmtSec, logPos, logVal, makeSlider, niceDays, niceFreq, niceSec, pctOf, signed,
  type SliderHandle,
} from './ui';

type Tab = 'syn' | 'prac' | 'str';

/* ---------- Sabit metinler ---------- */
const SYN_PRESETS = [
  { n: 'Zayıf: 1 Hz', f: 1, d: 900, post: 0 },
  { n: 'Orta: 5 Hz', f: 5, d: 300, post: 0 },
  { n: 'Yoğun: 100 Hz', f: 100, d: 1, post: 0 },
  { n: 'Hebb: 1 Hz + ateşleme', f: 1, d: 900, post: 1 },
];
const PRAC_PRESETS: Array<{ n: string; p: PracticeInputs; note: string }> = [
  { n: 'Piyano, 5 gün', p: { minutes: 120, mental: 0, days: 5 },
    note: 'Pascual-Leone: müzisyen olmayanlar günde 2 saat, birkaç gün piyano parmak alıştırması yaptı; el alanı büyüdü, pratik kesilince artış bir günden kısa sürede kayboldu.' },
  { n: 'Yalnızca hayal ederek', p: { minutes: 120, mental: 1, days: 5 },
    note: 'Aynı alıştırmayı yalnızca zihninde canlandıran grupta da yeniden haritalanma görüldü. Bu modelde zihinsel pratiğin payı fiziksel pratiğin yarısı kabul edildi (kitaptaki bulgu: etki var; replikasyon notu: genellikle daha küçük).' },
  { n: 'Piyano, 4 hafta', p: { minutes: 120, mental: 0, days: 28 },
    note: 'Dört haftalık alıştırmada genişleme pratikten sonra günlerce sürdü: uzun pratik kalıcı (yapısal) bir pay bırakır.' },
  { n: 'Jonglörlük, 3 ay', p: { minutes: 60, mental: 0, days: 90 },
    note: 'Draganski: üç ay jonglörlük öğrenenlerde hareketin görsel işlenmesiyle ilgili bölgede genişleme; bırakılınca artış kısmen geriledi. Günlük 60 dk bu modelin varsayımıdır.' },
  { n: 'Londra taksi, ≈3 yıl', p: { minutes: 120, mental: 0, days: 1200 },
    note: 'Maguire: taksi şoförlerinde arka hipokampüs büyüktü. Ölçülen bölge hipokampüs (hacim), motor harita değil; burada aynı iki bileşenli mantık (hızlı + kalıcı) uygulanıyor.' },
  { n: 'Taksi adayı 4 ayda bırakır', p: { minutes: 120, mental: 0, days: 120 },
    note: 'Woollett ve Maguire: hipokampüs yalnızca sınavı geçen adaylarda büyüdü. Erken bırakan adayda kalıcı pay zamanla söner (burada da hipokampüs hacmi yerine aynı mantık kullanılıyor).' },
];
const STRESS_KINDS: Array<{ k: StressKind; n: string; note: string }> = [
  { k: 'kronik', n: 'Kronik stres', note: 'Kronik stres: hipokampüs dendritleri küçülür, bazolateral amigdala (BLA) dendritleri genişler (Vyas ve ark.).' },
  { k: 'tek', n: 'Tek doz glukokortikoid', note: 'Mitra ve Sapolsky: tek bir kortikosteron dozu bile kaygıyı artırmaya ve BLA dendrit büyümesine yetti; sonuç 12 gün sonra ölçüldü.' },
  { k: 'kosu', n: 'Gönüllü koşu', note: 'Bağlam: kitaba göre korkuyla salgılanan glukokortikoid hipokampüs dendritlerini küçültürken, gönüllü koşuyla salgılanan benzer miktar onları büyütür. Amigdalanın devrede olup olmaması farkı belirliyor gibidir.' },
];

const TEMPLATE = (id: string): string => `
<div class="sim sim-nrp">
  <p class="lede">Deneyim, günler ve aylar içinde beynin fiziksel yapısını nasıl değiştirir?</p>
  <div data-ref="tourHost"></div>

  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    <button class="tab" role="tab" id="${id}-tab-syn" data-pane="syn" aria-controls="${id}-pane-syn" aria-selected="true" type="button">Sinaps</button>
    <button class="tab" role="tab" id="${id}-tab-prac" data-pane="prac" aria-controls="${id}-pane-prac" aria-selected="false" tabindex="-1" type="button">Pratik ve harita</button>
    <button class="tab" role="tab" id="${id}-tab-str" data-pane="str" aria-controls="${id}-pane-str" aria-selected="false" tabindex="-1" type="button">Stres ve yapı</button>
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık açıklama"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section class="pane" role="tabpanel" id="${id}-pane-syn" data-pane="syn" aria-labelledby="${id}-tab-syn">
    <p class="note">Tek bir sinaps. Presinaptik uç glutamat salar; glutamat AMPA ve NMDA reseptörlerine bağlanır. NMDA kanalı dinlenimde Mg²⁺ tıkacıyla kapalıdır; yeterli depolarizasyon tıkacı iter, kalsiyum (Ca²⁺) girer. Ca²⁺ düzeyi sinapsın kaderini belirler.</p>
    <div class="chips" data-ref="synChips" role="group" aria-label="Hazır uyarım örnekleri"></div>
    <div class="stage">
      <svg data-ref="synSvg" viewBox="0 0 360 300" role="img" aria-label="Sinaps diyagramı: üstte presinaptik uç ve glutamat, altta AMPA ve NMDA reseptörlü postsinaptik dikencik; dikencikteki yeşil seviye kalsiyum düzeyini gösterir"></svg>
      <div class="legend">
        <span><i style="background:var(--dop)"></i>Glutamat</span>
        <span><i class="sq" style="background:var(--pfc)"></i>AMPA reseptörü</span>
        <span><i class="sq" style="background:var(--pit)"></i>NMDA kanalı</span>
        <span><i style="background:var(--lesion)"></i>Mg²⁺ tıkacı</span>
        <span><i style="background:var(--gld)"></i>Ca²⁺</span>
      </div>
    </div>
    <p class="hebb" data-ref="hebb"></p>
    <div class="row"><button class="btn" data-ref="synRun" type="button">Uyarımı yeniden oynat</button></div>
    <section class="chart" aria-label="Sinaps gücü grafiği">
      <h3 class="sim-h">Sinaps gücü zaman içinde</h3>
      <svg data-ref="synChart" viewBox="0 0 360 172" role="img" aria-label="Uyarım sırasında ve sonraki dakika, saat ve günlerde sinaps gücünün seyri"></svg>
    </section>
    <section aria-label="Uyarım girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="synSliders"></div></section>
    <details class="more"><summary>Model nasıl çalışıyor?</summary><div>
      <p>Her presinaptik uyarı AMPA reseptörlerinden sodyum sokar; uyarılar sık geldikçe toplanır ve zar depolarize olur. Depolarizasyon NMDA kanalındaki Mg²⁺ tıkacını iter. Postsinaptik nöronun aynı anda ateşlenmesi depolarizasyonu ayrıca artırır (Hebb eşleşmesi).</p>
      <p>Ca²⁺ girişi = saniyedeki uyarı sayısı × tıkacın kalkma oranı. Ca²⁺ düzeyi iki eşiğe göre okunur: alt eşiğin altında değişim yok, iki eşik arasında LTD (AMPA reseptörleri azalır), üst eşiğin üstünde LTP (yeni AMPA reseptörleri yerleşir). Değişimin boyu toplam uyarı sayısıyla büyür ve doyar.</p>
      <p>Varsayım (kitapta yok): yetersiz uyarımda değişim erken evrede kalır ve saatler içinde söner; yeterince güçlüyse kalıcılaşır. Eşikler, hızlar ve süreler nitel ayarlardır.</p>
    </div></details>
    ${bookBox([
      { id: 'ch05-e1', text: 'Lømo (1966), Bliss ve Lømo (1973): yoğun uyarım sonrası sinaps uzun süre güçlü kalır (LTP)', rep: 'sağlam', note: 'Tartışma olgunun varlığında değil, doğal öğrenmedeki payında.' },
    ])}
    <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan: Hebb ilkesi, NMDA eşiği, Ca²⁺ aracılı LTP ve LTD'nin sinyali keskinleştirmesi. Kitap dışı: Mg²⁺ tıkacı ayrıntısı, frekans değerleri ve sürelerin kendisi. Bliss ve Lømo deneyi anestezili tavşanda perforan yola yüksek frekanslı uyarı verip saatlerce izleme düzeneğidir (kitap dışı bilgi).</p>
  </section>

  <section class="pane" role="tabpanel" id="${id}-pane-prac" data-pane="prac" aria-labelledby="${id}-tab-prac" hidden>
    <p class="note">Motor korteks haritasında bir beceriyi yöneten alan, pratikle genişler. Hızlı bileşen (Hebb tipi güçlenme) pratikle kurulur ve bırakılınca bir günden kısa sürede söner. Yavaş bileşen (yapısal, yeni bağlantılar) birikir ve haftalarca kalır.</p>
    <div class="chips" data-ref="pcChips" role="group" aria-label="Hazır senaryolar"></div>
    <p class="note pnote" data-ref="pcNote"></p>
    <div class="stage">
      <svg data-ref="pcSvg" viewBox="0 0 360 232" role="img" aria-label="Motor korteks haritası: el ve parmak alanı pratikle genişler, komşu alanlar daralır"></svg>
      <div class="legend">
        <span><i class="sq" style="background:var(--pfc)"></i>Başlangıç alanı</span>
        <span><i class="sq" style="background:var(--pit)"></i>Kalıcı (yapısal) genişleme</span>
        <span><i class="sq" style="background:var(--dop)"></i>Hızlı, geçici genişleme</span>
      </div>
    </div>
    <div class="row">
      <button class="btn" data-ref="pcPlay" type="button">Duraklat</button>
      <button class="btn" data-ref="pcStop" type="button">Pratiği şimdi bırak</button>
      <button class="btn" data-ref="pcReset" type="button">Baştan</button>
    </div>
    <section class="chart" aria-label="Harita alanı grafiği">
      <h3 class="sim-h">Harita alanı zaman içinde</h3>
      <svg data-ref="pcChart" viewBox="0 0 360 172" role="img" aria-label="Pratik sırasında ve bırakıldıktan sonra harita alanının seyri"></svg>
    </section>
    <section aria-label="Pratik girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="pcSliders"></div></section>
    <details class="more"><summary>Model nasıl çalışıyor?</summary><div>
      <p>Günlük etkin pratik = fiziksel dakikalar + 0,5 × hayal edilen dakikalar. Hızlı bileşen bu dozla doyarak yükselir (yarı doyum: günde ≈ 60 dk) ve pratik kesilince birkaç saatlik bir zamanla söner. Yavaş bileşen hızlı bileşenin sürdüğü sürece birikir ve ≈ 160 günlük bir zamanla yavaşça söner. Harita alanı = 1 + hızlı + yavaş; komşu alanlar toplam yüzey sabit kalacak biçimde daralır.</p>
      <p>Tüm katsayılar nitel ayardır; kitaptaki bulguların yönünü ve sırasını yakalamak için seçildi.</p>
    </div></details>
    ${bookBox([
      { id: 'ch05-e7', text: 'Pascual-Leone (1995): piyano alıştırması, hayal edilen pratik ve bırakınca hızlı kayıp', rep: 'sağlam', note: 'Zihinsel pratiğin etkisi raporlanmış ama genellikle fiziksel pratikten küçük.' },
      { id: 'ch05-e8', text: 'Draganski (2004): üç ay jonglörlük ve gri madde', rep: 'sağlam', note: 'Ancak MR hacim ölçümlerinin hücresel anlamı ve küçük örneklemler eleştirilmiş.' },
      { id: 'ch05-e12', text: 'Maguire ve ark.: Londra taksi şoförlerinde hipokampüs', rep: 'sağlam', note: 'Örneklemler görece küçük, büyük bağımsız replikasyonlar sınırlı.' },
    ])}
    <p class="foot">Nitel model. Kitaptan: günde 2 saat piyano alıştırması, birkaç gün ve dört hafta koşulları, hayal etme, bırakınca bir günden kısa sürede kayıp; üç ay jonglörlük ve kısmi gerileme; taksi şoförleri. Günlük 60 dk jonglörlük süresi ve tüm katsayılar kitap dışı varsayımdır.</p>
  </section>

  <section class="pane" role="tabpanel" id="${id}-pane-str" data-pane="str" aria-labelledby="${id}-tab-str" hidden>
    <p class="note">Aynı stres, iki bölgede zıt yönde iz bırakır. Hipokampüsün dendritleri ve dikenleri kısalır; bazolateral amigdalanın (BLA) dendritleri uzar. Stres bitince hipokampüs toparlanır; amigdaladaki değişiklik çok daha kalıcıdır.</p>
    <div class="chips" data-ref="stChips" role="group" aria-label="Stres türü"></div>
    <p class="note pnote" data-ref="stNote"></p>
    <div class="stage">
      <svg data-ref="stSvg" viewBox="0 0 360 250" role="img" aria-label="İki nöronun dendrit çizimi: solda hipokampüs nöronu, sağda amigdala nöronu"></svg>
      <div class="legend">
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--hyp)" stroke-width="2.4" stroke-linecap="round"/></svg>Hipokampüs dendriti</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--amy)" stroke-width="2.4" stroke-linecap="round"/></svg>Amigdala (BLA) dendriti</span>
        <span><i style="background:var(--muted)"></i>Dendrit dikeni</span>
      </div>
    </div>
    <div class="row">
      <button class="btn" data-ref="stPlay" type="button">Duraklat</button>
      <button class="btn" data-ref="stReset" type="button">Baştan</button>
    </div>
    <section class="chart" aria-label="Dendrit grafiği">
      <h3 class="sim-h">Dendrit uzunluğu zaman içinde</h3>
      <svg data-ref="stChart" viewBox="0 0 360 172" role="img" aria-label="Stres sırasında ve sonrasında hipokampüs ve amigdala dendrit uzunluğunun seyri"></svg>
    </section>
    <section aria-label="Stres girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="stSliders"></div></section>
    <details class="more"><summary>Model nasıl çalışıyor?</summary><div>
      <p>Stres sürerken hipokampüs dendrit uzunluğu alt sınıra (başlangıcın ≈ %68'i) ≈ 2 haftalık zamanla yaklaşır; diken kaybı dendrit kaybından biraz büyüktür. Stres bitince ≈ 3 haftalık zamanla toparlanır.</p>
      <p>Amigdalada glukokortikoid, hızlı kurulan ve yavaş sönen gizli bir programı (BDNF artışı gibi düşünülebilir) tetikler. Dendrit büyümesi bu programın karekökünü izler; bu yüzden tek doz bile görünür bir büyüme verir. Büyüme çabuk, geri çekilme çok yavaştır.</p>
      <p>Gönüllü koşuda hipokampüs dendritleri büyür, amigdala devreye girmez. Katsayılar nitel ayardır; BLA dikenleri modelde değişmez.</p>
    </div></details>
    ${bookBox([
      { id: 'ch05-e3', text: 'Vyas ve ark. (2002), Mitra ve Sapolsky (2008): stres hipokampüs dendritlerini küçültür, BLA dendritlerini büyütür', rep: 'sağlam', note: 'Birçok laboratuvarda tekrarlandı. Bağlam önemli: koşuyla gelen glukokortikoid farklı etki eder.' },
    ])}
    <p class="foot">Nitel model. Kitaptan: yön (hipokampüs küçülür, BLA büyür), tek dozun bile yetmesi (12. gün ölçümü), amigdala etkisinin kalıcı kaygıyla ilişkisi ve bağlam uyarısı. Kitap dışı: toparlanma zamanları ve yüzde değerleri. Çizimler şematiktir, gerçek morfoloji değildir.</p>
  </section>
</div>`;

/* ---------- Yardımcılar ---------- */
const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Oynatma zamanı çarpıtması: etkinlik sürerken sabit hız, bitince hızlanan (üstel) hız. */
function warpSpeed(t: number, stopAt: number): number {
  return t < stopAt ? clamp(stopAt / 5, 1, 100) : 1 + 0.6 * (t - stopAt);
}

function niceStep(total: number): number {
  for (const s of [1, 5, 10, 30, 60, 90, 180, 360, 720]) if (total / s <= 6) return s;
  return 720;
}

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('nrp');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduce = reducedMotion();

  /* ---------- Sekmeler ---------- */
  let tab: Tab = 'syn';
  let dirty = true;
  const SAY: Record<Tab, () => string> = { syn: () => '', prac: () => '', str: () => '' };
  const METERS: Record<Tab, () => Parameters<Meters['set']>[0]> = { syn: () => [], prac: () => [], str: () => [] };
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  const sayEl = $('say');
  const meters = new Meters($('meters'));
  let lastSay = '';
  function say(): void {
    const t = SAY[tab]();
    if (t !== lastSay) { lastSay = t; sayEl.textContent = t; }
    meters.set(METERS[tab]());
  }
  function showTab(t: Tab, focus = false): void {
    tab = t;
    dirty = true;
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

  function makeChips(host: HTMLElement, labels: string[], onPick: (i: number) => void): (i: number) => void {
    const btns = labels.map((l, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = l; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => onPick(i));
      host.appendChild(b);
      return b;
    });
    return (i) => btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  }

  /* =====================================================================
     1) SİNAPS
     ===================================================================== */
  const SY = {
    f: 1, d: 900, post: 0, after: 0,
    run: 1,
    res: synapse({ freq: 1, dur: 900, post: 0 }) as SynResult,
    lvl: 0, plug: 0, wShown: -1, nRec: -1, headW: -9,
    preset: -1,
  };
  const synInp = () => ({ freq: SY.f, dur: SY.d, post: SY.post });
  const recompute = () => { SY.res = synapse(synInp()); };

  const synSvg = $<SVGElement>('synSvg');
  const clipId = `${id}-head`;
  const TOPY = 136, VBOT = 238;
  synSvg.innerHTML =
    `<defs><clipPath id="${clipId}"><path data-ref="synClip"/></clipPath></defs>` +
    '<path class="axon" data-ref="axon" d="M110,0 L110,34 M250,0 L250,34"/>' +
    '<path class="cell" d="M110,0 L110,30 C70,38 66,64 70,76 C74,96 100,100 120,100 L240,100 C260,100 286,96 290,76 C294,64 290,38 250,30 L250,0"/>' +
    '<g data-ref="ves"></g>' +
    '<path class="cell" data-ref="spine"/>' +
    '<rect class="fill-ca" data-ref="caFill" x="60" width="240" y="238" height="3" clip-path="url(#' + clipId + ')"/>' +
    '<g data-ref="thr"></g>' +
    '<g data-ref="recs"></g>' +
    '<rect class="nmda" x="166" y="132" width="28" height="12" rx="3"/>' +
    '<circle class="mg" data-ref="plug" cx="180" cy="128" r="6"/>' +
    '<g data-ref="gluG"></g><g data-ref="caG"></g>' +
    '<rect class="flash" data-ref="flash" x="0" y="252" width="360" height="48"/>' +
    '<text class="lab" x="5" y="52">Presinaptik</text><text class="lab" x="5" y="64">uç</text>' +
    '<text class="lab" x="294" y="112">Sinaptik</text><text class="lab" x="294" y="124">aralık</text>' +
    '<text class="lab" x="3" y="196">Dikencik</text><text class="lab" x="3" y="208">(postsin.)</text>' +
    '<text class="lab" x="52" y="119">AMPA</text><line class="lead" x1="80" y1="116" x2="114" y2="127"/>' +
    '<text class="lab" x="262" y="150">NMDA</text><line class="lead" x1="196" y1="140" x2="258" y2="147"/>' +
    '<text class="lab" x="214" y="114">Mg²⁺ tıkacı</text><line class="lead" x1="212" y1="112" x2="187" y2="124"/><text class="lab" data-ref="post" x="180" y="290" text-anchor="middle">Dendrit</text>' +
    '<text class="lab eff" x="12" y="14">Glutamat salımı</text>';

  // Titreşim: vezikül konumları
  const vesEls: SVGElement[] = [];
  [[118, 84], [144, 90], [170, 85], [196, 90], [222, 84], [246, 88]].forEach(([x, y]) => {
    vesEls.push(svg('circle', { class: 'ves', cx: x, cy: y, r: 8 }, $('ves')));
  });
  const vesT: number[] = vesEls.map(() => 0);
  // AMPA yuvaları (merkezden dışa doğru dolar)
  const slotX: number[] = [];
  for (let i = 0; i < 9; i++) { slotX.push(158 - i * 5.8); slotX.push(202 + i * 5.8); }
  slotX.sort((a, b) => Math.abs(a - 180) - Math.abs(b - 180));
  const recEls = slotX.map((x) => svg('rect', { class: 'rec', x: x - 2, y: 124, width: 4, height: 12, rx: 1.5 }, $('recs')));
  // eşik çizgileri
  const yOfPos = (p: number) => VBOT - p * (VBOT - TOPY - 4);
  const thr = $('thr');
  for (const [v, label] of [[SYN.thD, 'LTD eşiği'], [SYN.thP, 'LTP eşiği']] as const) {
    const y = yOfPos(caPos(v));
    svg('line', { class: 'thr', x1: 96, x2: 264, y1: y, y2: y }, thr);
    const t = svg('text', { class: 'lab', x: 268, y: y + 3 }, thr);
    t.textContent = label;
  }
  // parçacıklar
  interface Part { el: SVGElement; x: number; y: number; vx: number; vy: number; on: boolean }
  const mkParts = (host: SVGElement, cls: string, r: number, n: number): Part[] =>
    Array.from({ length: n }, () => ({ el: svg('circle', { class: cls, r, display: 'none' }, host), x: 0, y: 0, vx: 0, vy: 0, on: false }));
  const glu = mkParts($('gluG') as unknown as SVGElement, 'glu', 2.8, 26);
  const cap = mkParts($('caG') as unknown as SVGElement, 'ca', 2.6, 26);
  const freeP = (a: Part[]) => a.find((p) => !p.on);
  const showP = (p: Part) => { p.on = true; p.el.setAttribute('display', 'inline'); };
  const hideP = (p: Part) => { p.on = false; p.el.setAttribute('display', 'none'); };
  // rastgelelik yalnızca görsel (parçacık konumu): sonuçları etkilemez
  const rnd = () => Math.random();

  function headPath(w: number): string {
    const k = clamp(w - 1, -0.6, 1.2);
    const mid = 176 + 10 * k, bot = 230 + 12 * k;
    return `M85,${mid} C85,150 108,${TOPY} 126,${TOPY} L234,${TOPY} C252,${TOPY} 275,150 275,${mid} C275,${bot - 14} 232,${bot - 6} 212,${bot} L212,254 L360,254 L360,300 L0,300 L0,254 L148,254 L148,${bot} C128,${bot - 6} 85,${bot - 14} 85,${mid} Z`;
  }
  const wNow = (): number => (SY.run < 1 ? 1 + synDelta(synInp(), SY.run) : synWeight(SY.res.delta, minutesOfSlider(SY.after)));

  function applySyn(): void {
    const w = wNow();
    if (Math.abs(w - SY.headW) > 0.015) {
      SY.headW = w;
      const d = headPath(w);
      $('spine').setAttribute('d', d);
      $('synClip').setAttribute('d', d);
    }
    const n = clamp(Math.round(8 * w), 2, 18);
    if (n !== SY.nRec) {
      SY.nRec = n;
      recEls.forEach((e, i) => e.setAttribute('class', i < n ? 'rec on' : 'rec'));
    }
    SY.wShown = w;
  }

  let nextSpike = 0.2, postT = 0, apT = 0, flashA = 0;
  const visRate = () => 1 + 4.5 * Math.log10(1 + SY.f);
  function spike(): void {
    const k = Math.min(5, 1 + Math.floor(SY.f / 14));
    const vi = Math.floor(rnd() * vesEls.length);
    vesT[vi] = 0.22; apT = 0.2;
    for (let i = 0; i < k; i++) {
      const p = freeP(glu); if (!p) break;
      p.x = 100 + rnd() * 160; p.y = 88 + rnd() * 6; p.vx = (rnd() - 0.5) * 10; p.vy = 46 + rnd() * 26;
      showP(p);
    }
  }
  function frameSyn(dt: number): void {
    if (SY.run < 1) {
      SY.run = Math.min(1, SY.run + dt / 6);
      dirty = true;
    }
    if (!reduce) {
      nextSpike -= dt;
      if (nextSpike <= 0) { spike(); nextSpike += 1 / visRate(); if (nextSpike < 0) nextSpike = 0.05; }
      if (SY.post > 0) {
        postT -= dt;
        if (postT <= 0) { flashA = 0.7; postT = 1 / (0.6 + 3.2 * SY.post); }
      }
    }
    const unb = SY.res.unblock;
    for (const p of glu) {
      if (!p.on) continue;
      p.y += p.vy * dt; p.x += p.vx * dt;
      if (p.y >= 125) {
        hideP(p);
        if (rnd() < clamp(Math.pow(unb, 0.8) * 1.3 + 0.04, 0, 1)) {
          const c = freeP(cap);
          if (c) { c.x = 180 + (rnd() - 0.5) * 12; c.y = 146; c.vx = (rnd() - 0.5) * 22; c.vy = 26 + rnd() * 20; showP(c); }
        }
      } else { p.el.setAttribute('cx', p.x.toFixed(1)); p.el.setAttribute('cy', p.y.toFixed(1)); }
    }
    for (const p of cap) {
      if (!p.on) continue;
      p.y += p.vy * dt; p.x += p.vx * dt;
      if (p.y >= 205 || p.x < 100 || p.x > 260) hideP(p);
      else { p.el.setAttribute('cx', p.x.toFixed(1)); p.el.setAttribute('cy', p.y.toFixed(1)); }
    }
    // Ca2+ seviyesi ve Mg2+ tıkacı hedefe doğru akar
    const target = caPos(SY.res.c);
    SY.lvl += (target - SY.lvl) * Math.min(1, dt * 5);
    const pg = Math.pow(unb, 0.6);
    SY.plug += (pg - SY.plug) * Math.min(1, dt * 6);
    const y = yOfPos(SY.lvl);
    $('caFill').setAttribute('y', y.toFixed(1));
    $('caFill').setAttribute('height', Math.max(0, 242 - y).toFixed(1));
    $('plug').setAttribute('cx', (180 + SY.plug * 30).toFixed(1));
    $('plug').setAttribute('cy', (128 - SY.plug * 16).toFixed(1));
    $('plug').setAttribute('opacity', (1 - 0.45 * SY.plug).toFixed(2));
    vesEls.forEach((e, i) => { if (vesT[i] > 0) vesT[i] = Math.max(0, vesT[i] - dt); e.setAttribute('opacity', vesT[i] > 0 ? '0.25' : '1'); });
    apT = Math.max(0, apT - dt);
    $('axon').setAttribute('class', apT > 0 ? 'axon hot' : 'axon');
    flashA = Math.max(0, flashA - dt * 2.5);
    $('flash').setAttribute('opacity', (SY.post > 0 ? flashA * SY.post : 0).toFixed(2));
    ($('post') as unknown as SVGElement).textContent = SY.post > 0 ? `Dendrit: postsinaptik nöron ateşleniyor (%${pctOf(SY.post)})` : 'Dendrit (postsinaptik nöron)';
    if (dirty || SY.run < 1) applySyn();
  }

  // ---- Sinaps zaman grafiği ----
  const GX0 = 40, GX1 = 340, GXS = 92, GY0 = 12, GY1 = 138, WMIN = 0.4, WMAX = 2.4;
  const gy = (w: number) => GY1 - ((clamp(w, WMIN, WMAX) - WMIN) / (WMAX - WMIN)) * (GY1 - GY0);
  const gxm = (m: number) => (m <= 0 ? GXS : GXS + (Math.log10(Math.max(m, 1)) / 4) * (GX1 - GXS));
  function drawSynChart(): void {
    const r = SY.res, inp = synInp();
    const col = r.zone === 'ltp' ? 'var(--dop)' : r.zone === 'ltd' ? 'var(--pit)' : 'var(--muted)';
    const pts: string[] = [];
    const running = SY.run < 1;
    const pmax = running ? SY.run : 1;
    for (let i = 0; i <= 24; i++) {
      const p = (i / 24) * pmax;
      pts.push(`${(GX0 + (GXS - GX0) * p).toFixed(1)},${gy(1 + synDelta(inp, p)).toFixed(1)}`);
    }
    if (!running) {
      for (let v = 0; v <= 100; v += 2) {
        const m = minutesOfSlider(v);
        pts.push(`${gxm(m).toFixed(1)},${gy(synWeight(r.delta, m)).toFixed(1)}`);
      }
    }
    const cm = minutesOfSlider(SY.after);
    const cx = running ? GX0 + (GXS - GX0) * SY.run : gxm(cm);
    const cy = gy(wNow());
    let s = '';
    for (const w of [0.5, 1, 1.5, 2]) {
      s += `<line class="${w === 1 ? 'base' : 'grid'}" x1="${GX0}" x2="${GX1}" y1="${gy(w)}" y2="${gy(w)}"/><text x="${GX0 - 4}" y="${gy(w) + 3}" text-anchor="end">%${w * 100}</text>`;
    }
    s += `<line class="grid dash" x1="${GXS}" x2="${GXS}" y1="${GY0}" y2="${GY1}"/><text x="${(GX0 + GXS) / 2}" y="${GY1 + 14}" text-anchor="middle">uyarım</text>`;
    for (const [m, l] of [[10, '10 dk'], [60, '1 sa'], [1440, '1 gün'], [10080, '1 hf']] as const) {
      s += `<line class="grid" x1="${gxm(m)}" x2="${gxm(m)}" y1="${GY1}" y2="${GY1 + 4}"/><text x="${gxm(m)}" y="${GY1 + 14}" text-anchor="middle">${l}</text>`;
    }
    s += `<text x="${GX1}" y="${GY1 + 28}" text-anchor="end">uyarımdan sonraki süre (logaritmik)</text>`;
    s += `<polyline class="ln" points="${pts.join(' ')}" style="stroke:${col}"/>`;
    s += `<line class="cur" x1="${cx}" x2="${cx}" y1="${GY0}" y2="${GY1}"/><circle cx="${cx}" cy="${cy}" r="4.5" fill="${col}" stroke="var(--panel)" stroke-width="1.5"/>`;
    const lab = r.zone === 'ltp' ? 'LTP' : r.zone === 'ltd' ? 'LTD' : 'değişim yok';
    const lcol = r.zone === 'ltp' ? 'var(--eff-text)' : r.zone === 'ltd' ? 'var(--pit)' : 'var(--muted)';
    s += `<text x="${GX1 - 2}" y="${GY0 + 10}" text-anchor="end" style="fill:${lcol};font-weight:600">${lab}</text>`;
    $('synChart').innerHTML = s;
  }

  const afterText = (v: number): string => fmtMin(minutesOfSlider(v));
  let slF: SliderHandle, slD: SliderHandle, slP: SliderHandle, slA: SliderHandle;
  const setPresetChip = makeChips($('synChips'), SYN_PRESETS.map((p) => p.n), (i) => { const p = SYN_PRESETS[i]; setSyn(p.f, p.d, p.post, true); SY.preset = i; setPresetChip(i); });
  function setSyn(f: number, d: number, post: number, run: boolean): void {
    SY.f = f; SY.d = d; SY.post = post; SY.after = 0; SY.preset = -1;
    slF.set(logPos(f, 0.5, 100), fmtHz(f)); slD.set(logPos(d, 1, 900), fmtSec(d)); slP.set(Math.round(post * 100), `%${pctOf(post)}`); slA.set(0);
    recompute();
    if (run) SY.run = 0;
    setPresetChip(-1);
    dirty = true;
  }
  const onSyn = () => { recompute(); SY.run = 1; setPresetChip(-1); dirty = true; };
  const synSl = $('synSliders');
  slF = makeSlider(scope, synSl, `${id}-f`, { name: 'Presinaptik uyarım frekansı', hint: 'Saniyedeki uyarı sayısı. Seyrek uyarı sinapsı etkilemez; çok sık uyarı dendriti depolarize eder.', min: 0, max: 100, step: 1, value: logPos(1, 0.5, 100), fmt: (v) => fmtHz(niceFreq(logVal(v, 0.5, 100))), color: 'var(--dop)' },
    (v) => { SY.f = niceFreq(logVal(v, 0.5, 100)); onSyn(); });
  slD = makeSlider(scope, synSl, `${id}-d`, { name: 'Uyarımın süresi', hint: 'Toplam uyarı sayısı = frekans × süre. Etki uyarı sayısıyla büyür ve doyar.', min: 0, max: 100, step: 1, value: logPos(900, 1, 900), fmt: (v) => fmtSec(niceSec(logVal(v, 1, 900))), color: 'var(--dop)' },
    (v) => { SY.d = niceSec(logVal(v, 1, 900)); onSyn(); });
  slP = makeSlider(scope, synSl, `${id}-p`, { name: 'Postsinaptik nöron aynı anda ateşleniyor', hint: 'Hebb: alıcı nöron da ateşlenirse zar daha çok depolarize olur ve Mg²⁺ tıkacı kalkar.', min: 0, max: 100, step: 5, value: 0, fmt: (v) => `%${v}`, color: 'var(--pit)' },
    (v) => { SY.post = v / 100; onSyn(); });
  slA = makeSlider(scope, synSl, `${id}-a`, { name: 'Uyarımdan sonra bak', hint: 'Zamanda ileri git: erken evredeki değişim saatler içinde söner, kalıcılaşan değişim sürer.', min: 0, max: 100, step: 1, value: 0, fmt: afterText, color: 'var(--ink)' },
    (v) => { SY.after = v; SY.run = 1; dirty = true; });
  scope.on($('synRun'), 'click', () => { SY.run = 0; SY.after = 0; slA.set(0); dirty = true; });

  const zoneText = (z: string) => (z === 'ltp' ? 'LTP eşiğinin üstünde' : z === 'ltd' ? 'iki eşik arasında (LTD bölgesi)' : 'alt eşiğin altında');
  SAY.syn = () => {
    const r = SY.res;
    const head = `${fmtHz(SY.f)} × ${fmtSec(SY.d)} (${r.pulses} uyarı)${SY.post > 0 ? `, postsinaptik ateşleme %${pctOf(SY.post)}` : ''}: Mg²⁺ tıkacı %${pctOf(r.unblock)} kalktı, Ca²⁺ ${zoneText(r.zone)}.`;
    if (SY.run < 1) return `${head} Uyarım sürüyor…`;
    const w = pctOf(synWeight(r.delta, minutesOfSlider(SY.after)));
    if (Math.abs(r.delta) < 0.04) return `${head} Sinaps gücü belirgin değişmiyor.`;
    const tail = r.late > 0.5 ? 'Değişim kalıcılaşıyor.' : r.late < 0.2 ? 'Değişim kalıcılaşmıyor, saatler içinde sönüyor.' : 'Değişimin bir kısmı kalıcılaşıyor.';
    return `${head} Sinaps gücü %100 → %${pctOf(1 + r.delta)}${minutesOfSlider(SY.after) > 0 ? ` (şimdi %${w})` : ''}; ${r.delta > 0 ? 'yeni AMPA reseptörleri yerleşiyor' : 'AMPA reseptörleri azalıyor'}. ${tail}`;
  };
  METERS.syn = () => {
    const r = SY.res, w = wNow();
    return [
      { label: 'Mg²⁺ tıkacı kalktı', text: `%${pctOf(r.unblock)}`, frac: r.unblock, color: 'var(--pit)' },
      { label: 'Ca²⁺ düzeyi', text: r.zone === 'ltp' ? 'LTP' : r.zone === 'ltd' ? 'LTD' : 'eşik altı', frac: caPos(r.c), color: 'var(--gld)', mark: caPos(SYN.thP) },
      { label: 'Sinaps gücü', text: `%${pctOf(w)}`, frac: w / 2.4, color: w >= 1.04 ? 'var(--dop)' : w <= 0.96 ? 'var(--pit)' : 'var(--muted)', mark: 1 / 2.4 },
    ];
  };
  const hebbEl = $('hebb');
  const updateHebb = () => {
    const r = SY.res;
    let t = 'Hebb: birlikte ateşlenen birlikte bağlanır. Sinapsı uyaran nöronla alıcı nöron aynı anda etkinse bağ güçlenir.';
    if (r.zone === 'ltp' && SY.post >= 0.6) t = 'Hebb ilkesi işliyor: sinaps uyarılırken alıcı nöron da ateşleniyor. Birlikte ateşlenen iki nöronun arasındaki bağ güçleniyor.';
    else if (r.zone === 'ltp') t = 'Güçlenme bu kez postsinaptik ateşlemeden değil, çok sık gelen glutamatın tek başına yeterince sodyum sokup zarı depolarize etmesinden geliyor.';
    else if (r.zone === 'ltd') t = 'Orta düzey Ca²⁺ girişi: sinaps zayıflıyor (LTD). Gereksiz sinyalleri silmek, önemli sinyali belirginleştirir; genel unutma değildir.';
    else if (SY.post > 0) t = 'Postsinaptik ateşleme var ama kalsiyum girişi hâlâ eşiğin altında.';
    if (hebbEl.textContent !== t) hebbEl.textContent = t;
  };

  /* =====================================================================
     2) PRATİK VE KORTİKAL HARİTA
     ===================================================================== */
  const PC = {
    inp: { minutes: 120, mental: 0, days: 5 } as PracticeInputs,
    ser: null as unknown as PracticeSeries,
    t: 0, playing: true, preset: -1,
  };
  const pcSim = () => { PC.ser = simulatePractice(PC.inp); };
  pcSim();
  const pcSvg = $<SVGElement>('pcSvg');
  const TERR = [{ n: 'Gövde', w: 50 }, { n: 'Omuz, kol', w: 70 }, { n: 'Bilek', w: 40 }, { n: 'El', w: 70 }, { n: 'Yüz', w: 90 }];

  function drawMap(): void {
    const a = practiceAt(PC.ser, PC.t);
    const base = 70, tw = base * a.area, others = TERR.reduce((s, t, i) => s + (i === 3 ? 0 : t.w), 0);
    const k = (320 - tw) / others;
    let x = 20, s = '<text class="lab ctr" x="180" y="16">Motor korteks (şematik kesit)</text>';
    let tx = 0;
    TERR.forEach((t, i) => {
      if (i === 3) {
        tx = x;
        s += `<rect class="b-base" x="${x}" y="52" width="${base}" height="60"/>`;
        s += `<rect class="b-slow" x="${x + base}" y="52" width="${(base * a.slow).toFixed(1)}" height="60"/>`;
        s += `<rect class="b-fast" x="${x + base + base * a.slow}" y="52" width="${(base * a.fast).toFixed(1)}" height="60"/>`;
        s += `<rect class="terr tgt" x="${x}" y="52" width="${tw.toFixed(1)}" height="60" rx="6"/>`;
        s += `<text class="lab ctr strong" x="${x + base / 2}" y="86">El</text>`;
        x += tw;
      } else {
        const w = t.w * k;
        s += `<rect class="terr" x="${x.toFixed(1)}" y="52" width="${w.toFixed(1)}" height="60" rx="6"/><text class="lab ctr" x="${(x + w / 2).toFixed(1)}" y="86">${t.n}</text>`;
        x += w;
      }
    });
    const cx = tx + tw / 2;
    s += `<path class="brk" d="M${cx - 35},44 v-5 h70 v5"/><text class="lab ctr" x="${cx}" y="34">başlangıç boyutu</text>`;
    s += `<path class="brk" d="M${tx},120 v5 h${tw.toFixed(1)} v-5"/><text class="val ctr" x="${cx}" y="141">${signed(Math.round((a.area - 1) * 100))}% alan</text>`;
    // parmaklar: fiziksel pratikte oynar, hayal ederken kesik çizgili düşünce balonu belirir
    const active = PC.t < PC.inp.days && PC.inp.minutes > 0;
    const phys = active ? 1 - PC.inp.mental : 0;
    const hs = [22, 30, 34, 30, 22];
    for (let i = 0; i < 5; i++) {
      const bob = reduce ? 0 : Math.max(0, Math.sin(PC.t * 7 + i * 1.3)) * 7 * phys;
      s += `<rect class="fing${active ? ' act' : ''}" x="${cx - 36 + i * 15}" y="${186 - hs[i] - bob}" width="10" height="${hs[i]}" rx="5"/>`;
    }
    s += `<rect class="palm" x="${cx - 40}" y="186" width="80" height="14" rx="6"/>`;
    if (active && PC.inp.mental > 0) s += `<ellipse class="thought" cx="${cx + 66}" cy="156" rx="30" ry="14"/><text class="lab ctr" x="${cx + 66}" y="159">hayal</text><circle class="thought" cx="${cx + 38}" cy="176" r="3"/><circle class="thought" cx="${cx + 31}" cy="184" r="1.8"/>`;
    const st = PC.t < PC.inp.days
      ? `Pratik sürüyor: gün ${Math.floor(PC.t) + 1} / ${PC.inp.days}`
      : `Pratik bırakıldı: ${Math.floor(PC.t - PC.inp.days)} gün önce`;
    s += `<text class="lab ctr strong" x="180" y="222">${PC.inp.minutes === 0 ? 'Pratik yok' : st}</text>`;
    pcSvg.innerHTML = s;
  }

  const pcChart = $<SVGElement>('pcChart');
  function drawPcChart(): void {
    const ser = PC.ser, H = ser.horizon, n = ser.area.length;
    const amax = Math.max(1.2, ...ser.area) * 1.04;
    const x = (d: number) => GX0 + (d / H) * (GX1 - GX0);
    const y = (v: number) => GY1 - ((v - 1) / (amax - 1)) * (GY1 - GY0);
    let s = '';
    const stepY = amax - 1 > 0.5 ? 0.2 : 0.1;
    for (let v = 1; v <= amax; v += stepY) s += `<line class="${v === 1 ? 'base' : 'grid'}" x1="${GX0}" x2="${GX1}" y1="${y(v)}" y2="${y(v)}"/><text x="${GX0 - 4}" y="${y(v) + 3}" text-anchor="end">${signed(Math.round((v - 1) * 100))}%</text>`;
    s += `<rect class="shade" x="${GX0}" y="${GY0}" width="${Math.max(0, x(PC.inp.days) - GX0)}" height="${GY1 - GY0}"/>`;
    s += `<text x="${GX0 + 3}" y="${GY0 + 9}">pratik</text>`;
    const stp = niceStep(H);
    for (let d = 0; d <= H; d += stp) s += `<line class="grid" x1="${x(d)}" x2="${x(d)}" y1="${GY1}" y2="${GY1 + 4}"/><text x="${x(d)}" y="${GY1 + 14}" text-anchor="middle">${d}</text>`;
    s += `<text x="${GX1}" y="${GY1 + 28}" text-anchor="end">gün</text>`;
    const every = Math.max(1, Math.floor(n / 160));
    const line = (arr: number[]) => arr.map((v, i) => [i, v] as const).filter(([i]) => i % every === 0 || i === n - 1).map(([i, v]) => `${x(i * ser.dt).toFixed(1)},${y(1 + v).toFixed(1)}`).join(' ');
    s += `<polyline class="ln" points="${line(ser.slow)}" style="stroke:var(--pit);stroke-width:1.6"/>`;
    s += `<polyline class="ln" points="${line(ser.area.map((v) => v - 1))}" style="stroke:var(--ink)"/>`;
    const a = practiceAt(ser, PC.t), cx = x(PC.t);
    s += `<line class="cur" x1="${cx}" x2="${cx}" y1="${GY0}" y2="${GY1}"/><circle cx="${cx}" cy="${y(a.area)}" r="4.5" fill="var(--ink)" stroke="var(--panel)" stroke-width="1.5"/>`;
    s += `<g class="key"><line x1="${GX1 - 150}" x2="${GX1 - 134}" y1="${GY0 + 6}" y2="${GY0 + 6}" stroke="var(--ink)" stroke-width="2.2"/><text x="${GX1 - 130}" y="${GY0 + 9}">toplam</text><line x1="${GX1 - 80}" x2="${GX1 - 64}" y1="${GY0 + 6}" y2="${GY0 + 6}" stroke="var(--pit)" stroke-width="2"/><text x="${GX1 - 60}" y="${GY0 + 9}">kalıcı pay</text></g>`;
    pcChart.innerHTML = s;
  }

  const setPcChip = makeChips($('pcChips'), PRAC_PRESETS.map((p) => p.n), (i) => { setPrac(PRAC_PRESETS[i].p, true); PC.preset = i; setPcChip(i); $('pcNote').textContent = PRAC_PRESETS[i].note; });
  let slPm: SliderHandle, slPx: SliderHandle, slPd: SliderHandle, slPt: SliderHandle;
  function setPrac(p: PracticeInputs, replay: boolean): void {
    PC.inp = { ...p };
    slPm.set(p.minutes); slPd.set(logPos(p.days, 1, 1200), fmtDays(p.days)); slPx.set(Math.round(p.mental * 100), `%${Math.round(p.mental * 100)}`);
    pcSim();
    syncPcT();
    if (replay) { PC.t = 0; PC.playing = true; }
    PC.preset = -1; setPcChip(-1); $('pcNote').textContent = '';
    dirty = true;
  }
  const syncPcT = () => { slPt.inp.max = String(PC.ser.horizon); slPt.set(Math.min(PC.t, PC.ser.horizon), `gün ${Math.round(PC.t)}`); };
  const onPrac = () => { pcSim(); PC.t = Math.min(PC.t, PC.ser.horizon); syncPcT(); PC.preset = -1; setPcChip(-1); $('pcNote').textContent = ''; dirty = true; };
  const pcSl = $('pcSliders');
  slPm = makeSlider(scope, pcSl, `${id}-pm`, { name: 'Günlük pratik süresi', hint: 'Sürenin tamamı fiziksel ya da hayal edilen pratik olabilir. Süre arttıkça etki doyar.', min: 0, max: 240, step: 5, value: 120, fmt: (v) => `${v} dk`, color: 'var(--dop)' },
    (v) => { PC.inp.minutes = v; onPrac(); });
  slPx = makeSlider(scope, pcSl, `${id}-px`, { name: 'Hayal ederek pratik oranı', hint: 'Zihinsel prova: parmak oynamadan alıştırmayı zihinde canlandırmak. Etkisi fiziksel pratiğin yarısı kabul edildi.', min: 0, max: 100, step: 5, value: 0, fmt: (v) => `%${v}`, color: 'var(--pit)' },
    (v) => { PC.inp.mental = v / 100; onPrac(); });
  slPd = makeSlider(scope, pcSl, `${id}-pd`, { name: 'Pratik yapılan gün sayısı', hint: 'Sonra pratik bırakılır. Kısa pratik hızlı bileşeni, uzun pratik kalıcı payı doldurur.', min: 0, max: 100, step: 1, value: logPos(5, 1, 1200), fmt: (v) => fmtDays(niceDays(logVal(v, 1, 1200))), color: 'var(--dop)' },
    (v) => { PC.inp.days = niceDays(logVal(v, 1, 1200)); onPrac(); });
  slPt = makeSlider(scope, pcSl, `${id}-pt`, { name: 'Zaman', hint: 'Oynatmayı duraklatıp kaydırarak istenen güne bak.', min: 0, max: PC.ser.horizon, step: 0.25, value: 0, fmt: (v) => `gün ${Math.round(v)}`, color: 'var(--ink)' },
    (v) => { PC.t = v; PC.playing = false; dirty = true; });
  scope.on($('pcPlay'), 'click', () => { if (PC.t >= PC.ser.horizon) PC.t = 0; PC.playing = !PC.playing; dirty = true; });
  scope.on($('pcReset'), 'click', () => { PC.t = 0; PC.playing = true; dirty = true; });
  scope.on($('pcStop'), 'click', () => {
    if (PC.t < PC.inp.days) {
      PC.inp.days = Math.max(1, Math.ceil(PC.t));
      slPd.set(logPos(PC.inp.days, 1, 1200), fmtDays(PC.inp.days));
      const t = PC.t; pcSim(); PC.t = t; syncPcT(); PC.playing = true; PC.preset = -1; setPcChip(-1); dirty = true;
    }
  });

  SAY.prac = () => {
    const a = practiceAt(PC.ser, PC.t);
    const gain = Math.round((a.area - 1) * 100), slowP = Math.round(a.slow * 100);
    const state = PC.inp.minutes === 0 ? 'Pratik yapılmıyor.' : PC.t < PC.inp.days ? `Pratik sürüyor${PC.inp.mental > 0 ? ` (%${Math.round(PC.inp.mental * 100)} hayal)` : ''}.` : `Pratik ${Math.floor(PC.t - PC.inp.days)} gündür bırakıldı.`;
    return `Gün ${Math.round(PC.t)}: el alanı ${signed(gain)}% (kalıcı pay ${signed(slowP)}%). ${state}`;
  };
  METERS.prac = () => {
    const a = practiceAt(PC.ser, PC.t);
    return [
      { label: 'Harita alanı', text: `${signed(Math.round((a.area - 1) * 100))}%`, frac: (a.area - 1) / 0.6, color: 'var(--dop)' },
      { label: 'Kalıcı pay', text: `${signed(Math.round(a.slow * 100))}%`, frac: a.slow / 0.6, color: 'var(--pit)' },
      { label: 'Günlük etkin doz', text: `${Math.round(effort(PC.inp))} dk`, frac: effort(PC.inp) / 240, color: 'var(--ink)' },
    ];
  };

  /* =====================================================================
     3) STRES VE YAPI
     ===================================================================== */
  const ST = {
    inp: { kind: 'kronik', days: 28, recover: 84 } as StressInputs,
    ser: null as unknown as StressSeries,
    t: 0, playing: true,
  };
  const stSim = () => { ST.ser = simulateStress(ST.inp); };
  stSim();
  const stSvg = $<SVGElement>('stSvg');
  svg('rect', { class: 'pnl', x: 2, y: 2, width: 176, height: 246, rx: 12 }, stSvg);
  svg('rect', { class: 'pnl', x: 182, y: 2, width: 176, height: 246, rx: 12 }, stSvg);
  const mkT = (x: number, y: number, s: string, cls = 'lab') => { const t = svg('text', { class: cls, x, y }, stSvg); t.textContent = s; return t; };
  mkT(90, 20, 'Hipokampüs nöronu', 'lab ctr strong');
  mkT(270, 20, 'Amigdala (BLA) nöronu', 'lab ctr strong');
  const treeHip: Tree = buildTree(stSvg, { seed: 11, x: 90, y: 214, roots: [-1.571, -2.2, -0.95], lens: [28, 23, 18, 13, 10.5], spread: 0.55, w: [0.25, 0.5, 0.9, 1.3, 1.6], color: 'var(--hyp)', spinesPer: 5, somaR: 8 });
  const treeAmy: Tree = buildTree(stSvg, { seed: 23, x: 270, y: 132, roots: [0, 1.05, 2.1, 3.14, 4.2, 5.24], lens: [19, 17, 14, 12], spread: 0.6, w: [0.4, 0.9, 1.4, 1.8], color: 'var(--amy)', spinesPer: 0, somaR: 8 });
  const stTxtH = mkT(90, 240, '', 'val ctr');
  const stTxtA = mkT(270, 240, '', 'val ctr');

  function drawStress(): void {
    const e = stressAt(ST.ser, ST.t);
    treeHip.update(e.hip, e.spine);
    treeAmy.update(e.amy, 1);
    stTxtH.textContent = `dendrit %${pctOf(e.hip)} · diken %${pctOf(e.spine)}`;
    stTxtA.textContent = `dendrit %${pctOf(e.amy)}`;
  }
  const stChart = $<SVGElement>('stChart');
  const SYMIN = 0.55, SYMAX = 1.5;
  function drawStChart(): void {
    const ser = ST.ser, H = Math.max(1, ser.total), n = ser.hip.length;
    const x = (d: number) => GX0 + (d / H) * (GX1 - GX0);
    const y = (v: number) => GY1 - ((clamp(v, SYMIN, SYMAX) - SYMIN) / (SYMAX - SYMIN)) * (GY1 - GY0);
    let s = '';
    for (const v of [0.6, 0.8, 1, 1.2, 1.4]) s += `<line class="${v === 1 ? 'base' : 'grid'}" x1="${GX0}" x2="${GX1}" y1="${y(v)}" y2="${y(v)}"/><text x="${GX0 - 4}" y="${y(v) + 3}" text-anchor="end">%${Math.round(v * 100)}</text>`;
    s += `<rect class="shade" x="${GX0}" y="${GY0}" width="${Math.max(0, x(ser.stressEnd) - GX0)}" height="${GY1 - GY0}"/><text x="${GX0 + 3}" y="${GY0 + 9}">${ST.inp.kind === 'kosu' ? 'koşu' : 'stres'}</text>`;
    const stp = niceStep(H);
    for (let d = 0; d <= H; d += stp) s += `<line class="grid" x1="${x(d)}" x2="${x(d)}" y1="${GY1}" y2="${GY1 + 4}"/><text x="${x(d)}" y="${GY1 + 14}" text-anchor="middle">${d}</text>`;
    s += `<text x="${GX1}" y="${GY1 + 28}" text-anchor="end">gün</text>`;
    const every = Math.max(1, Math.floor(n / 160));
    const line = (arr: number[]) => arr.map((v, i) => [i, v] as const).filter(([i]) => i % every === 0 || i === n - 1).map(([i, v]) => `${x(i * ser.dt).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    s += `<polyline class="ln" points="${line(ser.spine)}" style="stroke:var(--hyp);stroke-width:1.4;stroke-dasharray:4 3"/>`;
    s += `<polyline class="ln" points="${line(ser.hip)}" style="stroke:var(--hyp)"/>`;
    s += `<polyline class="ln" points="${line(ser.amy)}" style="stroke:var(--amy)"/>`;
    const e = stressAt(ser, ST.t), cx = x(ST.t);
    s += `<line class="cur" x1="${cx}" x2="${cx}" y1="${GY0}" y2="${GY1}"/><circle cx="${cx}" cy="${y(e.hip)}" r="4" fill="var(--hyp)" stroke="var(--panel)" stroke-width="1.5"/><circle cx="${cx}" cy="${y(e.amy)}" r="4" fill="var(--amy)" stroke="var(--panel)" stroke-width="1.5"/>`;
    s += `<text x="${GX1 - 2}" y="${GY0 + 10}" text-anchor="end" style="fill:var(--red-text);font-weight:600">Amigdala</text><text x="${GX1 - 2}" y="${GY1 - 5}" text-anchor="end" style="fill:var(--hyp);font-weight:600">Hipokampüs (kesik: diken)</text>`;
    stChart.innerHTML = s;
  }

  const setStChip = makeChips($('stChips'), STRESS_KINDS.map((k) => k.n), (i) => { ST.inp.kind = STRESS_KINDS[i].k; onStress(true); });
  let slSd: SliderHandle, slSr: SliderHandle, slSt: SliderHandle;
  const stNote = $('stNote');
  const syncStT = () => { slSt.inp.max = String(Math.round(ST.ser.total)); slSt.set(Math.min(ST.t, ST.ser.total), `gün ${Math.round(ST.t)}`); };
  function onStress(replay: boolean): void {
    stSim();
    const i = STRESS_KINDS.findIndex((k) => k.k === ST.inp.kind);
    setStChip(i); stNote.textContent = STRESS_KINDS[i].note;
    slSd.setDisabled(ST.inp.kind === 'tek');
    ST.t = replay ? 0 : Math.min(ST.t, ST.ser.total);
    if (replay) ST.playing = true;
    syncStT(); dirty = true;
  }
  function setStress(inp: StressInputs): void {
    ST.inp = { ...inp };
    slSd.set(inp.days); slSr.set(inp.recover);
    onStress(true);
  }
  const stSl = $('stSliders');
  slSd = makeSlider(scope, stSl, `${id}-sd`, { name: 'Kronik stres süresi', hint: 'Stres ne kadar uzun sürerse hipokampüs dendritleri o kadar kısalır, amigdala dendritleri o kadar uzar.', min: 1, max: 60, step: 1, value: 28, fmt: (v) => `${v} gün`, color: 'var(--red)' },
    (v) => { ST.inp.days = v; onStress(false); });
  slSr = makeSlider(scope, stSl, `${id}-sr`, { name: 'Stres bittikten sonra geçen süre', hint: 'Stres kalkınca hipokampüs toparlanır; amigdaladaki değişiklik çok daha yavaş geri döner.', min: 0, max: 180, step: 1, value: 84, fmt: (v) => `${v} gün`, color: 'var(--gld)' },
    (v) => { ST.inp.recover = v; onStress(false); });
  slSt = makeSlider(scope, stSl, `${id}-st`, { name: 'Zaman', hint: 'Oynatmayı duraklatıp kaydırarak istenen güne bak.', min: 0, max: Math.round(ST.ser.total), step: 1, value: 0, fmt: (v) => `gün ${Math.round(v)}`, color: 'var(--ink)' },
    (v) => { ST.t = v; ST.playing = false; dirty = true; });
  scope.on($('stPlay'), 'click', () => { if (ST.t >= ST.ser.total) ST.t = 0; ST.playing = !ST.playing; dirty = true; });
  scope.on($('stReset'), 'click', () => { ST.t = 0; ST.playing = true; dirty = true; });

  SAY.str = () => {
    const e = stressAt(ST.ser, ST.t);
    const phase = ST.inp.kind === 'kosu'
      ? (ST.t < ST.ser.stressEnd ? 'Gönüllü koşu sürüyor' : `Koşu ${Math.floor(ST.t - ST.ser.stressEnd)} gündür bitti`)
      : (ST.t < ST.ser.stressEnd ? 'Stres sürüyor' : `Stres ${Math.floor(ST.t - ST.ser.stressEnd)} gündür bitti`);
    const lostH = Math.round((1 - e.hip) * 100), gainA = Math.round((e.amy - 1) * 100);
    return `Gün ${Math.round(ST.t)}: ${phase}. Hipokampüs dendritleri ${lostH >= 0 ? `%${lostH} kısalmış` : `%${-lostH} uzamış`}, amigdala dendritleri %${gainA} ${gainA >= 0 ? 'uzamış' : 'kısalmış'}.`;
  };
  METERS.str = () => {
    const e = stressAt(ST.ser, ST.t);
    return [
      { label: 'Hipokampüs dendriti', text: `%${pctOf(e.hip)}`, frac: e.hip / 1.5, color: 'var(--hyp)', mark: 1 / 1.5 },
      { label: 'Hipokampüs dikeni', text: `%${pctOf(e.spine)}`, frac: e.spine / 1.5, color: 'var(--hyp)', mark: 1 / 1.5 },
      { label: 'Amigdala dendriti', text: `%${pctOf(e.amy)}`, frac: e.amy / 1.5, color: 'var(--amy)', mark: 1 / 1.5 },
    ];
  };

  /* =====================================================================
     REHBERLİ TUR
     ===================================================================== */
  const tour = createTour(scope, [
    {
      title: 'Yetersiz uyarım: sinaps değişmez',
      text: 'Tek bir sinaps ve saniyede bir uyarı. Glutamat AMPA reseptörlerine bağlanır ama zar yeterince depolarize olmaz, Mg²⁺ tıkacı yerinde kalır ve NMDA kanalından neredeyse hiç kalsiyum girmez.',
      look: 'dikenciğin içindeki yeşil Ca²⁺ seviyesi alt eşiğin altında kalıyor; grafik düz.',
      apply: () => { showTab('syn'); setSyn(1, 900, 0, true); },
    },
    {
      title: 'Orta düzey kalsiyum: LTD',
      text: 'Frekans orta düzeye çıkınca Ca²⁺ iki eşik arasında kalır. Bu orta düzey sinapsı zayıflatır: AMPA reseptörleri azalır (uzun süreli depresyon, LTD). Böylece gereksiz sinyaller silinir.',
      look: 'AMPA reseptörlerinin (mavi çubuklar) sayısı azalıyor, grafik aşağı iniyor.',
      apply: () => { showTab('syn'); setSyn(5, 300, 0, true); },
    },
    {
      title: 'Yoğun uyarım: LTP',
      text: 'Lømo ve Bliss tipi yoğun uyarımda (saniyede 100 uyarı) glutamat o kadar sık gelir ki zar depolarize olur, Mg²⁺ tıkacı kalkar ve Ca²⁺ yüksek eşiği aşar. Yeni AMPA reseptörleri yerleşir ve sinaps saatler boyunca güçlü kalır.',
      look: 'Mg²⁺ tıkacı kanaldan çıkıyor; grafikteki eğri yükselip uzun süre yüksek kalıyor.',
      apply: () => { showTab('syn'); setSyn(100, 1, 0, true); },
    },
    {
      title: 'Hebb: birlikte ateşlenen birlikte bağlanır',
      text: 'Frekans yine saniyede bir, ama alıcı nöron da aynı anda ateşleniyor. Depolarizasyon tıkacı kaldırıyor; tek başına etkisiz olan uyarı artık sinapsı güçlendiriyor.',
      look: 'aynı 1 Hz uyarının sonucu: ilk adımda düz, şimdi LTP.',
      apply: () => { showTab('syn'); setSyn(1, 900, 1, true); },
    },
    {
      title: 'Pratik haritayı büyütür, bırakmak geri alır',
      text: 'Günde 2 saat, 5 gün piyano alıştırması el alanını büyütür. Pratik kesilince büyümenin çoğu bir günden kısa sürede kaybolur: kısa pratik yalnızca geçici, Hebb tipi bir genişleme bırakır.',
      look: 'pratik bırakıldığında amber (hızlı) şeridin hızla küçülmesi.',
      apply: () => { showTab('prac'); setPrac(PRAC_PRESETS[0].p, true); PC.preset = 0; setPcChip(0); $('pcNote').textContent = PRAC_PRESETS[0].note; },
    },
    {
      title: 'Stres iki bölgeyi zıt yönde değiştirir',
      text: 'Dört hafta kronik stres: hipokampüs dendritleri ve dikenleri kısalır, amigdala dendritleri uzar. Stres bitince hipokampüs toparlanır, amigdaladaki değişiklik ise aylarca kalır. Plastisite iyi ya da kötü değildir: hem öğrenmeyi hem kaygıyı kalıcılaştırabilir.',
      look: 'oynatma sonunda mavi eğri 100%’e dönüyor, kırmızı eğri hâlâ yüksek.',
      apply: () => { showTab('str'); setStress({ kind: 'kronik', days: 28, recover: 84 }); },
    },
  ]);
  $('tourHost').appendChild(tour.el);

  /* ---------- Döngü ---------- */
  let last = performance.now(), tSay = 0, drawnSyn = false;
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    if (tab === 'syn') {
      frameSyn(dt);
      if (dirty || SY.run < 1) { drawSynChart(); updateHebb(); drawnSyn = true; }
    } else if (tab === 'prac') {
      if (PC.playing) {
        PC.t += dt * warpSpeed(PC.t, PC.inp.days);
        if (PC.t >= PC.ser.horizon) { PC.t = PC.ser.horizon; PC.playing = false; }
        slPt.set(PC.t, `gün ${Math.round(PC.t)}`);
        dirty = true;
      }
      if (dirty) { drawMap(); drawPcChart(); }
      $('pcPlay').textContent = PC.playing ? 'Duraklat' : PC.t >= PC.ser.horizon ? 'Yeniden oynat' : 'Oynat';
      ($('pcStop') as HTMLButtonElement).disabled = !(PC.t < PC.inp.days);
    } else {
      if (ST.playing) {
        ST.t += dt * warpSpeed(ST.t, ST.ser.stressEnd);
        if (ST.t >= ST.ser.total) { ST.t = ST.ser.total; ST.playing = false; }
        slSt.set(ST.t, `gün ${Math.round(ST.t)}`);
        dirty = true;
      }
      if (dirty) { drawStress(); drawStChart(); }
      $('stPlay').textContent = ST.playing ? 'Duraklat' : ST.t >= ST.ser.total ? 'Yeniden oynat' : 'Oynat';
    }
    if (dirty && tab === 'syn' && drawnSyn) $('synRun').textContent = SY.run < 1 ? 'Uyarım sürüyor…' : 'Uyarımı yeniden oynat';
    dirty = false;
    tSay += dt;
    if (tSay > 0.25) { tSay = 0; say(); }
  }

  // Başlangıç durumu
  syncPcT(); syncStT();
  const i0 = STRESS_KINDS.findIndex((k) => k.k === ST.inp.kind);
  setStChip(i0); stNote.textContent = STRESS_KINDS[i0].note;
  applySyn();
  showTab('syn');
  const poke = scope.announcer($('live'), () => lastSay);
  const onAction = () => { dirty = true; poke(); };
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
