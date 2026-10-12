import '../sim.css';
import './view.css';
import { Scope, ref, uid } from '../kit';
import { lazyNotes, type Ctx, type Meter, type Panel } from '../ui';
import { createBizPanel } from './biz-panel';
import { createHaritaPanel } from './harita-panel';
import { createOrtPanel } from './ort-panel';

type Tab = 'ort' | 'biz' | 'harita';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'ort', label: 'Ortalama mı, dağılım mı?' },
  { key: 'biz', label: 'Biz/Onlar kaydırıcısı' },
  { key: 'harita', label: 'Geri bakış: kitabın haritası' },
];

const TEMPLATE = (id: string) => `
<div class="sim sim-so">
  <p class="lede">"İnsanlar şöyledir" demek neden yanıltır, ve biz/onlar sınırı ne kadar kolay kayar?</p>

  <div class="tabs" role="tablist" aria-label="Simülasyon bölümleri">
    ${TABS.map((t, i) => `<button class="tab" role="tab" id="${id}-tab-${t.key}" data-pane="${t.key}" aria-controls="${id}-pane-${t.key}" aria-selected="${i === 0}" ${i ? 'tabindex="-1"' : ''} type="button">${t.label}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="Anlık çıktılar"><div class="sim-bar-in">
    <p class="say" data-ref="say"></p>
    <div class="meters" data-ref="meters"></div>
  </div></div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  ${TABS.map((t, i) => `<section class="pane" role="tabpanel" id="${id}-pane-${t.key}" data-pane="${t.key}" aria-labelledby="${id}-tab-${t.key}" ${i ? 'hidden' : ''}></section>`).join('')}

  <div class="notes" data-notes="foot"></div>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('so');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  let tab: Tab = 'ort';
  let barDirty = true;
  let lastSay = '';
  const sayEl = $('say'), metersEl = $('meters');
  const ctx: Ctx = { scope, id, touch: () => { barDirty = true; poke(); } };

  const hostOf = (k: Tab) => root.querySelector<HTMLElement>(`.pane[data-pane="${k}"]`)!;
  const ort = createOrtPanel(ctx, hostOf('ort'));
  const biz = createBizPanel(ctx, hostOf('biz'));
  const harita = createHaritaPanel(ctx, hostOf('harita'), (t) => { showTab(t, true); poke(); });
  const panels: Record<Tab, Panel> = { ort, biz, harita };

  /* ---- Çıktı çubuğu ---- */
  metersEl.innerHTML = [0, 1, 2].map((i) => `<div class="m"><div class="m-top"><span data-ref="ml${i}"></span><b data-ref="mv${i}"></b></div><div class="track"><b data-ref="mb${i}"></b></div></div>`).join('');
  function updateBar(): void {
    barDirty = false;
    const p = panels[tab], t = p.say();
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

  /* ---- Döngü: yalnızca durum değiştiğinde çizer; ekran dışında durur ---- */
  function frame(now: number): void {
    const redrew = panels[tab].draw(now);
    if (redrew || barDirty) updateBar();
  }
  scope.loop(frame, { root, onResume: () => { barDirty = true; panels[tab].resume?.(); } });
  showTab('ort');
  lazyNotes(scope, root, () => import('./notes').then((m) => m.NOTES));

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
