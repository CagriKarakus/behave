import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { createTour } from '../tour';
import { createAcePanel } from './ace-panel';
import { createMarshPanel } from './marsh-panel';
import { createMoralPanel } from './moral-panel';
import type { Ctx, Meter, Panel } from '../ui';

type Tab = 'marsh' | 'ace' | 'moral';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'marsh', label: 'Marshmallow testi' },
  { key: 'ace', label: 'Çocukluk adversitesi' },
  { key: 'moral', label: 'Ahlaki gelişim' },
];

const TEMPLATE = (id: string) => `
<div class="sim sim-ck">
  <p class="lede">Erken yaşantılar yetişkinlikteki davranışın zeminini nasıl hazırlar, ve bu ne kadar kaderdir?</p>

  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t.key}" data-pane="${t.key}" aria-controls="${id}-pane-${t.key}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${t.label}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık açıklama" data-ref="bar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="ck-meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t.key}" data-pane="${t.key}" aria-labelledby="${id}-tab-${t.key}" ${i ? 'hidden' : ''}></section>`).join('')}

  <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler: marshmallow grubunda yaklaşık üçte birinin 15 dakikayı tamamlaması ve ortalamanın ~11 dakika olması, stratejilerin ve deneyciye güvenin yönü, uzun vadeli öngörünün karışık replikasyonu (Watts ve ark. 2018), SES / kurumda bakım / anne ilgisinin yönleri, Kohlberg düzeylerinin yaş örüntüsü ve Blake'in yaş aralıkları. Bunların dışındaki bütün büyüklükler modelin varsayımıdır; kesin risk yüzdesi ya da "kader" iddiası taşımaz.</p>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('ck');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  let tab: Tab = 'marsh';
  let barDirty = true;
  let lastSay = '';
  const sayEl = $('say'), metersEl = $('meters');
  const ctx: Ctx = { scope, id, touch: () => { barDirty = true; poke(); } };

  const hostOf = (k: Tab) => root.querySelector<HTMLElement>(`.pane[data-pane="${k}"]`)!;
  const marsh = createMarshPanel(ctx, hostOf('marsh'));
  const ace = createAcePanel(ctx, hostOf('ace'));
  const moral = createMoralPanel(ctx, hostOf('moral'));
  const panels: Record<Tab, Panel> = { marsh, ace, moral };

  /* ---- Çıktı çubuğu ---- */
  metersEl.innerHTML = [0, 1, 2].map((i) => `<div class="ck-m"><div class="m-top"><span data-ref="ml${i}"></span><b data-ref="mv${i}"></b></div><div class="track"><b data-ref="mb${i}"></b></div></div>`).join('');
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

  /* ---- Rehberli tur (kaydırma yok: tur kartı yerinde kalır, çıktı çubuğu sonucu gösterir) ---- */
  const tour = createTour(scope, [
    {
      title: 'Bir marshmallow, on beş dakika',
      text: 'Beş yaşında bir çocuk, önünde marshmallow, deneyci odadan çıkmış. Kitaba göre grubun yaklaşık üçte biri 15 dakikayı tamamlar, ortalama 11 dakikaya yakın bekler; birkaçı hemen yer.',
      look: 'Grafiğin sağ ucundaki mavi sütun (tamamlayanlar) ve çubuktaki yüzde.',
      apply: () => { showTab('marsh'); marsh.set({ age: 5, strategy: 'look', trust: true, mode: 'raw' }); },
    },
    {
      title: 'Strateji beklemeyi uzatır',
      text: 'Aynı çocuklar, bu kez marshmallow\'u bulut gibi "soğuk" düşünüyor. Dikkati dağıtmak ve ödülü soğuk özellikleriyle düşünmek beklemeyi uzatır; lezzetini düşünmek kısaltır. Deneyciye güven de önemlidir.',
      look: 'Mavi sütunun büyümesi. Sonra "Deneyci sözünü tutmamış" seçeneğini dene.',
      apply: () => { showTab('marsh'); marsh.set({ age: 5, strategy: 'cold', trust: true, mode: 'raw' }); },
    },
    {
      title: 'Yıllar sonrası: karışık',
      text: 'Ham veride uzun bekleyenler sonradan daha iyi gidiyor gibi görünür. Ancak aile geçmişi kontrol edilince ilişki büyük ölçüde eriyor; kitaptaki replikasyon durumu "karışık" (Watts ve ark. 2018).',
      look: 'İkinci kutuda kırmızı çizginin yatıklaşması ve r değerinin düşmesi.',
      apply: () => { showTab('marsh'); marsh.set({ age: 5, strategy: 'look', trust: true, mode: 'ctrl' }); },
    },
    {
      title: 'Adversite birikir, kader olmaz',
      text: 'Beş olumsuz deneyim, korumasız. Risk dağılımı sağa kayar: deneyim sayısı arttıkça depresyon, dürtü kontrolü güçlüğü ve aşırı stres tepkisi eğilimi yükselir. Ama dağılımlar geniş ve çakışıyor.',
      look: 'Dağılımın kayması ve "yüksek eğilim bölgesi" dışında kalan büyük alan.',
      apply: () => { showTab('ace'); ace.set({ n: 5, out: 'dep' }); },
    },
    {
      title: 'Koruyucu etkenler eğriyi düzleştirir',
      text: 'Aynı beş deneyim, ama güvenli bağlanma, destekleyici bir yetişkin ve iyi kaynaklar var. Eğri düzleşir; stres tepkisinde fark en belirgindir (anne ilgisi ve epigenetik iz, Meaney).',
      look: 'Düz çizginin (mevcut koruma) kesikli çizginin (korumasız) altında kalması.',
      apply: () => { showTab('ace'); ace.set({ n: 5, attach: 1, adult: 0.8, ses: 0.7, out: 'str' }); },
    },
    {
      title: 'Gerekçe ahlakı basamaklandırır, ama eylemi pek öngörmez',
      text: 'Kohlberg\'e göre yetişkinlerin çoğu geleneksel düzeyde; 5. ve 6. aşamada tutarlı neredeyse kimse yok. Üstelik aşama, ahlaki eylemi zayıf öngörür ve model kültür ile cinsiyet açısından eleştirilmiştir.',
      look: 'Orta sütunların yüksekliği ve eylem olasılığındaki düz eğim.',
      apply: () => { showTab('moral'); moral.set({ age: 30, stance: 'yes', stage: 3, crit: 'action' }); },
    },
  ], { onExit: () => poke() });
  root.querySelector('.lede')!.after(tour.el);

  /* ---- Döngü: yalnızca durum değiştiğinde çizer; ekran dışında durur ---- */
  function frame(now: number): void {
    const redrew = panels[tab].draw(now);
    if (redrew || barDirty) updateBar();
  }
  scope.loop(frame, { root, onResume: () => { barDirty = true; panels[tab].resume?.(); } });
  showTab('marsh');

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
