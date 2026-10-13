import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { createTour } from '../tour';
import { t } from '../../i18n/t';
import { lazyNotes, type Ctx, type Meter, type Panel } from '../ui';
import { createCategoryPanel } from './category-panel';
import { createLadderPanel } from './ladder-panel';
import { L } from './text';
import type { Strings } from './text.tr';

type Tab = 'ladder' | 'cat';
const TAB_KEYS: Tab[] = ['ladder', 'cat'];

const TEMPLATE = (id: string, T: Strings) => {
  const TABS = TAB_KEYS.map((key) => ({ key, label: T.tabs[key] }));
  return `
<div class="sim sim-zm">
  <p class="lede">${T.lede}</p>

  <div class="tabs" role="tablist" aria-label="${T.tabsAria}">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t.key}" data-pane="${t.key}" aria-controls="${id}-pane-${t.key}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${t.label}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="${T.barAria}" data-ref="bar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t.key}" data-pane="${t.key}" aria-labelledby="${id}-tab-${t.key}" ${i ? 'hidden' : ''}></section>`).join('')}
</div>`;
};

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('zm');
  container.innerHTML = TEMPLATE(id, L());
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
  const T = L();
  const tl = T.tourL, tc = T.tourC;
  // Replikasyon etiketi metinde değil, t() üzerinden gelir.
  const fill = (x: string): string => x.replace('{rep}', t('repl.karışık'));
  const tourL = createTour(scope, [
    { ...tl[0], apply: () => { ladder.set({ behavior: 'vurma', depth: 1, sel: null }); touch(); } },
    { ...tl[1], apply: () => { ladder.set({ behavior: 'vurma', depth: 4, sel: 2 }); touch(); } },
    { ...tl[2], apply: () => { ladder.set({ behavior: 'vurma', depth: 6, sel: 5 }); touch(); } },
    { ...tl[3], text: fill(tl[3].text), apply: () => { ladder.set({ behavior: 'vurma', depth: 8, sel: 6 }); touch(); } },
    { ...tl[4], apply: () => { ladder.set({ behavior: 'yardim', depth: 9, sel: null }); touch(); } },
  ], { onExit: () => poke() });
  hostOf('ladder').prepend(tourL.el);

  const tourC = createTour(scope, [
    { ...tc[0], apply: () => { category.set({ example: 'renk', delta: 6, offset: 0, strength: 0, boxes: 4 }); touch(); } },
    { ...tc[1], apply: () => { category.set({ example: 'renk', delta: 6, offset: 100, strength: 50, boxes: 4 }); touch(); } },
    { ...tc[2], apply: () => { category.set({ example: 'renk', delta: 6, offset: 0, strength: 50, boxes: 4 }); touch(); } },
    { ...tc[3], apply: () => { category.set({ example: 'not', delta: 2, offset: 0, strength: 70, boxes: 4 }); touch(); } },
  ], { onExit: () => poke() });
  hostOf('cat').prepend(tourC.el);

  /* ---- Notlar (tembel) ---- */
  lazyNotes(scope, root, () => import('./notes').then((m) => m.default()));

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
