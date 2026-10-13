// Sekme 1: Merdiven. Seçilen bir davranış için zaman basamaklarındaki etkenler ve basamaklar arası oklar.
import { SVGNS } from '../kit';
import { chipRow, makeSlider, type Ctx, type Meter, type Panel, type SliderHandle } from '../ui';
import { L } from './text';
import { BEHAVIORS, LINKS, RUNGS, type Dir } from './data';
import { clampDepth, describeLadder, ladderStats, linksOf } from './model';

const dirTag = (d: Dir): string => L().dir[d];

export interface LadderPanel extends Panel {
  set(p: { behavior?: string; depth?: number; sel?: number | null }): void;
}

const rungHtml = (i: number): string => {
  const r = RUNGS[i], T = L().ladder;
  return `<li class="rung" data-i="${i}">
  <div class="r-when"><span class="r-n" aria-hidden="true">${i + 1}</span><span class="r-t">${r.when}</span>
    <a class="r-go" href="#/bolum/${r.ch}?sim=${r.sim}">${T.goChapter(+r.ch.slice(2))}</a></div>
  <button type="button" class="card" aria-pressed="false" data-c="card"><span class="c-dir"></span><b class="c-title"></b><span class="c-text"></span></button>
  <p class="r-off" hidden>${T.off}</p>
  <ul class="c-links" hidden></ul>
</li>`;
};

export function createLadderPanel(ctx: Ctx, host: HTMLElement): LadderPanel {
  const T = L().ladder;
  const mk = `${ctx.id}-ar`, mkOn = `${ctx.id}-aron`;
  host.innerHTML = `
<div class="chips" data-ref="beh"></div>
<div class="stage lad">
  <p class="lad-top">${T.near} <span aria-hidden="true">↓</span> ${T.far}</p>
  <div class="lad-wrap" data-ref="wrap">
    <svg class="rail" data-ref="rail" aria-hidden="true" focusable="false">
      <defs>
        <marker id="${mk}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" class="ar"/></marker>
        <marker id="${mkOn}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" class="ar on"/></marker>
      </defs>
      <g data-ref="rails"></g>
    </svg>
    <ol class="rungs" data-ref="rungs" aria-label="${T.rungsAria}">${RUNGS.map((_, i) => rungHtml(i)).join('')}</ol>
  </div>
  <div class="legend" aria-label="${T.legendAria}">
    <span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5 H20" class="lg-ln"/><path d="M19 1.5 L25 5 L19 8.5 z" class="lg-ar"/></svg>${T.legendArrow}</span>
    <span>${dirTag('for')} · ${dirTag('against')} · ${dirTag('ctx')}</span>
  </div>
</div>
<section aria-label="${T.inputsAria}"><h3 class="sim-h">${T.inputsH}</h3><div class="sliders" data-ref="sliders"></div></section>
<div class="notes" data-notes="ladder"></div>`;

  const $ = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const S = { behavior: 0, depth: 3, sel: null as number | null, dirty: true };
  const lis = Array.from(host.querySelectorAll<HTMLElement>('.rung'));
  const part = (li: HTMLElement) => ({
    card: li.querySelector<HTMLButtonElement>('.card')!,
    dir: li.querySelector<HTMLElement>('.c-dir')!,
    title: li.querySelector<HTMLElement>('.c-title')!,
    text: li.querySelector<HTMLElement>('.c-text')!,
    off: li.querySelector<HTMLElement>('.r-off')!,
    links: li.querySelector<HTMLElement>('.c-links')!,
    go: li.querySelector<HTMLElement>('.r-go')!,
  });
  const parts = lis.map(part);

  const setChip = chipRow($('beh'), ctx, BEHAVIORS.map((b) => ({ key: b.key, label: b.label })), (k) => {
    S.behavior = Math.max(0, BEHAVIORS.findIndex((b) => b.key === k)); S.dirty = true;
  }, T.chipsAria);

  const sl: Record<string, SliderHandle> = {};
  sl.depth = makeSlider(ctx, $('sliders'), 'depth', T.depthName, T.depthHint, 1, RUNGS.length, S.depth,
    (v) => { S.depth = clampDepth(v); S.dirty = true; }, (v) => T.depthVal(v, RUNGS.length, RUNGS[clampDepth(v) - 1].name), 'var(--pfc)');

  for (const [i, p] of parts.entries()) {
    ctx.scope.on(p.card, 'click', () => { S.sel = S.sel === i ? null : i; S.dirty = true; ctx.touch(); });
  }

  /* ---- Ok şeridi: kartların yerleşiminden hesaplanır ---- */
  const wrap = $('wrap'), rails = $<SVGGElement>('rails'), rail = $<SVGElement>('rail');
  function drawRail(): void {
    rails.textContent = '';
    const h = wrap.offsetHeight;
    if (!h) return;
    rail.setAttribute('viewBox', `0 0 40 ${h}`);
    rail.setAttribute('height', String(h));
    const d = ladderStats(S.depth).depth;
    const yOf = (i: number) => lis[i].offsetTop + parts[i].card.offsetTop + parts[i].card.offsetHeight / 2;
    for (const l of LINKS) {
      if (l.from >= d || l.to >= d) continue;
      const on = S.sel !== null && (l.from === S.sel || l.to === S.sel);
      const dim = S.sel !== null && !on;
      const y1 = yOf(l.from), y2 = yOf(l.to), dx = Math.min(30, 8 + 5 * (l.from - l.to));
      const p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', `M39 ${y1} C${39 - dx} ${y1} ${39 - dx} ${y2} 38 ${y2}`);
      p.setAttribute('class', `lk${on ? ' on' : ''}${dim ? ' dim' : ''}`);
      p.setAttribute('marker-end', `url(#${on ? mkOn : mk})`);
      rails.appendChild(p);
    }
  }
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => drawRail());
    ro.observe(wrap);
    ctx.scope.onDispose(() => ro.disconnect());
  }

  function render(): void {
    S.dirty = false;
    const b = BEHAVIORS[S.behavior];
    const d = ladderStats(S.depth).depth;
    if (S.sel !== null && S.sel >= d) S.sel = null;
    setChip(b.key);
    sl.depth.set(d);
    parts.forEach((p, i) => {
      const off = i >= d;
      p.card.hidden = off; p.off.hidden = !off; p.go.hidden = off;
      lis[i].classList.toggle('off', off);
      lis[i].classList.toggle('sel', S.sel === i);
      p.card.setAttribute('aria-pressed', String(S.sel === i));
      const c = b.cards[i];
      p.dir.textContent = dirTag(c.dir);
      p.card.dataset.dir = c.dir;
      p.title.textContent = c.title;
      p.text.textContent = c.text;
      p.card.setAttribute('aria-label', T.cardAria(RUNGS[i].when, c.title, dirTag(c.dir).slice(2)));
      const open = S.sel === i && !off;
      p.links.hidden = !open;
      p.links.textContent = '';
      if (open) {
        const { into, out } = linksOf(i);
        const vis = [...out, ...into].filter((l) => l.from < d && l.to < d);
        for (const l of vis) {
          const li = document.createElement('li');
          li.innerHTML = '<b></b> <span></span>';
          li.firstElementChild!.textContent = `${RUNGS[l.from].name} → ${RUNGS[l.to].name}`;
          li.lastElementChild!.textContent = l.label;
          p.links.appendChild(li);
        }
        if (!vis.length) { const li = document.createElement('li'); li.textContent = T.noLinks; p.links.appendChild(li); }
      }
    });
    drawRail();
  }

  return {
    say: () => describeLadder(BEHAVIORS[S.behavior].label, S.depth, S.sel),
    meters(): Meter[] {
      const s = ladderStats(S.depth);
      return [
        { label: T.mDepth, value: `${s.depth}/${RUNGS.length}`, frac: s.depth / RUNGS.length, color: 'var(--pfc)' },
        { label: T.mSeen, value: `${s.seen}/${s.total}`, frac: s.seen / s.total, color: 'var(--gld)' },
        { label: T.mCut, value: `${s.cut}`, frac: s.cut / s.total, color: 'var(--amy)' },
      ];
    },
    draw(): boolean { if (!S.dirty) return false; render(); return true; },
    resume() { S.dirty = true; },
    set(p) {
      if (p.behavior !== undefined) S.behavior = Math.max(0, BEHAVIORS.findIndex((b) => b.key === p.behavior));
      if (p.depth !== undefined) S.depth = clampDepth(p.depth);
      if (p.sel !== undefined) S.sel = p.sel;
      render();
    },
  };
}
