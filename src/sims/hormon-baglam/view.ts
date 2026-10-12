import '../sim.css';
import './view.css';
import { Scope, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  MATCHES, OFFERS, PARTNERS, O_BASE, S_BASE, T_BASE,
  beliefTable, betray, chronic, choice, describeO, describeS, describeT, empathy, gcLevel, habit, lieRate,
  meanOffer, minutesOf, perf, perfAcute, popOffers, prejudice, rejectRate, risk, sampleOffers, sliderOf, statusKept,
  transfer, vole, mean,
  type Belief, type Evidence, type OIn, type Partner, type Route, type SIn, type TIn, type VoleIn,
} from './model';
import { mulberry32 } from './rng';

type Tab = 't' | 'o' | 's';
const f1 = (x: number): string => x.toFixed(1).replace('.', ',');
const pc = (x: number): number => Math.round(x * 100);

const PARTNER_UI: Record<Partner, [string, string]> = {
  biz: ['Biz (iç grup)', 'aynı takımdan'],
  onlar: ['Onlar (dış grup)', 'karşı takımdan'],
  yabanci: ['Anonim yabancı', 'başka odada'],
  rastgele: ['Rastgele mekanizma', 'kontrol'],
};

const TEMPLATE = (id: string) => `
<div class="sim sim-hb">
  <p class="lede">Testosteron, oksitosin ve stres hormonları davranışı yaratır mı, yoksa zaten var olan eğilimleri bağlama göre mi büyütür?</p>

  <div class="tabs" role="tablist" aria-label="Hormonlar">
    <button class="tab" role="tab" id="${id}-tab-t" data-pane="t" aria-controls="${id}-p-t" aria-selected="true" type="button">Testosteron</button>
    <button class="tab" role="tab" id="${id}-tab-o" data-pane="o" aria-controls="${id}-p-o" aria-selected="false" tabindex="-1" type="button">Oksitosin</button>
    <button class="tab" role="tab" id="${id}-tab-s" data-pane="s" aria-controls="${id}-p-s" aria-selected="false" tabindex="-1" type="button">Stres eğrisi</button>
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık çıktılar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- ===== Testosteron ===== -->
  <section class="pane" role="tabpanel" id="${id}-p-t" data-pane="t" aria-labelledby="${id}-tab-t">
    <div class="chips" data-ref="tChips" role="group" aria-label="Hazır durumlar"></div>
    <div class="stage">
      <svg data-ref="tSvg" viewBox="0 0 360 190" role="img" aria-label="Ajanın statü meydan okumasına verdiği yanıtın olasılıkları: saldırı, cömertlik, geri çekilme"></svg>
      <div class="legend"><span><i style="background:var(--amy)"></i>saldırı</span><span><i style="background:var(--gld)"></i>cömertlik</span><span><i style="background:var(--lesion)"></i>geri çekilme</span></div>
    </div>
    <div class="readout" data-ref="tRead"></div>
    <section aria-label="Girdiler"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="tSl"></div><div class="ctls" data-ref="tCtl"></div></section>
    <section class="chart" aria-label="Doza göre eylem olasılığı">
      <h3 class="sim-h">Doz arttıkça seçilen yol</h3>
      <svg data-ref="tChart" viewBox="0 0 360 170" role="img" aria-label="Testosteron düzeyine göre statüyü koruyan eylemin olasılığı; meydan okuma varken ve yokken"></svg>
      <div class="legend"><span data-ref="tLeg1"></span><span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 3"/></svg><span data-ref="tLeg2"></span></span></div>
    </section>
    <section class="card" aria-label="Ultimatum oyunu varyantı">
      <h3 class="sim-h">Ultimatum varyantı: 10 ₺'yi bölüşme</h3>
      <p class="note">Teklif veren, karşı tarafa 10 ₺'den 0 ile 5 ₺ arası öneri sunar. Karşı taraf reddederse ikisi de hiçbir şey almaz; reddedilen teklif statü kaybıdır. 24 sanal teklif verenin payları:</p>
      <svg data-ref="uSvg" viewBox="0 0 360 152" role="img" aria-label="24 sanal teklif verenin teklifleri; çizgiler modelin beklentisi"></svg>
      <p class="sl-hint" data-ref="uStat"></p>
      <div class="row"><button class="btn" type="button" data-ref="uAgain">Yeniden örnekle</button></div>
      <table class="tbl" data-ref="uTbl">
        <caption>Ortalama teklif (₺): gerçekte ne alındı ve ne sanıldı</caption>
        <thead><tr><th></th><th scope="col">Plasebo sanıyor</th><th scope="col">Testosteron sanıyor</th></tr></thead>
        <tbody>
          <tr><th scope="row">Gerçekte plasebo</th><td data-ref="c00"></td><td data-ref="c01"></td></tr>
          <tr><th scope="row">Gerçekte testosteron</th><td data-ref="c10"></td><td data-ref="c11"></td></tr>
        </tbody>
      </table>
      <p class="sl-hint">Doz kaydırıcısı 0'dayken iki satır aynıdır. Satırlar ilacın, sütunlar inancın etkisini ayrı gösterir.</p>
    </section>
    <details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">
      <p>Ajanın üç yanıtı vardır: saldırı, cömertlik, geri çekilme. Her birinin ilk değeri kişinin kendi eğiliminden gelir. Meydan okuma varken hormon, statüyü koruyan yola bir kazanç ekler. Meydan okuma yokken bu kazanç yaklaşık altıda birine iner. Hormon kesilse de (doz 0) davranış sürer: hormon eğilimi büyütür, yaratmaz.</p>
      <p>Ultimatum'da teklif veren para, adalet ve statü arasında tartar. Cömertlikle statü kazanılan ortamda doz teklifleri yükseltir; saldırıyla statü kazanılan ortamda düşürür. "Testosteron aldığını sanmak" ise ilaçtan bağımsız ayrı bir terimdir ve teklifleri düşürür.</p>
      <p>Zar raporunda yalan oranı yalnızca dürüstlüğün itibar getirdiği (cömertlik yolu) bağlamda hormonla düşer. Saldırı yolunda kitapta test edilmiş bir durum yok, bu yüzden etkisiz bırakıldı.</p>
    </div></details>
    <section class="book" aria-label="Kitapta"><h3 class="sim-h">Kitapta</h3><ul class="book-list">
      <li><a href="#/bolum/ch04?deney=ch04-e2">Eisenegger ve ark. (2010)</a>: kadın katılımcılara testosteron verildi; reddin statü kaybı olduğu Ultimatum'da daha adil teklif yaptılar. Replikasyon: karışık (erkeklerde cömertlik azalan bir çalışma da var).</li>
      <li><a href="#/bolum/ch04?deney=ch04-e3">Aynı deneyde inanç</a>: gerçekte ne aldıklarından bağımsız, testosteron aldığına inananlar daha adaletsiz teklif verdi. Replikasyon: bilinmiyor; karşılaştırma rastgele atanmış değil.</li>
      <li><a href="#/bolum/ch04?deney=ch04-e4">Wibral ve ark. (2012)</a>: testosteron verilen erkekler zar sonucunu daha az yanlış bildirdi. Replikasyon: bilinmiyor; tek, küçük çalışma.</li>
      <li><a href="#/bolum/ch04?deney=ch04-e1">Dixson ve Herbert (1977)</a>: talapoin maymunlarında testosteron, mevcut saldırgan kalıbı (aşağıdakilere) büyüttü. Replikasyon: bilinmiyor.</li>
      <li>Kavram: zorluk hipotezi (challenge hypothesis). Testosteron statü meydan okuması anında yükselir ve statüyü koruyan davranışı destekler.</li>
    </ul></section>
  </section>

  <!-- ===== Oksitosin ===== -->
  <section class="pane" role="tabpanel" id="${id}-p-o" data-pane="o" aria-labelledby="${id}-tab-o" hidden>
    <div class="chips" data-ref="oChips" role="group" aria-label="Hazır durumlar"></div>
    <div class="warn" role="note">
      <p class="warn-h">Replikasyon durumu: tartışmalı</p>
      <p>Kosfeld ve ark. (2005), burundan oksitosinin güven oyununda yatırımı artırdığını bulmuştu. Sonraki güven oyunu deneylerinde bu tutarlı biçimde tekrarlanamadı; çalışmalar birleştirilince güvenilir bir etki görülmedi. Burundan verilen oksitosinin beyne ne kadar ulaştığı ve alandaki çalışmaların düşük istatistiksel gücü de eleştirildi. "Biz-onlar" bulguları (De Dreu) için durum: karışık.</p>
    </div>
    <div class="stage">
      <svg data-ref="oSvg" viewBox="0 0 360 246" role="img" aria-label="Güven oyununda dört karşı tarafa yatırılan pay; oksitosinsiz karşılaştırma işaretiyle"></svg>
      <div class="legend"><span><i style="background:var(--hyp)"></i>oksitosinle</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="13" y1="0" x2="13" y2="10" stroke="var(--ink)" stroke-width="2.4"/></svg>oksitosinsiz</span></div>
    </div>
    <div class="readout" data-ref="oRead"></div>
    <section aria-label="Girdiler"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="oSl"></div><div class="ctls" data-ref="oCtl"></div></section>
    <section class="card" aria-label="Tarla faresi">
      <h3 class="sim-h">Alt panel: tarla faresi ve vazopressin</h3>
      <p class="note">Tek eşli bozkır tarla faresinin (prairie vole) ödül bölgelerinde vazopressin reseptörü (V1a) yoğundur; çok eşli akrabalarında azdır. Reseptör ve hormon birlikte gerekir.</p>
      <div class="chips" data-ref="vChips" role="group" aria-label="Tür"></div>
      <div class="sliders" data-ref="vSl"></div>
      <div class="meters" data-ref="vMet"></div>
      <p class="sl-hint">Dikkat: tek bir gene ya da reseptöre indirgemek fazla basit. Oksitosin reseptörü olmayan bozkır tarla fareleri üzerine 2023 tarihli bir CRISPR çalışması, bu farelerin yine de eş bağı kurabildiğini gösterdi.</p>
    </section>
    <details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">
      <p>Her karşı taraf için başlangıç güveni ayrıdır: iç grup yüksek, dış grup ve yabancı daha düşük. Oksitosin yalnızca belirli kapılarda etkilidir: iç gruba yatırım artar (De Dreu); anonim yabancıya yatırım, yalnızca özgün Kosfeld bulgusuna göre artar; rastgele mekanizmada etki yoktur, yani etki genel risk alma değil sosyal güvendir.</p>
      <p>Dış grup tehdidi (maddi risk) yüksekken oksitosin, karşı takıma önleyici ihanet olasılığını ve örtük önyargıyı artırır. "Birleşik analizler" görünümünde Kosfeld etkisi sıfırlanır (kitaba göre güvenilir etki görülmedi); De Dreu etkileri ise belirsizlik nedeniyle yarıya indirilir (bu oran modelin varsayımı).</p>
    </div></details>
    <section class="book" aria-label="Kitapta"><h3 class="sim-h">Kitapta</h3><ul class="book-list">
      <li><a href="#/bolum/ch04?deney=ch04-e7">Kosfeld ve ark. (2005)</a>: oksitosin alan yatırımcılar daha çok para emanet etti; karşı tarafın rastgele mekanizma olduğu kontrolde etki yoktu. Replikasyon: <b>tartışmalı</b>. Ayrıca Sapolsky, oksitosinin anonim ve başka odadaki yabancılarla işbirliğini azalttığını belirtir.</li>
      <li><a href="#/bolum/ch04?deney=ch04-e8">De Dreu ve ark. (2010, 2011)</a>: oksitosin takım içi cömertliği artırdı, riskin yüksek olduğu durumlarda karşı takıma önleyici ihaneti ve dış gruplara örtük önyargıyı yükseltti. Replikasyon: karışık; "etnosentrizm" yorumu eleştirildi.</li>
      <li><a href="#/bolum/ch04?deney=ch04-e5">Young, Lim ve ark. (1999, 2004)</a>: V1a reseptörü tarla farelerinde eş yakınlığını ve tercihini artırdı. Replikasyon: sağlam. Kitap ikinci deneyi dağ tarla faresinde anlatır; asıl çalışma çayır tarla faresinde ve ventral pallidumdadır.</li>
    </ul></section>
  </section>

  <!-- ===== Stres ===== -->
  <section class="pane" role="tabpanel" id="${id}-p-s" data-pane="s" aria-labelledby="${id}-tab-s" hidden>
    <div class="chips" data-ref="sChips" role="group" aria-label="Hazır durumlar"></div>
    <div class="stage">
      <svg data-ref="sSvg" viewBox="0 0 360 196" role="img" aria-label="Ters U eğrisi: stres şiddetine göre performans; akut ve süren stres eğrileri"></svg>
      <div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--pfc)" stroke-width="2.4"/></svg>kısa süreli stres</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--red)" stroke-width="2.4" stroke-dasharray="5 3"/></svg>seçilen süre</span></div>
    </div>
    <div class="stage">
      <svg data-ref="eSvg" viewBox="0 0 360 120" role="img" aria-label="Stres altında empati kapsamı: yakın çevreye ve yabancıya yönelik empati"></svg>
    </div>
    <div class="readout" data-ref="sRead"></div>
    <section aria-label="Girdiler"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="sSl"></div><div class="ctls" data-ref="sCtl"></div></section>
    <section class="card" aria-label="Risk alma">
      <h3 class="sim-h">Stres altında risk alma (balon görevi)</h3>
      <div class="meters" data-ref="rMet"></div>
      <p class="sl-hint">Çizgi: stressiz düzey. Orta stres cinsiyet farkını açar; çok büyük stres ikisinde de risk almayı artırır. Deney akut stresle yapıldı: süre kaydırıcısı bu çubukları değiştirmez.</p>
    </section>
    <section class="card" aria-label="Futbol yenilgisi">
      <h3 class="sim-h">Yer değiştirme: futbol yenilgisi ve aile içi şiddet</h3>
      <div class="chips" data-ref="mChips" role="group" aria-label="Maç sonucu"></div>
      <div class="meters" data-ref="mMet"></div>
      <p class="sl-hint">Yüzdeler Card ve Dahl'ın bulgusundan (kitap): polise bildirilen aile içi şiddette göreli artış. Gözlemsel veridir, nedensel bir deney değil.</p>
    </section>
    <details class="how"><summary>Model nasıl çalışıyor?</summary><div class="how-in">
      <p>Performans eğrisi, stres şiddetiyle önce yükselip sonra düşer (ters U). Süre uzadıkça kronikleşme artar: yaklaşık bir günden sonra başlar, birkaç haftada tamamlanır. Kronik stres hem eğriyi alçaltır hem davranışı hedefe yönelikten alışkanlığa kaydırır. Eğrinin biçimi ve sayılar modelin varsayımıdır; yön kitaptan gelir.</p>
      <p>Empati: yakın çevre stresle az, yabancı çok daralır. Glukokortikoid yanıtı engellenince yabancıya empati korunur. Fare deneyindeki yabancı karşılaşması başlı başına stresli olduğundan "yabancı" çubuğu stresle düşer.</p>
      <p>Yer değiştirme seçeneği, saldırganlığı daha zayıf birine yöneltmenin stres hormonu düzeyini düşürmesini temsil eder (kitaptaki sıçan ve babun örnekleri). Bedeli bu hedefin maruz kaldığı zarardır; model onu göstermez.</p>
    </div></details>
    <section class="book" aria-label="Kitapta"><h3 class="sim-h">Kitapta</h3><ul class="book-list">
      <li><a href="#/bolum/ch04?deney=ch04-e9">Dias-Ferreira ve ark. (2009)</a>: kronik stresli sıçanlar ödül değersizleşse de alışkanlığı sürdürdü. Replikasyon: karışık; insanlarda alışkanlık oluşturma yöntemlerinin güvenilirliği sorgulandı.</li>
      <li><a href="#/bolum/ch04?deney=ch04-e10">Lighthall ve ark. (2009)</a>: soğuk baskı stresi erkeklerde risk almayı artırdı, kadınlarda azalttı. Replikasyon: bilinmiyor.</li>
      <li><a href="#/bolum/ch04?deney=ch04-e11">Card ve Dahl (2011)</a>: beklenmedik yenilgide erkeklerin partnerine şiddeti yaklaşık %10, playoff yarışında %13, rakibe yenilgide %20 arttı. Replikasyon: sağlam (gözlemsel).</li>
      <li><a href="#/bolum/ch04?deney=ch04-e12">Langford, Martin ve ark.</a>: glukokortikoid engellenince fareler yabancıya da acı empatisi gösterdi. Replikasyon: bilinmiyor.</li>
      <li><a href="#/bolum/ch01?deney=ch01-e1">Yer değiştirme saldırganlığı</a> (Levine'in sıçanları, Sapolsky'nin babunları): saldırganlığı başkasına yönelten babunların glukokortikoid düzeyi daha düşüktü. Replikasyon: sağlam (hormonu düşürme kısmı daha az çalışmaya dayanır).</li>
    </ul></section>
  </section>

  <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan yalnızca Card ve Dahl yüzdeleri (yaklaşık %10, %13, %20) ve bulguların yönleri alındı; bütün diğer sayılar (kazançlar, eşikler, ₺ tutarları, kronikleşme süresi) modelin varsayımıdır. Gerçek hormon etkileri bundan çok daha karmaşıktır.</p>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('hb');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  /* ---------- Durum ---------- */
  let tab: Tab = 't';
  let T: TIn = { ...T_BASE };
  let O: OIn = { ...O_BASE };
  let V: VoleIn = { receptor: 0.85, vasopressin: 0.5 };
  let S: SIn = { ...S_BASE };
  let match = 0;
  let seed = 7;
  const syncers: Array<() => void> = [];

  /* ---------- Ortak yardımcılar ---------- */
  function slider(host: HTMLElement, key: string, name: string, hint: string, min: number, max: number,
    get: () => number, set: (v: number) => void, fmt: (v: number) => string, color: string): void {
    const sid = `${id}-${key}`;
    const w = document.createElement('div');
    w.style.setProperty('--c', color);
    w.innerHTML = `<div class="sl-top"><label class="sl-name" for="${sid}">${name}</label><span class="sl-val"></span></div><input type="range" id="${sid}" min="${min}" max="${max}" step="1"><p class="sl-hint">${hint}</p>`;
    host.appendChild(w);
    const inp = w.querySelector('input')!;
    const out = w.querySelector('.sl-val')!;
    const upd = () => { inp.value = String(get()); out.textContent = fmt(get()); };
    scope.on(inp, 'input', () => { set(+inp.value); refresh(true); });
    syncers.push(upd);
  }
  function chipGroup<V extends string>(host: HTMLElement, label: string, items: Array<[V, string]>, get: () => V, set: (v: V) => void): void {
    const w = document.createElement('div');
    w.className = 'ctl';
    w.innerHTML = `<p class="sl-name">${label}</p><div class="row" role="group" aria-label="${label}"></div>`;
    host.appendChild(w);
    const row = w.querySelector('.row')!;
    const btns = items.map(([v, t]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = t;
      scope.on(b, 'click', () => { set(v); refresh(true); });
      row.appendChild(b);
      return [v, b] as const;
    });
    syncers.push(() => { for (const [v, b] of btns) b.setAttribute('aria-pressed', String(get() === v)); });
  }
  function presets(host: HTMLElement, items: Array<[string, () => void]>): void {
    items.forEach(([t, fn]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = t;
      scope.on(b, 'click', () => { fn(); refresh(true); });
      host.appendChild(b);
    });
  }
  function readouts(host: HTMLElement, labels: string[]): HTMLElement[] {
    return labels.map((l) => {
      const d = document.createElement('div');
      d.className = 'ro';
      d.innerHTML = `<span class="k">${l}</span><span class="v"></span>`;
      host.appendChild(d);
      return d.querySelector('.v') as HTMLElement;
    });
  }
  interface Meter { set: (v: number, text: string, ghost?: number) => void; label: HTMLElement; wrap: HTMLElement }
  function meter(host: HTMLElement, label: string, color: string): Meter {
    const w = document.createElement('div');
    w.className = 'm';
    w.style.setProperty('--c', color);
    w.innerHTML = `<div class="m-top"><span></span><b></b></div><div class="track"><b></b><i hidden></i></div>`;
    w.querySelector('span')!.textContent = label;
    host.appendChild(w);
    const val = w.querySelector('.m-top b')!, fill = w.querySelector<HTMLElement>('.track b')!, gh = w.querySelector<HTMLElement>('.track i')!;
    return {
      wrap: w, label: w.querySelector('span')!,
      set: (v, text, ghost) => {
        val.textContent = text;
        fill.style.width = `${Math.max(0, Math.min(1, v)) * 100}%`;
        gh.hidden = ghost === undefined;
        if (ghost !== undefined) gh.style.left = `${Math.max(0, Math.min(1, ghost)) * 100}%`;
      },
    };
  }

  /* ---------- Üst çubuk göstergeleri ---------- */
  const barM = $('meters');
  const bm = [meter(barM, '', 'var(--ink)'), meter(barM, '', 'var(--ink)'), meter(barM, '', 'var(--ink)')];
  const BAR_DEF: Record<Tab, Array<[string, string]>> = {
    t: [['Saldırı eğilimi', 'var(--amy)'], ['Cömertlik eğilimi', 'var(--gld)'], ['Ortalama teklif', 'var(--pfc)']],
    o: [['İç gruba verilen pay', 'var(--hyp)'], ['Dış gruba güven', 'var(--pit)'], ['Dış gruba önyargı', 'var(--red)']],
    s: [['Performans', 'var(--pfc)'], ['Alışkanlığa kayma', 'var(--dop)'], ['Yabancıya empati', 'var(--gld)']],
  };
  function setBar(t: Tab, vals: Array<[number, string]>): void {
    bm.forEach((m, i) => {
      m.label.textContent = BAR_DEF[t][i][0];
      m.wrap.style.setProperty('--c', BAR_DEF[t][i][1]);
      m.set(vals[i][0], vals[i][1]);
    });
  }

  /* ---------- Sekmeler ---------- */
  const sayEl = $('say'), live = $('live');
  const tabBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.tab'));
  const panes = Array.from(root.querySelectorAll<HTMLElement>('.pane'));
  function showTab(t: Tab, focus = false): void {
    tab = t;
    for (const b of tabBtns) {
      const on = b.dataset.pane === t;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    }
    for (const p of panes) p.hidden = p.dataset.pane !== t;
    refresh(false);
  }
  for (const b of tabBtns) {
    scope.on(b, 'click', () => showTab(b.dataset.pane as Tab));
    scope.on(b, 'keydown', (ev) => {
      const i = tabBtns.indexOf(b);
      const j = ev.key === 'ArrowRight' ? (i + 1) % tabBtns.length : ev.key === 'ArrowLeft' ? (i + tabBtns.length - 1) % tabBtns.length : -1;
      if (j >= 0) { ev.preventDefault(); showTab(tabBtns[j].dataset.pane as Tab, true); }
    });
  }
  const poke = scope.announcer(live, () => sayEl.textContent || '');

  /* =====================================================
     TESTOSTERON
     ===================================================== */
  presets($('tChips'), [
    ['Meydan okuma yok', () => { T = { ...T_BASE, dose: 1, challenge: false }; }],
    ['Saldırıyla statü', () => { T = { ...T_BASE, dose: 1, route: 'saldiri' }; }],
    ['Cömertlikle statü (Eisenegger)', () => { T = { ...T_BASE, dose: 1, route: 'comertlik' }; }],
    ['Yalnızca inanç', () => { T = { ...T_BASE, dose: 0, route: 'comertlik', belief: 'testosteron' }; }],
  ]);
  slider($('tSl'), 'dose', 'Testosteron düzeyi', 'Verilen doz. 0 = hormon yok; davranış yine de var.', 0, 100,
    () => pc(T.dose), (v) => { T.dose = v / 100; }, (v) => `%${v}`, 'var(--pit)');
  slider($('tSl'), 'disp', 'Öteden gelen eğilim', 'Kişinin hormondan bağımsız yapısı: uzlaşmacıdan saldırgana.', -100, 100,
    () => Math.round(T.disp * 100), (v) => { T.disp = v / 100; }, (v) => (v < -20 ? 'uzlaşmacı' : v > 20 ? 'saldırgan' : 'orta'), 'var(--edge)');
  chipGroup<'var' | 'yok'>($('tCtl'), 'Statüye meydan okuma', [['var', 'Var'], ['yok', 'Yok']],
    () => (T.challenge ? 'var' : 'yok'), (v) => { T.challenge = v === 'var'; });
  chipGroup<Route>($('tCtl'), 'Bu ortamda statüyü koruyan yol', [['saldiri', 'Saldırganlık'], ['comertlik', 'Cömertlik']],
    () => T.route, (v) => { T.route = v; });
  chipGroup<Belief>($('tCtl'), 'Katılımcı ne aldığını sanıyor', [['plasebo', 'Plasebo'], ['testosteron', 'Testosteron']],
    () => T.belief, (v) => { T.belief = v; });
  const [tRoDefense, tRoRej, tRoLie] = readouts($('tRead'), ['Statü korunuyor', 'Ortalama teklifin reddi', 'Zar raporunda yalan']);

  // Sahne
  const tSvg = $<SVGElement>('tSvg');
  const ROWS: Array<[keyof ReturnType<typeof choice>, string, string]> = [
    ['saldiri', 'Saldırı (aşağıdakine)', 'var(--amy)'], ['comertlik', 'Cömertlik (paylaşım)', 'var(--gld)'], ['cekil', 'Geri çekilme', 'var(--lesion)'],
  ];
  svg('rect', { x: 8, y: 8, width: 190, height: 22, rx: 11, fill: 'none', stroke: 'var(--edge)', 'stroke-width': 1.4 }, tSvg).setAttribute('data-k', 'pill');
  const tCtxTx = svgText(tSvg, { x: 18, y: 23, class: 't-cap' }, '');
  svg('circle', { cx: 56, cy: 108, r: 32, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.6 }, tSvg);
  const tAura = svg('circle', { cx: 56, cy: 108, r: 26, fill: 'var(--pit)', 'fill-opacity': 0 }, tSvg);
  svgText(tSvg, { x: 56, y: 112, class: 't-ink', 'text-anchor': 'middle' }, 'Ajan');
  const tHor = svgText(tSvg, { x: 56, y: 156, class: 't-cap', 'text-anchor': 'middle' }, '');
  const tRows = ROWS.map(([, label, col], i) => {
    const y = 66 + i * 52;
    const arrow = svg('path', { d: `M90,108 C120,108 130,${y} 166,${y}`, fill: 'none', stroke: col, 'stroke-linecap': 'round' }, tSvg);
    svgText(tSvg, { x: 172, y: y - 8, class: 't-ink' }, label);
    svg('rect', { x: 172, y: y - 2, width: 130, height: 9, rx: 4.5, fill: 'var(--line)' }, tSvg);
    const fill = svg('rect', { x: 172, y: y - 2, width: 0, height: 9, rx: 4.5, fill: col }, tSvg);
    const tx = svgText(tSvg, { x: 352, y: y + 7, class: 't-pct', 'text-anchor': 'end' }, '');
    return { arrow, fill, tx };
  });

  // Doz-yanıt grafiği
  const tChart = $<SVGElement>('tChart');
  const CX0 = 40, CX1 = 346, CT = 12, CB = 130;
  const cx = (v: number) => CX0 + (CX1 - CX0) * v, cy = (v: number) => CB - (CB - CT) * v;
  function gridXY(sv: SVGElement, xl: string, yl: string): void {
    for (const v of [0, 0.5, 1]) {
      svg('line', { class: 'grid', x1: CX0, x2: CX1, y1: cy(v), y2: cy(v) }, sv);
      svgText(sv, { x: CX0 - 6, y: cy(v) + 3, 'text-anchor': 'end' }, `${pc(v)}`);
      svgText(sv, { x: cx(v), y: CB + 14, 'text-anchor': 'middle' }, `${pc(v)}`);
    }
    svgText(sv, { x: (CX0 + CX1) / 2, y: CB + 30, 'text-anchor': 'middle' }, xl);
    svgText(sv, { x: 4, y: 8 }, yl);
  }
  const pathOf = (fn: (x: number) => number): string => Array.from({ length: 21 }, (_, k) => `${k ? 'L' : 'M'}${cx(k / 20).toFixed(1)},${cy(fn(k / 20)).toFixed(1)}`).join(' ');

  function drawTChart(): void {
    tChart.innerHTML = '';
    gridXY(tChart, 'Testosteron düzeyi (%)', 'olasılık %');
    const key = T.route === 'saldiri' ? 'saldiri' : 'comertlik';
    const col = T.route === 'saldiri' ? 'var(--amy)' : 'var(--gld)';
    const at = (ch: boolean) => (x: number) => choice({ ...T, dose: x, challenge: ch })[key];
    svg('path', { class: 'ln', d: pathOf(at(!T.challenge)), stroke: 'var(--muted)', 'stroke-dasharray': '6 4', 'stroke-width': 1.8 }, tChart);
    svg('path', { class: 'ln', d: pathOf(at(T.challenge)), stroke: col }, tChart);
    svg('circle', { cx: cx(T.dose), cy: cy(choice(T)[key]), r: 5, fill: col, stroke: 'var(--panel)', 'stroke-width': 2 }, tChart);
    $('tLeg1').innerHTML = `<i style="background:${col}"></i>${T.route === 'saldiri' ? 'saldırı' : 'cömertlik'} olasılığı, meydan okuma ${T.challenge ? 'var' : 'yok'}`;
    $('tLeg2').textContent = `aynısı, meydan okuma ${T.challenge ? 'yok' : 'var'}`;
  }

  // Ultimatum histogramı
  const uSvg = $<SVGElement>('uSvg');
  const NSAMP = 24;
  function drawHist(): void {
    uSvg.innerHTML = '';
    const rnd = mulberry32(seed * 7919);
    const smp = sampleOffers(T, NSAMP, rnd);
    const p = popOffers(T);
    const BW = 50, X0 = 36, BASE = 116, DOT = 5, STEP = 11;
    OFFERS.forEach((o, j) => {
      const x = X0 + j * BW;
      const n = smp.filter((s) => s === o).length;
      for (let k = 0; k < n; k++) svg('circle', { cx: x + BW / 2, cy: BASE - DOT - 1 - k * STEP, r: DOT, fill: 'var(--pfc)' }, uSvg);
      svg('line', { x1: x + 6, x2: x + BW - 6, y1: BASE - p[j] * NSAMP * STEP, y2: BASE - p[j] * NSAMP * STEP, stroke: 'var(--ink)', 'stroke-width': 2.4 }, uSvg);
      svgText(uSvg, { x: x + BW / 2, y: BASE + 14, 'text-anchor': 'middle', class: 't-cap' }, o === 5 ? '5 ₺ eşit' : `${o} ₺`);
    });
    svg('line', { class: 'grid', x1: X0, x2: X0 + 6 * BW, y1: BASE, y2: BASE }, uSvg);
    svgText(uSvg, { x: X0 + 3 * BW, y: BASE + 30, 'text-anchor': 'middle', class: 't-cap' }, 'karşı tarafa önerilen pay');
    const m = smp.reduce((a, b) => a + b, 0) / NSAMP;
    $('uStat').textContent = `Örneklem ortalaması ${f1(m)} ₺; model beklentisi ${f1(mean(p))} ₺ (çizgiler).`;
  }
  scope.on($('uAgain'), 'click', () => { seed++; drawHist(); poke(); });

  function renderT(): void {
    const c = choice(T);
    const mo = meanOffer(T);
    const p = popOffers(T);
    tCtxTx.textContent = T.challenge ? 'Statü meydan okuması var' : 'Statü meydan okuması yok';
    tSvg.querySelector('[data-k="pill"]')!.setAttribute('stroke-dasharray', T.challenge ? '0' : '4 3');
    tAura.setAttribute('fill-opacity', (0.75 * T.dose).toFixed(2));
    tHor.textContent = T.dose < 0.05 ? 'hormon yok' : `T %${pc(T.dose)}`;
    ROWS.forEach(([k], i) => {
      const v = c[k];
      tRows[i].fill.setAttribute('width', (130 * v).toFixed(1));
      tRows[i].tx.textContent = `%${pc(v)}`;
      tRows[i].arrow.setAttribute('stroke-width', (1 + 6 * v).toFixed(1));
      tRows[i].arrow.setAttribute('opacity', (0.3 + 0.7 * v).toFixed(2));
    });
    tRoDefense.textContent = T.challenge ? `%${pc(statusKept(T))}` : 'risk altında değil';
    tRoRej.textContent = `%${pc(rejectRate(p))}`;
    tRoLie.textContent = `%${pc(lieRate(T))}`;
    drawTChart();
    drawHist();
    const bt = beliefTable(T);
    bt.forEach((r, i) => r.forEach((v, j) => {
      const td = $(`c${i}${j}`);
      td.textContent = f1(v);
      td.classList.toggle('on', i === (T.dose > 0.05 ? 1 : 0) && j === (T.belief === 'testosteron' ? 1 : 0));
    }));
    setBar('t', [[c.saldiri, `%${pc(c.saldiri)}`], [c.comertlik, `%${pc(c.comertlik)}`], [mo / 5, `${f1(mo)} ₺`]]);
    sayEl.textContent = `${describeT(T)} Ortalama teklif ${f1(mo)} ₺${T.belief === 'testosteron' ? ' (inanç teklifi düşürüyor)' : ''}.`;
  }

  /* =====================================================
     OKSİTOSİN
     ===================================================== */
  presets($('oChips'), [
    ['Oksitosin yok', () => { O = { ...O_BASE, dose: 0 }; }],
    ['Oksitosin, düşük tehdit', () => { O = { dose: 0.8, threat: 0.15, evidence: 'ozgun' }; }],
    ['Oksitosin, yüksek tehdit', () => { O = { dose: 0.8, threat: 0.85, evidence: 'ozgun' }; }],
    ['Birleşik analizler', () => { O = { dose: 0.8, threat: 0.85, evidence: 'birlesik' }; }],
  ]);
  slider($('oSl'), 'odose', 'Oksitosin (burun spreyi)', 'Verilen oksitosin. 0 = plasebo.', 0, 100,
    () => pc(O.dose), (v) => { O.dose = v / 100; }, (v) => `%${v}`, 'var(--hyp)');
  slider($('oSl'), 'thr', 'Dış grup tehdidi / maddi risk', 'Karşı takım ne kadar tehdit ya da riskli görünüyor.', 0, 100,
    () => pc(O.threat), (v) => { O.threat = v / 100; }, (v) => `%${v}`, 'var(--red)');
  chipGroup<Evidence>($('oCtl'), 'Hangi veriye göre', [['ozgun', 'Özgün çalışmalar'], ['birlesik', 'Birleşik analizler']],
    () => O.evidence, (v) => { O.evidence = v; });
  const [oRoBetray, oRoGap] = readouts($('oRead'), ['Dış gruba önleyici ihanet', 'İç grup − dış grup farkı']);

  const oSvg = $<SVGElement>('oSvg');
  svgText(oSvg, { x: 60, y: 14, class: 't-cap' }, 'Emanetçiye yatırılan pay (₺, 10 ₺ üzerinden)');
  const oRows = PARTNERS.map((p, i) => {
    const b = 40 + i * 52;
    if (p === 'biz') { for (const dx of [-7, 0, 7]) svg('circle', { cx: 30 + dx, cy: b + 12, r: 8, fill: 'var(--hyp)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, oSvg); }
    else if (p === 'onlar') { for (const dx of [-7, 0, 7]) svg('rect', { x: 23 + dx, y: b + 5, width: 14, height: 14, rx: 2, fill: 'var(--pit)', stroke: 'var(--panel)', 'stroke-width': 1.5 }, oSvg); }
    else if (p === 'yabanci') { svg('circle', { cx: 30, cy: b + 12, r: 11, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6, 'stroke-dasharray': '3 2' }, oSvg); svgText(oSvg, { x: 30, y: b + 17, 'text-anchor': 'middle', class: 't-ink' }, '?'); }
    else { svg('rect', { x: 19, y: b + 1, width: 22, height: 22, rx: 5, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6 }, oSvg); for (const [dx, dy] of [[-5, -5], [0, 0], [5, 5]]) svg('circle', { cx: 30 + dx, cy: b + 12 + dy, r: 2, fill: 'var(--ink)' }, oSvg); }
    svgText(oSvg, { x: 60, y: b + 2, class: 't-ink' }, `${PARTNER_UI[p][0]} · ${PARTNER_UI[p][1]}`);
    svg('rect', { x: 60, y: b + 10, width: 250, height: 12, rx: 6, fill: 'var(--line)' }, oSvg);
    const fill = svg('rect', { x: 60, y: b + 10, width: 0, height: 12, rx: 6, fill: p === 'biz' ? 'var(--hyp)' : p === 'onlar' ? 'var(--pit)' : 'var(--edge)' }, oSvg);
    const ghost = svg('line', { x1: 60, x2: 60, y1: b + 6, y2: b + 26, stroke: 'var(--ink)', 'stroke-width': 2.4 }, oSvg);
    const tx = svgText(oSvg, { x: 352, y: b + 21, class: 't-pct', 'text-anchor': 'end' }, '');
    return { fill, ghost, tx };
  });
  svgText(oSvg, { x: 60, y: 242, class: 't-cap' }, 'Anonim yabancı: Kosfeld düzeneği.');

  // Tarla faresi
  presets($('vChips'), [
    ['Tek eşli tür', () => { V = { receptor: 0.85, vasopressin: 0.5 }; }],
    ['Çok eşli tür', () => { V = { receptor: 0.15, vasopressin: 0.5 }; }],
    ['Çok eşli + reseptör artışı (Lim)', () => { V = { receptor: 0.85, vasopressin: 0.5 }; }],
  ]);
  slider($('vSl'), 'v1a', 'V1a reseptör yoğunluğu', 'Ödül bölgelerindeki vazopressin reseptörü.', 0, 100,
    () => pc(V.receptor), (v) => { V.receptor = v / 100; }, (v) => `%${v}`, 'var(--eff)');
  slider($('vSl'), 'avp', 'Vazopressin', 'Dolaşımdaki hormon (enjeksiyon).', 0, 100,
    () => pc(V.vasopressin), (v) => { V.vasopressin = v / 100; }, (v) => `%${v}`, 'var(--pit)');
  const vMet = [meter($('vMet'), 'Tanıdık dişiyle yakınlık', 'var(--gld)'), meter($('vMet'), 'Yabancı dişiyle yakınlık', 'var(--lesion)')];

  function renderO(): void {
    const off: OIn = { ...O, dose: 0 };
    PARTNERS.forEach((p, i) => {
      const v = transfer(p, O) / 10, g = transfer(p, off) / 10;
      oRows[i].fill.setAttribute('width', (250 * v).toFixed(1));
      oRows[i].ghost.setAttribute('x1', String(60 + 250 * g)); oRows[i].ghost.setAttribute('x2', String(60 + 250 * g));
      oRows[i].tx.textContent = `${f1(transfer(p, O))} ₺`;
    });
    oRoBetray.textContent = `%${pc(betray(O))}`;
    oRoGap.textContent = `${f1(transfer('biz', O) - transfer('onlar', O))} ₺`;
    const vv = vole(V);
    vMet[0].set(vv.familiar, `%${pc(vv.familiar)}`);
    vMet[1].set(vv.stranger, `%${pc(vv.stranger)}`);
    setBar('o', [[transfer('biz', O) / 10, `${f1(transfer('biz', O))} ₺`], [transfer('onlar', O) / 10, `${f1(transfer('onlar', O))} ₺`], [prejudice(O), `%${pc(prejudice(O))}`]]);
    sayEl.textContent = describeO(O) + (O.evidence === 'birlesik' ? ' Birleşik analizlerde güven etkisi görünmez.' : '');
  }

  /* =====================================================
     STRES
     ===================================================== */
  presets($('sChips'), [
    ['Sınav öncesi heyecan', () => { S = { ...S, sev: 0.4, minutes: 20 }; }],
    ['Panik', () => { S = { ...S, sev: 0.95, minutes: 20 }; }],
    ['Aylarca süren stres', () => { S = { ...S, sev: 0.4, minutes: 20160 }; }],
    ['Stressiz', () => { S = { ...S, sev: 0, minutes: 20 }; }],
  ]);
  const fmtDur = (m: number): string => (m < 60 ? `${Math.round(m)} dk` : m < 1440 ? `${Math.round(m / 60)} saat` : m < 10080 ? `${Math.round(m / 1440)} gün` : `${Math.round(m / 10080)} hafta`);
  slider($('sSl'), 'sev', 'Stres şiddeti', 'Düşük: hafif tedirginlik. Aşırı: panik.', 0, 100,
    () => pc(S.sev), (v) => { S.sev = v / 100; }, (v) => `%${v}`, 'var(--amy)');
  slider($('sSl'), 'dur', 'Stresin süresi', 'Dakikalardan haftalara: akutu kronikten ayıran bu.', 0, 100,
    () => sliderOf(S.minutes), (v) => { S.minutes = minutesOf(v); }, (v) => fmtDur(minutesOf(v)), 'var(--dop)');
  chipGroup<'a' | 'k'>($('sCtl'), 'Glukokortikoid yanıtı', [['a', 'Normal'], ['k', 'İlaçla engellendi']],
    () => (S.block ? 'k' : 'a'), (v) => { S.block = v === 'k'; });
  chipGroup<'a' | 'k'>($('sCtl'), 'Saldırganlığı daha zayıf birine yönelt', [['a', 'Hayır'], ['k', 'Evet']],
    () => (S.displace ? 'k' : 'a'), (v) => { S.displace = v === 'k'; });
  const [sRoGc, sRoRisk, sRoClose] = readouts($('sRead'), ['Stres hormonu yanıtı', 'Hedefe yönelik davranış', 'Yakın çevreye empati']);

  const mChips = $('mChips');
  const mBtns = MATCHES.map((mt, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = mt.label;
    scope.on(b, 'click', () => { match = i; refresh(true); });
    mChips.appendChild(b);
    return b;
  });
  const mMet = meter($('mMet'), 'Aile içi şiddet bildiriminde artış', 'var(--amy)');
  const rMet = [meter($('rMet'), 'Risk alma, erkek', 'var(--pfc)'), meter($('rMet'), 'Risk alma, kadın', 'var(--pit)')];

  // Ters U
  const sSvg = $<SVGElement>('sSvg');
  function drawStress(): void {
    sSvg.innerHTML = '';
    for (const v of [0, 0.5, 1]) {
      svg('line', { class: 'grid', x1: CX0, x2: CX1, y1: cy(v), y2: cy(v) }, sSvg);
      svgText(sSvg, { x: CX0 - 6, y: cy(v) + 3, 'text-anchor': 'end' }, `${pc(v)}`);
    }
    [[0.1, 'düşük'], [0.4, 'orta'], [0.85, 'aşırı']].forEach(([v, t]) => svgText(sSvg, { x: cx(v as number), y: CB + 14, 'text-anchor': 'middle' }, t as string));
    svgText(sSvg, { x: (CX0 + CX1) / 2, y: CB + 32, 'text-anchor': 'middle' }, 'Stres şiddeti');
    svgText(sSvg, { x: 4, y: 8 }, 'performans %');
    svg('path', { class: 'ln', d: pathOf((x) => perfAcute(x)), stroke: 'var(--pfc)' }, sSvg);
    if (chronic(S.minutes) > 0.02) svg('path', { class: 'ln', d: pathOf((x) => perf(x, S.minutes)), stroke: 'var(--red)', 'stroke-dasharray': '6 4' }, sSvg);
    const py = perf(S.sev, S.minutes);
    svg('line', { x1: cx(S.sev), x2: cx(S.sev), y1: cy(py), y2: CB, stroke: 'var(--muted)', 'stroke-dasharray': '2 3' }, sSvg);
    svg('circle', { cx: cx(S.sev), cy: cy(py), r: 5.5, fill: 'var(--ink)', stroke: 'var(--panel)', 'stroke-width': 2 }, sSvg);
  }
  // Empati
  const eSvg = $<SVGElement>('eSvg');
  svg('circle', { cx: 180, cy: 58, r: 22, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.6 }, eSvg);
  svgText(eSvg, { x: 180, y: 62, class: 't-ink', 'text-anchor': 'middle' }, 'Ajan');
  const eNodes = [{ x: 44, t: 'Yakın çevre', col: 'var(--hyp)' }, { x: 316, t: 'Yabancı', col: 'var(--pit)' }].map((n, i) => {
    const line = svg('line', { x1: i ? 204 : 156, x2: i ? 284 : 76, y1: 58, y2: 58, stroke: n.col, 'stroke-linecap': 'round' }, eSvg);
    if (i) svg('rect', { x: n.x - 14, y: 44, width: 28, height: 28, rx: 5, fill: 'var(--panel)', stroke: n.col, 'stroke-width': 1.8, 'stroke-dasharray': '4 3' }, eSvg);
    else svg('circle', { cx: n.x, cy: 58, r: 16, fill: 'var(--panel)', stroke: n.col, 'stroke-width': 1.8 }, eSvg);
    svgText(eSvg, { x: n.x, y: 96, class: 't-cap', 'text-anchor': 'middle' }, n.t);
    const tx = svgText(eSvg, { x: i ? 248 : 112, y: 44, class: 't-pct', 'text-anchor': 'middle' }, '');
    return { line, tx };
  });
  svgText(eSvg, { x: 180, y: 114, class: 't-cap', 'text-anchor': 'middle' }, 'Çizgi kalınlığı: karşıdaki acıya duyulan empati');

  function renderS(): void {
    const em = empathy(S), rk = risk(S.sev), r0 = risk(0);
    drawStress();
    eNodes[0].line.setAttribute('stroke-width', (1 + 9 * em.yakin).toFixed(1));
    eNodes[1].line.setAttribute('stroke-width', (1 + 9 * em.yabanci).toFixed(1));
    eNodes[0].tx.textContent = `%${pc(em.yakin)}`;
    eNodes[1].tx.textContent = `%${pc(em.yabanci)}`;
    sRoGc.textContent = `%${pc(gcLevel(S))}${S.displace ? ' (boşaltılıyor)' : ''}`;
    sRoRisk.textContent = `%${pc(1 - habit(S.sev, S.minutes))}`;
    sRoClose.textContent = `%${pc(em.yakin)}`;
    rMet[0].set(rk.erkek, `%${pc(rk.erkek)}`, r0.erkek);
    rMet[1].set(rk.kadin, `%${pc(rk.kadin)}`, r0.kadin);
    mBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === match)));
    mMet.set(MATCHES[match].up / 25, MATCHES[match].up ? `yaklaşık %${MATCHES[match].up}` : 'artış yok');
    setBar('s', [[perf(S.sev, S.minutes), `%${pc(perf(S.sev, S.minutes))}`], [habit(S.sev, S.minutes), `%${pc(habit(S.sev, S.minutes))}`], [em.yabanci, `%${pc(em.yabanci)}`]]);
    sayEl.textContent = describeS(S) + (S.block ? ' Stres hormonu engellendi.' : '');
  }

  /* ---------- Çizim döngüsü yerine olay tabanlı yenileme ---------- */
  function refresh(user: boolean): void {
    for (const s of syncers) s();
    if (tab === 't') renderT(); else if (tab === 'o') renderO(); else renderS();
    if (user) poke();
  }

  /* ---------- Rehberli tur ---------- */
  const go = (t: Tab, fn: () => void) => () => { fn(); showTab(t); };
  const tour = createTour(scope, [
    { title: 'Bağlam yokken hormon az şey değiştirir', text: 'Testosteron yüksek, ama statüye yönelik bir meydan okuma yok. Ajanın davranışı büyük ölçüde kendi eğiliminden geliyor: hormon yeni bir şey icat etmiyor.', look: 'Doz kaydırıcısını 0\'a çek: çubuklar neredeyse hiç oynamaz.',
      apply: go('t', () => { T = { ...T_BASE, dose: 1, challenge: false }; }) },
    { title: 'Meydan okuma var, yol saldırı', text: 'Aynı doz, ama şimdi statüye meydan okunuyor ve ortamda statü saldırıyla korunuyor. Hormon, bağlamın ödüllendirdiği yolu büyütüyor.', look: 'Saldırı çubuğu ve grafikteki sürekli çizgi.',
      apply: go('t', () => { T = { ...T_BASE, dose: 1, route: 'saldiri' }; }) },
    { title: 'Aynı hormon, başka bağlam', text: 'Hormona dokunulmadı; yalnızca statünün cömertlikle korunduğu ortam seçildi. Ultimatum\'da teklifler yükseliyor (Eisenegger). Aynı hormon, bağlam değişince ters yönde etkili.', look: 'Cömertlik çubuğu ve ortalama teklif; saldırı yolundakinden yüksek.',
      apply: go('t', () => { T = { ...T_BASE, dose: 1, route: 'comertlik' }; }) },
    { title: 'Yalnızca inanç', text: 'Gerçekte hormon yok (plasebo), ama katılımcı testosteron aldığını sanıyor. Teklifler yine düşüyor: "testosteron kötü davranış yaptırır" inancı davranışı kendi başına kötüleştirebiliyor.', look: 'Tabloda sağ sütun sol sütundan düşük, satır farkı ise yok.',
      apply: go('t', () => { T = { ...T_BASE, dose: 0, route: 'comertlik', belief: 'testosteron' }; }) },
    { title: 'Oksitosin: biz ve onlar', text: 'Oksitosin iç gruba yatırımı artırıyor, dış gruba artırmıyor; tehdit yüksekken önyargı ve önleyici ihanet de büyüyor. Uyarı kutusu önemli: Kosfeld bulgusu tartışmalı, bu yüzden "Birleşik analizler" çipine de bak.', look: '"Biz" çubuğu uzar, "onlar" yerinde kalır; önyargı yükselir.',
      apply: go('o', () => { O = { dose: 0.8, threat: 0.85, evidence: 'ozgun' }; }) },
    { title: 'Stres: ters U ve sonuç', text: 'Orta, kısa stres performansı artırır; aşırı ya da aylarca süren stres bozar. Stres yabancıya empatiyi daraltır, risk almayı cinsiyete göre ayrıştırır. Üç hormonda da ortak sonuç: yeni davranış yok, var olan eğilim bağlama göre büyüyor.', look: 'Noktayı ters U\'nun tepesinden aşırı uca, sonra süreyi haftalara taşı.',
      apply: go('s', () => { S = { ...S_BASE, sev: 0.4, minutes: 20 }; match = 2; }) },
  ]);
  root.querySelector('.lede')!.after(tour.el);

  showTab('t');

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
