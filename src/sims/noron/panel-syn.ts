// Sekme 2: Sinaps. Salım -> reseptöre bağlanma -> geri alım / enzimle yıkım; ilaç benzeri engeller sinyalin düzeyini ve süresini değiştirir.
import { decimalSep } from '../../i18n/locale';
import { pct } from '../../i18n/fmt';
import { t } from '../../i18n/t';
import { svg, svgText } from '../kit';
import { SYN_DEFAULT, advanceSyn, clamp, createSyn, f1, f2, release, singleSpike, type Single, type Syn, type SynP, type SynType } from './model';
import { mulberry32 } from '../rng';
import type { TourStep } from '../tour';
import { L } from './text';
import { chipRow, el, gridY, linePath, makeSlider, toggleBtn, type Ctx, type Meter, type SliderHandle } from './ui';

const SPEED = 40;   // gerçek 1 sn = 40 ms model zamanı
const WIN = 200;
const NP = 48;      // sinaptik aralıktaki parçacık yuvası
const CMAX = 2.4;   // C grafiği tavanı
const RECV = [66, 114, 162, 210, 258, 306];
const CH = { x0: 34, x1: 352 };
const cxs = (s: Syn, t: number): number => CH.x1 - (s.t - t) / WIN * (CH.x1 - CH.x0);

export function createSynPanel(ctx: Ctx, host: HTMLElement) {
  const X = L().syn;
  const P: SynP = { ...SYN_DEFAULT };
  let s = createSyn();
  let paused = false, dirty = true, last = -1;
  let one: Single = singleSpike(P), base: Single = one, oneDirty = true;
  let seenRel = 0, flash = -1e9;
  const rnd = mulberry32(9);
  const slots = Array.from({ length: NP }, () => ({ x: 46 + rnd() * 268, y: 84 + rnd() * 60, a: rnd() * 6.28, b: rnd() * 6.28 }));

  let st = '<path class="term" d="M30 6H330V52Q330 72 310 72H50Q30 72 30 52Z"/>' +
    `<text class="lb" x="40" y="20">${X.presyn}</text>` +
    '<path data-r="imp" class="imp" d="M205 3L195 20H203L199 33L213 14H205Z" opacity="0"/>';
  for (const [x, y] of [[70, 38], [112, 50], [152, 36], [252, 40]]) st += `<circle class="ves" cx="${x}" cy="${y}" r="10"/><circle class="vd" cx="${x}" cy="${y}" r="3.5"/>`;
  st += '<circle data-r="dv" class="ves" cx="200" cy="58" r="10"/><circle class="vd" data-r="dvd" cx="200" cy="58" r="3.5"/>' +
    '<rect class="pump" x="276" y="64" width="28" height="12" rx="4"/><path class="pumpa" d="M290 64V46M285 52L290 46L295 52"/>' +
    `<text class="lb" x="290" y="92" text-anchor="middle">${X.pump}</text><path data-r="xru" class="xx" opacity="0" d="M279 62L301 80M301 62L279 80"/>`;
  for (const [x, y] of [[74, 132], [178, 112], [300, 134]]) st += `<g data-r="enz"><path class="enz" d="M-7 0L0 -7L7 0L0 7Z" transform="translate(${x} ${y})"/></g>`;
  st += '<path data-r="xen" class="xx" opacity="0" d="M164 100L192 124M192 100L164 124"/>';
  for (let i = 0; i < NP; i++) st += `<circle data-r="np${i}" class="np" r="3.2" cx="60" cy="100" opacity="0"/>`;
  st += '<path class="mem" d="M30 150H330"/>';
  RECV.forEach((x, i) => { st += `<path data-r="rc${i}" class="rc" d="M${x - 10} 148Q${x - 10} 164 ${x} 164Q${x + 10} 164 ${x + 10} 148"/>`; });
  st += '<rect class="post" x="30" y="170" width="300" height="60" rx="12"/><text class="lb" x="42" y="190">${X.postsyn}</text>';

  host.innerHTML =
    '<p class="note">Ateşleyince veziküller boşalır, nörotransmitter reseptöre bağlanır, sonra geri alınır ya da parçalanır. İlaç benzeri düğmelerle yolları kapat.</p>' +
    '<div class="chips" data-ref="type"></div>' +
    `<div class="stage"><svg viewBox="0 0 360 238" role="img" aria-label="Sinaps: presinaptik uç, sinaptik aralık, reseptörler" data-ref="syn">${st}</svg>` +
    '<div class="legend"><span><i style="background:var(--gld)"></i>nörotransmitter</span><span><i style="background:var(--dop)"></i>bağlı reseptör</span><span><i style="background:var(--pit);border-radius:2px"></i>enzim</span><span>çanak: reseptör (anahtar-kilit)</span></div></div>' +
    '<div class="row" data-ref="act"></div>' +
    '<div class="card"><h3 class="sim-h">Nereye gitti? (tek impuls)</h3><div class="fates" data-ref="fates"></div></div>' +
    '<div class="chart"><h4 class="sim-h">Sinaptik aralıktaki nörotransmitter</h4><svg viewBox="0 0 360 132" role="img" aria-label="Nörotransmitter düzeyi grafiği" data-ref="cc"></svg></div>' +
    '<div class="chart"><h4 class="sim-h">Postsinaptik yanıt</h4><svg viewBox="0 0 360 112" role="img" aria-label="Postsinaptik yanıt grafiği" data-ref="rc"></svg></div>' +
    '<div class="card"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="sl"></div></div>' +
    '<details class="more"><summary>Model nasıl çalışıyor?</summary>' +
    '<p>Kitaptan: veziküllerden salınan nörotransmitter sinaptik aralıktan geçip reseptöre bağlanır (anahtar-kilit); ayrılınca ya geri alım pompalarıyla toplanır ya da enzimle parçalanır, bu iki yol sinyalin süresini belirler. İlaçlar geri alımı engelleyerek sinyali güçlendirir.</p>' +
    '<p>Modelin varsayımı: her impuls q birim salar; düzey dağılma, doyabilen pompa ve enzimle azalır; bağlı reseptör oranı kitle etkisiyle bulunur, yanıt = bağlı oran x reseptör yoğunluğu (eşik 0,05). "Geri alım baskın" sinapsta pompa, "enzim baskın" sinapsta enzim ana yoldur (kitap tür ayrımı yapmaz). İlaç yolu %90 kapatır. Bu yalnızca tek sinapsın kısa süreli iletimidir; ilacın klinik etkisinin tamamını anlatmaz.</p></details>';

  const q = <T extends Element = HTMLElement>(k: string) => host.querySelector<T>(`[data-ref="${k}"]`)!;
  const r = <T extends SVGElement = SVGElement>(k: string) => host.querySelector<T>(`[data-r="${k}"]`)!;
  const np = Array.from({ length: NP }, (_, i) => r(`np${i}`));
  const rcs = RECV.map((_, i) => r(`rc${i}`));
  const enz = Array.from(host.querySelectorAll<SVGElement>('[data-r="enz"]'));

  /* ---------- Denetimler ---------- */
  const mark = () => { oneDirty = dirty = true; };
  const setType = chipRow(q('type'), ctx, [{ key: 'geri', label: 'Geri alım baskın' }, { key: 'enzim', label: 'Enzim baskın' }], (k) => { P.type = k as SynType; mark(); setType(P.type); }, 'Sinaps türü');
  const act = q('act');
  const fireB = el(act, 'button', 'btn', 'Tek impuls'); fireB.type = 'button';
  ctx.scope.on(fireB, 'click', () => { fire(); ctx.touch(); });
  const pauseT = toggleBtn(ctx, act, 'Duraklat', (v) => { paused = v; pauseT.b.textContent = v ? 'Devam' : 'Duraklat'; dirty = true; });
  const resetB = el(act, 'button', 'btn', 'Sıfırla'); resetB.type = 'button';
  ctx.scope.on(resetB, 'click', () => { reset(); ctx.touch(); });
  const drugs = document.createElement('div');
  drugs.className = 'row';
  act.after(drugs);
  const tRu = toggleBtn(ctx, drugs, 'Geri alımı engelle (SSRI benzeri)', (v) => { P.blockRu = v; mark(); });
  const tEn = toggleBtn(ctx, drugs, 'Enzimi engelle', (v) => { P.blockEn = v; mark(); });

  const sl = q('sl');
  const hs: Record<string, SliderHandle> = {};
  hs.q = makeSlider(ctx, sl, 'q', 'Salım miktarı', 'Her impulsta boşalan miktar.', 2, 15, 10, (v) => { P.q = v / 10; mark(); }, (v) => f1(v / 10), 'var(--gld)');
  hs.density = makeSlider(ctx, sl, 'den', 'Reseptör yoğunluğu', 'Aynı düzeyde daha çok reseptör, daha büyük yanıt.', 3, 20, 10, (v) => { P.density = v / 10; mark(); }, (v) => `${f1(v / 10)}x`, 'var(--dop)');
  hs.ru = makeSlider(ctx, sl, 'ru', 'Geri alım pompası etkinliği', 'Pompalar nörotransmitteri uca geri toplar.', 0, 20, 10, (v) => { P.ru = v / 10; mark(); }, (v) => `${f1(v / 10)}x`, 'var(--gld)');
  hs.en = makeSlider(ctx, sl, 'en', 'Enzim etkinliği', 'Enzim nörotransmitteri aralıkta parçalar.', 0, 20, 10, (v) => { P.en = v / 10; mark(); }, (v) => `${f1(v / 10)}x`, 'var(--pit)');
  hs.rate = makeSlider(ctx, sl, 'rate', 'Presinaptik ateşleme hızı', '0 iken yalnızca "Tek impuls" salım yapar. Sıklaştıkça düzey birikir.', 0, 50, P.rate, (v) => { P.rate = v; dirty = true; }, (v) => `${v} Hz`, 'var(--ink)');
  const fates = q('fates');
  const fateRows = [['Geri alım pompası', 'var(--gld)'], ['Enzimle yıkım', 'var(--pit)'], ['Dağılma', 'var(--lesion)']].map(([name, c]) => {
    const d = el(fates, 'div', 'fate', `<span>${name}</span><div class="track"><b style="background:${c}"></b></div><span class="fv"></span>`);
    return { bar: d.querySelector('b') as HTMLElement, v: d.querySelector('.fv') as HTMLElement };
  });

  /* ---------- Grafik iskeletleri ---------- */
  const cc = q<SVGSVGElement>('cc'), rr = q<SVGSVGElement>('rc');
  const CC = { top: 10, h: 90 }, RR = { top: 8, h: 66 };
  const yc = (v: number): number => CC.top + (1 - clamp(v / CMAX)) * CC.h;
  const yr = (v: number): number => RR.top + (1 - clamp(v / 1.2)) * RR.h;
  for (const v of [0, 1, 2]) gridY(cc, CH.x0, CH.x1, yc(v), String(v));
  for (const v of [0, 0.5, 1]) gridY(rr, CH.x0, CH.x1, yr(v), String(v).replace('.', ','));
  svgText(cc, { x: 3, y: 8 }, 'birim'); svgText(rr, { x: 3, y: 8 }, 'yanıt');
  const meanL = svg('line', { class: 'mean', x1: CH.x0, x2: CH.x1 }, cc);
  const meanT = svgText(cc, { class: 'lb', x: CH.x0 + 4, y: 0 }, '');
  const cP = svg('path', { class: 'cl', d: '' }, cc);
  const rP = svg('path', { class: 'rl', d: '' }, rr);
  const tkP = svg('path', { class: 'tk', d: '' }, cc);
  svgText(cc, { x: CH.x0, y: 118, class: 'lb' }, 'çizgiler: presinaptik impuls');
  for (const g of [cc, rr]) [['-200 ms', 0], ['-100', 0.5], ['şimdi', 1]].forEach(([t, k], i) => svgText(g, { x: CH.x0 + (CH.x1 - CH.x0) * (k as number), y: g === cc ? 130 : 110, 'text-anchor': i === 0 ? 'start' : i === 2 ? 'end' : 'middle' }, String(t)));

  /* ---------- Eylemler ---------- */
  function fire(): void { release(s, P); paused = false; pauseT.set(false); pauseT.b.textContent = 'Duraklat'; dirty = true; }
  function reset(): void { s = createSyn(); seenRel = 0; flash = -1e9; dirty = true; }

  let meanC = 0;
  function paint(now: number): void {
    if (oneDirty) {
      oneDirty = false;
      one = singleSpike(P); base = singleSpike({ ...P, blockRu: false, blockEn: false });
      [one.fRu, one.fEn, one.fDf].forEach((f, i) => { fateRows[i].bar.style.width = `${(f * 100).toFixed(0)}%`; fateRows[i].v.textContent = `%${Math.round(f * 100)}`; });
      const ru = r('xru'), en = r('xen');
      ru.setAttribute('opacity', P.blockRu ? '1' : '0'); en.setAttribute('opacity', P.blockEn ? '1' : '0');
      for (const e of enz) e.setAttribute('opacity', P.blockEn ? '0.3' : String(clamp(P.en / 1.2, 0.25, 1) * (P.type === 'enzim' ? 1 : 0.75)));
      host.querySelector('.pump')!.setAttribute('opacity', P.blockRu ? '0.3' : String(clamp(P.ru / 1.2, 0.25, 1)));
    }
    if (s.released !== seenRel) { if (s.released > seenRel) flash = now; seenRel = s.released; }
    const fa = (now - flash) / 400;
    r('imp').setAttribute('opacity', fa >= 0 && fa < 1 ? String(1 - fa) : '0');
    r('dv').setAttribute('stroke-dasharray', fa >= 0 && fa < 1 ? '3 3' : '0');
    r('dvd').setAttribute('opacity', fa >= 0 && fa < 1 ? '0' : '1');
    const nVis = Math.round(clamp(s.C / 2) * NP);
    for (let i = 0; i < NP; i++) {
      const on = i < nVis, sp = slots[i];
      if (on) { np[i].setAttribute('cx', (sp.x + 7 * Math.sin(now / 420 + sp.a)).toFixed(1)); np[i].setAttribute('cy', (sp.y + 5 * Math.cos(now / 360 + sp.b)).toFixed(1)); }
      np[i].setAttribute('opacity', on ? '0.9' : '0');
    }
    const active = Math.round(clamp(P.density * 3, 1, 6)), lit = Math.round(s.B * active + 0.15);
    rcs.forEach((e, i) => { e.setAttribute('class', `rc${i < active ? ' on' : ' off'}${i < Math.min(active, lit) ? ' bound' : ''}`); });
    const cs: Array<[number, number]> = [], rs: Array<[number, number]> = [];
    let sum = 0, cnt = 0;
    for (const [t, c, rv] of s.tr) { cs.push([cxs(s, t), yc(c)]); rs.push([cxs(s, t), yr(rv)]); sum += c; cnt++; }
    cP.setAttribute('d', linePath(cs)); rP.setAttribute('d', linePath(rs));
    meanC = cnt ? sum / cnt : 0;
    const my = yc(meanC);
    meanL.setAttribute('y1', String(my)); meanL.setAttribute('y2', String(my));
    meanT.setAttribute('y', String(my - 3)); meanT.textContent = `ortalama ${f2(meanC)}`;
    let tk = '';
    for (const t of s.fires) { const x = cxs(s, t); if (x >= CH.x0) tk += `M${x.toFixed(1)} 100V108`; }
    tkP.setAttribute('d', tk);
  }
  function draw(now: number): boolean {
    const dt = last < 0 ? 0 : Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    const anim = now - flash < 450;
    if (paused && !dirty && !anim) return false;
    if (!paused && dt > 0) advanceSyn(s, P, dt * SPEED, true);
    dirty = false;
    paint(now);
    return true;
  }

  setType(P.type);
  return {
    draw, resume: () => { last = -1; },
    say(): string {
      const drug = P.blockRu && P.blockEn ? 'Geri alım ve enzim engelli' : P.blockRu ? 'Geri alım engelli (SSRI benzeri)' : P.blockEn ? 'Enzim engelli' : 'İlaç yok';
      const main = one.fRu >= one.fEn && one.fRu >= one.fDf ? 'geri alım' : one.fEn >= one.fDf ? 'enzim' : 'dağılma';
      return `${drug}: tek impulsta düzey ${f1(one.half)} ms'de yarıya iniyor${P.blockRu || P.blockEn ? ` (ilaçsız ${f1(base.half)} ms)` : ''}; yanıt ${Math.round(one.dur)} ms sürüyor. Baskın yol: ${main}.`;
    },
    meters(): Meter[] {
      return [
        { label: 'Aralıkta ortalama düzey (son 200 ms)', value: `${f2(meanC)} birim`, frac: meanC / 1.5, color: 'var(--gld)' },
        { label: 'Düzeyin yarı ömrü (tek impuls)', value: `${f1(one.half)} ms`, frac: one.half / 40, color: 'var(--pit)' },
        { label: 'Yanıt süresi (tek impuls)', value: `${Math.round(one.dur)} ms`, frac: one.dur / 200, color: 'var(--dop)' },
      ];
    },
    /** Rehberli tur için: durumu sıfırla ve ayarla. */
    scene(p: Partial<SynP>, impulse = false): void {
      reset();
      Object.assign(P, SYN_DEFAULT, p);
      setType(P.type); tRu.set(P.blockRu); tEn.set(P.blockEn);
      hs.q.set(Math.round(P.q * 10)); hs.density.set(Math.round(P.density * 10)); hs.ru.set(Math.round(P.ru * 10)); hs.en.set(Math.round(P.en * 10)); hs.rate.set(P.rate);
      paused = false; pauseT.set(false); pauseT.b.textContent = 'Duraklat';
      mark();
      if (impulse) fire();
    },
  };
}

type SynPanel = ReturnType<typeof createSynPanel>;

/** Sinaps sekmesinin rehberli turu (sekmeyle birlikte tembel yüklenir). */
export const synTour = (syn: SynPanel): TourStep[] => [
  {
    title: 'Bir impuls, bir salım',
    text: 'Uca impuls gelir, veziküller boşalır, nörotransmitter reseptörlere bağlanır (anahtar-kilit). Sonra düzey düşer.',
    look: 'Yeşil çizgi sıçrayıp iniyor; turuncu yanıt geç tepe yapıp geç sönüyor.',
    apply: () => syn.scene({ rate: 0 }, true),
  },
  {
    title: 'Üç çıkış yolu',
    text: 'Nörotransmitter ya geri alım pompalarıyla toplanır ya da enzimle parçalanır (kitap); küçük bir pay dağılır. İlk ikisi sinyalin süresini belirler.',
    look: '"Nereye gitti?" kartı: bu sinapsta çoğu pompaya gidiyor (varsayım).',
    apply: () => syn.scene({ rate: 0 }, true),
  },
  {
    title: 'Geri alımı engelle',
    text: 'SSRI benzeri ilaç pompayı kapatır: nörotransmitter aralıkta kalır, sık ateşlemede birikir. Kitap: ilaçlar geri alımı engelleyerek sinyali güçlendirir.',
    look: 'Yeşil çizginin tabanı yükseliyor; yarı ömür ve yanıt süresi uzuyor.',
    apply: () => syn.scene({ blockRu: true }),
  },
  {
    title: 'Enzimi engellemek burada az işe yarar',
    text: 'Bu sinapsta ana yol pompa olduğu için enzimi kapatmak neredeyse hiçbir şeyi değiştirmez; etki baskın yola bağlı.',
    look: 'Yarı ömür 6 ms civarında kalıyor.',
    apply: () => syn.scene({ blockEn: true }),
  },
  {
    title: 'Enzim baskın sinapsta',
    text: 'Ana yol enzimse (varsayım), enzim engeli düzeyi ve süreyi belirgin uzatır; pompa küçük bir yedektir.',
    look: 'Yarı ömür birkaç kat uzuyor.',
    apply: () => syn.scene({ type: 'enzim', blockEn: true }),
  },
  {
    title: 'Düzey yanıt demek değil',
    text: 'Aynı düzey, yarı sayıda reseptörle yarı büyüklükte yanıt verir. Kitap: ilaç reseptörü taklit edebilir ya da bloke edebilir.',
    look: 'Dolu çanak ve turuncu çizgi düşük, yeşil çizgi aynı.',
    apply: () => syn.scene({ density: 0.5 }),
  },
];
