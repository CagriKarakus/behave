// Sekme 3: Kitabın özeti olarak geri bakış. Her bölümden bir cümlelik ders ve simülasyonlara bağlantılar.
import { createTour } from '../tour';
import { L } from './text';
import { simsFor } from '../registry';
import { chipRow, type Ctx, type Meter, type Panel } from '../ui';
import { CHAPTERS, GROUPS, THEMES, type Group } from './harita-data';

type Filter = Group | 'hepsi';
const chapterHref = (id: string): string => `#/bolum/${id}`;
const simLinks = (id: string): string =>
  simsFor(id).map((s) => `<a class="mp-sim" href="${chapterHref(id)}?sim=${s.id}">${s.title}<span class="mp-go" aria-hidden="true"> ▸</span></a>`).join('');

export interface HaritaApi extends Panel { set(f: Filter): void; shown(): { chapters: number; withSim: number; sims: number } }

/** `goTab`: temalar listesinden bu simülasyonun öteki sekmelerine geçiş. */
export function createHaritaPanel(ctx: Ctx, host: HTMLElement, goTab: (t: 'ort' | 'biz') => void): HaritaApi {
  const T = L().map;
  let filter: Filter = 'hepsi';
  let dirty = true;

  host.innerHTML =
    '<div data-ref="tour"></div>' +
    '<div class="chips" data-ref="chips"></div>' +
    `<section class="card" aria-label="${T.listAria}"><h3 class="sim-h">${T.listTitle}</h3><ul class="mp-list" data-ref="list"></ul></section>` +
    `<section class="card" aria-label="${T.themesAria}"><h3 class="sim-h">${T.themesTitle}</h3><ul class="mp-list mp-themes" data-ref="themes"></ul></section>` +
    '<div class="notes" data-notes="harita"></div>';
  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;

  /* ---- Bölüm listesi (bir kez kurulur; süzgeç satırları gizler) ---- */
  q('list').innerHTML = CHAPTERS.map((c) => {
    const sims = simLinks(c.id);
    return `<li class="mp-row" data-g="${c.group}"><div class="mp-h"><span class="mp-n">${c.label}</span><a class="mp-t" href="${chapterHref(c.id)}">${c.title}</a></div>` +
      `<p class="mp-l">${c.lesson}</p>${sims ? `<div class="mp-sims" aria-label="${T.simsAria}">${sims}</div>` : ''}</li>`;
  }).join('');

  q('themes').innerHTML = THEMES.map((t, i) => {
    const links = t.chapters.map((id) => {
      const c = CHAPTERS.find((x) => x.id === id)!;
      return `<a class="mp-sim" href="${chapterHref(id)}">${c.label}: ${c.title}</a>${simLinks(id)}`;
    }).join('');
    const here = t.tab ? `<button type="button" class="btn mp-here" data-tab="${t.tab}">${T.here(t.tab)}</button>` : '';
    return `<li class="mp-row" data-i="${i}"><div class="mp-h"><b class="mp-t">${t.term}</b></div><p class="mp-l">${t.text}</p><div class="mp-sims">${here}${links}</div></li>`;
  }).join('');
  for (const b of Array.from(host.querySelectorAll<HTMLButtonElement>('.mp-here'))) ctx.scope.on(b, 'click', () => goTab(b.dataset.tab as 'ort' | 'biz'));

  const setChip = chipRow(q('chips'), ctx, GROUPS.map((g) => ({ key: g.key, label: g.label })), (k) => { set(k as Filter); }, T.chipsAria);

  function set(f: Filter): void { filter = f; setChip(f); dirty = true; }
  const rows = Array.from(q('list').querySelectorAll<HTMLElement>('.mp-row'));
  const shown = (): { chapters: number; withSim: number; sims: number } => {
    const list = CHAPTERS.filter((c) => filter === 'hepsi' || c.group === filter);
    return { chapters: list.length, withSim: list.filter((c) => simsFor(c.id).length).length, sims: list.reduce((n, c) => n + simsFor(c.id).length, 0) };
  };

  const tour = createTour(ctx.scope, [
    { ...T.tour[0], apply: () => set('hepsi') },
    { ...T.tour[1], apply: () => set('zaman') },
    { ...T.tour[2], apply: () => set('gelisim') },
    { ...T.tour[3], apply: () => set('biz') },
    { ...T.tour[4], apply: () => set('hepsi') },
  ], { onExit: () => ctx.touch() });
  q('tour').replaceWith(tour.el);

  return {
    draw(): boolean {
      if (!dirty) return false;
      dirty = false;
      for (const r of rows) r.hidden = filter !== 'hepsi' && r.dataset.g !== filter;
      return true;
    },
    say: () => {
      const s = shown(), g = GROUPS.find((x) => x.key === filter)!.label;
      return T.say(s.chapters, g, s.withSim, s.sims);
    },
    meters: (): Meter[] => {
      const s = shown(), all = CHAPTERS.length;
      const totalSims = CHAPTERS.reduce((n, c) => n + simsFor(c.id).length, 0);
      return [
        { label: T.meters.shown, value: `${s.chapters} / ${all}`, frac: s.chapters / all, color: 'var(--ink)' },
        { label: T.meters.withSim, value: `${s.withSim}`, frac: s.withSim / all, color: 'var(--pfc)' },
        { label: T.meters.sims, value: `${s.sims}`, frac: totalSims ? s.sims / totalSims : 0, color: 'var(--dop)' },
      ];
    },
    set,
    shown,
  };
}
