import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { createTour } from '../tour';
import { lazyNotes, type Ctx, type Meter, type Panel } from '../ui';
import { createCategoryPanel } from './category-panel';
import { createLadderPanel } from './ladder-panel';

type Tab = 'ladder' | 'cat';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'ladder', label: 'Merdiven' },
  { key: 'cat', label: 'Kategori sınırı yanılgısı' },
];

const TEMPLATE = (id: string) => `
<div class="sim sim-zm">
  <p class="lede">Bir davranışı açıklamak için neden bir saniye öncesinden milyonlarca yıl öncesine kadar bakmak gerekir? Çünkü tek bir "neden" yok: her basamağın etkisi, ondan öncekilerden geçer.</p>

  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t.key}" data-pane="${t.key}" aria-controls="${id}-pane-${t.key}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${t.label}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık açıklama" data-ref="bar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t.key}" data-pane="${t.key}" aria-labelledby="${id}-tab-${t.key}" ${i ? 'hidden' : ''}></section>`).join('')}
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('zm');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  let tab: Tab = 'ladder';
  let barDirty = true;
  let lastSay = '';
  const sayEl = $('say'), metersEl = $('meters');
  const poke = scope.announcer($('live'), () => lastSay);
  const ctx: Ctx = { scope, id, touch: () => { barDirty = true; poke(); } };

  const hostOf = (k: Tab) => root.querySelector<HTMLElement>(`.pane[data-pane="${k}"]`)!;
  const ladder = createLadderPanel(ctx, hostOf('ladder'));
  const category = createCategoryPanel(ctx, hostOf('cat'));
  const panels: Record<Tab, Panel> = { ladder, cat: category };

  /* ---- Çıktı çubuğu ---- */
  metersEl.innerHTML = [0, 1, 2].map((i) => `<div class="m"><div class="m-top"><span data-ref="ml${i}"></span><b data-ref="mv${i}"></b></div><div class="track"><b data-ref="mb${i}"></b></div></div>`).join('');
  function updateBar(): void {
    barDirty = false;
    const p = panels[tab];
    const t = p.say();
    if (t !== lastSay) { lastSay = t; sayEl.textContent = t; }
    p.meters().forEach((m: Meter, i) => {
      $(`ml${i}`).textContent = m.label; $(`mv${i}`).textContent = m.value;
      const b = $(`mb${i}`);
      b.style.width = `${Math.round(Math.max(0, Math.min(1, m.frac)) * 100)}%`;
      b.style.background = m.color;
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
    panels[t].resume?.();
    panels[t].draw();
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

  /* ---- Rehberli turlar: her panelin ilk öğesi ---- */
  const touch = () => ctx.touch();
  const tourL = createTour(scope, [
    {
      title: 'Bir saniye önce',
      text: 'Birine vurmadan hemen önce beyinde ne olur? Amigdala hızlı, frontal korteks yavaş kalırsa dürtü öne geçer. Çoğu açıklama burada durur.',
      look: 'Tek kart görünür; sayaçta ok yok, 11 bağın hepsi dışarıda.',
      apply: () => { ladder.set({ behavior: 'vurma', depth: 1, sel: null }); touch(); },
    },
    {
      title: 'Saatler öncesi: stres hormonu',
      text: 'Birkaç basamak geriye bakınca stres hormonu, ipuçları ve aylarca süren stres görünür. Oklar amigdalaya varıyor: hormon ve stres, frenin zayıflamasına zemin hazırlıyor.',
      look: 'Saatler-günler kartından "bir saniye önce"ye giden ok ve açılan bağ listesi.',
      apply: () => { ladder.set({ behavior: 'vurma', depth: 4, sel: 2 }); touch(); },
    },
    {
      title: 'Ergenlik ve çocukluk',
      text: 'Frontal korteks yirmili yaşların ortasına dek olgunlaşır ve çocukluk deneyimi onu şekillendirir. Çocukluk aynı zamanda stres tepkisini de ayarlar: bir basamak birkaç yere birden etki ediyor.',
      look: 'Çocukluk kartından çıkan iki ok.',
      apply: () => { ladder.set({ behavior: 'vurma', depth: 6, sel: 5 }); touch(); },
    },
    {
      title: 'Genler ve kültür',
      text: 'Gen tek başına belirlemez: MAO-A varyantının etkisi ağır çocukluk istismarına bağlı (replikasyon karışık). Kültür ise çocuğun nasıl yetiştirildiğini belirler.',
      look: 'Döllenme kartından çocukluğa giden ok.',
      apply: () => { ladder.set({ behavior: 'vurma', depth: 8, sel: 6 }); touch(); },
    },
    {
      title: 'Tüm merdiven, başka bir davranış',
      text: 'Evrim de ekleniyor ve hiçbir ok açıkta kalmıyor. Davranışı "el uzatmak"a çevir: etkenler değişir, ama yine tek bir neden çıkmaz.',
      look: 'Sayaçta "dışarıda kalan" değerinin 0\'a inmesi.',
      apply: () => { ladder.set({ behavior: 'yardim', depth: 9, sel: null }); touch(); },
    },
  ], { onExit: () => poke() });
  hostOf('ladder').prepend(tourL.el);

  const tourC = createTour(scope, [
    {
      title: 'Kutu yokken',
      text: 'Önce kategorisiz algı: iki değer arasındaki gerçek fark, olduğu gibi algılanıyor. Algı eğrisi köşegenin üstünde.',
      look: 'Eğri ile kesikli köşegenin örtüşmesi.',
      apply: () => { category.set({ example: 'renk', delta: 6, offset: 0, strength: 0, boxes: 4 }); touch(); },
    },
    {
      title: 'Aynı kutuda',
      text: 'Kutular gelince kutu içi farklar siliniyor. Sınır iki değerin dışında: ikisi aynı kutuda ve fark gerçeğin yarısına kadar küçülüyor.',
      look: 'Eğrinin kutu içinde yatıklaşması ve algılanan farkın düşmesi.',
      apply: () => { category.set({ example: 'renk', delta: 6, offset: 100, strength: 50, boxes: 4 }); touch(); },
    },
    {
      title: 'Sınır ikisinin arasında',
      text: 'Fark aynı, yalnızca sınır kaydı. İki değer farklı kutulara düştü ve kendi kutularının merkezlerine doğru uzaklaştı: fark birkaç katına çıktı.',
      look: 'Alttaki grafikte gölgeli bölgede yükselen tepe.',
      apply: () => { category.set({ example: 'renk', delta: 6, offset: 0, strength: 50, boxes: 4 }); touch(); },
    },
    {
      title: 'Sınav notu: 2 puan',
      text: 'Aynı mantık notlarda: sınırın iki yanındaki 2 puan, aynı kutudaki 2 puandan çok daha büyük görünür. Sınırlar keyfidir; gerçek fark değişmez.',
      look: 'Sınır kaydırıcısını sağa çekince tepenin kaybolması.',
      apply: () => { category.set({ example: 'not', delta: 2, offset: 0, strength: 70, boxes: 4 }); touch(); },
    },
  ], { onExit: () => poke() });
  hostOf('cat').prepend(tourC.el);

  /* ---- Notlar (tembel) ---- */
  lazyNotes(scope, root, () => import('./notes').then((m) => m.NOTES));

  /* ---- Döngü yok: iki panel de yalnızca kullanıcı eylemiyle değişir; çizim kare başına yalnızca kirliyse ---- */
  function frame(): void {
    const redrew = panels[tab].draw();
    if (redrew || barDirty) updateBar();
  }
  scope.loop(frame, { root, onResume: () => { barDirty = true; panels[tab].resume?.(); } });
  showTab('ladder');

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
