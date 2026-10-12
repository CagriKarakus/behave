import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { createTour, type TourStep } from '../tour';
import { createCircPanel } from './panel-circ';
import { createSumPanel } from './panel-sum';
import { createSynPanel } from './panel-syn';
import { relatedBox, type Ctx, type Meter, type Panel } from './ui';

type Tab = 'sum' | 'syn' | 'circ';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'sum', label: 'Toplama ve eşik' },
  { key: 'syn', label: 'Sinaps' },
  { key: 'circ', label: 'Devre' },
];

const TEMPLATE = (id: string) => `
<div class="sim sim-nr">
  <p class="lede">Bir nöron gelen binlerce sinyali nasıl tek bir "ateşle / ateşleme" kararına dönüştürür?</p>

  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t.key}" data-pane="${t.key}" aria-controls="${id}-pane-${t.key}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${t.label}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık açıklama"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="nr-meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t.key}" data-pane="${t.key}" aria-labelledby="${id}-tab-${t.key}" ${i ? 'hidden' : ''}></section>`).join('')}

  ${relatedBox()}

  <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan (Ek 1): dinlenme ~-70 mV; eşikte tam ya da hiç; tek girdi sönüp gider, birçoğu birlikte gerekir; geri alım ve enzim sinyalin süresini belirler; ilaçlar geri alımı engelleyerek güçlendirir; geri bildirim kısaltır, ileri beslemeli zamanda, yanal inhibisyon uzayda keskinleştirir. Eşik, tepe, süreler, genlikler, hız sabitleri, %90 ilaç etkisi ve devre güçleri modelin varsayımıdır.</p>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('nr');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  let tab: Tab = 'sum';
  let barDirty = true;
  let lastSay = '';
  const sayEl = $('say'), metersEl = $('meters');
  const ctx: Ctx = { scope, id, touch: () => { barDirty = true; poke(); } };

  const hostOf = (k: Tab) => root.querySelector<HTMLElement>(`.pane[data-pane="${k}"]`)!;
  const sum = createSumPanel(ctx, hostOf('sum'));
  const syn = createSynPanel(ctx, hostOf('syn'));
  const circ = createCircPanel(ctx, hostOf('circ'));
  const panels: Record<Tab, Panel> = { sum, syn, circ };

  /* ---- Çıktı çubuğu ---- */
  metersEl.innerHTML = [0, 1, 2].map((i) => `<div class="nr-m"><div class="m-top"><span data-ref="ml${i}"></span><b data-ref="mv${i}"></b></div><div class="track"><b data-ref="mb${i}"></b></div></div>`).join('');
  const cache: string[] = [];
  function updateBar(): void {
    barDirty = false;
    const p = panels[tab];
    const t = p.say();
    if (t !== lastSay) { lastSay = t; sayEl.textContent = t; }
    p.meters().forEach((m: Meter, i) => {
      const w = `${Math.round(Math.max(0, Math.min(1, m.frac)) * 100)}%`;
      const key = `${m.label}|${m.value}|${w}|${m.color}`;
      if (cache[i] === key) return;
      cache[i] = key;
      $(`ml${i}`).textContent = m.label; $(`mv${i}`).textContent = m.value;
      const b = $(`mb${i}`);
      b.style.width = w; b.style.background = m.color;
    });
  }

  /* ---- Sekmeler ---- */
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
    panels[t].resume();
    panels[t].draw(performance.now());
    updateBar();
  }
  for (const b of tabBtns) {
    scope.on(b, 'click', () => { showTab(b.dataset.pane as Tab); poke(); });
    scope.on(b, 'keydown', (ev) => {
      const i = tabBtns.indexOf(b);
      const j = ev.key === 'ArrowRight' ? (i + 1) % tabBtns.length : ev.key === 'ArrowLeft' ? (i + tabBtns.length - 1) % tabBtns.length : -1;
      if (j >= 0) { ev.preventDefault(); showTab(tabBtns[j].dataset.pane as Tab, true); poke(); }
    });
  }
  const poke = scope.announcer($('live'), () => lastSay);

  /* ---- Rehberli turlar (kaydırma yok: tur kartı yerinde kalır, çıktı çubuğu sonucu gösterir) ---- */
  const six = [0, 1, 2, 3, 4, 5];
  const after = () => { barDirty = true; poke(); };
  const addTour = (key: Tab, steps: TourStep[]) => hostOf(key).prepend(createTour(scope, steps, { onExit: after }).el);

  addTour('sum', [
    {
      title: 'Tek girdi sönüp gider',
      text: 'Dinlenme gerilimi yaklaşık -70 mV (kitaptan). En yakın dendritten gelen tek girdi gerilimi ~4 mV oynatıp söner.',
      look: 'Küçük bir tümsek; eşik çizgisi çok uzakta.',
      apply: () => sum.scene({}, ({ add }) => add(0, 1, 15)),
    },
    {
      title: 'Uzamsal toplama',
      text: 'Altı dendrit aynı anda uyarılınca etkiler akson tepeciğinde toplanır. Toplam eşiği (-55 mV, varsayım) aşınca aksiyon potansiyeli doğar.',
      look: 'Kesikli çizgi (girdi toplamı) eşiği geçince gerilim +40 mV\'ye fırlıyor.',
      apply: () => sum.scene({}, ({ volley }) => volley(six, 1, 15)),
    },
    {
      title: 'Zamansal toplama',
      text: 'Aynı dendrite sekiz girdi: 2 ms arayla gelenler üst üste biner, 8 ms arayla gelenler her seferinde sönüp gider.',
      look: 'İlk dizi ateşliyor, ikincisi eşiğin altında kalıyor.',
      apply: () => sum.scene({}, ({ train }) => { train(0, 8, 2, 15); train(0, 8, 8, 50); }),
    },
    {
      title: 'Engelleyici girdi',
      text: 'Altı uyarıcı girdi ilk seferde ateşletiyor. İkincide üç engelleyici girdi de var ve toplam eşiğe varamıyor.',
      look: 'İkinci dalganın tepesi eşiğin altında.',
      apply: () => sum.scene({}, ({ volley }) => { volley(six, 1, 15); volley(six, 1, 75); volley([0, 1, 2], -1, 75); }),
    },
    {
      title: 'Hep ya da hiç, sonra refrakter',
      text: 'Eşiği zor geçen ve çok güçlü uyarı aynı boyda bir aksiyon potansiyeli verir. 2 ms sonra gelen ikinci dalga refrakter dönemde boşa gider.',
      look: 'Üç tepe de +40 mV; kesikli analog çizgi ikincide çok daha yüksek.',
      apply: () => sum.scene({}, ({ volley }) => {
        volley([0, 1, 2, 3, 4], 1, 15);
        for (let k = 0; k < 3; k++) volley(six, 1, 55);
        volley(six, 1, 95); volley(six, 1, 97);
      }),
    },
    {
      title: 'Hız, şiddeti taşır',
      text: 'Sürekli girdi arttıkça aksiyon potansiyelinin boyu değişmez, sıklığı artar: analog şiddet ateşleme hızına çevrilir.',
      look: 'Alttaki eğride nokta yükseldikçe çıkış sıklaşıyor.',
      apply: () => sum.scene({ exc: 0.6 }),
    },
  ]);

  addTour('syn', [
    {
      title: 'Bir impuls, bir salım',
      text: 'Uca impuls gelir, veziküller boşalır, nörotransmitter reseptörlere bağlanır (anahtar-kilit). Sonra düzey düşer.',
      look: 'Yeşil çizgi sıçrayıp iniyor; turuncu yanıt geç tepe yapıp geç sönüyor.',
      apply: () => syn.scene({ rate: 0 }, true),
    },
    {
      title: 'Üç çıkış yolu',
      text: 'Nörotransmitter ya geri alım pompalarıyla toplanır ya da enzimle parçalanır (kitap); küçük bir pay dağılır. İlk ikisi sinyalin süresini belirler.',
      look: '"Nereye gitti?" kartı: bu sinapsta çoğu pompaya gidiyor (varsayım).',
      apply: () => syn.scene({ rate: 0 }, true),
    },
    {
      title: 'Geri alımı engelle',
      text: 'SSRI benzeri ilaç pompayı kapatır: nörotransmitter aralıkta kalır, sık ateşlemede birikir. Kitap: ilaçlar geri alımı engelleyerek sinyali güçlendirir.',
      look: 'Yeşil çizginin tabanı yükseliyor; yarı ömür ve yanıt süresi uzuyor.',
      apply: () => syn.scene({ blockRu: true }),
    },
    {
      title: 'Enzimi engellemek burada az işe yarar',
      text: 'Bu sinapsta ana yol pompa olduğu için enzimi kapatmak neredeyse hiçbir şeyi değiştirmez; etki baskın yola bağlı.',
      look: 'Yarı ömür 6 ms civarında kalıyor.',
      apply: () => syn.scene({ blockEn: true }),
    },
    {
      title: 'Enzim baskın sinapsta',
      text: 'Ana yol enzimse (varsayım), enzim engeli düzeyi ve süreyi belirgin uzatır; pompa küçük bir yedektir.',
      look: 'Yarı ömür birkaç kat uzuyor.',
      apply: () => syn.scene({ type: 'enzim', blockEn: true }),
    },
    {
      title: 'Düzey yanıt demek değil',
      text: 'Aynı düzey, yarı sayıda reseptörle yarı büyüklükte yanıt verir. Kitap: ilaç reseptörü taklit edebilir ya da bloke edebilir.',
      look: 'Dolu çanak ve turuncu çizgi düşük, yeşil çizgi aynı.',
      apply: () => syn.scene({ density: 0.5 }),
    },
  ]);

  addTour('circ', [
    {
      title: 'İnhibisyon yokken',
      text: 'Her nöron girdisini olduğu gibi iletir; kenar iki düzey arasında düz bir basamaktır.',
      look: 'Çıkış girişin kopyası, kenar zıtlığı 1 kat.',
      apply: () => circ.scene({ motif: 'lat', sp: 'basamak', g: 0 }),
    },
    {
      title: 'Yanal inhibisyon',
      text: 'Her nöron komşularını bastırır. Kenarın parlak yanı daha az, karanlık yanı daha çok bastırıldığı için kenar belirginleşir.',
      look: 'Parlak tarafta aşım, karanlık tarafta çukur.',
      apply: () => circ.scene({ motif: 'lat', sp: 'basamak', g: 1, reach: 2 }),
    },
    {
      title: 'Keskinliğin bedeli',
      text: 'Daha güçlü ve geniş bastırmada kenar daha belirgin, ama düz bölgelerin düzeyi düşer. Gürültülü girişte de kenar seçilir.',
      look: 'Düz bölge düzeyi çubuğu düşüyor.',
      apply: () => circ.scene({ motif: 'lat', sp: 'gurultu', g: 1.5, reach: 3 }),
    },
    {
      title: 'Negatif geri bildirim',
      text: 'Çıkış ara nöronu uyarır, ara nöron çıkışı bastırır. Uzun girdi bile kısa bir patlamaya dönüşür: sinyal kısalır.',
      look: 'Siyah çıkış zirve yapıp alçalıyor; kesikli girdi sürüyor.',
      apply: () => circ.scene({ motif: 'fb', tp: 'uzun', g: 2 }),
    },
    {
      title: 'İleri beslemeli inhibisyon',
      text: 'Aynı girdi ara nöron aracılığıyla gecikmeli baskı da gönderir. Yanıt gecikme kadar sürer: sinyal zamanda keskinleşir.',
      look: '~10 ms genişliğinde dar bir tepe.',
      apply: () => circ.scene({ motif: 'ff', tp: 'uzun', g: 1, delay: 10 }),
    },
    {
      title: 'Üçü üç ayrı iş yapar',
      text: 'Yanal inhibisyon uzayda, ileri beslemeli zamanda keskinleştirir; geri bildirim sinyali kısaltır. İki vuru, iki ayrı kısa yanıt olur.',
      look: 'İki dar tepe; gecikmeyi artırınca genişler.',
      apply: () => circ.scene({ motif: 'ff', tp: 'iki', g: 1, delay: 10 }),
    },
  ]);

  /* ---- Döngü: yalnızca durum değiştiğinde ya da zaman akarken çizer; ekran dışında durur ---- */
  function frame(now: number): void {
    const redrew = panels[tab].draw(now);
    if (redrew || barDirty) updateBar();
  }
  scope.loop(frame, { root, onResume: () => { barDirty = true; panels[tab].resume(); } });
  showTab('sum');

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
