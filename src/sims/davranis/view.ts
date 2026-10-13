import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { lazyNotes, type Ctx, type Meter, type Panel } from '../ui';
import { createHaritaPanel } from './panel-harita';
import { createBaglamPanel } from './panel-baglam';
import { createYerPanel } from './panel-yer';
import { L } from './text';
import { getLocale } from '../../i18n/locale';

type Tab = 'harita' | 'baglam' | 'yer';
const TABS: Tab[] = ['harita', 'baglam', 'yer'];

const TEMPLATE = (id: string) => `
<div class="sim sim-ad">
  <p class="lede">${L().lede}</p>

  <div class="tabs" role="tablist" aria-label="${L().tabsLabel}">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t}" data-pane="${t}" aria-controls="${id}-pane-${t}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${L().tabs[t]}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="${L().barLabel}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t}" data-pane="${t}" aria-labelledby="${id}-tab-${t}" ${i ? 'hidden' : ''}></section>`).join('')}
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('ad');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  let tab: Tab = 'harita';
  let barDirty = true;
  let lastSay = '';
  const sayEl = $('say'), metersEl = $('meters');
  // Paneller kurulurken (tur adımları) touch çağrılabilir; announcer önce hazır olmalı.
  const poke = scope.announcer($('live'), () => lastSay);
  const ctx: Ctx = { scope, id, touch: () => { barDirty = true; poke(); } };

  const hostOf = (k: Tab) => root.querySelector<HTMLElement>(`.pane[data-pane="${k}"]`)!;
  const panels: Record<Tab, Panel> = {
    harita: createHaritaPanel(ctx, hostOf('harita')),
    baglam: createBaglamPanel(ctx, hostOf('baglam')),
    yer: createYerPanel(ctx, hostOf('yer')),
  };
  lazyNotes(scope, root, () => (getLocale() === 'en' ? import('./notes.en').then((m) => m.default()) : import('./notes').then((m) => m.default())));

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

  /* ---- Döngü: yalnızca durum değiştiğinde çizer; ekran dışında durur ---- */
  function frame(now: number): void {
    const redrew = panels[tab].draw(now);
    if (redrew || barDirty) updateBar();
  }
  scope.loop(frame, { root, onResume: () => { barDirty = true; panels[tab].resume?.(); } });
  showTab('harita');

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
