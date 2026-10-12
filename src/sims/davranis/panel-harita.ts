// Sekme 1: Saldırganlık haritası. Yedi tür üç eksende (reaktif-proaktif, sıcak-soğuk, dürtüsel-planlı).
import { ref, svg, svgText } from '../kit';
import { createTour } from '../tour';
import { chipRow, makeSlider, pc, type Ctx, type Meter, type Panel } from '../ui';
import { AXIS_INFO, SCENARIOS, SYSTEM_INFO, blur, coherence, nearest, pole, profile, systems, type Axes } from './model';
import { bars, chLink } from './bars';

const ROW_Y = [68, 138, 208], X0 = 24, X1 = 336, LANES = [0, -16, 16];
const AX_CAP = [
  'Reaktif: bir uyarana karşılık. Proaktif: kendiliğinden, bir amaca doğru.',
  'Sıcakkanlı: öfke ve heyecan eşlik eder. Soğukkanlı: duygusuz, araçsal.',
  'Dürtüsel: o an, düşünmeden. Planlı: önceden tasarlanmış.',
];

export interface HaritaPanel extends Panel { select(i: number): void; reset(i?: number): void; place(i: number, p: Partial<Axes>): void }

export function createHaritaPanel(ctx: Ctx, host: HTMLElement): HaritaPanel {
  const preset = (): Axes[] => SCENARIOS.map((s) => ({ ...s.axes }));
  const pos = preset();
  let sel = 0, dirty = true;

  host.innerHTML =
    `<div class="chips" data-ref="chips"></div>` +
    `<div class="stage"><svg viewBox="0 0 360 250" role="group" aria-label="Saldırganlık türlerinin üç eksendeki konumu. Şeride dokunmak seçili türü taşır; kaydırıcılar da aynısını yapar." data-ref="map"></svg>` +
    `<div class="legend"><span>Dolu daire: seçili tür (şeride dokun ya da kaydırıcıyı kullan)</span><span>Boş daire: diğer türler, numara = çip sırası</span><span>Kesikli çizgi: seçili türün profili</span></div></div>` +
    `<div class="card"><h3 class="sim-h" data-ref="h"></h3><p class="note" data-ref="desc"></p><p data-ref="prof"></p><p class="note" data-ref="blur"></p>` +
    `<h3 class="sim-h sys-h">İlgili sistemler (modelin eşlemesi)</h3><div class="sys" data-ref="sys"></div><p class="note" data-ref="where"></p></div>` +
    `<section><h3 class="sim-h">Seçili türü yerleştir</h3><div class="sliders" data-ref="sl"></div><div class="row"><button type="button" class="btn" data-ref="r1">Bu türü hazır konuma döndür</button><button type="button" class="btn" data-ref="rall">Hepsini hazır konuma al</button></div></section>` +
    `<div class="notes" data-notes="n1"></div>`;
  const $ = <T extends Element = HTMLElement>(n: string) => ref<T>(host, n);

  /* ---- Çipler ---- */
  const setChip = chipRow($('chips'), ctx, SCENARIOS.map((s, i) => ({ key: String(i), label: `${i + 1} ${s.name}` })), (k) => select(+k), 'Saldırganlık türü');

  /* ---- Harita ---- */
  const map = $<SVGElement>('map');
  AXIS_INFO.forEach((info, r) => {
    const cy = ROW_Y[r];
    svgText(map, { x: X0, y: cy - 38, class: 'ax-t' }, info.lo);
    svgText(map, { x: X1, y: cy - 38, class: 'ax-t', 'text-anchor': 'end' }, info.hi);
    svg('line', { x1: X0, x2: X1, y1: cy, y2: cy, class: 'trk' }, map);
    for (const t of [0.35, 0.65]) svg('line', { x1: X0 + t * (X1 - X0), x2: X0 + t * (X1 - X0), y1: cy - 5, y2: cy + 5, class: 'tick' }, map);
  });
  const profLine = svg('polyline', { class: 'prof', fill: 'none' }, map);
  const dots = AXIS_INFO.map(() => SCENARIOS.map((_, i) => {
    const g = svg('g', { class: 'dot' }, map);
    const c = svg('circle', { r: 7.5 }, g);
    svgText(g, { 'text-anchor': 'middle', y: 3.5 }, String(i + 1));
    return { g, c };
  }));
  // Şeride dokunmak ya da sürüklemek seçili türü o eksende taşır; şerit, imlecin en yakın olduğu çizgidir.
  const at = (ev: PointerEvent): { r: number; v: number } => {
    const rc = map.getBoundingClientRect();
    const x = (ev.clientX - rc.left) / rc.width * 360, y = (ev.clientY - rc.top) / rc.height * 250;
    const r = ROW_Y.reduce((best, cy, i) => (Math.abs(cy - y) < Math.abs(ROW_Y[best] - y) ? i : best), 0);
    return { r, v: Math.max(0, Math.min(1, (x - X0) / (X1 - X0))) };
  };
  let dragRow = -1;
  const move = (ev: PointerEvent, lock: boolean): void => {
    const { r, v } = at(ev);
    if (lock) dragRow = r;
    pos[sel][AXIS_INFO[dragRow < 0 ? r : dragRow].key] = Math.round(v * 100) / 100;
    dirty = true; syncSliders(); ctx.touch();
  };
  const mapEl = map as unknown as HTMLElement;
  ctx.scope.on(mapEl, 'pointerdown', (ev) => { mapEl.setPointerCapture?.((ev as PointerEvent).pointerId); move(ev as PointerEvent, true); });
  ctx.scope.on(mapEl, 'pointermove', (ev) => { if (dragRow >= 0) move(ev as PointerEvent, false); });
  const up = (): void => { dragRow = -1; };
  ctx.scope.on(mapEl, 'pointerup', up);
  ctx.scope.on(mapEl, 'pointercancel', up);

  /* ---- Kaydırıcılar ---- */
  const txt = (r: number, v: number): string => `${pole(AXIS_INFO[r], v / 100)} ${v}`;
  const sliders = AXIS_INFO.map((info, r) => makeSlider(ctx, $('sl'), info.key, `${info.lo} ↔ ${info.hi}`, AX_CAP[r], 0, 100, 0,
    (v) => { pos[sel][info.key] = v / 100; dirty = true; }, (v) => txt(r, v), 'var(--ink)'));
  function syncSliders(): void { AXIS_INFO.forEach((info, r) => { const v = Math.round(pos[sel][info.key] * 100); sliders[r].set(v, txt(r, v)); }); }
  ctx.scope.on($('r1'), 'click', () => { reset(); ctx.touch(); });
  ctx.scope.on($('rall'), 'click', () => { pos.splice(0, pos.length, ...preset()); syncSliders(); dirty = true; ctx.touch(); });

  const sysSet = bars($('sys'), SYSTEM_INFO.map((s) => ({ label: `${s.name} <a href="#/bolum/${s.ch}">B${+s.ch.slice(2)}</a>`, color: `var(${s.color})` })));

  function select(i: number): void { sel = i; syncSliders(); dirty = true; }
  function reset(i = sel): void { pos[i] = { ...SCENARIOS[i].axes }; if (i === sel) syncSliders(); dirty = true; }
  function place(i: number, p: Partial<Axes>): void { Object.assign(pos[i], p); if (i === sel) syncSliders(); dirty = true; }

  const moved = (i: number): boolean => AXIS_INFO.some((a) => Math.abs(pos[i][a.key] - SCENARIOS[i].axes[a.key]) > 0.005);
  const near = (): number => nearest(pos, sel);

  function render(): void {
    const sc = SCENARIOS[sel], p = pos[sel];
    // Aynı şeritte yakın duran daireler üst üste binmesin diye üç çizgiye dağıtılır; seçili tür hep ortada.
    const order = [sel, ...SCENARIOS.map((_, i) => i).filter((i) => i !== sel)];
    const selPts: string[] = [];
    AXIS_INFO.forEach((info, r) => {
      const placed: Array<{ x: number; lane: number }> = [];
      for (const i of order) {
        const x = X0 + pos[i][info.key] * (X1 - X0);
        const found = LANES.findIndex((_, l) => placed.every((q) => q.lane !== l || Math.abs(q.x - x) >= 17));
        const lane = found < 0 ? 0 : found;
        placed.push({ x, lane });
        const y = ROW_Y[r] + LANES[lane], d = dots[r][i], on = i === sel;
        d.g.setAttribute('class', on ? 'dot on' : 'dot');
        d.g.setAttribute('transform', `translate(${x.toFixed(1)},${y})`);
        d.c.setAttribute('r', on ? '9.5' : '7.5');
        if (on) { selPts.push(`${x.toFixed(1)},${y}`); d.g.parentNode!.appendChild(d.g); }
      }
    });
    profLine.setAttribute('points', selPts.join(' '));
    setChip(String(sel));
    const ax = p, n = SCENARIOS[near()];
    $('h').textContent = `${sel + 1} ${sc.name}`;
    $('desc').textContent = sc.desc + (moved(sel) ? ' (Konum elle değiştirildi.)' : '');
    $('prof').innerHTML = `<b>Profil:</b> ${profile(ax)}. <b>Eksen uyumu:</b> ${pc(coherence(ax))}. <b>En yakın tür:</b> ${n.name}.`;
    const b = blur(ax);
    $('blur').textContent = b ? `Eksenler ayrışıyor: ${b}. Bu tür tek bir kutuya sığmaz.` : 'Üç eksen aynı yönü gösteriyor; sınıflamalar bu türde birbirini doğruluyor.';
    const s = systems(ax, sc);
    sysSet(SYSTEM_INFO.map((i) => s[i.key]));
    $('where').innerHTML = `<b>Kitapta:</b> ` + sc.where.map(([ch, why]) => `${chLink(ch)} (${why})`).join('; ') + '.';
  }

  const say = (): string => {
    const sc = SCENARIOS[sel], b = blur(pos[sel]);
    return `${sc.name}: ${profile(pos[sel])}. ${b ? `Eksenler ayrışıyor (${b}).` : 'Eksenler aynı yönde.'} En yakın tür: ${SCENARIOS[near()].name}.`;
  };
  const panel: HaritaPanel = {
    say,
    meters(): Meter[] {
      const s = systems(pos[sel], SCENARIOS[sel]);
      return [
        { label: 'Eksen uyumu', value: pc(coherence(pos[sel])), frac: coherence(pos[sel]), color: 'var(--ink)' },
        { label: 'Tehdit devresi', value: pc(s.amy), frac: s.amy, color: 'var(--amy)' },
        { label: 'Planlama', value: pc(s.pfc), frac: s.pfc, color: 'var(--pfc)' },
      ];
    },
    draw(): boolean { if (!dirty) return false; dirty = false; render(); return true; },
    select, reset, place,
  };

  const tour = createTour(ctx.scope, [
    { title: 'Savunma: üç eksen aynı uçta', text: 'Bir saldırganlık türü tek bir kutu değil, üç ayrı eksendeki konumdur. Tehdit altındaki savunma reaktif, sıcakkanlı ve dürtüseldir.',
      look: 'Üç şeritte de seçili dairenin sol uçta olması ve yüksek eksen uyumu.', apply: () => { panel.reset(0); select(0); } },
    { title: 'Planlı şiddet: tam ters uç', text: 'Önceden tasarlanmış soğukkanlı şiddet proaktif, duygusuz ve planlıdır. Öne çıkan sistemler de değişir (modelin eşlemesi).',
      look: 'Tehdit devresi çubuğunun düşmesi, planlama ve dopamin çubuklarının yükselmesi.', apply: () => { panel.reset(4); select(4); } },
    { title: 'Ara türler kutuya sığmaz', text: 'Statü kavgası kasıtlı ama öfkeli, sıcak ama hesaplı. Üç eksen artık aynı yönü göstermez; sınıflamaların sınırı bulanıktır.',
      look: 'Eksen uyumunun düşmesi ve kartta "ayrışıyor" uyarısı.', apply: () => { panel.reset(2); select(2); } },
    { title: 'Yer değiştirme: stres yükü', text: 'Hedef tehdit eden kişi değil, ulaşılabilen zayıf biri. Profili savunmaya yakın ama stres sistemi en yüksek. Mekanizma üçüncü sekmede.',
      look: 'Glukokortikoid çubuğu ve "en yakın tür" satırı.', apply: () => { panel.reset(3); select(3); } },
    { title: 'Sen yerleştir', text: 'Kurguda şiddetin mağduru yoktur ama aynı sözcük kullanılır. Daireyi şeritlerde sürükleyerek ya da kaydırıcıyla taşı; kitap her ayrımın farklı biyolojiye işaret ettiğini söyler.',
      look: 'Bir ekseni uca çektiğinde sistem çubuklarının hangi yöne kaydığı.', apply: () => { panel.reset(6); select(6); } },
  ]);
  host.prepend(tour.el);
  return panel;
}
