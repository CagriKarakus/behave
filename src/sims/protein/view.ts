import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { createTour, type TourStep } from '../tour';
import { lazyNotes, type Ctx, type Meter, type Panel } from '../ui';
import { createCodePanel } from './panel-code';

type Tab = 'code' | 'reg' | 'conf';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'code', label: 'Kodon çevirisi' },
  { key: 'reg', label: 'Gen düzenlenmesi' },
  { key: 'conf', label: 'Şekil ve işlev' },
];

const TEMPLATE = (id: string) => `
<div class="sim sim-pr">
  <p class="lede">DNA'daki tek bir harf değişikliği neden bazen hiçbir şey yapmaz, bazen her şeyi değiştirir?</p>

  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t.key}" data-pane="${t.key}" aria-controls="${id}-pane-${t.key}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${t.label}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık açıklama"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t.key}" data-pane="${t.key}" aria-labelledby="${id}-tab-${t.key}" ${i ? 'hidden' : ''}></section>`).join('')}

  <div class="notes"><div data-notes="how"></div><div data-notes="book"></div><div data-notes="foot"></div></div>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('pr');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  let tab: Tab = 'code';
  let barDirty = true;
  let lastSay = '';
  const sayEl = $('say'), metersEl = $('meters');
  const ctx: Ctx = { scope, id, touch: () => { barDirty = true; poke(); } };

  const hostOf = (k: Tab) => root.querySelector<HTMLElement>(`.pane[data-pane="${k}"]`)!;
  const code = createCodePanel(ctx, hostOf('code'));
  // Gen düzenlenmesi ve Şekil ve işlev sekmeleri (panel + kendi turu) ilk seçildiklerinde ayrı parçalardan yüklenir.
  type RegP = ReturnType<Awaited<typeof import('./panel-reg')>['createRegPanel']>;
  type ConfP = ReturnType<Awaited<typeof import('./panel-conf')>['createConfPanel']>;
  const panels: Partial<Record<Tab, Panel>> = { code };
  const loading: Partial<Record<Tab, boolean>> = {};
  let gone = false;
  scope.onDispose(() => { gone = true; });
  function loadPanel(t: 'reg' | 'conf'): void {
    if (panels[t] || loading[t]) return;
    loading[t] = true;
    const made: Promise<Panel> = t === 'reg'
      ? import('./panel-reg').then((m) => { const p = m.createRegPanel(ctx, hostOf('reg')); addTour('reg', regTour(p)); return p; })
      : import('./panel-conf').then((m) => { const p = m.createConfPanel(ctx, hostOf('conf')); addTour('conf', confTour(p)); return p; });
    void made.then((p) => {
      if (gone) return;
      panels[t] = p;
      if (tab === t) { p.resume?.(); p.draw(performance.now()); updateBar(); poke(); }
    });
  }

  /* ---- Çıktı çubuğu ---- */
  metersEl.innerHTML = [0, 1, 2].map((i) => `<div class="m"><div class="m-top"><span data-ref="ml${i}"></span><b data-ref="mv${i}"></b></div><div class="track"><b data-ref="mb${i}"></b></div></div>`).join('');
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
    if (t !== 'code') loadPanel(t);
    panels[t]?.resume?.();
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
  const after = () => { barDirty = true; poke(); };
  const addTour = (key: Tab, steps: TourStep[]) => hostOf(key).prepend(createTour(scope, steps, { onExit: after }).el);

  addTour('code', [
    {
      title: 'Normal gen',
      text: 'DNA\'daki üçlüler (kodon) mRNA\'ya kopyalanır; her kodon bir amino asidi belirtir. ATG ile başlar, TAA ile durur.',
      look: 'Kutuların altındaki zincir: on amino asit, işlev %100.',
      apply: () => code.setPreset('none'),
    },
    {
      title: 'Sessiz: hiçbir şey olmaz',
      text: 'Alanin kodonunun üçüncü harfi T yerine C oldu. GCT de GCC de alanin: 61 kodon yalnızca 20 amino asidi paylaşır (kodon fazlalığı).',
      look: 'Kodon değişti (işaretli harf) ama zincir ve işlev aynı.',
      apply: () => code.setPreset('sessiz'),
    },
    {
      title: 'Yanlış anlamlı: bir amino asit değişir',
      text: 'CAC yerine GAC: artı yüklü histidin, eksi yüklü aspartata döndü. Üstelik modelin aktif bölgesinde (varsayım).',
      look: 'Mutant zincirde çerçeveli tek kutu ve işlev çubuğunun düşüşü.',
      apply: () => code.setPreset('yanlis'),
    },
    {
      title: 'Anlamsız: erken dur',
      text: 'Triptofan kodonu TGG, TGA oldu; TGA bir dur kodonudur. Zincir beşinci amino asitte kesilir, kalan yarısı hiç yapılmaz.',
      look: 'Kutular DUR\'dan sonra sönük, zincir kısaldı.',
      apply: () => code.setPreset('anlamsiz'),
    },
    {
      title: 'Çerçeve kayması: her şey değişir',
      text: 'Tek bir harf silinince sonraki bütün üçlüler bir harf kayar. Üçüncü amino asitten sonrası tamamen başka bir dizi olur.',
      look: 'Mutant zincirde ikinci amino asitten sonraki bütün kutular çerçeveli.',
      apply: () => code.setPreset('sil1'),
    },
    {
      title: 'Üç harf silmek çerçeveyi korur',
      text: 'Aynı kadar zarar sanılır, ama üç harf tam bir kodon eder: yalnızca bir amino asit eksilir, geri kalanı yerinde. Etki harf sayısından çok çerçeveye bağlı.',
      look: 'Zincir 9 amino asit; 1 harf silmeyle işlev karşılaştırması.',
      apply: () => code.setPreset('sil3'),
    },
  ]);

  const regTour = (p: RegP): TourStep[] => [
    {
      title: 'Aynı gen, iki ortam',
      text: 'İki ortamda DNA da promotör de aynı. Yalnızca hormon sinyali farklı: düşük sinyalde TF etkinleşmez ve gen kapalı kalır; yüksek sinyalde TF promotöre oturur.',
      look: 'A ve B\'de gen kutusunun rengi ve mRNA sayısı.',
      apply: () => p.set({ a: 10, b: 80, tf: 100, meA: false, meB: false }),
    },
    {
      title: 'TF yoksa sinyal yetmez',
      text: 'Sinyal yüksek ama hücrede TF yok. Promotöre oturacak bir protein olmadığı için gen yine kapalı.',
      look: 'TF dairesi boş, oturma %0.',
      apply: () => p.set({ a: 90, b: 90, tf: 0, meA: false, meB: false }),
    },
    {
      title: 'Metilasyon kilidi',
      text: 'Sinyal ve TF var ama B\'de promotöre metil işaretleri yapışmış: TF oturamıyor. DNA dizisi aynı kaldı; susturan şey epigenetik bir işaret.',
      look: 'B\'de dolu TF, kırmızı çarpı ve kapalı gen; A\'da açık gen.',
      apply: () => p.set({ a: 90, b: 90, tf: 100, meA: false, meB: true }),
    },
    {
      title: 'Bir gen, birden çok protein',
      text: 'Gen eksonlara bölünür; hücre hangilerini birleştireceğini seçer. E2 ve E3 birlikte alınırsa protein hem bağlanır hem iş yapar.',
      look: 'Alttaki birleştirilmiş mRNA\'da dört eksonun hepsi var: 210 amino asit.',
      apply: () => p.set({ a: 90, b: 90, tf: 100, meA: false, meB: false, e2: true, e3: true }),
    },
    {
      title: 'Aynı gen, başka ürün',
      text: 'E3 atlanınca daha kısa bir protein çıkar: bağlanır ama işi yapamaz. "Bir gen, bir protein" kuralı geçerli değil.',
      look: 'E3 (atlandı) ve ürün satırındaki yeni uzunluk.',
      apply: () => p.set({ e2: true, e3: false }),
    },
  ];

  const confTour = (p: ConfP): TourStep[] => [
    {
      title: 'Molekül yokken',
      text: 'Protein çoğunlukla açık duruyor; ara sıra kendiliğinden kapanıp açılıyor ama bir iş yapmıyor.',
      look: 'İşlev hızı 0, kapalı şekil payı küçük.',
      apply: () => p.set({ lig: 'none', conc: 3, temp: 37, ph: 7.4 }),
    },
    {
      title: 'Doğru molekül: şekil değişir',
      text: 'Uyan molekül çukura oturunca iki lob kapanır ve iş yapılır. Ürün çıkınca protein yeniden açılır: iki şekil arasında gidip gelir.',
      look: 'Zaman çizgisinde açık ile kapalı arası geçişler ve yeşil noktalar.',
      apply: () => p.set({ lig: 'good', conc: 3, temp: 37, ph: 7.4 }),
    },
    {
      title: 'Daha çok molekül, doyum',
      text: 'Derişimi artırmak hızı bir yere kadar artırır. Tüm moleküller meşgulken ekstra molekül bir şey katmaz.',
      look: 'İşlev hızı çubuğunun artışı yavaşlıyor.',
      apply: () => p.set({ lig: 'good', conc: 10, temp: 37, ph: 7.4 }),
    },
    {
      title: 'Benzer ama uymayan',
      text: 'Şekli çukura tam uymayan benzer molekül zayıf bağlanır, çabuk ayrılır ve lobları kapatamaz. Anahtar-kilit eşleşmesi işlevi belirler.',
      look: 'Elmas şekilli molekül ve çok düşük işlev hızı.',
      apply: () => p.set({ lig: 'like', conc: 10, temp: 37, ph: 7.4 }),
    },
    {
      title: 'Sıcaklık ve asitlik şekli kaydırır',
      text: 'Kitaba göre çevre koşulları şekli hafifçe değiştirebilir. Modelde uç değerlerde şekil bozulur ve işlev çöker (varsayım).',
      look: '"Şekil bozulması" yazısı ve şeklin sağlamlığı çubuğu.',
      apply: () => p.set({ lig: 'good', conc: 5, temp: 52, ph: 7.4 }),
    },
    {
      title: 'Reseptör de böyle çalışır',
      text: 'Hormon ya da nörotransmitter reseptöre bağlanınca reseptör şekil değiştirir ve hücreye sinyal gider. Yanlış hormon aynı kilidi açamaz.',
      look: '"Kapalı" şekil payı: reseptörde etkin sinyal payı gibi okunur.',
      apply: () => p.set({ lig: 'good', conc: 3, temp: 37, ph: 7.4 }),
    },
  ];

  lazyNotes(scope, root, () => import('./notes').then((m) => m.NOTES));

  /* ---- Döngü: yalnızca durum değiştiğinde ya da molekül akarken çizer; ekran dışında durur ---- */
  function frame(now: number): void {
    const redrew = panels[tab]?.draw(now) ?? false;
    if (redrew || barDirty) updateBar();
  }
  scope.loop(frame, { root, onResume: () => { barDirty = true; panels[tab]?.resume?.(); } });
  showTab('code');

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
