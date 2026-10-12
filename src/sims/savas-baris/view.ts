import '../sim.css';
import './view.css';
import { Scope, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  BABOON_DEFAULT, BB, BOOK, CONDS, CONTACT_DEFAULT, COND_NAME, CT, FO, PAY_DEFAULT, TR, TRENCH_DEFAULT, VILLAGE_DEFAULT,
  approachDays, clamp, conditionsMet, correlation, describeBaboons, describeContact, describePay, describeTrench, describeVillage,
  ensembleTruce, meanKnow, simulateBaboons, simulateContact, simulatePay, simulateTrench, simulateVillage, simulateVillages,
  truceCount, weekFire,
  type BabParams, type BabRun, type Cond, type ContactParams, type ContactRun, type PayParams, type Rule, type TrenchParams, type TrenchRun,
  type VillageParams,
} from './model';

type Tab = 'sip' | 'tem' | 'bab';
type Card = 'ct' | 'fo' | 'py';
const pc = (x: number): string => `%${Math.round(x * 100)}`;
const f1 = (x: number): string => x.toFixed(1).replace('.', ',');
const sv = (w: number, h: number, inner: string): string => `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">${inner}</svg>`;
const dotI = (c: string): string => `<i style="background:${c}"></i>`;
const key = (...a: [string, string][]): string => `<div class="legend">${a.map(([i, t]) => `<span>${i}${t}</span>`).join('')}</div>`;
const LG = {
  quiet: sv(26, 10, '<path d="M1 5H25" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="1 4" stroke-linecap="round"/>'),
  two: sv(26, 10, '<circle cx="9" cy="5" r="2.6" fill="var(--pfc)"/><circle cx="17" cy="5" r="2.6" fill="var(--pfc)"/>'),
  fire: sv(26, 10, '<path d="M1 5L5 1L9 9L13 1L17 9L21 1L25 5" fill="none" stroke="var(--amy)" stroke-width="1.8" stroke-linejoin="round"/>'),
  raid: sv(26, 10, '<path d="M1 5H23M18 1L24 5L18 9" fill="none" stroke="var(--ink)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  flag: sv(14, 12, '<circle cx="7" cy="6" r="4.5" fill="var(--pfc)"/>'),
  neu: sv(16, 12, '<rect x="1.5" y="1.5" width="13" height="9" rx="2" fill="none" stroke="var(--dop)" stroke-width="1.6" stroke-dasharray="3 2"/>'),
  line: (c: string, dash = ''): string => sv(26, 10, `<path d="M1 5H25" stroke="${c}" stroke-width="2.4"${dash}/>`),
};

const TEMPLATE = (id: string) => `
<div class="sim sim-sb">
  <p class="lede">Düşmanlar arasında bile işbirliği nasıl kendiliğinden doğar ve onu ne güçlendirir?</p>
  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    <button class="tab" role="tab" id="${id}-tab-sip" data-pane="sip" aria-controls="${id}-pane-sip" aria-selected="true" type="button">Yaşa ve yaşat siperleri</button>
    <button class="tab" role="tab" id="${id}-tab-tem" data-pane="tem" aria-controls="${id}-pane-tem" aria-selected="false" tabindex="-1" type="button">Temas ve itibar</button>
    <button class="tab" role="tab" id="${id}-tab-bab" data-pane="bab" aria-controls="${id}-pane-bab" aria-selected="false" tabindex="-1" type="button">Babunlar</button>
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık çıktılar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- ============ 1 · Siperler ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-sip" data-pane="sip" aria-labelledby="${id}-tab-sip">
    <div data-ref="tour1"></div>
    <section class="card" aria-label="Siper hatları">
      <h3 class="sim-h">Karşılıklı iki siper hattı, sekiz sektör</h3>
      <div class="stage">
        <svg viewBox="0 0 360 172" role="img" aria-label="İki siper hattı" data-ref="trench"></svg>
        ${key([LG.quiet, 'sessiz ya da ritüel atış'], [LG.two, 'iki mermi karşılığı'], [LG.fire, 'gerçek ateş'], [LG.raid, 'baskın emri'], [LG.flag, 'ateşkes (5 gün gerçek ateş yok)'], [LG.neu, 'yeni birlik'])}
        <p class="note">Birliğin içindeki mavi çubuk güvenidir: karşısındakinin kısıtlamaya uyduğuna inanç.</p>
      </div>
      <div data-ref="tp1"></div>
    </section>

    <section class="card" aria-label="Ateşkesin doğuşu ve çöküşü">
      <h3 class="sim-h">Ateşkesin doğuşu ve çöküşü</h3>
      <div class="chart"><svg viewBox="0 0 360 178" role="img" aria-label="Sektör ve güne göre ateşkes ve gerçek ateş; altında ateşkesteki sektör sayısı" data-ref="tl"></svg>
        ${key([dotI('var(--pfc)'), 'ateşkes'], [dotI('var(--amy)'), 'gerçek ateş'], [dotI('var(--ink)'), 'baskın'], [LG.line('var(--dop)'), 'birlik değişimi'])}
      </div>
    </section>

    <section class="card" aria-label="Girdiler">
      <h3 class="sim-h">Girdiler</h3>
      <div class="chips" role="group" aria-label="Karşılık kuralı" data-ref="ruleChips"></div>
      <p class="sl-hint">İhlale karşılık: iki mermi ölçülüdür; tam karşılık gerçek ateştir ve karşılık doğurur.</p>
      <div class="sliders" data-ref="tSl"></div>
    </section>

    <section class="card" aria-label="Duyarlılık">
      <h3 class="sim-h">Ateşkes oranı ve karşı karşıya kalma süresi</h3>
      <div class="chart"><svg viewBox="0 0 360 160" role="img" aria-label="Karşı karşıya kalma süresine göre ortalama ateşkes oranı: iki mermi ve tam karşılık kuralları" data-ref="sens"></svg></div>
      <p class="note">Her nokta 4 farklı tohumun ortalaması (28. günden sonra, sektör-gün payı).</p>
    </section>

    <details class="how">
      <summary>Model nasıl çalışıyor?</summary>
      <div class="how-in">
        <p>Her sektörde iki birlik (ajan) karşı karşıya. Sessiz gün güveni artırır, gerçek ateş ya da baskın düşürür; güven arttıkça gerçek ateş olasılığı hızla azalır, kaza atışı hep mümkündür. Yemek saati ve kötü hava günlerin bir kısmında iki tarafı rastlantıyla susturur: ateşkes buradan başlar.</p>
        <p>İhlale ertesi gün karşılık verilir. İki mermi sınırlıdır ve çoğu zaman "hesap kapandı" diye okunur; ritüel düzenliliği bu okumayı güvenilir kılar. Tam karşılık gerçek ateştir ve yeni karşılık doğurur: tek kaza intikam döngüsüne dönebilir. Bu, <a href="#/bolum/ch10?sim=isbirligi-evrimi">Bölüm 10'daki</a> Tit for Tat'in yankı sorunudur; iki mermi onun ölçülü, affedici türevi gibi davranır.</p>
        <p>Birlik değişince yeni birlik güvensiz başlar. Komuta baskısı baskın emri ve erken rotasyon ekler. Olasılıklar ve "5 gün" ateşkes tanımı modelin varsayımıdır.</p>
      </div>
    </details>

    <section class="book" aria-label="Kitapta">
      <h3 class="sim-h">Kitapta</h3>
      <ul class="book-list">
        <li><a href="#/bolum/ch17?deney=ch17-e12">Ashworth (1980)</a>: ateşkesler yemek saatinde ve kötü havada pasif başladı; keskin nişancılar her gün aynı zararsız noktaya ateş etti; ihlale en yaygın yanıt iki mermiydi. Komutanlar birlik değiştirerek, divan-ı harp tehdidi ve baskın emriyle bozdu. Düşmanlığın cepheden uzaklaştıkça artması modellenmedi. Replikasyon: tarihsel belgeleme, uygulanamaz. Axelrod (1984) vakayı Tit for Tat örneği saydı.</li>
        <li>Grossman/Marshall ateş oranları (<a href="#/bolum/ch17?deney=ch17-e9">e9</a>) ve dron pilotlarında PTSD iddiası (<a href="#/bolum/ch17?deney=ch17-e10">e10</a>) replikasyon notlarına göre tartışmalı; burada kullanılmadı.</li>
      </ul>
    </section>
  </section>

  <!-- ============ 2 · Temas ve itibar ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-tem" data-pane="tem" aria-labelledby="${id}-tab-tem" hidden>
    <div data-ref="tour2"></div>

    <section class="card" data-card="ct" aria-label="Gruplar arası temas">
      <h3 class="sim-h">1 · Temas önyargıyı ne zaman azaltır? (Pettigrew ve Tropp)</h3>
      <div class="chips" role="group" aria-label="Hazır koşullar" data-ref="ctChips"></div>
      <div class="stage">
        <svg viewBox="0 0 360 154" role="img" aria-label="İki grup ve her turdaki eşleşmeler" data-ref="ctStage"></svg>
        ${key([sv(14, 12, '<circle cx="7" cy="6" r="5" fill="var(--amy)" fill-opacity=".2" stroke="var(--ink)"/>'), 'önyargı düşük (açık)'], [sv(14, 12, '<circle cx="7" cy="6" r="5" fill="var(--amy)" fill-opacity=".95" stroke="var(--ink)"/>'), 'yüksek (koyu)'], [LG.line('var(--muted)'), 'bu turdaki temas'])}
      </div>
      <div data-ref="tp2"></div>
      <div class="chart"><svg viewBox="0 0 360 172" role="img" aria-label="Turlara göre ortalama önyargı: seçili koşullar, koşulsuz temas ve üç koşul" data-ref="ctChart"></svg>
        ${key([LG.line('var(--ink)'), 'seçili'], [LG.line('var(--amy)', ' stroke-dasharray="5 3"'), 'koşulsuz temas'], [LG.line('var(--pfc)', ' stroke-dasharray="2 3"'), 'üç koşul'])}
      </div>
      <div class="sliders" data-ref="ctSl"></div>
      <div class="chips" role="group" aria-label="Etki büyüklüğü" data-ref="ctStrength"></div>
      <p class="sl-hint">Etki büyüklüğü: meta-analiz ortalaması ya da randomize, gecikmeli ölçümlerde bulunan küçük etki (Paluck ve ark. 2019).</p>
    </section>

    <section class="card" data-card="fo" aria-label="Orman toplulukları">
      <h3 class="sim-h">2 · Cezalandırmaya hazır köyün ormanı (Rustagi ve ark.)</h3>
      <div class="chart"><svg viewBox="0 0 360 196" role="img" aria-label="49 köyde cezalandırma isteğine göre ormanın 40. yıldaki sağlığı" data-ref="foScatter"></svg>
        ${key([dotI('var(--lesion)'), '49 köy'], [sv(14, 12, '<circle cx="7" cy="6" r="4.5" fill="var(--pfc)" stroke="var(--ink)" stroke-width="1.6"/>'), 'senin köyün'])}
      </div>
      <div class="chart"><svg viewBox="0 0 360 120" role="img" aria-label="Seçili köyde yıllara göre orman stoku" data-ref="foLine"></svg></div>
      <div class="readout" data-ref="foRead"></div>
      <div class="sliders" data-ref="foSl"></div>
    </section>

    <section class="card" data-card="py" aria-label="Hatıra fotoğrafı satışı">
      <h3 class="sim-h">3 · İstediğin kadar öde ve hayır kurumu (Gneezy ve ark.)</h3>
      <div class="chips" role="group" aria-label="Satış koşulu" data-ref="pyChips"></div>
      <div class="chart"><svg viewBox="0 0 360 186" role="img" aria-label="Dört satış koşulunda satış, ortalama ödeme, kâr ve bağış" data-ref="pyChart"></svg></div>
      <p class="note">Değerler 100 ziyaretçi başınadır; sabit fiyat ${10} birimdir (modelin varsayımı).</p>
      <div class="sliders" data-ref="pySl"></div>
    </section>

    <details class="how">
      <summary>Model nasıl çalışıyor?</summary>
      <div class="how-in">
        <p><b>Temas.</b> 12 + 12 ajan, her turda karşı gruptan rastgele biriyle buluşur. Üç koşulun ortalaması temasın niteliğidir: 0,5 üstü önyargıyı azaltır, altı artırır; önyargılı eş etkiyi zayıflatır. Programdan sonra temasa devam etmeyenlerin önyargısı eski düzeyine döner.</p>
        <p><b>Orman.</b> 24 kişi her yıl pay çeker. Bedavacılar olabildiğince keser, koşullu işbirlikçiler ortalamaya uyar. Cezalandırma isteği maliyeti aşanlar devriye atar; devriye kesimi azaltır. Kitaptaki bulgu ilişkiseldir, modelde yol varsayıldı.</p>
        <p><b>Fotoğraf.</b> Ziyaretçinin değeri, hayra ve norma duyarlılığı var. İstediğin kadar öde koşulunda kişi az ödemenin rahatsızlığı ile parayı dengeler; hayır payı hem rahatsızlığı büyütür hem verme memnuniyeti getirir. Fiyat, maliyet ve dağılımlar varsayımdır.</p>
      </div>
    </details>

    <section class="book" aria-label="Kitapta">
      <h3 class="sim-h">Kitapta</h3>
      <ul class="book-list">
        <li><a href="#/bolum/ch17?deney=ch17-e3">Pettigrew ve Tropp (2006)</a>: ~500 çalışma, 250.000'i aşkın katılımcı; eşit statü, ortak hedef ve kurumsal destek varken temas önyargıyı azalttı; gençlerin %91'i program sonrası iletişimi sürdürmedi. Replikasyon: karışık; randomize ve gecikmeli ölçümlerde etki daha küçük (Paluck ve ark. 2019).</li>
        <li><a href="#/bolum/ch17?deney=ch17-e4">Rustagi ve ark. (2010)</a>: 49 orman grubunda cezalandırmaya istekli köylerde devriye sık, orman sağlıklıydı. Tek, ilişkisel saha çalışması; replikasyon bilinmiyor.</li>
        <li><a href="#/bolum/ch17?deney=ch17-e5">Gneezy ve ark. (2010)</a>: ~113.000 alıcı, dört koşul; yönler kitaptan, sayılar yok. Replikasyon: bilinmiyor.</li>
      </ul>
    </section>
  </section>

  <!-- ============ 3 · Babunlar ============ -->
  <section class="pane" role="tabpanel" id="${id}-pane-bab" data-pane="bab" aria-labelledby="${id}-tab-bab" hidden>
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

    <section class="book" aria-label="Kitapta">
      <h3 class="sim-h">Kitapta</h3>
      <ul class="book-list">
        <li><a href="#/bolum/ch17?deney=ch17-e11">Sapolsky ve Share (2004)</a>: çöplük sürüsünde salgın, çöplüğe giden erkeklerin tümü öldü; dişi:erkek 2:1, saldırganlık düştü; yeni erkekler ~6 ayda uydu, dişiler günler-haftalar içinde yaklaştı (tipik: 2 aydan uzun). Tek sürü, replikasyon yok.</li>
      </ul>
    </section>
  </section>

  <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan: iki karşılık mermisi, ritüel keskin nişancı atışları, rotasyon ve baskın emrinin ateşkesi bozması; temasın üç koşulu ve gençlerin %91'i; 49 orman grubu; yaklaşık 113.000 alıcı ve dört koşulun yönleri; dişi:erkek 2:1, yaklaşık altı ay uyum, tipik sürüde iki aydan uzun yaklaşma. Günlük olasılıklar, güven kuralları, ağırlıklar, fiyat ve maliyet, sürü sayıları ve eğri biçimleri modelin varsayımıdır.</p>
</div>`;

interface SliderHandle { inp: HTMLInputElement; set: (v: number) => void }
interface Transport { pos: number; playing: boolean; max: number; speed: number; idx: () => number; set: (i: number, play: boolean) => void; sync: () => void }

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('sb');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let slN = 0;

  /* ---------- Durum ---------- */
  interface State {
    tab: Tab; focus: Card;
    t: TrenchParams; tseed: number;
    c: ContactParams; cseed: number;
    v: VillageParams; vseed: number;
    y: PayParams; cond: Cond;
    b: BabParams; bseed: number;
  }
  const S: State = {
    tab: 'sip', focus: 'ct',
    t: { ...TRENCH_DEFAULT }, tseed: 3,
    c: { ...CONTACT_DEFAULT }, cseed: 5,
    v: { ...VILLAGE_DEFAULT }, vseed: 2,
    y: { ...PAY_DEFAULT }, cond: 'pwywHayir',
    b: { ...BABOON_DEFAULT }, bseed: 4,
  };
  let dirty = true, lastSay = '';
  // Yeniden hesaplama bayrakları
  const need = { t: true, c: true, v: true, y: true, b: true, sens: true };

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
  function toggles<T extends string>(parent: HTMLElement, items: { k: T; name: string }[], get: () => T | null, pick: (k: T) => void): () => void {
    const btns = items.map((it) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = it.name; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => { pick(it.k); dirty = true; });
      parent.appendChild(b);
      return b;
    });
    return () => items.forEach((it, i) => btns[i].setAttribute('aria-pressed', String(get() === it.k)));
  }
  function makeTransport(parent: HTMLElement, o: { max: number; speed: number; unit: string; seed: () => void }): Transport {
    const sid = `${id}-s${++slN}`;
    parent.innerHTML = `<div class="row play"><button class="btn tour-next" type="button" data-k="play"></button><button class="btn" type="button" data-k="rew">Baştan</button><button class="btn" type="button" data-k="seed">Başka tohum</button></div><div class="sl"><div class="sl-top"><label class="sl-name" for="${sid}">Zaman</label><span class="sl-val"></span></div><input type="range" id="${sid}" min="0" max="${o.max - 1}" step="1"></div>`;
    const q = (k: string) => parent.querySelector<HTMLButtonElement>(`[data-k="${k}"]`)!;
    const inp = parent.querySelector<HTMLInputElement>('input')!, val = parent.querySelector<HTMLElement>('.sl-val')!;
    const tp: Transport = {
      pos: 0, playing: false, max: o.max, speed: o.speed,
      idx: () => Math.min(o.max - 1, Math.floor(tp.pos)),
      set: (i, play) => { tp.pos = clamp(play && reduced ? o.max - 1 : i, 0, o.max - 1); tp.playing = play && !reduced; dirty = true; },
      sync: () => {
        const i = tp.idx();
        inp.value = String(i);
        val.textContent = `${o.unit} ${i + (o.unit === 'Tur' ? 0 : 1)} / ${o.unit === 'Tur' ? o.max - 1 : o.max}`;
        inp.setAttribute('aria-valuetext', val.textContent);
        q('play').textContent = tp.playing ? 'Duraklat' : tp.pos >= o.max - 1 ? 'Baştan oynat' : 'Oynat';
      },
    };
    scope.on(q('play'), 'click', () => { if (tp.pos >= o.max - 1) tp.pos = 0; tp.playing = !tp.playing; dirty = true; });
    scope.on(q('rew'), 'click', () => tp.set(0, true));
    scope.on(q('seed'), 'click', () => { o.seed(); tp.set(0, true); });
    scope.on(inp, 'input', () => { tp.pos = Number(inp.value); tp.playing = false; dirty = true; });
    return tp;
  }
  const tiles = (xs: [string, string][]): string => xs.map(([l, v]) => `<div class="ro"><span>${l}</span><b>${v}</b></div>`).join('');
  const setW = (el: HTMLElement, frac: number) => { el.style.width = `${(clamp(frac) * 100).toFixed(1)}%`; };
  const yGrid = (parent: Element, x0: number, x1: number, y: (v: number) => number, vals: number[], fmt: (v: number) => string): void => {
    for (const v of vals) { svg('line', { class: 'grid', x1: x0, x2: x1, y1: y(v), y2: y(v) }, parent); svgText(parent, { class: 'ax', x: x0 - 6, y: y(v) + 3.5, 'text-anchor': 'end' }, fmt(v)); }
  };
  const poly = (pts: [number, number][]): string => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const clipRect = (parent: Element, cid: string, h: number): SVGElement => {
    const cp = svg('clipPath', { id: cid }, svg('defs', {}, parent));
    return svg('rect', { x: 0, y: 0, width: 0, height: h }, cp);
  };

  /* ---------- Sekmeler ---------- */
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  const started: Record<Tab, boolean> = { sip: true, tem: false, bab: false };
  function showTab(t: Tab, focus = false): void {
    S.tab = t; dirty = true;
    for (const b of tabBtns) {
      const on = b.dataset.pane === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const p of panes) p.hidden = p.dataset.pane !== t;
    if (!started[t]) { started[t] = true; (t === 'tem' ? tC : tB).set(0, true); }
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
     1 · Siperler
     ===================================================================== */
  const S8 = TR.S;
  const px = (s: number): number => 22 + s * 45.14;
  const zig = (x: number, y0: number, y1: number): string => {
    const n = 8, dy = (y1 - y0) / n;
    return Array.from({ length: n + 1 }, (_, i) => `${i ? 'L' : 'M'}${(x + (i % 2 ? 3.5 : -3.5) * (i === 0 || i === n ? 0 : 1)).toFixed(1)},${(y0 + dy * i).toFixed(1)}`).join('');
  };
  const trSvg = $<SVGElement>('trench');
  svgText(trSvg, { class: 'tl', x: 4, y: 13 }, 'A hattı');
  svgText(trSvg, { class: 'tl', x: 4, y: 168 }, 'B hattı');
  const secs = Array.from({ length: S8 }, (_, s) => {
    const x = px(s), g = svg('g', {}, trSvg);
    svg('line', { class: 't-base', x1: x, x2: x, y1: 46, y2: 126 }, g);
    const zA = svg('path', { class: 't-fire hide', d: zig(x - 3, 46, 126) }, g), zB = svg('path', { class: 't-fire hide', d: zig(x + 3, 126, 46) }, g);
    const rA = svg('path', { class: 't-raid hide', d: `M${x - 3},48V112M${x - 8},105L${x - 3},113L${x + 2},105` }, g), rB = svg('path', { class: 't-raid hide', d: `M${x + 3},124V60M${x - 2},67L${x + 3},59L${x + 8},67` }, g);
    const dA = svg('g', { class: 'hide' }, g), dB = svg('g', { class: 'hide' }, g);
    for (const [gg, y] of [[dA, 62], [dB, 108]] as const) for (const o of [-5, 5]) svg('circle', { class: 't-dot', cx: x + o, cy: y, r: 2.8 }, gg);
    const flag = svg('circle', { class: 't-flag hide', cx: x, cy: 86, r: 5 }, g);
    const post = (y: number) => {
      const nw = svg('rect', { class: 't-new hide', x: x - 16, y: y - 3, width: 32, height: 24, rx: 4 }, g);
      svg('rect', { class: 't-post', x: x - 13, y, width: 26, height: 18, rx: 3 }, g);
      const tr = svg('rect', { class: 't-trust', x: x - 10, y: y + 12, width: 0, height: 3.5, rx: 1 }, g);
      return { nw, tr };
    };
    return { zA, zB, rA, rB, dA, dB, flag, pA: post(22), pB: post(130), x };
  });
  const cls = (el: Element, base: string, show: boolean) => el.setAttribute('class', show ? base : `${base} hide`);

  // Zaman çizelgesi
  const TL = { x0: 30, x1: 352, cy: 12, rh: 9, ly0: 112, ly1: 156 };
  const tlx = (d: number): number => TL.x0 + ((TL.x1 - TL.x0) * d) / TR.days;
  const tl = $<SVGElement>('tl');
  for (let s = 0; s < S8; s++) if (s % 7 === 0) svgText(tl, { class: 'ax', x: TL.x0 - 6, y: TL.cy + s * TL.rh + 7, 'text-anchor': 'end' }, `s${s + 1}`);
  const tlClip = clipRect(tl, `${id}-clipT`, 178);
  const tlG = svg('g', { 'clip-path': `url(#${id}-clipT)` }, tl);
  const tlCells = { quiet: svg('path', { class: 'c-quiet' }, tlG), fire: svg('path', { class: 'c-fire' }, tlG), raid: svg('path', { class: 'c-raid' }, tlG) };
  const tlRot = svg('path', { class: 'c-rot' }, tlG);
  const tlArea = svg('path', { class: 'c-area' }, tlG), tlLine = svg('polyline', { class: 'ln c-line' }, tlG);
  const ty = (n: number): number => TL.ly1 - ((TL.ly1 - TL.ly0) * n) / S8;
  yGrid(tl, TL.x0, TL.x1, ty, [0, 4, 8], String);
  svgText(tl, { class: 'ax', x: TL.x0, y: TL.ly0 - 6 }, 'ateşkesteki sektör');
  for (let w = 0; w <= 26; w += 4) svgText(tl, { class: 'ax', x: tlx(w * 7), y: 171, 'text-anchor': w === 0 ? 'start' : 'middle' }, String(w));
  const tlCur = svg('line', { class: 'cursor', y1: TL.cy - 4, y2: TL.ly1 }, tl);
  let runT: TrenchRun;
  function buildTimeline(): void {
    const cw = (TL.x1 - TL.x0) / TR.days + 0.35;
    const sets = { quiet: '', fire: '', raid: '' };
    let rot = '', pts: [number, number][] = [], area = `M${TL.x0},${TL.ly1}`;
    for (let d = 0; d < TR.days; d++) {
      const a = runT.acts[d], x = tlx(d);
      for (let s = 0; s < S8; s++) {
        const y = TL.cy + s * TL.rh, A = a[s], B = a[S8 + s];
        const k = A === 3 || B === 3 ? 'raid' : A >= 2 || B >= 2 ? 'fire' : runT.truce[d][s] ? 'quiet' : '';
        if (k) sets[k] += `M${x.toFixed(1)} ${y}h${cw.toFixed(2)}v${TL.rh - 1}h-${cw.toFixed(2)}z`;
      }
      const nr = runT.rotated[d].reduce((p, c) => p + c, 0);
      if (nr) rot += `M${x.toFixed(1)} ${TL.cy + S8 * TL.rh + 6}v${-Math.min(nr, 3) * 2.5 - 1}`;
      const yy = ty(truceCount(runT, d));
      pts.push([x, yy]); area += `L${x.toFixed(1)},${yy.toFixed(1)}`;
    }
    area += `L${TL.x1},${TL.ly1}z`;
    tlCells.quiet.setAttribute('d', sets.quiet); tlCells.fire.setAttribute('d', sets.fire); tlCells.raid.setAttribute('d', sets.raid);
    tlRot.setAttribute('d', rot); tlArea.setAttribute('d', area); tlLine.setAttribute('points', poly(pts));
  }
  function drawTrench(d: number): void {
    const a = runT.acts[d], kn = runT.know[d];
    secs.forEach((e, s) => {
      const A = a[s], B = a[S8 + s];
      cls(e.zA, 't-fire', A === 2); cls(e.zB, 't-fire', B === 2);
      cls(e.rA, 't-raid', A === 3); cls(e.rB, 't-raid', B === 3);
      cls(e.dA, '', A === 1); cls(e.dB, '', B === 1);
      cls(e.flag, 't-flag', runT.truce[d][s] === 1);
      e.pA.tr.setAttribute('width', (20 * kn[s]).toFixed(1)); e.pB.tr.setAttribute('width', (20 * kn[S8 + s]).toFixed(1));
      const recent = (i: number) => [0, 1, 2].some((k) => d - k >= 0 && runT.rotated[d - k][i]);
      cls(e.pA.nw, 't-new', recent(s)); cls(e.pB.nw, 't-new', recent(S8 + s));
    });
    const x = tlx(d + 1);
    tlClip.setAttribute('width', x.toFixed(1)); tlCur.setAttribute('x1', x.toFixed(1)); tlCur.setAttribute('x2', x.toFixed(1));
    trSvg.setAttribute('aria-label', describeTrench(runT, d));
  }

  // Duyarlılık grafiği
  const SN = { x0: 36, x1: 346, top: 10, bot: 116 };
  const sens = $<SVGElement>('sens');
  const TEN = [1, 2, 3, 4, 6, 8, 12, 16, 20, 26];
  const sx = (w: number): number => SN.x0 + ((SN.x1 - SN.x0) * (w - 1)) / 25;
  const sy = (v: number): number => SN.bot - (SN.bot - SN.top) * v;
  yGrid(sens, SN.x0, SN.x1, sy, [0, 0.5, 1], pc);
  for (const w of [1, 4, 8, 12, 16, 20, 26]) svgText(sens, { class: 'ax', x: sx(w), y: SN.bot + 14, 'text-anchor': w === 1 ? 'start' : w === 26 ? 'end' : 'middle' }, String(w));
  svgText(sens, { class: 'ax', x: (SN.x0 + SN.x1) / 2, y: SN.bot + 30, 'text-anchor': 'middle' }, 'aynı birliklerin karşı karşıya kalma süresi (hafta)');
  const snIki = svg('polyline', { class: 'ln s-iki' }, sens), snTam = svg('polyline', { class: 'ln s-tam' }, sens);
  const snLbI = svgText(sens, { class: 'ax lgt', x: SN.x1, y: 0, 'text-anchor': 'end' }, 'iki mermi'), snLbT = svgText(sens, { class: 'ax lgt', x: SN.x1, y: 0, 'text-anchor': 'end' }, 'tam karşılık');
  const snDot = svg('circle', { class: 'cur-dot', r: 4.6 }, sens);
  let sensKey = '', sensVal: Record<Rule, number[]> = { iki: [], tam: [] };
  function drawSens(): void {
    const k = `${S.t.ritual}|${S.t.accident}|${S.t.command}`;
    if (k !== sensKey) {
      sensKey = k;
      for (const rule of ['iki', 'tam'] as const) sensVal[rule] = TEN.map((w) => ensembleTruce({ ...S.t, tenure: w, rule }, 4));
    }
    snIki.setAttribute('points', poly(TEN.map((w, i) => [sx(w), sy(sensVal.iki[i])])));
    snTam.setAttribute('points', poly(TEN.map((w, i) => [sx(w), sy(sensVal.tam[i])])));
    const li = sensVal.iki[TEN.length - 1], lt = sensVal.tam[TEN.length - 1], up = li >= lt;
    snLbI.setAttribute('y', String(sy(li) + (up ? -7 : 14))); snLbT.setAttribute('y', String(sy(lt) + (up ? 14 : -7)));
    snDot.setAttribute('cx', String(sx(S.t.tenure))); snDot.setAttribute('cy', String(sy(ensembleTruce(S.t, 4))));
  }

  // Girdiler
  const tSlH = $('tSl');
  const setT = (patch: Partial<TrenchParams>) => {
    S.t = { ...S.t, ...patch };
    if (patch.tenure !== undefined) hTen.set(patch.tenure);
    if (patch.ritual !== undefined) hRit.set(Math.round(patch.ritual * 100));
    if (patch.accident !== undefined) hAcc.set(Math.round(patch.accident * 1000) / 10);
    if (patch.command !== undefined) hCom.set(Math.round(patch.command * 100));
    need.t = need.sens = dirty = true;
  };
  const hTen = makeSlider(tSlH, { name: 'Karşı karşıya kalma süresi', hint: 'Aynı birlikler değişmeden kaç hafta aynı karşılarında kalır. Kısa olunca ateşkes yerleşemez', min: 1, max: 26, step: 1, val: S.t.tenure, fmt: (v) => `${v} hafta`, cb: (v) => { setT({ tenure: v }); }, color: 'var(--pfc)' });
  const hRit = makeSlider(tSlH, { name: 'Ritüel düzenliliği', hint: 'Keskin nişancı her gün aynı zararsız noktaya ateş eder: sessizlik ve karşılık doğru okunur', min: 0, max: 100, step: 5, val: S.t.ritual * 100, fmt: (v) => `%${v}`, cb: (v) => { setT({ ritual: v / 100 }); }, color: 'var(--pfc)' });
  const hAcc = makeSlider(tSlH, { name: 'Kaza atışı olasılığı', hint: 'Gergin bir nöbetçinin ya da şaşıran bir topçunun günlük hatası (birlik başına)', min: 0, max: 8, step: 0.5, val: S.t.accident * 100, fmt: (v) => `%${String(v).replace('.', ',')}`, cb: (v) => { setT({ accident: v / 100 }); }, color: 'var(--amy)' });
  const hCom = makeSlider(tSlH, { name: 'Komuta baskısı', hint: 'Baskın emirleri ve erken birlik değişimi (divan-ı harp tehdidi)', min: 0, max: 100, step: 5, val: S.t.command * 100, fmt: (v) => `%${v}`, cb: (v) => { setT({ command: v / 100 }); }, color: 'var(--amy)' });
  const syncRule = toggles<Rule>($('ruleChips'), [{ k: 'iki', name: 'İki mermi (ölçülü)' }, { k: 'tam', name: 'Tam karşılık' }], () => S.t.rule, (k) => setT({ rule: k }));
  const tT = makeTransport($('tp1'), { max: TR.days, speed: 8, unit: 'Gün', seed: () => { S.tseed++; need.t = true; } });
  function barTrench(): void {
    const d = tT.idx(), tc = truceCount(runT, d), wf = weekFire(runT, d);
    setBar(describeTrench(runT, d), [
      { label: 'Ateşkesteki sektör', text: `${tc}/${S8}`, frac: tc / S8, color: 'var(--pfc)' },
      { label: 'Son 7 gün gerçek ateş', text: String(wf), frac: wf / 40, color: 'var(--amy)' },
      { label: 'Ortalama güven', text: pc(meanKnow(runT, d)), frac: meanKnow(runT, d), color: 'var(--ink)' },
    ]);
  }
  function renderTrench(): void {
    if (need.t) { runT = simulateTrench(S.t, S.tseed); buildTimeline(); need.t = false; }
    if (need.sens) { drawSens(); need.sens = false; }
    drawTrench(tT.idx()); syncRule(); tT.sync(); barTrench();
  }

  /* =====================================================================
     2 · Temas ve itibar
     ===================================================================== */
  // --- 2a Temas
  const cs = $<SVGElement>('ctStage');
const CP = { ax: 80, bx: 280, y0: 28, dy: 21, dx: 14 };
  const cpos = (g: 0 | 1, i: number): [number, number] => [(g ? CP.bx : CP.ax) + (i % 2 ? CP.dx : -CP.dx), CP.y0 + Math.floor(i / 2) * CP.dy];
  svgText(cs, { class: 'tl', x: CP.ax, y: 12, 'text-anchor': 'middle' }, 'Grup A');
  svgText(cs, { class: 'tl', x: CP.bx, y: 12, 'text-anchor': 'middle' }, 'Grup B');
  const ctLinks = svg('g', {}, cs);
  const ctDots = [0, 1].map((g) => Array.from({ length: CT.n }, (_, i) => { const [x, y] = cpos(g as 0 | 1, i); return svg('circle', { class: 'ct-dot', cx: x, cy: y, r: 8 }, cs); }));
  const ctMid = svgText(cs, { class: 'tl', x: 180, y: 146, 'text-anchor': 'middle' }, '');
  let runC: ContactRun, refNone: ContactRun, refAll: ContactRun;
  const CC = { x0: 34, x1: 346, top: 12, bot: 128 };
  const cch = $<SVGElement>('ctChart');
  const crx = (t: number): number => CC.x0 + ((CC.x1 - CC.x0) * t) / CT.rounds;
  const cry = (v: number): number => CC.bot - (CC.bot - CC.top) * v;
  yGrid(cch, CC.x0, CC.x1, cry, [0, 0.5, 1], pc);
  for (let t = 0; t <= CT.rounds; t += 10) svgText(cch, { class: 'ax', x: crx(t), y: CC.bot + 14, 'text-anchor': t === 0 ? 'start' : 'middle' }, String(t));
  svgText(cch, { class: 'ax', x: (CC.x0 + CC.x1) / 2, y: CC.bot + 30, 'text-anchor': 'middle' }, 'temas turu');
  svg('line', { class: 'offline', x1: crx(CT.program), x2: crx(CT.program), y1: CC.top, y2: CC.bot }, cch);
  svgText(cch, { class: 'ax', x: crx(CT.program) + 4, y: CC.top + 9 }, 'program biter');
  const ctRefN = svg('polyline', { class: 'ln ref-amy' }, cch), ctRefA = svg('polyline', { class: 'ln ref-pfc' }, cch);
  const ctClip = clipRect(cch, `${id}-clipC`, 172);
  const ctLine = svg('polyline', { class: 'ln cur', 'clip-path': `url(#${id}-clipC)` }, cch);
  const ctCur = svg('circle', { class: 'cur-dot', r: 4.5 }, cch);
  const lineOf = (r: ContactRun): string => poly(r.mean.map((m, t) => [crx(t), cry(m)]));
  function drawContact(t: number): void {
    ctDots.forEach((arr, g) => arr.forEach((c, i) => c.setAttribute('fill-opacity', (0.12 + 0.88 * runC.agents[t][g * CT.n + i]).toFixed(2))));
    ctLinks.replaceChildren();
    runC.pairs[t].forEach((b, i) => { if (b >= 0) { const [x1, y1] = cpos(0, i), [x2, y2] = cpos(1, b); svg('line', { class: 'ct-link', x1: x1 + 8, y1, x2: x2 - 8, y2 }, ctLinks); } });
    ctMid.textContent = t === 0 ? '' : t > CT.program && runC.p.follow < 0.5 ? 'program bitti: temas kesildi' : t > CT.program ? 'temas sürüyor' : '';
    ctClip.setAttribute('width', (crx(t) + 1).toFixed(1));
    ctCur.setAttribute('cx', String(crx(t))); ctCur.setAttribute('cy', String(cry(runC.mean[t])));
    cs.setAttribute('aria-label', describeContact(runC, t));
  }
  const tC = makeTransport($('tp2'), { max: CT.rounds + 1, speed: 3, unit: 'Tur', seed: () => { S.cseed++; need.c = true; } });
  const ctSl = $('ctSl');
  const setC = (patch: Partial<ContactParams>) => {
    S.c = { ...S.c, ...patch };
    if (patch.status !== undefined) hSt.set(Math.round(patch.status * 100));
    if (patch.goal !== undefined) hGo.set(Math.round(patch.goal * 100));
    if (patch.support !== undefined) hSu.set(Math.round(patch.support * 100));
    if (patch.follow !== undefined) hFo.set(Math.round(patch.follow * 100));
    need.c = dirty = true; S.focus = 'ct';
  };
  const pctFmt = (v: number): string => `%${v}`;
  const hSt = makeSlider(ctSl, { name: 'Eşit statü', hint: 'İki grup temasta aynı konumda mı, yoksa biri üstte mi', min: 0, max: 100, step: 10, val: 100, fmt: pctFmt, cb: (v) => setC({ status: v / 100 }), color: 'var(--pfc)' });
  const hGo = makeSlider(ctSl, { name: 'Ortak hedef', hint: 'Birlikte ulaşılacak bir amaç var mı', min: 0, max: 100, step: 10, val: 100, fmt: pctFmt, cb: (v) => setC({ goal: v / 100 }), color: 'var(--pfc)' });
  const hSu = makeSlider(ctSl, { name: 'Kurumsal destek', hint: 'Otorite ve kurallar temasa arka çıkıyor mu', min: 0, max: 100, step: 10, val: 100, fmt: pctFmt, cb: (v) => setC({ support: v / 100 }), color: 'var(--pfc)' });
  const hFo = makeSlider(ctSl, { name: 'Programdan sonra temasa devam eden', hint: 'Kitapta gençlerin %91\'i iletişimi sürdürmedi; yani yaklaşık %9 devam etti', min: 0, max: 100, step: 1, val: 100, fmt: pctFmt, cb: (v) => setC({ follow: v / 100 }), color: 'var(--dop)' });
  const CT_PRE = [{ k: 'none', name: 'Koşulsuz temas', v: [0, 0, 0] }, { k: 'one', name: 'Yalnızca eşit statü', v: [1, 0, 0] }, { k: 'all', name: 'Üç koşul', v: [1, 1, 1] }];
  const syncCtPre = toggles($('ctChips'), CT_PRE.map((p) => ({ k: p.k, name: p.name })), () => CT_PRE.find((p) => p.v[0] === S.c.status && p.v[1] === S.c.goal && p.v[2] === S.c.support)?.k ?? null, (k) => { const p = CT_PRE.find((x) => x.k === k)!; setC({ status: p.v[0], goal: p.v[1], support: p.v[2] }); });
  const syncStr = toggles($('ctStrength'), [{ k: '1', name: 'Ortalama etki' }, { k: '0.4', name: 'Temkinli (Paluck 2019)' }], () => String(S.c.strength), (k) => setC({ strength: Number(k) }));
  const refOf = (p: Partial<ContactParams>): ContactRun => simulateContact({ ...S.c, ...p }, S.cseed);

  // --- 2b Orman
  const FS = { x0: 36, x1: 346, top: 12, bot: 148 };
  const fsc = $<SVGElement>('foScatter');
  const fx = (w: number): number => FS.x0 + (FS.x1 - FS.x0) * w, fy = (v: number): number => FS.bot - (FS.bot - FS.top) * v;
  yGrid(fsc, FS.x0, FS.x1, fy, [0, 0.5, 1], pc);
  for (const w of [0, 0.25, 0.5, 0.75, 1]) svgText(fsc, { class: 'ax', x: fx(w), y: FS.bot + 14, 'text-anchor': w === 0 ? 'start' : w === 1 ? 'end' : 'middle' }, pc(w));
  svgText(fsc, { class: 'ax', x: (FS.x0 + FS.x1) / 2, y: FS.bot + 30, 'text-anchor': 'middle' }, 'maliyetli cezalandırmaya ortalama istek (köy)');
  svgText(fsc, { class: 'ax', x: FS.x0, y: 8 }, 'ormanın 40. yıldaki stoku');
  const fsDots = svg('g', {}, fsc), fsMe = svg('circle', { class: 'me-dot', r: 6 }, fsc);
  const FL = { x0: 36, x1: 346, top: 8, bot: 90 };
  const fln = $<SVGElement>('foLine');
  const lx = (y: number): number => FL.x0 + ((FL.x1 - FL.x0) * y) / FO.years, ly = (v: number): number => FL.bot - (FL.bot - FL.top) * v;
  yGrid(fln, FL.x0, FL.x1, ly, [0, 0.5, 1], pc);
  for (let y = 0; y <= FO.years; y += 10) svgText(fln, { class: 'ax', x: lx(y), y: FL.bot + 14, 'text-anchor': y === 0 ? 'start' : 'middle' }, String(y));
  svgText(fln, { class: 'ax', x: (FL.x0 + FL.x1) / 2, y: FL.bot + 28, 'text-anchor': 'middle' }, 'yıl');
  const flLine = svg('polyline', { class: 'ln cur' }, fln);
  let runV: ReturnType<typeof simulateVillage>, vil: ReturnType<typeof simulateVillages> = [];
  let vilCost = -1;
  const foSl = $('foSl');
  const setV = (patch: Partial<VillageParams>) => {
    S.v = { ...S.v, ...patch };
    if (patch.free !== undefined) hFr.set(Math.round(patch.free * 100));
    if (patch.willing !== undefined) hWi.set(Math.round(patch.willing * 100));
    if (patch.cost !== undefined) hCo.set(Math.round(patch.cost * 100));
    need.v = dirty = true; S.focus = 'fo';
  };
  const hFr = makeSlider(foSl, { name: 'Bedavacı payı', hint: 'Ormanı olabildiğince kesenlerin payı', min: 0, max: 60, step: 5, val: S.v.free * 100, fmt: pctFmt, cb: (v) => setV({ free: v / 100 }), color: 'var(--amy)' });
  const hWi = makeSlider(foSl, { name: 'Cezalandırmaya hazırlık', hint: 'Maliyete rağmen bedavacıyı cezalandırmaya hazır olma (senin köyünün ortalaması)', min: 0, max: 100, step: 5, val: S.v.willing * 100, fmt: pctFmt, cb: (v) => setV({ willing: v / 100 }), color: 'var(--pfc)' });
  const hCo = makeSlider(foSl, { name: 'Devriye maliyeti', hint: 'Zaman ve emek. Hazırlığı bunu aşanlar devriyeye çıkar', min: 0, max: 100, step: 5, val: S.v.cost * 100, fmt: pctFmt, cb: (v) => setV({ cost: v / 100 }), color: 'var(--dop)' });
  function drawForest(): void {
    if (vilCost !== S.v.cost) {
      vilCost = S.v.cost; vil = simulateVillages(S.v.cost, S.vseed);
      fsDots.replaceChildren();
      for (const p of vil) svg('circle', { class: 'v-dot', cx: fx(p.willing), cy: fy(p.end), r: 3 }, fsDots);
    }
    fsMe.setAttribute('cx', String(fx(S.v.willing))); fsMe.setAttribute('cy', String(fy(runV.end)));
    flLine.setAttribute('points', poly(runV.stock.map((v, y) => [lx(y), ly(v)])));
    const r = correlation(vil.map((p) => p.willing), vil.map((p) => p.end));
    $('foRead').innerHTML = tiles([['Devriyeci', `${runV.patrollers} / ${Math.round((1 - S.v.free) * FO.n)}`], ['Devriye kapsaması', pc(runV.coverage)], ['40. yıl stoku', pc(runV.end)], [`${BOOK.villages} köyde ilişki (r)`, r.toFixed(2).replace('.', ',')]]);
  }

  // --- 2c Fotoğraf
  const PC = { x0: 108, cw: 62, bw: 34, top: 28, rh: 36 };
  const LBL: Record<Cond, string[]> = { sabit: ['Sabit fiyat'], pwyw: ['İstediğin', 'kadar öde'], sabitHayir: ['Sabit fiyat', '+ hayır payı'], pwywHayir: ['Öde', '+ hayır payı'] };
  const pyc = $<SVGElement>('pyChart');
  const METS: { k: 'sales' | 'avgPaid' | 'profit' | 'donation'; name: string; color: string }[] = [
    { k: 'sales', name: 'Satış', color: 'var(--pfc)' }, { k: 'avgPaid', name: 'Ödenen', color: 'var(--dop)' },
    { k: 'profit', name: 'Kâr', color: 'var(--ink)' }, { k: 'donation', name: 'Bağış', color: 'var(--gld)' },
  ];
  METS.forEach((m, j) => svgText(pyc, { class: 'tl', x: PC.x0 + j * PC.cw, y: 16 }, m.name));
  const pyRows = CONDS.map((c, i) => {
    const y = PC.top + i * PC.rh, g = svg('g', {}, pyc);
    const hl = svg('rect', { class: 'py-hl', x: 1, y: y - 4, width: 358, height: PC.rh - 2, rx: 6 }, g);
    LBL[c].forEach((part, k, a) => svgText(g, { class: 'tk', x: 6, y: y + 18 + (k - (a.length - 1) / 2) * 12 }, part));
    const cells = METS.map((m, j) => ({ b: svg('rect', { class: 'py-bar', x: PC.x0 + j * PC.cw, y: y + 4, width: 0, height: 12, rx: 2, fill: m.color }, g), t: svgText(g, { class: 'pv', x: PC.x0 + j * PC.cw, y: y + 28 }, '') }));
    return { hl, cells };
  });
  let outP: ReturnType<typeof simulatePay>;
  const pySl = $('pySl');
  const setY = (patch: Partial<PayParams>) => {
    S.y = { ...S.y, ...patch };
    if (patch.share !== undefined) hSh.set(Math.round(patch.share * 100));
    if (patch.glow !== undefined) hGl.set(Math.round(patch.glow * 100));
    if (patch.norm !== undefined) hNo.set(Math.round(patch.norm * 100));
    need.y = dirty = true; S.focus = 'py';
  };
  const hSh = makeSlider(pySl, { name: 'Hayır payı', hint: 'Ödemenin hayır kurumuna giden payı (iki hayır koşulunda)', min: 0, max: 100, step: 10, val: S.y.share * 100, fmt: pctFmt, cb: (v) => setY({ share: v / 100 }), color: 'var(--gld)' });
  const hGl = makeSlider(pySl, { name: 'Hayra duyarlılık', hint: 'Hayra katkıdan duyulan memnuniyet', min: 0, max: 100, step: 10, val: S.y.glow * 100, fmt: pctFmt, cb: (v) => setY({ glow: v / 100 }), color: 'var(--gld)' });
  const hNo = makeSlider(pySl, { name: 'Norm duyarlılığı', hint: 'Az ödemekten duyulan rahatsızlık (öz imaj)', min: 10, max: 100, step: 10, val: S.y.norm * 100, fmt: pctFmt, cb: (v) => setY({ norm: v / 100 }), color: 'var(--dop)' });
  const syncCond = toggles<Cond>($('pyChips'), CONDS.map((c) => ({ k: c, name: COND_NAME[c] })), () => S.cond, (k) => { S.cond = k; S.focus = 'py'; });
  function drawPay(): void {
    METS.forEach((m, j) => {
      const mx = Math.max(1e-9, ...CONDS.map((c) => Math.abs(outP[c][m.k])));
      CONDS.forEach((c, i) => {
        const v = outP[c][m.k], cell = pyRows[i].cells[j];
        cell.b.setAttribute('width', (Math.max(1.5, (Math.abs(v) / mx) * PC.bw)).toFixed(1));
        cell.b.setAttribute('fill', v < 0 ? 'var(--amy)' : m.color);
        cell.t.textContent = `${v < 0 ? '−' : ''}${f1(Math.abs(v))}`;
      });
    });
    pyRows.forEach((r, i) => r.hl.setAttribute('class', `py-hl${CONDS[i] === S.cond ? ' on' : ''}`));
    pyc.setAttribute('aria-label', `Satış koşulları. ${describePay(outP, S.cond)}`);
  }

  function barTemas(): void {
    if (S.focus === 'ct') {
      const t = tC.idx(), m = runC.mean[t];
      setBar(describeContact(runC, t), [
        { label: 'Ortalama önyargı', text: pc(m), frac: m, color: 'var(--amy)' },
        { label: 'Sağlanan koşul', text: `${conditionsMet(S.c)}/3`, frac: conditionsMet(S.c) / 3, color: 'var(--pfc)' },
        { label: 'Temas turu', text: `${t}/${CT.rounds}`, frac: t / CT.rounds, color: 'var(--ink)' },
      ]);
    } else if (S.focus === 'fo') {
      setBar(describeVillage(runV, S.v), [
        { label: 'Orman stoku', text: pc(runV.end), frac: runV.end, color: 'var(--pfc)' },
        { label: 'Devriye kapsaması', text: pc(runV.coverage), frac: runV.coverage, color: 'var(--dop)' },
        { label: 'Bedavacı payı', text: pc(S.v.free), frac: S.v.free / 0.6, color: 'var(--amy)' },
      ]);
    } else {
      const r = outP[S.cond];
      setBar(describePay(outP, S.cond), [
        { label: 'Satış /100 ziyaretçi', text: f1(r.sales), frac: r.sales / 50, color: 'var(--pfc)' },
        { label: 'Ortalama ödeme', text: f1(r.avgPaid), frac: r.avgPaid / 10, color: 'var(--dop)' },
        { label: 'Şirket kârı', text: f1(r.profit), frac: Math.max(0, r.profit) / 80, color: 'var(--ink)' },
      ]);
    }
  }
  function renderTemas(): void {
    if (need.c) { runC = simulateContact(S.c, S.cseed); refNone = refOf({ status: 0, goal: 0, support: 0 }); refAll = refOf({ status: 1, goal: 1, support: 1 }); ctRefN.setAttribute('points', lineOf(refNone)); ctRefA.setAttribute('points', lineOf(refAll)); ctLine.setAttribute('points', lineOf(runC)); need.c = false; }
    if (need.v) { runV = simulateVillage(S.v, S.vseed); need.v = false; }
    if (need.y) { outP = simulatePay(S.y, 7); need.y = false; }
    drawContact(tC.idx()); drawForest(); drawPay();
    syncCtPre(); syncStr(); syncCond(); tC.sync(); barTemas();
  }

  /* =====================================================================
     3 · Babunlar
     ===================================================================== */
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
    need.b = dirty = true;
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

  /* ---------- Rehberli turlar ---------- */
  const seekT = (d: number, play = false) => tT.set(d, play);
  const tour1 = createTour(scope, [
    { title: 'Savaş böyle başlar', text: 'İlk günlerde herkes ateş ediyor. Yemek saati ve kötü hava ara sıra iki tarafı rastlantıyla susturuyor.',
      look: 'Kırmızı zikzaklar arasında ilk mavi noktalar belirir.', apply: () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT }); seekT(0, true); } },
    { title: 'Ateşkes kendiliğinden doğar', text: 'Sessiz günler güveni (mavi çubuk) artırıyor. Kimse emir vermedi.',
      look: 'Çizelgede mavi alan yayılıyor, ateşkesteki sektör sayısı artıyor.', apply: () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT }); seekT(110); } },
    { title: 'Ritüel olmadan ateşkes tutmaz', text: 'Her gün aynı noktaya zararsız atış yoksa sessizlik yanlış okunuyor; güven yükselmiyor.',
      look: 'Ateşkesteki sektör sayısı düşük kalır.', apply: () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT, ritual: 0 }); seekT(TR.days - 1); } },
    { title: 'İki mermi: kaza intikam olmaz', text: 'Kaza sık, ama karşılık iki mermi ve "hesap kapandı" diye okunuyor (kitaptaki en yaygın yanıt).',
      look: 'Matriste kısa kırmızı lekeler, hemen ardından yine mavi.', apply: () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT, accident: 0.04, command: 0, rule: 'iki' }); seekT(TR.days - 1); } },
    { title: 'Tam karşılık: intikam döngüsü', text: 'Aynı kaza oranı, ama her atışa gerçek ateşle karşılık: karşılık yeni karşılık doğuruyor.',
      look: 'Kırmızı uzun bloklar; ateşkesteki sektör az.', apply: () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT, accident: 0.04, command: 0, rule: 'tam' }); seekT(TR.days - 1); } },
    { title: 'Komuta karşılıklılığı bozar', text: 'Kitapta komutanlar birlik değiştirdi, baskın emri verdi. Burada güven her seferinde sıfırlanıyor.',
      look: 'Turuncu birlik değişimi çizgileri ve siyah baskın blokları.', apply: () => { S.tseed = 3; setT({ ...TRENCH_DEFAULT, tenure: 4, command: 1, rule: 'iki' }); seekT(TR.days - 1); } },
  ]);
  $('tour1').appendChild(tour1.el);

  const seekC = (t: number, play = false) => tC.set(t, play);
  const tour2 = createTour(scope, [
    { title: 'Koşulsuz temas', text: 'Çok buluşma var ama statü eşit değil, ortak hedef ve kurumsal destek yok.',
      look: 'Önyargı düşmüyor, yükseliyor (koyu noktalar çoğalır).', apply: () => { S.focus = 'ct'; S.cseed = 5; setC({ status: 0, goal: 0, support: 0, follow: 1, strength: 1 }); seekC(0, true); } },
    { title: 'Üç koşul: önyargı düşer', text: 'Üç koşul varken aynı temas önyargıyı belirgin azaltıyor (Pettigrew ve Tropp).',
      look: 'Çizgi mavi kesikli "üç koşul" referansına yakın iner.', apply: () => { S.focus = 'ct'; S.cseed = 5; setC({ status: 1, goal: 1, support: 1, follow: 1, strength: 1 }); seekC(CT.rounds); } },
    { title: 'Program bitince etki söner', text: 'Kitapta gençlerin %91\'i program sonrası iletişimi sürdürmedi. Temas kesilince önyargı eski düzeyine doğru geri dönüyor.',
      look: '20. turdan sonra çizgi yeniden yükselir.', apply: () => { S.focus = 'ct'; S.cseed = 5; setC({ status: 1, goal: 1, support: 1, follow: 0.09, strength: 1 }); seekC(CT.rounds); } },
    { title: 'Cezalandırmaya hazır köy', text: 'Cezalandırmaya hazırlık arttıkça devriye artıyor, orman sağlıklı kalıyor. Kitapta bulgu ilişkisel; burada yol varsayıldı.',
      look: 'Noktalar sağa doğru yükselir; kaydırıcı seni bir noktaya taşır.', apply: () => { S.focus = 'fo'; setV({ free: 0.2, willing: 0.15, cost: 0.4 }); } },
    { title: 'İstediğin kadar öde', text: 'Satışlar fırlıyor ama ödemeler çok küçük; şirket zararda. Kimse izlemiyorsa az ödemek ucuz.',
      look: '"Satış" sütunu uzun, "Ödenen" ve "Kâr" sütunları kısa ya da kırmızı.', apply: () => { setY({ ...PAY_DEFAULT }); S.cond = 'pwyw'; } },
    { title: 'Ödemenin yarısı hayra', text: 'Hem satış hem ödeme artıyor; şirket kâr ediyor, büyük bağış toplanıyor.',
      look: 'Ödenen ve bağış sütunları yükselir.', apply: () => { setY({ ...PAY_DEFAULT }); S.cond = 'pwywHayir'; } },
  ]);
  $('tour2').appendChild(tour2.el);

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

  /* ---------- Başlangıç ---------- */
  const poke = scope.announcer($('live'), () => lastSay);
  const onAction = (ev: Event) => {
    const card = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-card]')?.dataset.card as Card | undefined;
    if (card) { S.focus = card; dirty = true; }
    if (dirty) { dirty = false; render(); }
    poke();
  };
  scope.on(root, 'click', onAction);
  scope.on(root, 'input', onAction);

  let last = performance.now();
  function render(): void {
    if (S.tab === 'sip') renderTrench();
    else if (S.tab === 'tem') renderTemas();
    else renderBab();
  }
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    const tp = S.tab === 'sip' ? tT : S.tab === 'tem' ? tC : tB;
    if (tp.playing) {
      tp.pos = Math.min(tp.max - 1, tp.pos + dt * tp.speed);
      if (tp.pos >= tp.max - 1) tp.playing = false;
      dirty = true;
    }
    if (dirty) { dirty = false; render(); }
  }
  render();
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
