import '../sim.css';
import './view.css';
import { Scope, pct, ref, uid } from '../kit';
import { createTour } from '../tour';
import {
  BOND_DEFAULT, CHOCOLATE, COMPASSION_TRAINING, DT, EMPATHY_DEFAULT, EMPATHY_TRAINING, GIVE_DEFAULT, STEPS, STRAIN_NAME, TARGETS,
  TARGET_NAME, THETA, T_END, bondResult, contagionWeight, describeBond, describeEmpathy, describeGive, forecast, happinessChange,
  painResponse, simulateEmpathy, simulateGive,
  type BondInputs, type EmpathyInputs, type GiveInputs, type Kind, type Replic, type Strain, type Target,
} from './model';

type Tab = 'e' | 'b' | 'g';
const TABS: Array<[Tab, string]> = [['e', 'Bulaşma ve şefkat'], ['b', 'Kime yardım?'], ['g', 'Bağış ve ödül']];
const tr = (v: number, d = 2): string => v.toFixed(d).replace('.', ',');
const GROUPS = ['Kafes arkadaşı', 'Açık renkli yabancı', 'Koyu renkli yabancı'];

// ---- Küçük SVG parçaları ----
const fig = (cx: number, role: string): string =>
  `<circle class="em-body" cx="${cx}" cy="48" r="13"/><rect class="em-body" x="${cx - 18}" y="64" width="36" height="54" rx="14"/>` +
  (role ? `<rect class="em-tint" data-ref="${role}-tint" x="${cx - 18}" y="64" width="36" height="54" rx="14" fill-opacity="0"/>` : '');
const rat = (strain: Strain, x: number, y: number, sx: number, sc: number): string =>
  `<g transform="translate(${x} ${y}) scale(${sx * sc} ${sc})" class="em-rat ${strain}">` +
  '<path class="tail" d="M-22 2 C-32 -4,-40 8,-50 2"/><ellipse rx="22" ry="11"/><circle cx="23" cy="-3" r="8"/><circle cx="17" cy="-11" r="4"/>' +
  '<circle class="eye" cx="26" cy="-5" r="1.5"/></g>';

const TEMPLATE = (id: string) => `
<div class="sim sim-emp">
  <p class="lede">Başkasının acısını hissetmek bizi yardıma mı götürür, yoksa kendi sıkıntımıza mı kilitler?</p>
  <div class="tabs" role="tablist" aria-label="Bölümler">
    ${TABS.map(([k, n]) => `<button type="button" role="tab" class="tab" id="${id}-t-${k}" aria-controls="${id}-p-${k}" data-tab="${k}">${n}</button>`).join('')}
  </div>
  <div class="sim-bar" role="group" aria-label="Anlık çıktılar">
    <div class="sim-bar-in">
      <p class="say" data-ref="say"></p>
      <div class="meters">
        ${[0, 1, 2].map((i) => `<div class="m"><div class="m-top"><span data-ref="l${i}"></span><b data-ref="v${i}"></b></div><div class="track"><b data-ref="b${i}"></b></div></div>`).join('')}
      </div>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section role="tabpanel" id="${id}-p-e" aria-labelledby="${id}-t-e" data-ref="p-e" class="panel">
    <div class="chips" role="group" aria-label="Eğitim koşulları" data-ref="e-pre"></div>
    <div class="stage">
      <svg viewBox="0 0 360 156" role="img" aria-label="Solda acı çeken kişi, sağda gözlemci. Gözlemcinin gövdesinin kırmızı dolgusu kendi sıkıntısını, amber daire şefkatini gösterir. Oklar dikkatin kendine ya da karşıdakine yönelişini gösterir.">
        <g data-ref="e-burst"><circle class="em-burst" cx="64" cy="91" r="20"/></g>
        ${fig(64, '')}
        <g data-ref="e-waves" class="em-waves"><path d="M96 84 C 140 62, 190 108, 270 84"/><path d="M96 94 C 140 72, 190 118, 270 94"/><path d="M96 74 C 140 52, 190 98, 270 74"/></g>
        ${fig(296, 'e')}
        <circle class="em-heart" data-ref="e-heart" cx="296" cy="92" r="4"/>
        <g class="em-alarm" data-ref="e-alarm"><path d="M279 38 L271 32 M277 48 L267 48 M279 58 L271 64"/></g>
        <path class="em-ar other" data-ref="e-ar-o" d="M278 52 C 235 20, 140 20, 98 48"/><polygon class="em-ah other" data-ref="e-ah-o" points="90,51 101,48 97,41"/>
        <path class="em-ar self" data-ref="e-ar-s" d="M314 44 C 346 44, 346 96, 320 98"/><polygon class="em-ah self" data-ref="e-ah-s" points="317,98 328,103 328,94"/>
        <text x="190" y="16" text-anchor="middle">dikkat: karşıdakine</text>
        <text x="336" y="34" text-anchor="middle">kendine</text>
        <text x="64" y="138" text-anchor="middle">acı çeken</text>
        <text x="296" y="138" text-anchor="middle">gözlemci</text>
      </svg>
      <div class="legend"><span><i class="k-amy"></i>kırmızı dolgu ve çizgi: kendi sıkıntısı</span><span><i class="k-dop"></i>amber: şefkat</span><span>ok: dikkatin yönü</span></div>
    </div>
    <section class="chart" aria-label="Sıkıntı ve şefkat zaman grafiği">
      <h3 class="sim-h">Gözlemcide sıkıntı ve şefkat</h3>
      <svg viewBox="0 0 360 140" role="img" aria-label="Zaman içinde ortalama gözlemcinin sıkıntı ve şefkat düzeyi, kaçınma eşiğiyle birlikte" data-ref="e-chart">
        <line class="grid" x1="30" x2="300" y1="10" y2="10"/><line class="grid" x1="30" x2="300" y1="55" y2="55"/><line class="grid" x1="30" x2="300" y1="100" y2="100"/>
        <text x="26" y="13" text-anchor="end">1</text><text x="26" y="58" text-anchor="end">0,5</text><text x="26" y="103" text-anchor="end">0</text>
        ${[0, 20, 40, 60].map((s) => `<text x="${30 + 270 * s / T_END}" y="114" text-anchor="middle">${s}</text>`).join('')}
        <text x="165" y="130" text-anchor="middle">zaman (saniye, şematik)</text>
        <line class="thr" x1="30" x2="300" y1="${100 - 90 * THETA}" y2="${100 - 90 * THETA}"/>
        <text x="34" y="${100 - 90 * THETA - 4}">kaçınma eşiği</text>
        <path class="ln ln-d" data-ref="e-ld"/><path class="ln ln-w" data-ref="e-lw"/>
        <line class="head" data-ref="e-head" y1="10" y2="100"/>
        <circle class="pt pt-d" data-ref="e-pd" r="4"/><circle class="pt pt-w" data-ref="e-pw" r="4"/>
        <text data-ref="e-td" x="304"></text><text data-ref="e-tw" x="304"></text>
      </svg>
    </section>
    <section class="chart" aria-label="Kırk gözlemcinin tepkisi">
      <h3 class="sim-h">Kırk gözlemci ne yaptı?</h3>
      <svg viewBox="0 0 360 52" role="img" aria-label="Kırk gözlemcinin tepkisi: yardım edenler, etkisiz kalanlar ve sıkıntıdan kaçınanlar" data-ref="e-dots"></svg>
      <div class="legend">
        <span><svg class="lg-dot" viewBox="0 0 12 12"><circle class="dh" cx="6" cy="6" r="5"/></svg>yardım ediyor</span>
        <span><svg class="lg-dot" viewBox="0 0 12 12"><circle class="di" cx="6" cy="6" r="2.5"/></svg>etkisiz kalıyor</span>
        <span><svg class="lg-dot" viewBox="0 0 12 12"><circle class="da" cx="6" cy="6" r="4.5"/><path class="dx" d="M4 4 L8 8 M8 4 L4 8"/></svg>sıkıntıdan kaçınıyor</span>
      </div>
      <p class="tally" data-ref="e-tally"></p>
    </section>
    <div class="row"><button class="btn btn-go" type="button" data-ref="e-play">Oynat</button><button class="btn" type="button" data-ref="e-rerun">Yeni gözlemciler</button></div>
    <section aria-label="Bulaşma girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="e-in"></div></section>
  </section>

  <section role="tabpanel" id="${id}-p-b" aria-labelledby="${id}-t-b" data-ref="p-b" class="panel" hidden>
    <div class="chips" role="group" aria-label="Kurtarılacak sıçan" data-ref="b-tg"></div>
    <div class="stage">
      <svg viewBox="0 0 360 156" role="img" aria-label="Sol: serbest sıçan. Orta: kapalı bölmede kurtarılmayı bekleyen sıçan. Sağ: çikolata. Oklar kurtarma ve paylaşma olasılığını gösterir." data-ref="b-stage">
        ${rat('light', 68, 100, 1, 1)}
        <rect class="em-cage" x="150" y="64" width="84" height="54" rx="6"/><path class="em-cage" d="M170 64 V118 M192 64 V118 M214 64 V118"/>
        <g data-ref="b-trap"></g>
        <rect class="em-choc" x="292" y="86" width="30" height="22" rx="5"/><path class="em-choc-l" d="M292 97 H322 M307 86 V108"/>
        <path class="em-ar res" data-ref="b-a1" d="M104 96 H144"/><polygon class="em-ah res" points="148,96 139,91 139,101"/>
        <path class="em-ar sh" data-ref="b-a2" d="M240 96 H282"/><polygon class="em-ah sh" points="286,96 277,91 277,101"/>
        <text x="124" y="84" text-anchor="middle" data-ref="b-t1"></text><text x="262" y="84" text-anchor="middle" data-ref="b-t2"></text>
        <text x="192" y="56" text-anchor="middle" data-ref="b-name"></text>
        <text x="68" y="134" text-anchor="middle">gözlemci (açık renkli doğdu)</text>
        <text x="68" y="148" text-anchor="middle" data-ref="b-rtxt"></text>
        <text x="307" y="134" text-anchor="middle">çikolata</text>
      </svg>
      <div class="legend"><span><i class="k-pfc"></i>kurtarma</span><span><i class="k-dop"></i>çikolatayı paylaşma</span><span>ok kalınlığı: olasılık</span></div>
    </div>
    <section class="chart" aria-label="Hedefe göre kurtarma ve paylaşma">
      <h3 class="sim-h">Kime ne kadar yardım edilir?</h3>
      <svg viewBox="0 0 360 130" role="img" aria-label="Üç hedef için kurtarma ve çikolata paylaşma olasılıkları, çikolata referansıyla birlikte" data-ref="b-chart"></svg>
      <div class="legend"><span><i class="k-pfc"></i>kurtarma</span><span><i class="k-dop"></i>çikolata paylaşma</span><span><svg viewBox="0 0 26 10"><path class="thr" d="M1 5 H25"/></svg>çikolata kapısını açma (%${pct(CHOCOLATE)}, referans)</span></div>
    </section>
    <section class="chart" aria-label="Fare acı bulaşması">
      <h3 class="sim-h">Fare izlediği acıyı hisseder mi?</h3>
      <svg viewBox="0 -10 360 146" role="img" aria-label="İzlenen farenin acısına göre izleyici farenin kendi acı yanıtı: kafes arkadaşı ve yabancı için" data-ref="m-chart"></svg>
      <p class="tally" data-ref="m-tally"></p>
    </section>
    <div class="chips" role="group" aria-label="Gözlemciyi büyüten soy" data-ref="b-rear"></div>
    <section aria-label="Yardım hedefi girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="b-in"></div></section>
  </section>

  <section role="tabpanel" id="${id}-p-g" aria-labelledby="${id}-t-g" data-ref="p-g" class="panel" hidden>
    <div class="chips" role="group" aria-label="Ödül yapısı" data-ref="g-pre"></div>
    <section class="chart" aria-label="Ödül devresi etkinliği">
      <h3 class="sim-h">Ödül devresi: para alma, vergi, bağış</h3>
      <svg viewBox="0 0 360 124" role="img" aria-label="Para alırken, zorunlu vergide ve gönüllü bağışta ortalama ödül devresi etkinliği" data-ref="g-bars"></svg>
    </section>
    <section class="chart" aria-label="Vergi ödülü ile cömertlik">
      <h3 class="sim-h">Vergide ödül yüksekse bağış da yüksek mi?</h3>
      <svg viewBox="0 -10 360 152" role="img" aria-label="Kırk katılımcı için vergi sırasındaki ödül devresi etkinliği ve gönüllü cömertlik" data-ref="g-sc"></svg>
      <p class="tally" data-ref="g-tally"></p>
    </section>
    <section class="chart" aria-label="Parayı kendine ya da başkasına harcamak">
      <h3 class="sim-h">Parayı nereye harcamak mutlu eder?</h3>
      <svg viewBox="0 0 360 128" role="img" aria-label="Kendine ve başkasına 5 ve 20 dolar harcamanın mutluluk değişimi, dışarıdan tahminle birlikte" data-ref="g-dunn"></svg>
      <div class="legend"><span><i class="k-dop"></i>dolu çubuk: harcayanın gerçek değişimi</span><span><svg viewBox="0 0 26 10"><path class="fc" d="M2 5 H24"/></svg>çizgi: dışarıdan tahmin</span></div>
    </section>
    <section aria-label="Ödül girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="g-in"></div></section>
  </section>

  <details class="how">
    <summary>Model nasıl çalışıyor?</summary>
    <p><b>Bulaşma ve şefkat.</b> İki durum değişkeni var. Sıkıntı, acının şiddeti ve dikkatin kendine dönüklüğüyle yükselir; şefkat, dikkat karşıdakine döndükçe ve şefkat eğitimiyle yükselir. Şefkat sıkıntıyı yatıştırır. Kişisel sıkıntı eşiği aşıldıkça kaçınma olasılığı hızla artar. Kaçınmayan gözlemci, paylaşılan duygu ve şefkatle orantılı bir olasılıkla yardım eder. Kırk gözlemcinin duyarlılığı ve eşiği biraz farklıdır.</p>
    <p><b>Kime yardım?</b> Her hedefin "bizden" sayılma düzeyi: kafes arkadaşı tam; yabancı için gözlemcinin o soya aşinalığı belirleyici. Büyütüldüğü soya tam aşina, öteki soya birlikte yaşadıkça artan bir aşinalık var. Kurtarma, bu düzey eksi bedel üzerinden yumuşak bir eşikle belirlenir; çikolata paylaşımı kurtarılanla bağa göre artar. Fare bölümünde acı bulaşması tanıdıklıkla ağırlıklanır.</p>
    <p><b>Bağış ve ödül.</b> Zorunlu vergide ödül yalnızca başkasının yararına duyarlılıktan gelir. Gönüllü bağışta buna sıcak ışıltı (vermenin kendi ödülü) eklenir. Cömertlik, ikisinin karışımıdır. Başkasına harcamanın mutluluğu, aynı sıcak ışıltıdan gelir ve miktardan bağımsızdır.</p>
    <p>Varsayımlar: katsayılar, eşik ve ölçekler modelin varsayımıdır; sanal katılımcılar bağımsızdır; sıçanlar ve fareler tek bir "biz" ağırlığıyla özetlenir.</p>
  </details>

  <aside class="book" aria-label="Kitapta">
    <h3 class="sim-h">Kitapta</h3>
    <ul>
      <li><a href="#/bolum/ch14?deney=ch14-e9">Klimecki, Singer ve Ricard: empati ve şefkat eğitimi</a> (replikasyon: bilinmiyor; küçük örneklem, uzman meditasyoncular). Empati eğitimi yoğun amigdala etkinliği ve kaygılı ruh hali getirdi; şefkat eğitimi dopamin devresiyle bağlantılı etkinlik, olumlu duygu ve daha çok prososyallik getirdi. Eğitim koşulları yalnızca bu yönde kalibre edildi.</li>
      <li><a href="#/bolum/ch14?deney=ch14-e7">Eisenberg ve ark.: kalp hızı ve yardım</a> (bilinmiyor). Acıyı görünce kalp hızı belirgin artanlar daha az yardım etti. <a href="#/bolum/ch14?deney=ch14-e8">Martin ve ark.</a> (bilinmiyor; tek çalışma, küçük insan örneklemi): glukokortikoid engellenince yabancılara karşı empati ortaya çıktı.</li>
      <li><a href="#/bolum/ch14?deney=ch14-e4">Bartal ve ark.: sıçanlar birbirini kurtarır</a> (replikasyon: karışık). Kafes arkadaşını kurtarma çikolata kadar güçlü bir motivasyondu; ikisi de mümkünken zamanın yarısından fazlasında çikolata paylaşıldı. Farklı soydan biriyle büyüyen sıçan o soya yardım etti. Davranışın empati mi, kendi sıkıntısını azaltma ya da sosyal temas isteği mi olduğu tartışmalı.</li>
      <li><a href="#/bolum/ch14?deney=ch14-e2">Langford ve ark.: farelerde acı paylaşımı</a> (sağlam; ama "empati" adı tartışmalı). Daha çok yalayan fareyi izleyen daha çok yaladı. Bu yalnızca kafes arkadaşları arasında görüldü.</li>
      <li><a href="#/bolum/ch14?deney=ch14-e12">Harbaugh ve ark.: vergi ve gönüllü bağış</a> (bilinmiyor; tek fMRI, 19 katılımcı). Gönüllü bağışta dopamin etkinliği ve memnuniyet zorunlu vergiye göre yüksekti; yani öz-çıkar bileşeni var. <a href="#/bolum/ch14?deney=ch14-e11">Dunn ve ark.</a> (karışık): yalnızca başkasına harcamak mutluluğu artırdı, miktar fark etmedi; ön kayıtlı replikasyon (Aknin ve ark. 2020) etkiyi belirgin biçimde küçük buldu.</li>
      <li><a href="#/bolum/ch14?deney=ch14-e5">Piff ve ark.: sosyal sınıf ve şeker kasesi</a> (replikasyon: tartışmalı). Büyük ve temsili örneklemli çalışmalar (Trautmann ve ark. 2013; Korndörfer ve ark. 2015) üst sınıfın daha etik dışı davrandığı bulgusunu tekrarlayamadı. Bu yüzden modele alınmadı; sosyal sınıfın kişinin ahlakını belirlediğini göstermez.</li>
    </ul>
    <details class="more"><summary>Burada simüle edilmeyenler</summary>
      <p><a href="#/bolum/ch14?deney=ch14-e3">Prairie vole teselli davranışı</a> (bilinmiyor): stresli partneri yalayıp tımarlama, ACC'deki oksitosine bağlı; stresli yabancıya yönelmedi. <a href="#/bolum/ch14?deney=ch14-e6">Ayna nöronları</a> (makak bulgusu sağlam; empatiyi açıkladığı iddiası zayıf kanıtlı). <a href="#/bolum/ch14?deney=ch14-e10">Akupunktörler</a> (bilinmiyor): tekrarlanan maruziyet başkasının acısına yanıtı azaltabilir.</p>
    </details>
  </aside>

  <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler: empati eğitiminde sıkıntı ve kaçınma, şefkat eğitiminde olumlu duygu ve yardım (Klimecki/Singer); sıkıntısı yüksek olanın daha az yardım etmesi; kafes arkadaşını kurtarmanın çikolata kadar güçlü olması ve paylaşımın zamanın yarısından fazlası; büyütüldüğü soya yardım; acı bulaşmasının tanıdıklara özgü olması; gönüllü bağışta vergiye göre daha yüksek ödül; başkasına harcamanın miktardan bağımsız mutluluğu. Eşik (%55), katsayılar, gün ölçeği, yüzdeler, ödül birimleri ve replikasyonda etkinin ×0,4 küçülmesi modelin varsayımıdır. Sıçan soyları insan gruplarının karşılığı değildir; "biz"in deneyimle kurulduğunu gösterir.</p>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('emp');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  const S = {
    tab: 'e' as Tab, seed: 1, tf: T_END, playing: false,
    e: { ...EMPATHY_DEFAULT } as EmpathyInputs,
    b: { ...BOND_DEFAULT } as BondInputs,
    g: { ...GIVE_DEFAULT } as GiveInputs, rep: 'orig' as Replic,
  };
  let eRes = simulateEmpathy(S.e, S.seed);
  let bRes = bondResult(S.b);
  let gRes = simulateGive(S.g, S.seed);

  // ---- Alt çubuk ----
  const sayEl = $('say');
  const poke = scope.announcer($('live'), () => sayEl.textContent ?? '');
  scope.on(root, 'click', poke);
  scope.on(root, 'input', poke);
  const COLORS: Record<Tab, string[]> = { e: ['--amy', '--dop', '--pfc'], b: ['--pfc', '--dop', '--pit'], g: ['--pfc', '--dop', '--lesion'] };
  const meter = (i: number, label: string, v: number, text?: string) => {
    $(`l${i}`).textContent = label;
    $(`v${i}`).textContent = text ?? pct(v) + '%';
    $(`b${i}`).style.width = pct(Math.min(1, Math.max(0, v))) + '%';
  };
  function renderBar(withSay = true): void {
    COLORS[S.tab].forEach((c, i) => $(`b${i}`).parentElement!.parentElement!.style.setProperty('--c', `var(${c})`));
    if (S.tab === 'e') {
      const i = Math.min(STEPS, Math.floor(S.tf / DT + 1e-6));
      if (withSay) sayEl.textContent = describeEmpathy(S.e, eRes);
      meter(0, 'Sıkıntı', eRes.mean.d[i]);
      meter(1, 'Şefkat', eRes.mean.w[i]);
      meter(2, 'Yardım eden', eRes.help);
    } else if (S.tab === 'b') {
      sayEl.textContent = describeBond(S.b, bRes);
      meter(0, 'Kurtarma', bRes.sel.rescue);
      meter(1, 'Çikolata paylaşma', bRes.sel.share);
      meter(2, 'Acı bulaşması', bRes.sel.w);
    } else {
      sayEl.textContent = describeGive(gRes);
      meter(0, 'Ödül: vergi', gRes.tax);
      meter(1, 'Ödül: bağış', gRes.vol);
      meter(2, 'r: ödül–bağış', Math.max(0, gRes.r), tr(gRes.r));
    }
  }

  // ---- Arayüz yardımcıları ----
  function addSlider(parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, step: number,
    fmt: (v: number) => string, onInput: (v: number) => void): (v: number) => void {
    const w = document.createElement('div');
    w.innerHTML = `<div class="sl-top"><label class="sl-name" for="${id}-s-${key}">${name}</label><span class="sl-val"></span></div>` +
      `<input type="range" id="${id}-s-${key}" min="${min}" max="${max}" step="${step}"><p class="sl-hint">${hint}</p>`;
    parent.appendChild(w);
    const inp = w.querySelector('input') as HTMLInputElement, val = w.querySelector('.sl-val') as HTMLElement;
    const set = (v: number) => { inp.value = String(v); val.textContent = fmt(v); inp.setAttribute('aria-valuetext', fmt(v)); };
    scope.on(inp, 'input', () => { const v = Number(inp.value); set(v); onInput(v); });
    return set;
  }
  function addToggle(parent: HTMLElement, name: string, hint: string, onToggle: () => void): (on: boolean) => void {
    const w = document.createElement('div');
    w.innerHTML = `<button type="button" class="btn tg" aria-pressed="false">${name}</button><p class="sl-hint">${hint}</p>`;
    parent.appendChild(w);
    const b = w.querySelector('button') as HTMLButtonElement;
    scope.on(b, 'click', onToggle);
    return (on) => b.setAttribute('aria-pressed', String(on));
  }
  function addChips(host: HTMLElement, names: string[], onPick: (i: number) => void): (i: number) => void {
    const bs = names.map((n, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = n; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => onPick(i));
      host.appendChild(b);
      return b;
    });
    return (i) => bs.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
  }
  /** Üst üste binen doğrudan etiketleri ayırır (y'ye göre sıralı, en az gap aralık). */
  const spread = (ys: number[], gap = 11): number[] => {
    const idx = ys.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
    const out = ys.slice();
    for (let k = 1; k < idx.length; k++) if (out[idx[k]] - out[idx[k - 1]] < gap) out[idx[k]] = out[idx[k - 1]] + gap;
    return out;
  };

  // =================================================================== 1) Bulaşma ve şefkat
  const px = (i: number) => 30 + (270 * i) / STEPS;
  const py = (v: number) => 100 - 90 * v;
  const path = (a: number[], upto: number) => {
    let s = '';
    for (let i = 0; i < upto; i += 2) s += `${s ? 'L' : 'M'}${px(i).toFixed(1)} ${py(a[i]).toFixed(1)}`;
    return `${s}${s ? 'L' : 'M'}${px(upto).toFixed(1)} ${py(a[upto]).toFixed(1)}`;
  };
  const ORDER: Kind[] = ['help', 'idle', 'avoid'];
  const dotSvg = (k: Kind, x: number, y: number): string =>
    k === 'help'
      ? `<circle class="dh" cx="${x}" cy="${y}" r="6.5"/><path class="dc" d="M${x - 3} ${y} l2.2 2.4 l4 -4.6"/>`
      : k === 'avoid'
        ? `<circle class="da" cx="${x}" cy="${y}" r="5.5"/><path class="dx" d="M${x - 2.6} ${y - 2.6} l5.2 5.2 M${x + 2.6} ${y - 2.6} l-5.2 5.2"/>`
        : `<circle class="di" cx="${x}" cy="${y}" r="2.6"/>`;

  function renderE(live = false): void {
    const idx = Math.min(STEPS, Math.floor(S.tf / DT + 1e-6));
    const m = eRes.mean, d = m.d[idx], w = m.w[idx];
    $('e-tint').setAttribute('fill-opacity', (0.9 * d).toFixed(2));
    $('e-heart').setAttribute('r', (4 + 13 * w).toFixed(1));
    $('e-alarm').style.display = d >= THETA ? '' : 'none';
    $('e-ld').setAttribute('d', path(m.d, idx));
    $('e-lw').setAttribute('d', path(m.w, idx));
    const x = px(idx);
    $('e-head').setAttribute('x1', String(x)); $('e-head').setAttribute('x2', String(x));
    $('e-pd').setAttribute('cx', String(x)); $('e-pd').setAttribute('cy', String(py(d)));
    $('e-pw').setAttribute('cx', String(x)); $('e-pw').setAttribute('cy', String(py(w)));
    const [yd, yw] = (() => { const r = spread([py(m.d[STEPS]) + 3, py(m.w[STEPS]) + 3]); return r; })();
    $('e-td').setAttribute('y', String(yd)); $('e-td').textContent = 'sıkıntı';
    $('e-tw').setAttribute('y', String(yw)); $('e-tw').textContent = 'şefkat';
    if (live) return;
    const u = S.e;
    $('e-burst').firstElementChild!.setAttribute('r', (14 + 18 * u.pain).toFixed(1));
    $('e-waves').style.opacity = String(0.25 + 0.75 * u.pain);
    for (const [k, share] of [['o', 1 - u.selfFocus], ['s', u.selfFocus]] as const) {
      $(`e-ar-${k}`).style.strokeOpacity = String(0.12 + 0.88 * share);
      $(`e-ah-${k}`).style.fillOpacity = String(0.12 + 0.88 * share);
    }
    const sorted = eRes.obs.slice().sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    $('e-dots').innerHTML = sorted.map((o, i) => dotSvg(o.kind, 26 + (i % 20) * 16.5, 14 + Math.floor(i / 20) * 24)).join('');
    const n = eRes.obs.length, c = (k: Kind) => eRes.obs.filter((o) => o.kind === k).length;
    $('e-tally').textContent = `${n} gözlemciden ${c('help')} yardım etti, ${c('idle')} etkisiz kaldı, ${c('avoid')} sıkıntıdan kaçındı. Sıkıntı ile yardım olasılığı arasındaki ilişki r = ${tr(eRes.corr)}.`;
  }

  function stopPlay(): void { S.playing = false; $('e-play').textContent = 'Oynat'; }
  function changeE(): void { stopPlay(); S.tf = T_END; eRes = simulateEmpathy(S.e, S.seed); renderE(); renderBar(); }
  const ePre = addChips($('e-pre'), ['Empati eğitimi', 'Şefkat eğitimi', 'Başlangıç'], (i) => {
    S.e = { ...[EMPATHY_TRAINING, COMPASSION_TRAINING, EMPATHY_DEFAULT][i] };
    syncE(); changeE();
  });
  const eIn = $('e-in');
  const sPain = addSlider(eIn, 'pain', 'Gözlenen acının şiddeti', 'Yüksek: acı çeken kişi daha çok sıkıntıda.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.e.pain = v; changeE(); });
  const sSelf = addSlider(eIn, 'self', 'Benlik odaklı perspektif', 'Yüksek: "bana olsaydı" diye düşünmek. Düşük: "ona ne hissettiriyor" diye düşünmek.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.e.selfFocus = v; changeE(); });
  const sTrain = addSlider(eIn, 'train', 'Şefkat eğitimi', 'Sıcaklık ve bakım odağı; sıkıntıyı yatıştırır.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.e.training = v; changeE(); });
  const sStress = addSlider(eIn, 'stress', 'Stres düzeyi', 'Yüksek stres bulaşmayı güçlendirir ve yardımı azaltır.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.e.stress = v; changeE(); });
  function syncE(): void {
    sPain(S.e.pain); sSelf(S.e.selfFocus); sTrain(S.e.training); sStress(S.e.stress);
    ePre([EMPATHY_TRAINING, COMPASSION_TRAINING, EMPATHY_DEFAULT].findIndex((p) => (Object.keys(p) as Array<keyof EmpathyInputs>).every((k) => p[k] === S.e[k])));
  }
  scope.on($('e-play'), 'click', () => {
    if (S.playing) { stopPlay(); return; }
    S.tf = 0; S.playing = true; $('e-play').textContent = 'Durdur'; renderE(true); renderBar(false);
  });
  scope.on($('e-rerun'), 'click', () => { S.seed++; changeE(); });
  let last = 0;
  scope.loop((now) => {
    const dt = Math.max(0, (now - last) / 1000);
    last = now;
    if (!S.playing) return;
    S.tf = Math.min(T_END, S.tf + dt * 10);
    if (S.tf >= T_END) stopPlay();
    renderE(true); renderBar(false);
  }, { root, onResume: () => { last = performance.now(); } });

  // =================================================================== 2) Kime yardım?
  const strainOf = (t: Target): Strain => (t === 'cage' ? S.b.rearing : t);
  function renderB(): void {
    const r = bRes, sel = r.sel;
    $('b-trap').innerHTML = rat(strainOf(S.b.target), 192, 104, -1, 0.8);
    $('b-name').textContent = TARGET_NAME[S.b.target];
    $('b-rtxt').textContent = `bakıcı: ${STRAIN_NAME[S.b.rearing]} soy`;
    $('b-a1').style.strokeWidth = String(1 + 7 * sel.rescue);
    $('b-a2').style.strokeWidth = String(1 + 7 * sel.share);
    $('b-t1').textContent = `%${pct(sel.rescue)}`;
    $('b-t2').textContent = `%${pct(sel.share)}`;
    // Çubuk grafik
    const cx = [60, 180, 300], H = 80, B = 100;
    let s = '';
    TARGETS.forEach((t, i) => {
      const row = r.rows[t];
      if (t === S.b.target) s += `<rect class="sel" x="${cx[i] - 56}" y="4" width="112" height="${B + 22 - 4}" rx="8"/>`;
      s += `<rect class="bar-r" x="${cx[i] - 34}" y="${B - H * row.rescue}" width="30" height="${H * row.rescue}"/>` +
        `<rect class="bar-s" x="${cx[i] + 4}" y="${B - H * row.share}" width="30" height="${H * row.share}"/>` +
        `<text class="vl" x="${cx[i] - 19}" y="${B - H * row.rescue - 3}" text-anchor="middle">${pct(row.rescue)}</text>` +
        `<text class="vl" x="${cx[i] + 19}" y="${B - H * row.share - 3}" text-anchor="middle">${pct(row.share)}</text>` +
        `<text class="nm" x="${cx[i]}" y="116" text-anchor="middle">${GROUPS[i]}</text>`;
    });
    s += `<line class="thr" x1="0" x2="360" y1="${B - H * CHOCOLATE}" y2="${B - H * CHOCOLATE}"/>` +
      `<line class="grid" x1="0" x2="360" y1="${B}" y2="${B}"/>`;
    $('b-chart').innerHTML = s;
    // Fare grafiği: x = izlenen farenin acısı, y = izleyicinin kendi acı yanıtı
    const X0 = 40, X1 = 250, mx = (v: number) => X0 + (X1 - X0) * v, my = (v: number) => 100 - 90 * v;
    const wCage = contagionWeight('cage', S.b.gcBlock), wStr = contagionWeight('dark', S.b.gcBlock);
    const lines = (w: number) => `M${mx(0)} ${my(painResponse(w, 0))} L${mx(1)} ${my(painResponse(w, 1))}`;
    const [yl1, yl2] = spread([my(painResponse(wCage, 1)) + 3, my(painResponse(wStr, 1)) + 3], 12);
    const familiar = S.b.target === 'cage';
    const wSel = familiar ? wCage : wStr;
    $('m-chart').innerHTML =
      `<line class="grid" x1="${X0}" x2="${X1}" y1="10" y2="10"/><line class="grid" x1="${X0}" x2="${X1}" y1="100" y2="100"/>` +
      `<line class="thr" x1="${X0}" x2="${X1}" y1="${my(0.5)}" y2="${my(0.5)}"/>` +
      `<text x="${X0 - 4}" y="13" text-anchor="end">1</text><text x="${X0 - 4}" y="103" text-anchor="end">0</text><text x="${X0 + 4}" y="2">izleyicinin kendi acı yanıtı</text>` +
      `<text x="${X0 + 4}" y="${my(0.5) - 4}">tek başına</text>` +
      `<text x="${X0}" y="114" text-anchor="middle">az</text><text x="${X1}" y="114" text-anchor="middle">çok</text>` +
      `<text x="${(X0 + X1) / 2}" y="130" text-anchor="middle">izlenen farenin acısı (yalama)</text>` +
      `<path class="ln ln-f" d="${lines(wCage)}"/><path class="ln ln-s" d="${lines(wStr)}"/>` +
      `<text x="${X1 + 5}" y="${yl1}">kafes arkadaşı</text><text x="${X1 + 5}" y="${yl2}">yabancı</text>` +
      `<circle class="pt-m" cx="${mx(S.b.partnerPain)}" cy="${my(painResponse(wSel, S.b.partnerPain))}" r="5"/>`;
    $('m-tally').textContent = `${familiar ? 'Kafes arkadaşını' : 'Yabancı fareyi'} izleyen farenin kendi acı yanıtı: ${tr(sel.response)} (tek başına 0,5). ` +
      (S.b.gcBlock ? 'Glukokortikoid engelli: yabancıda da bulaşma var.' : 'Kafes arkadaşı dışında bulaşma neredeyse yok.');
  }
  function changeB(): void { bRes = bondResult(S.b); renderB(); renderBar(); }
  const setTarget = addChips($('b-tg'), GROUPS, (i) => { S.b.target = TARGETS[i]; setTarget(i); changeB(); });
  const setRear = addChips($('b-rear'), ['Açık renkli bakıcı (kendi soyu)', 'Koyu renkli bakıcı (çapraz bakım)'], (i) => { S.b.rearing = i ? 'dark' : 'light'; setRear(i); changeB(); });
  const bIn = $('b-in');
  const sDays = addSlider(bIn, 'days', 'Öteki soyla birlikte yaşama', 'Gözlemcinin, büyütüldüğü soydan farklı soyla geçirdiği gün (modelin ölçeği).', 0, 14, 1, (v) => `${v} gün`, (v) => { S.b.days = v; changeB(); });
  const sCost = addSlider(bIn, 'cost', 'Kurtarmanın bedeli', 'Yüksek: kapıyı açmak zor ya da riskli; "biz" olmayana yardım önce düşer.', 0, 0.8, 0.05, (v) => pct(v) + '%', (v) => { S.b.cost = v; changeB(); });
  const sPartner = addSlider(bIn, 'pp', 'İzlenen farenin acısı', 'Az yalayan fareyi izlemek acı yanıtını azaltır, çok yalayanı izlemek artırır.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.b.partnerPain = v; changeB(); });
  const tgGc = addToggle(bIn, 'Stres hormonu (glukokortikoid) engellendi', 'Açıkken yabancıda da acı bulaşması görülür (Martin ve ark.).', () => { S.b.gcBlock = !S.b.gcBlock; tgGc(S.b.gcBlock); changeB(); });
  function syncB(): void {
    setTarget(TARGETS.indexOf(S.b.target)); setRear(S.b.rearing === 'dark' ? 1 : 0);
    sDays(S.b.days); sCost(S.b.cost); sPartner(S.b.partnerPain); tgGc(S.b.gcBlock);
  }

  // =================================================================== 3) Bağış ve ödül
  function renderG(): void {
    // Ödül çubukları
    const items: Array<[string, number, string]> = [['Para alma', gRes.recv, 'bar-l'], ['Zorunlu vergi', gRes.tax, 'bar-t'], ['Gönüllü bağış', gRes.vol, 'bar-v']];
    $('g-bars').innerHTML = items.map(([n, v, c], i) => {
      const x = 70 + i * 110, h = 70 * v;
      return `<rect class="${c}" x="${x - 26}" y="${92 - h}" width="52" height="${h}"/><text class="vl" x="${x}" y="${89 - h}" text-anchor="middle">${tr(v)}</text>` +
        `<text class="nm" x="${x}" y="108" text-anchor="middle">${n}</text>`;
    }).join('') + '<line class="grid" x1="10" x2="350" y1="92" y2="92"/>';
    // Dağılım grafiği
    const X0 = 40, X1 = 340, sx = (v: number) => X0 + (X1 - X0) * v, sy = (v: number) => 100 - 90 * v;
    const gv = gRes.givers, n = gv.length;
    const mt = gv.reduce((a, g) => a + g.tax, 0) / n, mg = gv.reduce((a, g) => a + g.gift, 0) / n;
    let sxy = 0, sxx = 0;
    for (const g of gv) { sxy += (g.tax - mt) * (g.gift - mg); sxx += (g.tax - mt) ** 2; }
    const slope = sxx > 0 ? sxy / sxx : 0, y0 = mg - slope * mt;
    const lo = Math.min(...gv.map((g) => g.tax)), hi = Math.max(...gv.map((g) => g.tax));
    const cl = (v: number) => Math.min(1, Math.max(0, v));
    $('g-sc').innerHTML =
      `<line class="grid" x1="${X0}" x2="${X1}" y1="10" y2="10"/><line class="grid" x1="${X0}" x2="${X1}" y1="100" y2="100"/>` +
      `<text x="${X0 - 4}" y="13" text-anchor="end">1</text><text x="${X0 - 4}" y="103" text-anchor="end">0</text>` +
      `<text x="${X0}" y="114" text-anchor="middle">0</text><text x="${X1}" y="114" text-anchor="middle">1</text>` +
      `<text x="${(X0 + X1) / 2}" y="132" text-anchor="middle">vergi sırasında ödül devresi etkinliği</text>` +
      `<text x="${X0 + 4}" y="2">gönüllü cömertlik</text>` +
      (sxx > 1e-6 ? `<line class="trend" x1="${sx(lo)}" y1="${sy(cl(y0 + slope * lo))}" x2="${sx(hi)}" y2="${sy(cl(y0 + slope * hi))}"/>` : '') +
      gv.map((g) => `<circle class="dp" cx="${sx(g.tax).toFixed(1)}" cy="${sy(g.gift).toFixed(1)}" r="3.6"/>`).join('');
    $('g-tally').textContent = `Vergi sırasında ödül devresi daha güçlü yanıt verenler gönüllü olarak daha cömert: r = ${tr(gRes.r)} (kitaptaki yön).`;
    // Dunn
    const cond: Array<[boolean, 5 | 20, string]> = [[true, 5, 'Kendine 5 $'], [true, 20, 'Kendine 20 $'], [false, 5, 'Başkasına 5 $'], [false, 20, 'Başkasına 20 $']];
    const k = 100, B = 100;
    $('g-dunn').innerHTML = cond.map(([self, amt, name], i) => {
      const cxx = 48 + i * 88, a = happinessChange(S.g.warm, self, S.rep), f = forecast(self, amt);
      const top = B - k * Math.max(a, f);
      return `<rect class="bar-v" x="${cxx - 22}" y="${B - k * a}" width="44" height="${Math.max(0.5, k * a)}"/>` +
        `<line class="fc" x1="${cxx - 28}" x2="${cxx + 28}" y1="${B - k * f}" y2="${B - k * f}"/>` +
        `<text class="vl" x="${cxx}" y="${top - 4}" text-anchor="middle">+${tr(a)}</text><text class="nm" x="${cxx}" y="114" text-anchor="middle">${name}</text>`;
    }).join('') + `<line class="grid" x1="0" x2="360" y1="${B}" y2="${B}"/>`;
  }
  function changeG(): void { gRes = simulateGive(S.g, S.seed); renderG(); renderBar(); }
  const GPRE: Array<[string, GiveInputs]> = [
    ['Saf fayda ağırlıklı', { altru: 0.8, warm: 0.1, amount: S.g.amount }],
    ['Karışık', { altru: 0.5, warm: 0.5, amount: S.g.amount }],
    ['Yalnızca sıcak ışıltı', { altru: 0.1, warm: 0.8, amount: S.g.amount }],
  ];
  const gPre = addChips($('g-pre'), GPRE.map((p) => p[0]), (i) => { S.g = { ...GPRE[i][1], amount: S.g.amount }; syncG(); changeG(); });
  const gIn = $('g-in');
  const sAltru = addSlider(gIn, 'altru', 'Başkasının yararına duyarlılık', 'Yüksek: vergi sırasında bile ödül devresi, hayır kurumunun kazancına yanıt verir.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.g.altru = v; syncG(); changeG(); });
  const sWarm = addSlider(gIn, 'warm', 'Sıcak ışıltı (vermenin kendi ödülü)', 'Yüksek: gönüllü bağış ve başkasına harcama kişiyi ayrıca mutlu eder.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.g.warm = v; syncG(); changeG(); });
  const sAmount = addSlider(gIn, 'amt', 'Vergi ya da bağışın tutarı', 'Beklenmedik paranın ne kadarı gıda bankasına gidiyor.', 0.1, 0.9, 0.05, (v) => pct(v) + '%', (v) => { S.g.amount = v; changeG(); });
  const tgRep = addToggle(gIn, 'Ön kayıtlı replikasyon düzeyi', 'Açıkken başkasına harcamanın etkisi küçülür (Aknin ve ark. 2020; ×0,4 modelin varsayımı).', () => { S.rep = S.rep === 'orig' ? 'small' : 'orig'; tgRep(S.rep === 'small'); renderG(); });
  function syncG(): void {
    sAltru(S.g.altru); sWarm(S.g.warm); sAmount(S.g.amount); tgRep(S.rep === 'small');
    gPre(GPRE.findIndex((p) => p[1].altru === S.g.altru && p[1].warm === S.g.warm));
  }

  // =================================================================== Sekmeler
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  function setTab(t: Tab): void {
    S.tab = t;
    tabs.forEach((b) => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-pressed', String(on)); b.tabIndex = on ? 0 : -1; });
    for (const [k] of TABS) $(`p-${k}`).hidden = k !== t;
    renderBar();
  }
  tabs.forEach((b, i) => {
    scope.on(b, 'click', () => setTab(b.dataset.tab as Tab));
    scope.on(b, 'keydown', (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const nb = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      nb.focus(); setTab(nb.dataset.tab as Tab);
    });
  });

  syncE(); renderE();
  syncB(); renderB();
  syncG(); renderG();
  setTab('e');

  // =================================================================== Tur
  const goE = (u: EmpathyInputs) => { setTab('e'); S.e = { ...u }; syncE(); changeE(); };
  const goB = (patch: Partial<BondInputs>) => { setTab('b'); S.b = { ...BOND_DEFAULT, ...patch }; syncB(); changeB(); };
  const tour = createTour(scope, [
    {
      title: 'Acıyı izlemek',
      text: 'Gözlemci, acı çeken birini izliyor. Acının duygusu ona geçiyor: kırmızı çizgi kendi sıkıntısı, amber çizgi acı çekene yönelik şefkat.',
      look: '"Oynat"a basınca iki eğrinin zamanla nasıl ayrıştığına bak.',
      apply: () => goE(EMPATHY_DEFAULT),
    },
    {
      title: 'Kendi sıkıntısına kilitlenmek',
      text: 'Dikkat "bana olsaydı"ya yönelince (empati eğitimi koşulu) sıkıntı eşiği aşıyor. Eşiği aşan gözlemcilerin çoğu kaçınıyor, yardım eden azalıyor.',
      look: 'Kırmızı eğrinin eşik çizgisini geçmesi ve noktalardaki çarpı işaretleri.',
      apply: () => goE(EMPATHY_TRAINING),
    },
    {
      title: 'Karşıdakine dönmek',
      text: 'Aynı acı, dikkat karşıdakine ve sıcaklığa çevrilince (şefkat eğitimi koşulu) başka sonuç veriyor: sıkıntı eşiğin altında kalıyor, şefkat yükseliyor, yardım artıyor.',
      look: 'Amber eğrinin yükselmesi ve mavi dolu noktaların çoğalması.',
      apply: () => goE(COMPASSION_TRAINING),
    },
    {
      title: 'Yardım kime gider?',
      text: 'Sıçan, kafes arkadaşını kurtarmak için çikolata kadar çaba harcıyor. Modelde, tanımadığı ve başka soydan bir sıçan için çok daha az harcıyor.',
      look: 'Çubuk grafikte "Koyu renkli yabancı" grubunun kurtarma çubuğu.',
      apply: () => goB({ target: 'dark' }),
    },
    {
      title: '"Biz" deneyimle genişler',
      text: 'Öteki soyla birlikte geçen gün arttıkça o soydan yabancılara yardım da artıyor. Kitaptaki bulguya göre sıçan, biyolojik soyuna değil büyüdüğü soya yardım ediyor.',
      look: 'Gün kaydırıcısı 14\'te koyu renkli yabancının kurtarma çubuğu. Çapraz bakım çipini de dene.',
      apply: () => goB({ target: 'dark', days: 14 }),
    },
    {
      title: 'Vermenin kendi ödülü',
      text: 'Zorunlu vergide ödül devresi yalnızca başkasının yararına yanıt verir; gönüllü bağışta buna vermenin kendi ödülü eklenir. Başkasına harcamak da kendine harcamaktan daha mutlu eder, oysa dışarıdan tahmin tersidir.',
      look: 'Gönüllü bağış çubuğunun vergiden yüksek olması; Dunn grafiğinde dolu çubuk ile tahmin çizgisinin ters yönde olması.',
      apply: () => { setTab('g'); S.g = { ...GIVE_DEFAULT }; S.rep = 'orig'; syncG(); changeG(); },
    },
  ]);
  root.querySelector('.lede')!.after(tour.el);

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
