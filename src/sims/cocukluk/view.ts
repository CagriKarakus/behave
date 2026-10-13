import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { createTour } from '../tour';
import { createAcePanel } from './ace-panel';
import { createMarshPanel } from './marsh-panel';
import { createMoralPanel } from './moral-panel';
import type { Ctx, Meter, Panel } from '../ui';
import { L } from './text';

type Tab = 'marsh' | 'ace' | 'moral';
const TAB_KEYS: Tab[] = ['marsh', 'ace', 'moral'];

const TEMPLATE = (id: string, T: ReturnType<typeof L>) => {
  const TABS = TAB_KEYS.map((key) => ({ key, label: T.tabs[key] }));
  return `
<div class="sim sim-ck">
  <p class="lede">${T.lede}</p>

  <div class="tabs" role="tablist" aria-label="${T.tablistAria}">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t.key}" data-pane="${t.key}" aria-controls="${id}-pane-${t.key}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${t.label}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="${T.barAria}" data-ref="bar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t.key}" data-pane="${t.key}" aria-labelledby="${id}-tab-${t.key}" ${i ? 'hidden' : ''}></section>`).join('')}

  <p class="foot">${T.foot}</p>
</div>`;
};

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('ck');
  const T = L();
  container.innerHTML = TEMPLATE(id, T);
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
  const poke = scope.announcer($('live'), () => lastSay);

  /* ---- Rehberli tur (kaydırma yok: tur kartı yerinde kalır, çıktı çubuğu sonucu gösterir) ---- */
  const tour = createTour(scope, [
    {
      title: T.tour[0].title,
      text: T.tour[0].text,
      look: T.tour[0].look,
      apply: () => { showTab('marsh'); marsh.set({ age: 5, strategy: 'look', trust: true, mode: 'raw' }); },
    },
    {
      title: T.tour[1].title,
      text: T.tour[1].text,
      look: T.tour[1].look,
      apply: () => { showTab('marsh'); marsh.set({ age: 5, strategy: 'cold', trust: true, mode: 'raw' }); },
    },
    {
      title: T.tour[2].title,
      text: T.tour[2].text,
      look: T.tour[2].look,
      apply: () => { showTab('marsh'); marsh.set({ age: 5, strategy: 'look', trust: true, mode: 'ctrl' }); },
    },
    {
      title: T.tour[3].title,
      text: T.tour[3].text,
      look: T.tour[3].look,
      apply: () => { showTab('ace'); ace.set({ n: 5, out: 'dep' }); },
    },
    {
      title: T.tour[4].title,
      text: T.tour[4].text,
      look: T.tour[4].look,
      apply: () => { showTab('ace'); ace.set({ n: 5, attach: 1, adult: 0.8, ses: 0.7, out: 'str' }); },
    },
    {
      title: T.tour[5].title,
      text: T.tour[5].text,
      look: T.tour[5].look,
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
