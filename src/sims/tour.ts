// Rehberli tur: simülasyonu adım adım anlatan ortak bileşen. Her adım simülasyonu
// belirli bir duruma getirir (apply), ne olduğunu anlatır (text) ve okuyucuya neye
// bakması gerektiğini söyler (look). Tur bitince ya da "Serbest oyna"ya basılınca
// kullanıcı kaydırıcılarla serbestçe dener.

import { t } from '../i18n/t';
import type { Scope } from './kit';

export interface TourStep {
  title: string;
  /** Bu adımda ne oluyor; 1-3 kısa cümle. */
  text: string;
  /** "Neye bak:" satırı; ekranda gözlenecek tek şey. */
  look?: string;
  /** Simülasyonu bu adımın durumuna getirir. */
  apply?: () => void;
}

export interface Tour {
  el: HTMLElement;
  go: (i: number) => void;
  /** Etkin adım; tur kapalıysa -1. */
  current: () => number;
}

export function createTour(scope: Scope, steps: TourStep[], opts: { onExit?: () => void } = {}): Tour {
  const el = document.createElement('section');
  el.className = 'tour';
  el.setAttribute('aria-label', t('tour.title'));
  el.innerHTML =
    `<div class="tour-head"><span class="tour-k">${t('tour.title')}</span><span class="tour-n" data-t="n"></span></div>` +
    '<p class="tour-title" data-t="title"></p>' +
    '<p class="tour-text" data-t="text" aria-live="polite"></p>' +
    '<p class="tour-look" data-t="look"></p>' +
    '<div class="tour-nav">' +
    `<button type="button" class="btn" data-t="prev">${t('tour.prev')}</button>` +
    `<button type="button" class="btn tour-next" data-t="next">${t('tour.next')}</button>` +
    `<button type="button" class="btn tour-exit" data-t="exit">${t('tour.free')}</button>` +
    '</div>' +
    `<button type="button" class="btn tour-start" data-t="start" hidden>${t('tour.restart')}</button>`;
  const q = (k: string) => el.querySelector<HTMLElement>(`[data-t="${k}"]`)!;
  let i = 0;

  const render = () => {
    const open = i >= 0;
    for (const k of ['n', 'title', 'text', 'look']) q(k).hidden = !open;
    q('prev').parentElement!.hidden = !open;
    q('start').hidden = open;
    el.classList.toggle('is-closed', !open);
    if (!open) return;
    const s = steps[i];
    q('n').textContent = `${i + 1} / ${steps.length}`;
    q('title').textContent = s.title;
    q('text').textContent = s.text;
    q('look').textContent = s.look ? t('tour.look', { x: s.look }) : '';
    q('look').hidden = !s.look;
    (q('prev') as HTMLButtonElement).disabled = i === 0;
    q('next').textContent = i === steps.length - 1 ? t('tour.done') : t('tour.next');
  };
  const go = (n: number) => {
    i = Math.max(0, Math.min(steps.length - 1, n));
    steps[i].apply?.();
    render();
  };
  const exit = () => { i = -1; render(); opts.onExit?.(); };

  scope.on(q('prev'), 'click', () => go(i - 1));
  scope.on(q('next'), 'click', () => (i === steps.length - 1 ? exit() : go(i + 1)));
  scope.on(q('exit'), 'click', exit);
  scope.on(q('start'), 'click', () => go(0));

  go(0);
  return { el, go, current: () => i };
}
