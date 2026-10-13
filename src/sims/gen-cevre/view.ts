import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { createTour } from '../tour';
import { L } from './text';
import { createGwasPanel } from './gwas-panel';
import { createMaoPanel } from './mao-panel';
import { createTablePanel } from './table-panel';
import { M_STEPS } from './model';
import type { Ctx, Meter, Panel } from '../ui';

type Tab = 'table' | 'mao' | 'gwas';
const TAB_KEYS: Tab[] = ['table', 'mao', 'gwas'];

const TEMPLATE = (id: string) => {
  const V = L().view;
  const TABS = TAB_KEYS.map((key) => ({ key, label: V.tabs[key] }));
  return `
<div class="sim sim-gc">
  <p class="lede">${V.lede}</p>

  <div class="tabs" role="tablist" aria-label="${V.tabsLabel}">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t.key}" data-pane="${t.key}" aria-controls="${id}-pane-${t.key}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${t.label}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="${V.barLabel}" data-ref="bar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t.key}" data-pane="${t.key}" aria-labelledby="${id}-tab-${t.key}" ${i ? 'hidden' : ''}></section>`).join('')}
</div>`;
};

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('gc');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  let tab: Tab = 'table';
  let barDirty = true;
  let lastSay = '';
  const sayEl = $('say'), metersEl = $('meters');
  const ctx: Ctx = { scope, id, touch: () => { barDirty = true; poke(); } };

  const hostOf = (k: Tab) => root.querySelector<HTMLElement>(`.pane[data-pane="${k}"]`)!;
  const panels: Record<Tab, Panel> = {
    table: createTablePanel(ctx, hostOf('table')),
    mao: createMaoPanel(ctx, hostOf('mao')),
    gwas: createGwasPanel(ctx, hostOf('gwas')),
  };
  const tablePanel = panels.table as ReturnType<typeof createTablePanel>;
  const maoPanel = panels.mao as ReturnType<typeof createMaoPanel>;
  const gwasPanel = panels.gwas as ReturnType<typeof createGwasPanel>;

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
  const poke = scope.announcer($('live'), () => lastSay);

  /* ---- Rehberli tur ---- */
  const TS = L().view.tour;
  const stepApply: Array<() => void> = [
    () => { showTab('table'); tablePanel.setPreset('none'); tablePanel.setParams({ n: 1 }); },
    () => { showTab('table'); tablePanel.setPreset('none'); tablePanel.setParams({ n: 6 }); },
    () => { showTab('table'); tablePanel.setPreset('crabbe'); },
    () => { showTab('mao'); maoPanel.set({ level: 1, ratio: 3, share: 0.1 }); },
    () => { showTab('gwas'); gwasPanel.set({ mIdx: 0, env: 0.2, sample: 'y2010' }); },
    () => { showTab('gwas'); gwasPanel.set({ mIdx: M_STEPS.length - 1, env: 0.2, sample: 'y2010' }); },
  ];
  const tour = createTour(scope, TS.map((st, i) => ({ ...st, apply: stepApply[i] })), { onExit: () => poke() });
  root.querySelector('.lede')!.after(tour.el);

  /* ---- Döngü: yalnızca durum değiştiğinde çizer; ekran dışında durur ---- */
  function frame(): void {
    const redrew = panels[tab].draw();
    if (redrew || barDirty) updateBar();
  }
  scope.loop(frame, { root, onResume: () => { barDirty = true; } });
  showTab('table');

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
