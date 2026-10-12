// Sekme 2: Biz/Onlar kaydırıcısı. Merkezdeki kişi için kimin "biz" sayıldığı ayarlarla yeniden çizilir.
import { mulberry32 } from '../rng';
import { createTour } from '../tour';
import { chipRow, makeSlider, pc, type Ctx, type Meter, type Panel } from '../ui';
import { BIZ_DEFAULT, N_PEOPLE, VIEW_H, VIEW_W, bizView, describeBiz, makePeople, timeline, type BizInputs, type BizView } from './model';

const TIER_WORD = { biz: 'biz', ara: 'arada', onlar: 'onlar', ego: 'merkez' } as const;
const SVGNS = 'http://www.w3.org/2000/svg';
const node = (tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement => {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  parent?.appendChild(e);
  return e as SVGElement;
};

const PRESETS: Array<{ key: string; label: string; set: Partial<BizInputs> }> = [
  { key: 'base', label: 'Başlangıç', set: { ...BIZ_DEFAULT } },
  { key: 'label', label: 'Ortak etiket', set: { ...BIZ_DEFAULT, label: 1 } },
  { key: 'goal', label: 'Ortak hedef', set: { ...BIZ_DEFAULT, goal: 1 } },
  { key: 'contact', label: 'Temas + hedef', set: { ...BIZ_DEFAULT, contact: 0.8, goal: 0.5 } },
  { key: 'threat', label: 'Tehdit', set: { ...BIZ_DEFAULT, threat: 1 } },
];

export function createBizPanel(ctx: Ctx, host: HTMLElement) {
  const inp: BizInputs = { ...BIZ_DEFAULT };
  const people = makePeople(mulberry32(11));
  let ego = 0;
  let view: BizView = bizView(people, ego, inp);
  let dirty = true, playing = false, last = 0;
  const hid = `${ctx.id}-h`;

  host.innerHTML =
    '<div data-ref="tour"></div>' +
    '<div class="chips" data-ref="presets"></div>' +
    '<section class="card" aria-label="Kişiler ağı">' +
    '<h3 class="sim-h">Kimin "biz" olduğu: merkezdeki kişiye göre</h3>' +
    '<div class="chips" data-ref="egos"></div>' +
    '<div class="stage"><svg viewBox="0 0 ' + VIEW_W + ' ' + VIEW_H + '" role="group" aria-label="24 kişi: iki ilk grup ve iki ortak etiket. Merkezdeki kişi seçilir; halkalı olanlar biz sayılır." data-ref="net"></svg>' +
    '<div class="legend" data-ref="lg"></div></div>' +
    '<p class="note">Merkezdeki kişiyi değiştirmek için bir kişiye dokun ya da yukarıdaki düğmeleri kullan.</p>' +
    '</section>' +
    '<section class="card" aria-label="Girdiler"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="sl"></div>' +
    '<div class="row"><button type="button" class="btn tour-next" data-ref="play">Zamanı oynat</button></div></section>' +
    '<section class="card" aria-label="Zaman çizelgesi"><h3 class="sim-h">Zaman çizelgesi: kim "biz" sayılıyor?</h3>' +
    '<div class="chart"><svg viewBox="0 0 360 168" role="img" aria-label="" data-ref="tl"></svg>' +
    '<div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h24" stroke="var(--pfc)" stroke-width="2.6"/></svg>eski grubundan biz sayılan</span>' +
    '<span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h24" stroke="var(--dop)" stroke-width="2.6" stroke-dasharray="5 3"/></svg>eski dış gruptan biz sayılan</span></div></div>' +
    '<p class="note" data-ref="tlNote"></p></section>' +
    '<div class="notes" data-notes="biz"></div>';

  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const net = q<SVGSVGElement>('net'), tl = q<SVGSVGElement>('tl');

  /* ---- Lejant ---- */
  const icon = (inner: string): string => `<svg viewBox="0 0 26 22" aria-hidden="true">${inner}</svg>`;
  const hatch = (id: string): string => `<defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--dop)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--panel)" stroke-width="1.8"/></pattern></defs>`;
  q('lg').innerHTML =
    `<span>${icon('<rect x="6" y="3" width="14" height="14" fill="var(--muted)"/>')}kare: ilk grup 1</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="var(--muted)"/>')}daire: ilk grup 2</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="var(--pfc)"/>')}mavi: ortak etiket 1</span>` +
    `<span>${icon(hatch(`${hid}-l`) + `<circle cx="13" cy="10" r="8" fill="url(#${hid}-l)"/>`)}taralı: ortak etiket 2</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="none" stroke="var(--ink)" stroke-width="2.6"/>')}düz halka: biz</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="none" stroke="var(--edge)" stroke-width="2" stroke-dasharray="3 3"/>')}kesikli: arada</span>` +
    `<span>${icon('<circle cx="13" cy="10" r="8" fill="var(--muted)" fill-opacity=".4"/>')}soluk: onlar</span>`;

  /* ---- Ağ ---- */
  net.insertAdjacentHTML('afterbegin', hatch(hid));
  node('text', { class: 'gl', x: 70, y: 12, 'text-anchor': 'middle' }, net).textContent = 'İlk grup 1 (kareler)';
  node('text', { class: 'gl', x: 290, y: 12, 'text-anchor': 'middle' }, net).textContent = 'İlk grup 2 (daireler)';
  const lines = people.map(() => node('line', { class: 'tie', x1: 0, y1: 0, x2: 0, y2: 0, visibility: 'hidden' }, net));
  const gs = people.map((p) => {
    const g = node('g', { class: 'pp', tabindex: 0, role: 'button', transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})` }, net);
    node('circle', { class: 'ring', r: 17, fill: 'none' }, g);
    node('circle', { class: 'ring2', r: 22, fill: 'none' }, g);
    const fill = p.c === 0 ? 'var(--pfc)' : `url(#${hid})`;
    if (p.g === 0) node('rect', { class: 'sh', x: -9, y: -9, width: 18, height: 18, fill, stroke: 'var(--ink)', 'stroke-width': 1 }, g);
    else node('circle', { class: 'sh', r: 10, fill, stroke: 'var(--ink)', 'stroke-width': 1 }, g);
    node('text', { class: 'tag', x: 0, y: 32, 'text-anchor': 'middle' }, g).textContent = '';
    ctx.scope.on(g, 'click', () => pick(p.id));
    ctx.scope.on(g as unknown as HTMLElement, 'keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(p.id); } });
    return g;
  });
  function pick(i: number): void { ego = i; dirty = true; ctx.touch(); setEgo(i === 0 ? 'e0' : i === N_PEOPLE / 2 ? 'e1' : null); }
  const setEgo = chipRow(q('egos'), ctx, [{ key: 'e0', label: 'Kare grubundan bak' }, { key: 'e1', label: 'Daire grubundan bak' }], (k) => { ego = k === 'e0' ? 0 : N_PEOPLE / 2; dirty = true; setEgo(k); }, 'Merkezdeki kişi');
  setEgo('e0');

  /* ---- Girdiler ---- */
  const sl: Record<string, ReturnType<typeof makeSlider>> = {};
  const sld = (key: keyof BizInputs, name: string, hint: string, color: string, fmt: (v: number) => string = (v) => pc(v / 100)) =>
    (sl[key] = makeSlider(ctx, q('sl'), key, name, hint, 0, 100, Math.round(inp[key] * 100), (v) => { inp[key] = v / 100; dirty = true; setPre(null); }, fmt, color));
  const setPre = chipRow(q('presets'), ctx, PRESETS.map((p) => ({ key: p.key, label: p.label })), (k) => { set(PRESETS.find((p) => p.key === k)!.set); setPre(k); }, 'Hazır durumlar');
  setPre('base');
  sld('goal', 'Ortak hedef', 'İki grubun birlikte ulaşması gereken bir amaç.', 'var(--gld)');
  sld('label', 'Yeni ortak etiket', 'Gruplar arasını kesen bir etiket (ör. aynı forma rengi) öne çıkıyor.', 'var(--pfc)');
  sld('contact', 'Temas', 'Gruplar arası gerçek karşılaşma; ortak hedef varsa daha iyi işler.', 'var(--pit)');
  sld('threat', 'Tehdit', 'Ortamdaki baskı: sınırı sertleştirir, öteki etkileri azaltır.', 'var(--amy)');
  sld('time', 'Geçen süre', 'Hedef, etiket ve temas hemen değil, zamanla oturur.', 'var(--ink)', (v) => (v < 15 ? 'ilk günler' : v < 45 ? 'haftalar' : v < 85 ? 'aylar' : 'yıllar'));

  function set(p: Partial<BizInputs>): void {
    Object.assign(inp, p);
    (Object.keys(sl) as Array<keyof BizInputs>).forEach((k) => sl[k].set(Math.round(inp[k] * 100)));
    dirty = true;
  }
  ctx.scope.on(q('play'), 'click', () => {
    if (!playing && inp.time >= 0.99) set({ time: 0 });
    playing = !playing; last = 0; q('play').textContent = playing ? 'Duraklat' : 'Zamanı oynat'; ctx.touch();
  });

  /* ---- Çizim ---- */
  function renderNet(): void {
    const e = people[ego];
    people.forEach((p, i) => {
      const t = view.tiers[i], g = gs[i];
      g.setAttribute('class', `pp t-${t}`);
      g.setAttribute('aria-label', `Kişi ${i + 1}: ${p.g ? 'daire' : 'kare'}, ${p.c ? 'taralı' : 'mavi'} etiket, ${TIER_WORD[t]}`);
      g.setAttribute('aria-pressed', String(t === 'ego'));
      g.querySelector('.tag')!.textContent = t === 'ego' ? 'merkez' : '';
      const ln = lines[i];
      if (t === 'biz') { ln.setAttribute('x1', String(e.x)); ln.setAttribute('y1', String(e.y)); ln.setAttribute('x2', String(p.x)); ln.setAttribute('y2', String(p.y)); ln.setAttribute('visibility', 'visible'); }
      else ln.setAttribute('visibility', 'hidden');
    });
  }
  const TX0 = 34, TW = 312, TY = 124, TH = 96, TMAX = 12;
  function renderTl(): void {
    const tx = (t: number) => TX0 + t * TW, ty = (n: number) => TY - (n / TMAX) * TH;
    const data = timeline(people, ego, inp);
    let s = '';
    for (const n of [0, 6, 12]) s += `<line class="grid" x1="${TX0}" y1="${ty(n)}" x2="${TX0 + TW}" y2="${ty(n)}"/><text class="ax" x="${TX0 - 6}" y="${ty(n) + 3.5}" text-anchor="end">${n}</text>`;
    for (const t of [0, 0.5, 1]) s += `<text class="ax" x="${tx(t)}" y="${TY + 14}" text-anchor="${t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}">${t === 0 ? 'başlangıç' : t === 1 ? 'uzun süre' : 'orta'}</text>`;
    const path = (f: (d: (typeof data)[number]) => number) => data.map((d, k) => `${k ? 'L' : 'M'}${tx(d.t).toFixed(1)} ${ty(f(d)).toFixed(1)}`).join('');
    s += `<path d="${path((d) => d.old)}" fill="none" stroke="var(--pfc)" stroke-width="2.6" stroke-linejoin="round"/>`;
    s += `<path d="${path((d) => d.neu)}" fill="none" stroke="var(--dop)" stroke-width="2.6" stroke-dasharray="5 3" stroke-linejoin="round"/>`;
    s += `<line x1="${tx(inp.time)}" y1="${TY - TH - 2}" x2="${tx(inp.time)}" y2="${TY}" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="2 3"/>`;
    s += `<circle cx="${tx(inp.time)}" cy="${ty(view.bizOld)}" r="4.5" fill="var(--pfc)" stroke="var(--ink)" stroke-width="1.4"/><circle cx="${tx(inp.time)}" cy="${ty(view.bizNew)}" r="4.5" fill="var(--dop)" stroke="var(--ink)" stroke-width="1.4"/>`;
    s += `<text class="ax" x="10" y="${TY - TH / 2}" text-anchor="middle" transform="rotate(-90 10 ${TY - TH / 2})">biz sayılan kişi</text>`;
    s += `<text class="ax" x="${TX0 + TW / 2}" y="${TY + 30}" text-anchor="middle">geçen süre</text>`;
    tl.innerHTML = s;
    const end = data[data.length - 1];
    tl.setAttribute('aria-label', `Geçen süreye göre biz sayılanlar: başlangıçta eski grubundan ${data[0].old}, eski dış gruptan ${data[0].neu}; uzun sürede ${end.old} ve ${end.neu}.`);
    q('tlNote').textContent = `Şu an (dikey çizgi): eski grubundan ${view.bizOld} / ${view.nIn}, eski dış gruptan ${view.bizNew} / ${view.nOut} kişi "biz".`;
  }

  /* ---- Rehberli tur ---- */
  const tour = createTour(ctx.scope, [
    {
      title: 'Etiket sınırı çizer',
      text: 'Merkezdeki kişi için "biz", kendi ilk grubudur; öbür grup "onlar". Kitaba göre anlamsız bir ölçüt bile içgrup kayırmacılığı doğurur (minimal grup deneyleri).',
      look: 'Düz halkalı kişiler yalnızca merkezle aynı şekilde olanlar.',
      apply: () => { set({ ...BIZ_DEFAULT }); setPre('base'); },
    },
    {
      title: 'Yeni bir ortak etiket',
      text: 'İki grubu kesen bir etiket (aynı forma rengi) öne çıkınca ırk benzeri kategoriler solar. Kitaptaki gömlek rengi deneyinde karıştırmalar böyle kaydı. Sınır silinmez, yeniden çizilir.',
      look: 'Mavi (ya da taralı) kişilerin halkası iki gruptan da geliyor.',
      apply: () => { set({ ...BIZ_DEFAULT, label: 1 }); setPre('label'); },
    },
    {
      title: 'Ortak hedef sınırı yumuşatır',
      text: 'Birlikte ulaşılması gereken bir hedef, karşı gruptakileri "onlar"dan "arada"ya taşır. Tek başına tam bir "biz" yapmaz.',
      look: 'Kesikli halkalar ve çizelgede yükselen kesikli çizgi.',
      apply: () => { set({ ...BIZ_DEFAULT, goal: 1 }); setPre('goal'); },
    },
    {
      title: 'Temas, koşullar uygunsa',
      text: 'Gruplar arası temas ancak ortak hedef gibi uygun koşullarla işe yarar ve zaman ister. Kitapta temasın yararı ve koşulları var; çalışmaların toplam sonucu "karışık".',
      look: 'Zaman çizelgesinde yükselişin başlangıçta değil, süre geçince gelmesi.',
      apply: () => { set({ ...BIZ_DEFAULT, contact: 0.8, goal: 0.5, time: 0.9 }); setPre('contact'); },
    },
    {
      title: 'Tehdit işleri bozar',
      text: 'Aynı iyi koşullar (ortak hedef, etiket, temas) ama ortam tehditli: sınır sertleşir, ortak payda daha az işler. Bu etki modelin varsayımıdır.',
      look: 'Tehdit düşükken ve yüksekken "biz" sayısının farkı.',
      apply: () => { set({ goal: 0.8, label: 0.8, contact: 0.8, threat: 1, time: 0.9 }); setPre(null); },
    },
    {
      title: '"Biz" bir ayardır',
      text: 'Sınır sabit değil, kolayca yönlendirilebilir: hedef, etiket, temas, tehdit ve zaman onu iki yöne de kaydırır (Sonsöz). Bu, nefretin de, ortak paydanın da aynı mekanizmadan geldiği anlamına gelir.',
      look: 'Tehdidi indirip hedefi artır: sınırın yeniden çizildiğini izle.',
      apply: () => { set({ goal: 0.8, label: 0.8, contact: 0.8, threat: 0.1, time: 0.9 }); setPre(null); },
    },
  ], { onExit: () => ctx.touch() });
  q('tour').replaceWith(tour.el);

  return {
    draw(now = 0): boolean {
      if (playing) {
        const dt = last ? Math.max(0, (now - last) / 1000) : 0;
        last = now;
        if (dt > 0) {
          inp.time = Math.min(1, inp.time + dt / 8);
          sl.time.set(Math.round(inp.time * 100)); dirty = true;
          if (inp.time >= 1) { playing = false; q('play').textContent = 'Zamanı oynat'; ctx.touch(); }
        }
      }
      if (!dirty) return false;
      dirty = false;
      view = bizView(people, ego, inp);
      renderNet(); renderTl();
      return true;
    },
    resume() { last = 0; },
    say: () => describeBiz(view),
    meters: (): Meter[] => [
      { label: '"Biz" sayısı', value: `${view.nBiz} / ${N_PEOPLE - 1}`, frac: view.nBiz / (N_PEOPLE - 1), color: 'var(--ink)' },
      { label: 'Eski grup içi yakınlık', value: pc(view.meanIn), frac: view.meanIn, color: 'var(--pfc)' },
      { label: 'Eski grup dışı yakınlık', value: pc(view.meanOut), frac: view.meanOut, color: 'var(--dop)' },
    ],
    set,
  } satisfies Panel & { set(p: Partial<BizInputs>): void };
}
