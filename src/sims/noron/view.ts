import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { createTour, type TourStep } from '../tour';
import { createSumPanel } from './panel-sum';
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
  // "Sinaps" ve "Devre" sekmeleri (panel + rehberli tur) ayrı parçalardan, ilk seçildiklerinde yüklenir.
  const panels: Partial<Record<Tab, Panel>> = { sum };
  const loading: Partial<Record<Tab, boolean>> = {};
  let gone = false;
  scope.onDispose(() => { gone = true; });
  function loadPanel(t: 'syn' | 'circ'): void {
    if (panels[t] || loading[t]) return;
    loading[t] = true;
    const made: Promise<Panel> = t === 'syn'
      ? import('./panel-syn').then((m) => { const p = m.createSynPanel(ctx, hostOf('syn')); addTour('syn', m.synTour(p)); return p; })
      : import('./panel-circ').then((m) => { const p = m.createCircPanel(ctx, hostOf('circ')); addTour('circ', m.circTour(p)); return p; });
    void made.then((p) => {
      if (gone) return;
      panels[t] = p;
      if (tab === t) { p.resume(); p.draw(performance.now()); updateBar(); poke(); }
    });
  }

  /* ---- Çıktı çubuğu ---- */
  metersEl.innerHTML = [0, 1, 2].map((i) => `<div class="nr-m"><div class="m-top"><span data-ref="ml${i}"></span><b data-ref="mv${i}"></b></div><div class="track"><b data-ref="mb${i}"></b></div></div>`).join('');
  const cache: string[] = [];
  function updateBar(): void {
    barDirty = false;
    const p = panels[tab];
    if (!p) return;
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
    if (t !== 'sum') loadPanel(t);
    panels[t]?.resume();
    panels[t]?.draw(performance.now());
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



  /* ---- Döngü: yalnızca durum değiştiğinde ya da zaman akarken çizer; ekran dışında durur ---- */
  function frame(now: number): void {
    const redrew = panels[tab]?.draw(now) ?? false;
    if (redrew || barDirty) updateBar();
  }
  scope.loop(frame, { root, onResume: () => { barDirty = true; panels[tab]?.resume(); } });
  showTab('sum');

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
