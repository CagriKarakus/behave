import { mulberry32 } from '../rng';
import { repBadge, pc } from '../ui';
import { percent } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { L } from './text';
import { TR } from './text.tr';
import '../sim.css';
import './view.css';
import { Scope, pct, ref, svg, svgText, uid } from '../kit';
import { createTour, type Tour } from '../tour';
import {
  AGE_MAX, AGE_MIN, GROUPS, LOSS, MAX_PEERS, PROFILES, accumbens, agentRound, ageCurves, asymmetry, badRate, control, describeAge,
  describeDrive, describeNews, dopamine, forcedActual, frontal, gap, goodRate, greyMatter, groupAge, lerp, myelin, newsFor,
  pointsFor, remainingFromRisk, rewardSignal, riskRate, updateFraction, updatedEstimate, RISK_MAX, RISK_MIN,
  type GroupId, type News, type NewsKind, type ProfileId,
} from './model';

export const EVENTS: Array<{ name: string; actual: number }> = [25, 12, 30, 45, 8].map((actual, i) => ({ get name() { return L().events[i]; }, actual }));

/** Sekme başlıkları (Türkçe; görünürde `L().tabs` kullanılır). */
export const TABS = TR.tabs;
export const PHASE = { approach: 0.9, wait: 0.8, resolve: 1.15 } as const;

const TEMPLATE = (id: string) => { const T = L(); return `
<div class="sim sim-erg">
  <p class="lede">${T.lede}</p>
  <div data-ref="tourHost"></div>
  <div class="tabs" role="tablist" aria-label="${T.tabsAria}" data-ref="tabs">
    ${T.tabs.map((tb, i) => `<button type="button" class="tab" role="tab" id="${id}-t${i}" aria-controls="${id}-p${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">${i + 1}. ${tb}</button>`).join('')}
  </div>

  <div class="sim-bar" role="group" aria-label="${T.outputsAria}">
    <div class="sim-bar-in">
      <p class="say" data-ref="say"></p>
      <div class="meters">
        ${[0, 1, 2].map((k) => `<div class="m" data-ref="mm${k}"><div class="m-top"><span data-ref="ml${k}"></span><b data-ref="mv${k}">0%</b></div><div class="track"><b data-ref="mb${k}"></b></div></div>`).join('')}
      </div>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <!-- 1. Olgunlaşma çizelgesi -->
  <section role="tabpanel" id="${id}-p0" aria-labelledby="${id}-t0" class="panel" data-ref="p0">
    <div class="stage">
      <svg viewBox="0 0 360 232" role="img" aria-label="${T.brainAria}" data-ref="brain">
        <defs><clipPath id="${id}-clip"><path d="M62,118 C50,78 84,34 140,28 C190,18 252,26 290,62 C322,92 326,138 296,162 C280,176 258,176 244,170 C240,184 232,190 214,190 C196,190 192,184 192,178 C160,188 112,186 88,162 C72,148 64,134 62,118 Z"/></clipPath></defs>
        <ellipse class="b-cb" cx="268" cy="172" rx="38" ry="19"/>
        <path class="b-stem" d="M206,176 L200,224 L226,224 L228,176 Z"/>
        <path class="b-out" d="M62,118 C50,78 84,34 140,28 C190,18 252,26 290,62 C322,92 326,138 296,162 C280,176 258,176 244,170 C240,184 232,190 214,190 C196,190 192,184 192,178 C160,188 112,186 88,162 C72,148 64,134 62,118 Z"/>
        <g clip-path="url(#${id}-clip)">
          <path data-ref="front" class="b-front" d="M30,10 L178,10 C170,60 178,120 190,230 L30,230 Z"/>
          <g data-ref="dots"></g>
          <path class="b-edge" d="M178,10 C170,60 178,120 190,230"/>
        </g>
        <g data-ref="fibres" class="b-fibres"></g>
        <ellipse data-ref="limb" class="b-limb" cx="204" cy="122" rx="36" ry="22"/>
        <circle data-ref="nacc" class="b-nacc" cx="172" cy="140" r="6"/>
        <text class="b-lab" x="108" y="92" text-anchor="middle">${T.brainLabels.frontal}</text>
        <text class="b-val" x="108" y="106" text-anchor="middle" data-ref="fval"></text>
        <text class="b-lab" x="206" y="119" text-anchor="middle">${T.brainLabels.limbic}</text>
        <text class="b-val" x="206" y="132" text-anchor="middle" data-ref="lval"></text>
        <text class="b-small" x="172" y="160" text-anchor="middle">${T.brainLabels.accumbens}</text>
        <text class="b-small" x="272" y="204" text-anchor="middle">${T.brainLabels.cerebellum}</text>
        <text class="b-small" x="118" y="196" text-anchor="middle">${T.brainLabels.front}</text>
        <text class="b-small" x="298" y="196" text-anchor="middle">${T.brainLabels.back}</text>
      </svg>
      <div class="legend">
        <span><i style="background:var(--pfc)"></i>${T.brainLegend[0]}</span>
        <span><i style="background:var(--dop)"></i>${T.brainLegend[1]}</span>
        <span><i style="background:var(--ink)"></i>${T.brainLegend[2]}</span>
        <span><i style="background:var(--pit)"></i>${T.brainLegend[3]}</span>
      </div>
    </div>

    <div class="chips" role="group" aria-label="${T.ageChipsAria}" data-ref="ageChips"></div>
    <div class="sliders">
      <div class="sl">
        <div class="sl-top"><label class="sl-name" for="${id}-age">${T.ageLabel}</label><span class="sl-val" data-ref="ageV"></span></div>
        <input type="range" id="${id}-age" min="${AGE_MIN}" max="${AGE_MAX}" step="1" data-ref="age">
        <p class="sl-hint">${T.ageHint}</p>
      </div>
    </div>

    <section class="chart" aria-label="${T.chart1Aria}">
      <h3 class="sim-h">${T.chart1H}</h3>
      <svg viewBox="0 0 360 188" role="img" aria-label="${T.chart1Svg}" data-ref="chart1"></svg>
      <div class="legend">
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--dop)" stroke-width="2.4"/></svg>${T.chart1Legend[0]}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--pfc)" stroke-width="2.4"/></svg>${T.chart1Legend[1]}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--lesion)" stroke-width="2.2" stroke-dasharray="5 3"/></svg>${T.chart1Legend[2]}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--pit)" stroke-width="2.2" stroke-dasharray="1.5 3"/></svg>${T.chart1Legend[3]}</span>
        <span><i style="background:var(--dop);opacity:.35;border-radius:2px"></i>${T.chart1Legend[4]}</span>
      </div>
    </section>
  </section>

  <!-- 2. Akranlarla sürüş -->
  <section role="tabpanel" id="${id}-p1" aria-labelledby="${id}-t1" class="panel" data-ref="p1" hidden>
    <div class="stage">
      <svg viewBox="0 0 360 214" role="img" aria-label="${T.sceneAria}" data-ref="scene">
        <rect class="s-road" x="0" y="118" width="360" height="56"/>
        <rect class="s-road" x="236" y="84" width="52" height="130"/>
        <line class="s-dash" x1="0" y1="146" x2="236" y2="146"/>
        <line class="s-dash" x1="288" y1="146" x2="360" y2="146"/>
        <line class="s-stop" x1="226" y1="120" x2="226" y2="172"/>
        <g data-ref="peerFigs"></g>
        <text class="s-note" x="8" y="18" data-ref="peerNote"></text>
        <g class="s-light">
          <line x1="214" y1="64" x2="214" y2="118" class="s-pole"/>
          <rect x="204" y="30" width="20" height="40" rx="5" class="s-box"/>
          <circle data-ref="lampR" cx="214" cy="39" r="5.5"/>
          <circle data-ref="lampY" cx="214" cy="50" r="5.5"/>
          <circle data-ref="lampG" cx="214" cy="61" r="5.5"/>
        </g>
        <text class="s-note" x="232" y="46" data-ref="lightTxt"></text>
        <g data-ref="cross" class="s-cross" transform="translate(262,240)"><rect x="-8" y="-17" width="16" height="34" rx="4"/></g>
        <g data-ref="car" transform="translate(-40,134)">
          <rect class="s-car" x="0" y="0" width="38" height="17" rx="5"/>
          <rect class="s-win" x="20" y="3" width="11" height="8" rx="2"/>
          <circle class="s-wheel" cx="8" cy="17" r="4"/><circle class="s-wheel" cx="30" cy="17" r="4"/>
        </g>
        <g data-ref="burst" class="s-burst" transform="translate(262,146)" opacity="0">
          <path d="M-14,-14 L14,14 M14,-14 L-14,14" />
          <text y="-22" text-anchor="middle">${T.crashWord}</text>
        </g>
        <text class="s-status" x="8" y="203" data-ref="sceneTxt"></text>
      </svg>
      <div class="legend">
        <span><i style="background:var(--red)"></i>${T.sceneLegend[0]}</span>
        <span><i style="background:var(--dop)"></i>${T.sceneLegend[1]}</span>
        <span><i style="background:var(--gld)"></i>${T.sceneLegend[2]}</span>
        <span>${T.sceneLegend[3]}</span>
      </div>
    </div>

    <div class="row" role="group" aria-label="${T.playerAria}">
      <button type="button" class="btn" data-ref="modeAgent" aria-pressed="true">${T.modeAgent}</button>
      <button type="button" class="btn" data-ref="modeUser" aria-pressed="false">${T.modeUser}</button>
    </div>
    <div class="row" data-ref="agentRow">
      <button type="button" class="btn go" data-ref="agent1">${T.agent1}</button>
      <button type="button" class="btn" data-ref="agent50">${T.agent50}</button>
      <button type="button" class="btn" data-ref="reset">${T.reset}</button>
    </div>
    <div class="row" data-ref="userRow" hidden>
      <button type="button" class="btn go" data-ref="uNew">${T.uNew}</button>
      <button type="button" class="btn dec" data-ref="uGo" disabled>${T.uGo}</button>
      <button type="button" class="btn dec" data-ref="uStop" disabled>${T.uStop}</button>
      <button type="button" class="btn" data-ref="uReset">${T.uReset}</button>
    </div>
    <p class="tally" data-ref="tally"></p>

    <section aria-label="${T.inputsH}">
      <h3 class="sim-h">${T.inputsH}</h3>
      <div class="sliders">
        <div class="sl">
          <div class="sl-top"><label class="sl-name" for="${id}-grp">${T.grpLabel}</label><span class="sl-val" data-ref="grpV"></span></div>
          <input type="range" id="${id}-grp" min="0" max="2" step="1" data-ref="grp">
          <p class="sl-hint">${T.grpHint}</p>
        </div>
        <div class="sl sl-amy">
          <div class="sl-top"><label class="sl-name" for="${id}-peers">${T.peersLabel}</label><span class="sl-val" data-ref="peersV"></span></div>
          <input type="range" id="${id}-peers" min="0" max="${MAX_PEERS}" step="1" data-ref="peers">
          <p class="sl-hint">${T.peersHint}</p>
        </div>
        <div class="sl sl-dop">
          <div class="sl-top"><label class="sl-name" for="${id}-rew">${T.rewLabel}</label><span class="sl-val" data-ref="rewV"></span></div>
          <input type="range" id="${id}-rew" min="0" max="100" step="1" data-ref="rew">
          <p class="sl-hint">${T.rewHint}</p>
        </div>
      </div>
    </section>

    <section class="chart" aria-label="${T.chart2Aria}">
      <h3 class="sim-h">${T.chart2H}</h3>
      <svg viewBox="0 0 360 170" role="img" aria-label="${T.chart2Svg}" data-ref="chart2"></svg>
      <div class="legend">
        <span><i style="background:var(--lesion)"></i>${T.chart2Legend[0]}</span>
        <span><i style="background:var(--amy)"></i>${T.chart2Legend[1]}</span>
      </div>
    </section>
    <section class="chart" aria-label="${T.chart3Aria}">
      <h3 class="sim-h">${T.chart3H}</h3>
      <svg viewBox="0 0 360 160" role="img" aria-label="${T.chart3Svg}" data-ref="chart3"></svg>
      <div class="legend">
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--lesion)" stroke-width="2.2" stroke-dasharray="5 3"/></svg>${T.chart3Legend[0]}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--amy)" stroke-width="2.4"/></svg>${T.chart3Legend[1]}</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="var(--pfc)" stroke-width="2.4"/></svg>${T.chart3Legend[2]}</span>
        <span><i style="background:var(--ink)"></i>${T.chart3Legend[3]}</span>
      </div>
    </section>
  </section>

  <!-- 3. Haber güncelleme -->
  <section role="tabpanel" id="${id}-p2" aria-labelledby="${id}-t2" class="panel" data-ref="p2" hidden>
    <div class="contested" role="note">
      ${repBadge('tartışmalı')}
      <p>${T.contestedNote}</p>
    </div>
    <div class="chips" role="group" aria-label="${T.profAria}" data-ref="profChips"></div>

    <div class="card">
      <p class="card-k" data-ref="evK"></p>
      <p class="card-t" data-ref="evT"></p>
      <div class="sl">
        <div class="sl-top"><label class="sl-name" for="${id}-est">${T.estLabel}</label><span class="sl-val" data-ref="estV"></span></div>
        <input type="range" id="${id}-est" min="1" max="99" step="1" data-ref="est">
        <p class="sl-hint">${T.estHint}</p>
      </div>
      <div class="chips" role="group" aria-label="${T.kindAria}" data-ref="kindChips"></div>
      <div class="row">
        <button type="button" class="btn go" data-ref="news">${T.newsBtn}</button>
        <button type="button" class="btn" data-ref="nextEv">${T.nextEv}</button>
      </div>
    </div>

    <div class="card" data-ref="result" hidden>
      <p class="news" data-ref="newsTxt"></p>
      <div class="sl">
        <div class="sl-top"><label class="sl-name" for="${id}-sec">${T.secLabel}</label><span class="sl-val" data-ref="secV"></span></div>
        <input type="range" id="${id}-sec" min="0" max="100" step="1" data-ref="sec">
        <p class="sl-hint">${T.secHint}</p>
      </div>
      <div class="row"><button type="button" class="btn go" data-ref="upd">${T.upd}</button></div>
      <ul class="rows" data-ref="rows"></ul>
    </div>

    <section class="chart" aria-label="${T.chart4Aria}">
      <h3 class="sim-h">${T.chart4H}</h3>
      <svg viewBox="0 0 360 176" role="img" aria-label="${T.chart4Svg}" data-ref="chart4"></svg>
      <div class="legend">
        <span><i style="background:var(--gld)"></i>${T.chart4Legend[0]}</span>
        <span><i style="background:var(--amy)"></i>${T.chart4Legend[1]}</span>
        <span>${T.chart4Legend[2]}</span>
      </div>
    </section>
  </section>

  <details class="how">
    <summary>${t('sim.how')}</summary>
    ${T.how.map((h) => `<p>${h}</p>`).join('')}
  </details>

  <aside class="book" aria-label="${t('sim.book')}">
    <h3 class="sim-h">${t('sim.book')}</h3>
    <ul>
      ${BOOK.map((b, i) => `<li><a href="#/bolum/ch06?deney=${b.id}">${T.book[i].link}</a>: ${T.book[i].body} ${t('repl.badge', { s: b.bold ? `<b>${t(`repl.${b.rep}`)}</b>` : t(`repl.${b.rep}`) })}${T.book[i].tail}</li>`).join('')}
    </ul>
  </aside>

  <p class="foot">${T.foot}</p>
</div>`; };

const BOOK: Array<{ id: string; rep: 'karışık' | 'tartışmalı'; bold?: boolean }> = [
  { id: 'ch06-e6', rep: 'karışık' },
  { id: 'ch06-e5', rep: 'karışık' },
  { id: 'ch06-e4', rep: 'tartışmalı', bold: true },
  { id: 'ch06-e1', rep: 'karışık' },
];

interface Round { phase: 'approach' | 'wait' | 'resolve'; t0: number; risk: number; go: boolean; crash: boolean; points: number; decided: boolean; user: boolean }
interface Tally { n: number; go: number; crash: number; score: number }

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('erg');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const speed = reduce ? 0.3 : 1;

  const S = {
    tab: 0, age: 15,
    group: 'teen' as GroupId, peers: 0, reward: 0.5, mode: 'agent' as 'agent' | 'user',
    rng: mulberry32(11), urng: mulberry32(97),
    tally: { n: 0, go: 0, crash: 0, score: 0 } as Tally, utally: { n: 0, go: 0, crash: 0, score: 0 } as Tally,
    round: null as Round | null, lastMsg: '',
    profile: 'teen' as ProfileId, ev: 0, est: 30, kind: 'auto' as 'auto' | NewsKind, nrng: mulberry32(5),
    news: null as News | null, base: 30, answered: false, trials: [] as Array<{ kind: NewsKind; frac: number }>, last: '',
  };
  let dirty = true;

  // ---------- Sekme gezintisi ----------
  const tabEls = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = [$('p0'), $('p1'), $('p2')];
  function selectTab(i: number, focus = false): void {
    S.tab = i;
    tabEls.forEach((b, k) => { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
    panels.forEach((p, k) => { p.hidden = k !== i; });
    if (focus) tabEls[i].focus();
    dirty = true;
    render();
  }
  tabEls.forEach((b, k) => {
    scope.on(b, 'click', () => selectTab(k));
    scope.on(b, 'keydown', (ev) => {
      const key = (ev as KeyboardEvent).key;
      if (key === 'ArrowRight') { ev.preventDefault(); selectTab((k + 1) % 3, true); }
      else if (key === 'ArrowLeft') { ev.preventDefault(); selectTab((k + 2) % 3, true); }
    });
  });

  // ---------- Çubuk ----------
  const sayEl = $('say');
  const meter = (k: number, label: string, v: number, text: string, color: string) => {
    $(`ml${k}`).textContent = label;
    $(`mv${k}`).textContent = text;
    $(`mb${k}`).style.width = pct(Math.max(0, Math.min(1, v))) + '%';
    $(`mm${k}`).style.setProperty('--c', color);
  };

  // ---------- 1. Olgunlaşma ----------
  const CH = { x0: 30, x1: 350, top: 12, bot: 150 };
  const xOf = (a: number) => CH.x0 + ((a - AGE_MIN) / (AGE_MAX - AGE_MIN)) * (CH.x1 - CH.x0);
  const yOf = (v: number) => CH.bot - (CH.bot - CH.top) * v;
  const chart1 = $<SVGElement>('chart1');
  for (const v of [0, 0.5, 1]) {
    svg('line', { class: 'grid', x1: CH.x0, x2: CH.x1, y1: yOf(v), y2: yOf(v) }, chart1);
    svgText(chart1, { x: CH.x0 - 5, y: yOf(v) + 3.5, 'text-anchor': 'end' }, String(pct(v)));
  }
  for (const a of [5, 10, 15, 20, 25, 30]) svgText(chart1, { x: xOf(a), y: CH.bot + 14, 'text-anchor': 'middle' }, String(a));
  svgText(chart1, { x: (CH.x0 + CH.x1) / 2, y: CH.bot + 28, 'text-anchor': 'middle' }, 'yaş');
  const curvePts = (f: (a: number) => number): string => {
    const pts: string[] = [];
    for (let a = AGE_MIN; a <= AGE_MAX + 1e-9; a += 0.5) pts.push(`${xOf(a).toFixed(1)},${yOf(f(a)).toFixed(1)}`);
    return pts.join(' ');
  };
  {
    const top: string[] = [], bot: string[] = [];
    for (let a = AGE_MIN; a <= AGE_MAX + 1e-9; a += 0.5) {
      if (gap(a) <= 0) break;
      top.push(`${xOf(a).toFixed(1)},${yOf(dopamine(a)).toFixed(1)}`);
      bot.unshift(`${xOf(a).toFixed(1)},${yOf(frontal(a)).toFixed(1)}`);
    }
    svg('polygon', { class: 'gapfill', points: top.concat(bot).join(' ') }, chart1);
    svgText(chart1, { class: 'gaplab', x: xOf(11.5), y: yOf(0.55), 'text-anchor': 'middle' }, 'boşluk');
  }
  svg('line', { class: 'ref', x1: xOf(25), x2: xOf(25), y1: CH.top, y2: CH.bot }, chart1);
  svgText(chart1, { x: xOf(25) - 3, y: CH.bot - 5, 'text-anchor': 'end' }, 'frontal ≈ olgun');
  const lines1 = [
    { f: greyMatter, stroke: 'var(--lesion)', cls: 'ln dash' },
    { f: myelin, stroke: 'var(--pit)', cls: 'ln dot' },
    { f: dopamine, stroke: 'var(--dop)', cls: 'ln' },
    { f: frontal, stroke: 'var(--pfc)', cls: 'ln' },
  ];
  for (const l of lines1) svg('polyline', { class: l.cls, stroke: l.stroke, points: curvePts(l.f) }, chart1);
  const mk1 = svg('line', { class: 'mk1', y1: CH.top, y2: CH.bot, x1: 0, x2: 0 }, chart1);
  const dots1 = lines1.map((l) => svg('circle', { r: 3.5, fill: l.stroke, stroke: 'var(--panel)', 'stroke-width': 1.2, cx: 0, cy: 0 }, chart1));

  // Beyin: gri madde noktaları (budanınca azalır) ve miyelinli bağlantılar.
  const dotsG = $<SVGElement>('dots');
  const NDOT = 40;
  const drng = mulberry32(4);
  const dotEls: SVGElement[] = [];
  while (dotEls.length < NDOT) {
    const x = 60 + drng() * 108, y = 34 + drng() * 140;
    if (((x - 112) / 54) ** 2 + ((y - 104) / 70) ** 2 > 1) continue;
    dotEls.push(svg('circle', { class: 'b-dot', cx: x.toFixed(1), cy: y.toFixed(1), r: 2.3 }, dotsG));
  }
  const fibres = ['M150,98 C170,90 186,100 200,112', 'M140,124 C164,126 182,124 198,124', 'M156,150 C172,144 186,138 202,132'];
  const fibreEls = fibres.map((d) => svg('path', { d }, $('fibres')));

  function drawAge(): void {
    const a = S.age, c = ageCurves(a);
    $('front').setAttribute('fill-opacity', (0.1 + 0.8 * c.frontal).toFixed(2));
    $('limb').setAttribute('fill-opacity', (0.1 + 0.85 * c.dopamine).toFixed(2));
    $('nacc').setAttribute('fill-opacity', (0.15 + 0.85 * c.dopamine).toFixed(2));
    const nVis = Math.round(c.grey * NDOT);
    dotEls.forEach((d, i) => d.setAttribute('opacity', i < nVis ? '0.8' : '0'));
    fibreEls.forEach((p, i) => { p.setAttribute('stroke-width', (0.5 + 3.4 * c.myelin - i * 0.2).toFixed(2)); p.setAttribute('opacity', (0.25 + 0.7 * c.myelin).toFixed(2)); });
    $('fval').textContent = `%${pct(c.frontal)}`;
    $('lval').textContent = `%${pct(c.dopamine)}`;
    mk1.setAttribute('x1', String(xOf(a))); mk1.setAttribute('x2', String(xOf(a)));
    [c.grey, c.myelin, c.dopamine, c.frontal].forEach((v, i) => { dots1[i].setAttribute('cx', String(xOf(a))); dots1[i].setAttribute('cy', yOf(v).toFixed(1)); });
    $('ageV').textContent = `${a} yaş`;
    ($('age') as HTMLInputElement).value = String(a);
    $('age').setAttribute('aria-valuetext', `${a} yaş`);
    Array.from($('ageChips').children).forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.a === String(a))));
    sayEl.textContent = describeAge(a);
    meter(0, 'Dopamin · limbik', c.dopamine, pct(c.dopamine) + '%', 'var(--dop)');
    meter(1, 'Frontal olgunluk', c.frontal, pct(c.frontal) + '%', 'var(--pfc)');
    meter(2, 'Boşluk', c.gap, pct(c.gap) + '%', 'var(--amy)');
  }
  for (const [label, a] of [['Çocuk · 8', 8], ['Ergen · 15', 15], ['Yirmilerin başı · 21', 21], ['Yirmilerin ortası · 25', 25]] as const) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = label; b.dataset.a = String(a); b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => setAge(a));
    $('ageChips').appendChild(b);
  }
  function setAge(a: number): void { S.age = Math.max(AGE_MIN, Math.min(AGE_MAX, Math.round(a))); dirty = true; render(); }
  scope.on($('age'), 'input', () => setAge(Number(($('age') as HTMLInputElement).value)));

  // ---------- 2. Akranlarla sürüş ----------
  const peersG = $<SVGElement>('peerFigs');
  const peerEls: SVGElement[] = [];
  for (let i = 0; i < MAX_PEERS; i++) {
    const g = svg('g', { transform: `translate(${28 + i * 34},64)` }, peersG);
    svg('circle', { class: 's-face', r: 11 }, g);
    svg('circle', { class: 's-eye', cx: -4, cy: -2, r: 1.6 }, g);
    svg('circle', { class: 's-eye', cx: 4, cy: -2, r: 1.6 }, g);
    svg('path', { class: 's-mouth', d: 'M-4,4 Q0,8 4,4' }, g);
    peerEls.push(g);
  }
  const sc = {
    car: $<SVGElement>('car'), cross: $<SVGElement>('cross'), burst: $<SVGElement>('burst'),
    r: $<SVGElement>('lampR'), y: $<SVGElement>('lampY'), g: $<SVGElement>('lampG'),
    lightTxt: $<SVGElement>('lightTxt'), txt: $<SVGElement>('sceneTxt'), note: $<SVGElement>('peerNote'),
  };
  const setLight = (c: 'r' | 'y' | 'g') => {
    sc.r.setAttribute('fill', 'var(--red)'); sc.y.setAttribute('fill', 'var(--dop)'); sc.g.setAttribute('fill', 'var(--gld)');
    sc.r.setAttribute('opacity', c === 'r' ? '1' : '0.22'); sc.y.setAttribute('opacity', c === 'y' ? '1' : '0.22'); sc.g.setAttribute('opacity', c === 'g' ? '1' : '0.22');
    sc.lightTxt.textContent = c === 'r' ? 'KIRMIZI' : c === 'y' ? 'SARI' : 'YEŞİL';
  };
  const carAt = (x: number) => sc.car.setAttribute('transform', `translate(${x.toFixed(1)},134)`);
  const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 2;

  function drawScene(now: number): void {
    const r = S.round;
    peerEls.forEach((g, i) => g.setAttribute('opacity', i < S.peers ? '1' : '0'));
    sc.note.textContent = S.peers ? `${S.peers} akran izliyor` : 'yalnız';
    if (!r) { setLight('g'); carAt(-40); sc.cross.setAttribute('transform', 'translate(262,240)'); sc.burst.setAttribute('opacity', '0'); sc.txt.textContent = S.lastMsg; return; }
    const t = (now - r.t0) / 1000;
    if (r.phase === 'approach') {
      setLight('g'); carAt(lerp(-40, 120, ease(t / (PHASE.approach * speed))));
      sc.cross.setAttribute('transform', 'translate(262,240)'); sc.burst.setAttribute('opacity', '0');
      sc.txt.textContent = 'Araç kavşağa yaklaşıyor...';
    } else if (r.phase === 'wait') {
      setLight('y'); carAt(120);
      sc.txt.textContent = `Sarı: kalan süre ~${remainingFromRisk(r.risk).toFixed(1)} sn, geçersen çarpışma riski %${pct(r.risk)}.`;
    } else {
      const k = Math.min(1, t / (PHASE.resolve * speed));
      if (r.go) {
        setLight(k > 0.3 ? 'r' : 'y');
        if (r.crash) {
          carAt(lerp(120, 222, ease(k * 1.2)));
          sc.cross.setAttribute('transform', `translate(262,${lerp(240, 150, ease(Math.min(1, k * 1.3))).toFixed(1)})`);
          sc.burst.setAttribute('opacity', k > 0.6 ? '1' : '0');
          sc.txt.textContent = k > 0.6 ? `Çarpışma! ${-LOSS} puan.` : 'Geçiyor...';
        } else { carAt(lerp(120, 330, k * k * 0.5 + k * 0.5)); sc.txt.textContent = k > 0.7 ? `Güvenle geçti: +${r.points} puan.` : 'Geçiyor...'; }
      } else { setLight('r'); carAt(lerp(120, 190, ease(k))); sc.txt.textContent = k > 0.5 ? 'Durdu: 0 puan.' : 'Duruyor...'; }
    }
  }

  function startRound(user: boolean, now: number): void {
    if (S.round) return;
    let risk: number, go: boolean, crash: boolean, points: number;
    const p = { age: groupAge(S.group), peers: S.peers, reward: S.reward };
    if (user) { risk = lerp(RISK_MIN, RISK_MAX, S.urng()); go = false; crash = false; points = 0; }
    else ({ risk, go, crash, points } = agentRound(S.rng, p));
    S.round = { phase: 'approach', t0: now, risk, go, crash, points, decided: !user, user };
    S.lastMsg = '';
    syncButtons();
    dirty = true;
  }
  function finishRound(): void {
    const r = S.round!;
    const t = r.user ? S.utally : S.tally;
    t.n++; if (r.go) t.go++; if (r.crash) t.crash++; t.score += r.points;
    S.lastMsg = r.go ? (r.crash ? `Çarpışma! ${-LOSS} puan.` : `Güvenle geçti: +${r.points} puan.`) : 'Durdu: 0 puan.';
    S.round = null;
    syncButtons();
    dirty = true;
    announce();
  }
  function decide(go: boolean): void {
    const r = S.round;
    if (!r || !r.user || r.phase !== 'wait' || r.decided) return;
    r.decided = true; r.go = go;
    r.crash = go && S.urng() < r.risk;
    r.points = go ? (r.crash ? -LOSS : pointsFor(S.reward)) : 0;
    r.phase = 'resolve'; r.t0 = performance.now();
    syncButtons();
  }
  function syncButtons(): void {
    const busy = !!S.round;
    ($('agent1') as HTMLButtonElement).disabled = busy;
    ($('agent50') as HTMLButtonElement).disabled = busy;
    ($('uNew') as HTMLButtonElement).disabled = busy;
    const waiting = !!S.round && S.round.user && S.round.phase === 'wait' && !S.round.decided;
    ($('uGo') as HTMLButtonElement).disabled = !waiting;
    ($('uStop') as HTMLButtonElement).disabled = !waiting;
  }
  function setMode(m: 'agent' | 'user'): void {
    S.mode = m;
    $('modeAgent').setAttribute('aria-pressed', String(m === 'agent'));
    $('modeUser').setAttribute('aria-pressed', String(m === 'user'));
    $('agentRow').hidden = m !== 'agent';
    $('userRow').hidden = m !== 'user';
    dirty = true; render();
  }
  function resetTally(full = false): void {
    S.tally = { n: 0, go: 0, crash: 0, score: 0 };
    if (full) { S.rng = mulberry32(11); S.utally = { n: 0, go: 0, crash: 0, score: 0 }; S.urng = mulberry32(97); S.round = null; S.lastMsg = ''; syncButtons(); }
  }
  scope.on($('modeAgent'), 'click', () => setMode('agent'));
  scope.on($('modeUser'), 'click', () => setMode('user'));
  scope.on($('agent1'), 'click', () => startRound(false, performance.now()));
  scope.on($('agent50'), 'click', () => {
    if (S.round) return;
    const p = { age: groupAge(S.group), peers: S.peers, reward: S.reward };
    for (let i = 0; i < 50; i++) { const r = agentRound(S.rng, p); S.tally.n++; if (r.go) S.tally.go++; if (r.crash) S.tally.crash++; S.tally.score += r.points; }
    S.lastMsg = '50 tur çalıştırıldı.';
    dirty = true; render(); announce();
  });
  scope.on($('reset'), 'click', () => { resetTally(true); dirty = true; render(); });
  scope.on($('uNew'), 'click', () => startRound(true, performance.now()));
  scope.on($('uGo'), 'click', () => decide(true));
  scope.on($('uStop'), 'click', () => decide(false));
  scope.on($('uReset'), 'click', () => { resetTally(true); dirty = true; render(); });

  const groupIdx = () => GROUPS.findIndex((g) => g.id === S.group);
  const syncSliders2 = () => {
    ($('grp') as HTMLInputElement).value = String(groupIdx());
    ($('peers') as HTMLInputElement).value = String(S.peers);
    ($('rew') as HTMLInputElement).value = String(Math.round(S.reward * 100));
    const gName = GROUPS[groupIdx()].name;
    $('grpV').textContent = gName; $('grp').setAttribute('aria-valuetext', gName);
    $('peersV').textContent = S.peers === 0 ? 'yalnız' : `${S.peers} akran`; $('peers').setAttribute('aria-valuetext', $('peersV').textContent);
    const rl = S.reward < 0.25 ? 'küçük' : S.reward > 0.75 ? 'büyük' : 'orta';
    $('rewV').textContent = `${rl} (+${pointsFor(S.reward)} puan)`; $('rew').setAttribute('aria-valuetext', $('rewV').textContent);
  };
  const configChanged = () => { resetTally(); S.lastMsg = ''; dirty = true; render(); };
  scope.on($('grp'), 'input', () => { S.group = GROUPS[Number(($('grp') as HTMLInputElement).value)].id; configChanged(); });
  scope.on($('peers'), 'input', () => { S.peers = Number(($('peers') as HTMLInputElement).value); configChanged(); });
  scope.on($('rew'), 'input', () => { S.reward = Number(($('rew') as HTMLInputElement).value) / 100; configChanged(); });

  const chart2 = $<SVGElement>('chart2');
  const chart3 = $<SVGElement>('chart3');
  const C2 = { x0: 30, x1: 350, top: 14, bot: 126 };
  const y2 = (v: number) => C2.bot - (C2.bot - C2.top) * v;
  const bars2: Array<{ alone: SVGElement; peer: SVGElement; va: SVGElement; vp: SVGElement; lab: SVGElement }> = [];
  for (const v of [0, 0.5, 1]) {
    svg('line', { class: 'grid', x1: C2.x0, x2: C2.x1, y1: y2(v), y2: y2(v) }, chart2);
    svgText(chart2, { x: C2.x0 - 5, y: y2(v) + 3.5, 'text-anchor': 'end' }, String(pct(v)));
  }
  GROUPS.forEach((g, i) => {
    const cx = C2.x0 + ((i + 0.5) / 3) * (C2.x1 - C2.x0);
    bars2.push({
      alone: svg('rect', { class: 'bar-a', x: cx - 26, width: 24 }, chart2),
      peer: svg('rect', { class: 'bar-p', x: cx + 2, width: 24 }, chart2),
      va: svgText(chart2, { x: cx - 14, 'text-anchor': 'middle' }, ''),
      vp: svgText(chart2, { x: cx + 14, 'text-anchor': 'middle' }, ''),
      lab: svgText(chart2, { class: 'glab', x: cx, y: C2.bot + 15, 'text-anchor': 'middle' }, g.name),
    });
  });
  svgText(chart2, { x: (C2.x0 + C2.x1) / 2, y: C2.bot + 30, 'text-anchor': 'middle' }, '');
  const note2 = chart2.lastChild as SVGElement;

  const C3 = { x0: 30, x1: 350, top: 14, bot: 124 };
  const x3 = (r: number) => C3.x0 + 20 + r * (C3.x1 - C3.x0 - 40);
  const y3 = (v: number) => C3.bot - (C3.bot - C3.top) * v;
  for (const v of [0, 0.5, 1]) {
    svg('line', { class: 'grid', x1: C3.x0, x2: C3.x1, y1: y3(v), y2: y3(v) }, chart3);
    svgText(chart3, { x: C3.x0 - 5, y: y3(v) + 3.5, 'text-anchor': 'end' }, String(pct(v)));
  }
  [['küçük', 0], ['orta', 0.5], ['büyük', 1]].forEach(([l, r]) => svgText(chart3, { x: x3(r as number), y: C3.bot + 14, 'text-anchor': 'middle' }, l as string));
  svgText(chart3, { x: (C3.x0 + C3.x1) / 2, y: C3.bot + 28, 'text-anchor': 'middle' }, 'ödül büyüklüğü');
  const accLine = (age: number, stroke: string, cls: string) => {
    const pts = [0, 0.25, 0.5, 0.75, 1].map((r) => `${x3(r).toFixed(1)},${y3(accumbens(age, r)).toFixed(1)}`).join(' ');
    svg('polyline', { class: cls, stroke, points: pts }, chart3);
  };
  accLine(8, 'var(--lesion)', 'ln dash'); accLine(15, 'var(--amy)', 'ln'); accLine(25, 'var(--pfc)', 'ln');
  const accDot = svg('circle', { r: 5, class: 'accdot', cx: 0, cy: 0 }, chart3);

  function drawDrive(): void {
    syncSliders2();
    const gi = groupIdx();
    const age = groupAge(S.group);
    const p = { age, peers: S.peers, reward: S.reward };
    GROUPS.forEach((g, i) => {
      const a = riskRate({ age: g.age, peers: 0, reward: S.reward });
      const b = riskRate({ age: g.age, peers: S.peers, reward: S.reward });
      const o = bars2[i];
      o.alone.setAttribute('y', y2(a).toFixed(1)); o.alone.setAttribute('height', (C2.bot - y2(a)).toFixed(1));
      o.peer.setAttribute('y', y2(b).toFixed(1)); o.peer.setAttribute('height', (C2.bot - y2(b)).toFixed(1));
      o.peer.setAttribute('opacity', S.peers ? '1' : '0.25');
      o.va.setAttribute('y', (y2(a) - 4).toFixed(1)); o.va.textContent = pct(a) + '%';
      o.vp.setAttribute('y', (y2(b) - 4).toFixed(1)); o.vp.textContent = S.peers ? pct(b) + '%' : '';
      o.lab.classList.toggle('sel', i === gi);
    });
    note2.textContent = S.peers ? '' : 'Akran sayısı 0: akranlarla çubuğu için kaydırıcıyı artır.';
    accDot.setAttribute('cx', x3(S.reward).toFixed(1)); accDot.setAttribute('cy', y3(accumbens(age, S.reward)).toFixed(1));
    const t = S.mode === 'agent' ? S.tally : S.utally;
    const who = S.mode === 'agent' ? 'Ajan' : 'Sen';
    const exp = riskRate(p);
    $('tally').textContent = t.n
      ? `${who}: ${t.n} tur, ${t.go} kez geçti (%${pct(t.go / t.n)}), ${t.crash} çarpışma, toplam ${t.score} puan.` + (S.mode === 'agent' ? ` Modelin beklentisi %${pct(exp)}.` : ` Aynı ayarda ${GROUPS[gi].name.toLowerCase()} ajanın beklentisi %${pct(exp)}. Akran ve yaş grubu yalnızca ajanı etkiler; sen oynarken akranlar seyirci olarak görünür.`)
      : (S.mode === 'agent' ? 'Henüz tur yok. Ajan 1 tur ya da 50 tur çalıştır; ayar değişince sayım sıfırlanır.' : 'Henüz tur yok. Yeni tur başlat, sarıda Geç ya da Dur seç.');
    const rs = rewardSignal(p), ct = control(p);
    sayEl.textContent = describeDrive(S.group, S.peers, S.reward);
    meter(0, 'Risk alma oranı', exp, pct(exp) + '%', 'var(--amy)');
    meter(1, 'Ödül sinyali · accumbens', rs / 2.2, pct(rs / 2.2) + '%', 'var(--dop)');
    meter(2, 'Frontal denetim', ct, pct(ct) + '%', 'var(--pfc)');
  }

  // ---------- 3. Haber güncelleme ----------
  const profChips = $('profChips'), kindChips = $('kindChips');
  for (const pr of PROFILES) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = pr.name; b.dataset.p = pr.id; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => setProfile(pr.id));
    profChips.appendChild(b);
  }
  for (const [k, label] of [['auto', 'Haber: olayın kendi olasılığı'], ['good', 'İyi haber'], ['bad', 'Kötü haber']] as const) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.textContent = label; b.dataset.k = k; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => { S.kind = k; dirty = true; render(); });
    kindChips.appendChild(b);
  }
  function setProfile(p: ProfileId): void { S.profile = p; dirty = true; render(); }
  scope.on($('est'), 'input', () => { S.est = Number(($('est') as HTMLInputElement).value); if (!S.answered) S.news = null; dirty = true; render(); });
  scope.on($('sec'), 'input', () => { $('secV').textContent = ($('sec') as HTMLInputElement).value + '%'; });
  scope.on($('nextEv'), 'click', () => { S.ev = (S.ev + 1) % EVENTS.length; S.news = null; S.answered = false; dirty = true; render(); });

  function giveNews(): void {
    const ev = EVENTS[S.ev];
    const actual = S.kind === 'auto' ? ev.actual : forcedActual(S.est, S.kind, S.nrng);
    const n = newsFor(S.est, actual);
    S.base = S.est;
    S.news = n;
    S.answered = false;
    S.last = n ? '' : 'Tahmin gerçeğe çok yakın: bu olayda haber yok. Başka olay seç ya da tahmini değiştir.';
    const sec = S.news ? Math.round(S.est) : S.est;
    ($('sec') as HTMLInputElement).value = String(sec);
    dirty = true; render();
    announce();
  }
  scope.on($('news'), 'click', giveNews);
  scope.on($('upd'), 'click', () => {
    if (!S.news) return;
    const second = Number(($('sec') as HTMLInputElement).value);
    S.trials.push({ kind: S.news.kind, frac: updateFraction(S.base, second, S.news) });
    S.answered = true; dirty = true; render(); announce();
  });

  const chart4 = $<SVGElement>('chart4');
  const C4 = { x0: 30, x1: 350, top: 14, bot: 126 };
  const y4 = (v: number) => C4.bot - (C4.bot - C4.top) * v;
  for (const v of [0, 0.5, 1]) {
    svg('line', { class: 'grid', x1: C4.x0, x2: C4.x1, y1: y4(v), y2: y4(v) }, chart4);
    svgText(chart4, { x: C4.x0 - 5, y: y4(v) + 3.5, 'text-anchor': 'end' }, String(pct(v)));
  }
  const clusters = [...PROFILES.map((p) => p.name), 'Sen'];
  const bars4 = clusters.map((name, i) => {
    const cx = C4.x0 + ((i + 0.5) / clusters.length) * (C4.x1 - C4.x0);
    const mk = (dx: number, cls: string) => svg('rect', { class: cls, x: cx + dx, width: 16 }, chart4);
    const tx = (dx: number) => svgText(chart4, { x: cx + dx + 8, 'text-anchor': 'middle' }, '');
    const label = svgText(chart4, { class: 'glab', x: cx, y: C4.bot + 14, 'text-anchor': 'middle' }, name.replace(/ \(.*\)/, ''));
    const sub = svgText(chart4, { class: 'glab sm', x: cx, y: C4.bot + 26, 'text-anchor': 'middle' }, (name.match(/\((\d+)\)/) ?? [])[1] ? (name.match(/\((\d+)\)/) as RegExpMatchArray)[1] + ' yaş' : '');
    void label; void sub;
    return { g: mk(-18, 'bar-g'), b: mk(2, 'bar-b'), tg: tx(-18), tb: tx(2) };
  });
  const fix = (o: (typeof bars4)[number], g: number | null, b: number | null) => {
    for (const [bar, tx, v] of [[o.g, o.tg, g], [o.b, o.tb, b]] as const) {
      const val = v === null ? 0 : Math.max(0, Math.min(1, v));
      bar.setAttribute('y', y4(val).toFixed(1)); bar.setAttribute('height', (C4.bot - y4(val)).toFixed(1));
      bar.setAttribute('opacity', v === null ? '0' : '1');
      tx.setAttribute('y', (y4(val) - 4).toFixed(1)); tx.textContent = v === null ? '' : String(pct(v));
    }
  };

  function drawNews(): void {
    const pr = PROFILES.find((p) => p.id === S.profile)!;
    Array.from(profChips.children).forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.p === S.profile)));
    Array.from(kindChips.children).forEach((b) => b.setAttribute('aria-pressed', String((b as HTMLElement).dataset.k === S.kind)));
    const ev = EVENTS[S.ev];
    $('evK').textContent = `Olay ${S.ev + 1} / ${EVENTS.length}`;
    $('evT').textContent = ev.name;
    ($('est') as HTMLInputElement).value = String(S.est);
    $('estV').textContent = S.est + '%'; $('est').setAttribute('aria-valuetext', S.est + '%');
    const res = $('result');
    res.hidden = !S.news && !S.last;
    if (S.news) {
      const n = S.news;
      $('newsTxt').innerHTML = n.kind === 'good'
        ? `<b class="k-good">İyi haber:</b> gerçek olasılık %${n.actual}, düşündüğünden ${n.gap} puan düşük.`
        : `<b class="k-bad">Kötü haber:</b> gerçek olasılık %${n.actual}, düşündüğünden ${n.gap} puan yüksek.`;
      ($('sec').closest('.sl') as HTMLElement).hidden = false;
      $('upd').parentElement!.hidden = false;
      $('secV').textContent = ($('sec') as HTMLInputElement).value + '%';
      const li = PROFILES.map((p) => {
        const e = updatedEstimate(p.age, S.base, n);
        const d = e - S.base;
        return `<li${p.id === S.profile ? ' class="sel"' : ''}><span>${p.name}</span><span class="v">${Math.round(S.base)}% → ${Math.round(e)}% (${d >= 0 ? '+' : '−'}${Math.abs(Math.round(d))})</span></li>`;
      });
      if (S.answered) {
        const sec = Number(($('sec') as HTMLInputElement).value);
        li.push(`<li class="me"><span>Sen</span><span class="v">${Math.round(S.base)}% → ${sec}% (${sec - S.base >= 0 ? '+' : '−'}${Math.abs(Math.round(sec - S.base))})</span></li>`);
      }
      $('rows').innerHTML = li.join('');
    } else {
      $('newsTxt').textContent = S.last;
      ($('sec').closest('.sl') as HTMLElement).hidden = true;
      $('upd').parentElement!.hidden = true;
      $('rows').innerHTML = '';
    }
    PROFILES.forEach((p, i) => fix(bars4[i], goodRate(p.age), badRate(p.age)));
    const mine = (k: NewsKind) => { const f = S.trials.filter((t) => t.kind === k); return f.length ? Math.max(0, f.reduce((s, t) => s + t.frac, 0) / f.length) : null; };
    fix(bars4[4], mine('good'), mine('bad'));
    sayEl.textContent = describeNews(S.profile);
    const g = goodRate(pr.age), b = badRate(pr.age);
    meter(0, 'İyi haber güncellemesi', g, pct(g) + '%', 'var(--gld)');
    meter(1, 'Kötü haber güncellemesi', b, pct(b) + '%', 'var(--amy)');
    meter(2, 'Asimetri (puan)', asymmetry(pr.age), pct(asymmetry(pr.age)) + '', 'var(--eff)');
  }

  // ---------- Çizim ve döngü ----------
  function render(): void {
    if (S.tab === 0) drawAge(); else if (S.tab === 1) drawDrive(); else drawNews();
  }
  const announce = scope.announcer($('live'), () => (S.tab === 1 ? `${sayEl.textContent} ${S.lastMsg} ${$('tally').textContent}` : S.tab === 2 ? `${sayEl.textContent} ${$('newsTxt').textContent}` : sayEl.textContent ?? ''), 600);
  scope.on(root, 'click', () => announce());
  scope.on(root, 'input', () => announce());

  function frame(now: number): void {
    const r = S.round;
    if (r) {
      const t = (now - r.t0) / 1000;
      if (r.phase === 'approach' && t >= PHASE.approach * speed) { r.phase = 'wait'; r.t0 = now; syncButtons(); }
      else if (r.phase === 'wait' && !r.user && t >= PHASE.wait * speed) { r.phase = 'resolve'; r.t0 = now; }
      else if (r.phase === 'resolve' && t >= PHASE.resolve * speed) { drawScene(now); finishRound(); }
      if (S.round && S.tab === 1) drawScene(now);
      if (S.round) return;
    }
    if (!dirty) return;
    dirty = false;
    render();
    if (S.tab === 1) drawScene(now);
  }

  // ---------- Rehberli tur ----------
  let tour: Tour;
  const steps = [
    { title: 'Çocuk beyni', text: '8 yaşında hem ödül sistemi hem frontal korteks düşük düzeyde. İkisi de gelişmeye başlıyor.', look: 'Beyin silüetinin soluk renkleri ve çizelgedeki iki eğrinin düşük başlangıcı.',
      apply: () => { selectTab(0); setAge(8); } },
    { title: 'Ergenlikte boşluk', text: '15 yaşında dopamin sistemi tepe yapar, frontal korteks ise henüz yarı yolda. Gaz pedalı hazır, fren eksik: bu bir kusur değil, bir zamanlama farkı.', look: 'Çizelgede amber eğri ile mavi eğri arasındaki gölgeli boşluk.',
      apply: () => { selectTab(0); setAge(15); } },
    { title: 'Yirmilerin ortası', text: 'Frontal korteks en son olgunlaşır: 25 yaşında neredeyse tamamlanmıştır. Gri madde budanmış, miyelinli bağlantılar sağlamlaşmıştır, boşluk kapanmıştır.', look: 'Boşluğun sıfıra inmesi ve mor miyelin çizgilerinin kalınlaşması.',
      apply: () => { selectTab(0); setAge(25); } },
    { title: 'Yalnızken fark yok', text: 'Sarı ışık oyununda ergen, genç yetişkin ve yetişkin tek başına benzer sıklıkta geçer. Ergenin soğukkanlı muhakemesi yetişkininkine yakındır.', look: 'Üç grubun gri çubuklarının neredeyse aynı yüksekliği.',
      apply: () => { selectTab(1); setMode('agent'); S.group = 'teen'; S.peers = 0; S.reward = 0.5; configChanged(); } },
    { title: 'Akranlar izleyince', text: 'İki akran izlediğinde ergenin sarıda geçme oranı yaklaşık üç katına çıkar; yetişkinde neredeyse hiç değişmez. Modelde akranlar ergenin ödül sinyalini artırır, frontal denetimi azaltır.', look: 'Ergenin kırmızı çubuğu ile yetişkinin kırmızı çubuğu; ödül sinyali göstergesi.',
      apply: () => { selectTab(1); setMode('agent'); S.group = 'teen'; S.peers = 2; S.reward = 0.5; configChanged(); } },
    { title: 'Büyük ödül', text: 'Galvan örüntüsü: büyük ödülde ergenin accumbens tepkisi yetişkininkinin çok üstüne çıkar, küçük ödülde ise düşer. Ödül kaydırıcısını oynat; oyunu kendin de oynayabilirsin.', look: 'Accumbens grafiğinde seçili nokta; ödül büyüdükçe ergen eğrisinin yükselişi.',
      apply: () => { selectTab(1); S.group = 'teen'; S.peers = 0; S.reward = 1; configChanged(); } },
    { title: 'Kötü haber ve tartışma', text: 'Ergen profili iyi haberle tahminini günceller, kötü haberle neredeyse hiç. Ama bu bulgunun replikasyonu tartışmalı: asimetrinin istatistiksel bir yapaylık olabileceği öne sürüldü.', look: 'Ergen kümesinde yeşil ve kırmızı çubuk farkı; üstteki "tartışmalı" notu.',
      apply: () => { selectTab(2); S.profile = 'teen'; S.ev = 0; S.est = 25; S.kind = 'bad'; S.nrng = mulberry32(5); giveNews(); } },
  ];
  tour = createTour(scope, steps);
  $('tourHost').appendChild(tour.el);

  // Başlangıç
  syncButtons();
  render();
  drawScene(performance.now());
  scope.loop(frame, { root, onResume: () => { dirty = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}

