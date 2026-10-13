import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { createTour, type TourStep } from '../tour';
import { lazyNotes, type Ctx, type Meter, type Panel } from '../ui';
import { createCodePanel } from './panel-code';
import { L } from './text';

type Tab = 'code' | 'reg' | 'conf';
const TAB_KEYS: Tab[] = ['code', 'reg', 'conf'];

const TEMPLATE = (id: string) => {
  const s = L();
  const TABS = TAB_KEYS.map((key) => ({ key, label: s.tabs[key] }));
  return `
<div class="sim sim-pr">
  <p class="lede">${s.lede}</p>

  <div class="tabs" role="tablist" aria-label="${s.tabsAria}">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t.key}" data-pane="${t.key}" aria-controls="${id}-pane-${t.key}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${t.label}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="${s.barAria}"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t.key}" data-pane="${t.key}" aria-labelledby="${id}-tab-${t.key}" ${i ? 'hidden' : ''}></section>`).join('')}

  <div class="notes"><div data-notes="how"></div><div data-notes="book"></div><div data-notes="foot"></div></div>
</div>`;
};

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

  const withText = (texts: Array<{ title: string; text: string; look: string }>, applies: Array<() => void>): TourStep[] =>
    texts.map((x, i) => ({ ...x, apply: applies[i] }));

  addTour('code', withText(L().tourCode, (['none', 'sessiz', 'yanlis', 'anlamsiz', 'sil1', 'sil3'] as const).map((k) => () => code.setPreset(k))));

  const regTour = (p: RegP): TourStep[] => withText(L().tourReg, [
    () => p.set({ a: 10, b: 80, tf: 100, meA: false, meB: false }),
    () => p.set({ a: 90, b: 90, tf: 0, meA: false, meB: false }),
    () => p.set({ a: 90, b: 90, tf: 100, meA: false, meB: true }),
    () => p.set({ a: 90, b: 90, tf: 100, meA: false, meB: false, e2: true, e3: true }),
    () => p.set({ e2: true, e3: false }),
  ]);

  const confTour = (p: ConfP): TourStep[] => withText(L().tourConf, [
    () => p.set({ lig: 'none', conc: 3, temp: 37, ph: 7.4 }),
    () => p.set({ lig: 'good', conc: 3, temp: 37, ph: 7.4 }),
    () => p.set({ lig: 'good', conc: 10, temp: 37, ph: 7.4 }),
    () => p.set({ lig: 'like', conc: 10, temp: 37, ph: 7.4 }),
    () => p.set({ lig: 'good', conc: 5, temp: 52, ph: 7.4 }),
    () => p.set({ lig: 'good', conc: 3, temp: 37, ph: 7.4 }),
  ]);

  lazyNotes(scope, root, () => import('./notes').then((m) => m.notes()));

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
