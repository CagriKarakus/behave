// Sekme 2: Çocukluk adversitesi birikimi, koruyucu etkenler ve yetişkinlik riski (doz-yanıt).
import { ACES, DEFAULT_ACE, OUTCOMES, THRESHOLD, buffer, instLoad, levelWord, mechanisms, pHigh, pRef, pdf, shift, type AceInput, type Outcome } from './model';
import { bookBox, chipRow, el, f1, makeSlider, type Ctx, type Meter, type Panel } from '../ui';

const OUTS = Object.keys(OUTCOMES) as Outcome[];
const wordOf3 = (v: number): string => (v < 0.35 ? 'düşük' : v < 0.6 ? 'orta' : 'yüksek');

export function createAcePanel(ctx: Ctx, host: HTMLElement) {
  const a: AceInput = { ...DEFAULT_ACE };
  let out: Outcome = 'dep';
  const checks: boolean[] = ACES.map(() => false);
  let dirty = true;

  host.innerHTML =
    `<p class="note">ACE benzeri bir liste: yaşanan olumsuz deneyimleri işaretle, koruyucu etkenleri ayarla. Yetişkinlikte risk <em>olasılık dağılımı</em> olarak görünür; kitap bu listeyi ya da kesin risk yüzdelerini vermez, bu yüzden göstergeler nitel ve modelin varsayımıdır.</p>` +
    `<div class="chips" data-ref="presets"></div>` +
    `<div class="card"><h3 class="sim-h">Yaşanan olumsuz deneyimler <span data-ref="cnt"></span></h3><div class="acelist" data-ref="list"></div>` +
    `<div class="row"><button type="button" class="btn" data-ref="clear">Temizle</button></div></div>` +
    `<div class="card"><h3 class="sim-h">Yükü ve korumayı ayarla</h3><div class="sliders" data-ref="ctl"></div></div>` +
    `<div class="card"><h3 class="sim-h">Yetişkinlikte hangi risk?</h3><div class="chips" data-ref="outs"></div>` +
    `<div class="chart"><svg viewBox="0 0 320 150" role="img" aria-label="Deneyim sayısına göre yüksek eğilim olasılığı" data-ref="dose"></svg></div>` +
    `<div class="legend"><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h24" stroke="var(--amy)" stroke-width="2.4"/></svg>Mevcut koruma</span><span><svg viewBox="0 0 26 10" aria-hidden="true"><path d="M1 5h24" stroke="var(--muted)" stroke-width="2" stroke-dasharray="4 3"/></svg>Korumasız</span><span><i style="background:var(--ink)"></i>Şu anki yük</span></div>` +
    `<div class="chart"><svg viewBox="0 0 320 120" role="img" aria-label="Eğilim dağılımı: adversitesiz referans ve mevcut durum" data-ref="dens"></svg></div>` +
    `<p class="note" data-ref="densNote"></p></div>` +
    `<div class="card"><h3 class="sim-h">Beyinde ve stres ekseninde ne olur? (yön, nitel)</h3><div class="mech" data-ref="mech"></div></div>` +
    `<div class="callout"><strong>Kader değil, kayan bir dağılım.</strong><span>Adversite eğilimi artırır ama aynı yükü taşıyan çocukların hepsi aynı yere varmaz. Kitap da çocukluk deneyimlerinin tek başına kader olmadığını, davranış eğilimlerini ise kalıcı biçimde değiştirebildiğini vurgular.</span></div>` +
    bookBox([
      { id: 'ch07-e9', text: 'Farah / Boyce: SES, glukokortikoid ve frontal korteks (sağlam; etkiler ortalamada küçük)' },
      { id: 'ch07-e10', text: 'Romanya yetimhaneleri: kurumda kalış uzadıkça sonuç kötüleşir (sağlam; amigdala bulgusu tutarsız)' },
      { id: 'ch07-e12', text: 'Meaney: anne ilgisi ve epigenetik iz (kemirgenlerde sağlam; replikasyon karışık)' },
      { id: 'ch07-e6', text: 'Harlow: bağlanma beslenmeden çok temasa dayanır (sağlam)' },
    ]) +
    `<details class="more"><summary>Model nasıl çalışıyor?</summary><p>Etkin yük = (işaretlenen deneyim sayısı + kurumda geçen aydan gelen yük) × süreklilik; yük arttıkça etkisi hafifçe doyar. Her sonuç için eğilim dağılımı bu yük kadar sağa kayar. Güvenli bağlanma ve destekleyici yetişkin kaymayı küçültür (eğriyi düzleştirir); yüksek SES de küçültür, düşük SES adversite olmasa da dürtü kontrolü ve stres tepkisini kaydırır. Güvenli bağlanma stres tepkisine en çok etki eder (Meaney'in anne ilgisi bulgusu kemirgenlerde).</p><p>"Yüksek eğilim" bölgesi, adversitesiz referans grubun üst yaklaşık altıda biridir. Kitaptan yalnızca yönler ve nitel örüntüler gelir (SES gradyanı, kurumda kalış süresi, anne ilgisi); bütün büyüklükler modelin varsayımıdır.</p></details>`;

  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;
  const count = () => checks.filter(Boolean).length;
  a.n = 0;

  /* ---- Onay kutuları ---- */
  const list = q('list');
  const boxes: HTMLInputElement[] = ACES.map((label, i) => {
    const row = el(list, 'label', 'ck');
    const cb = el(row, 'input');
    cb.type = 'checkbox';
    el(row, 'span', '', label);
    ctx.scope.on(cb, 'change', () => { checks[i] = cb.checked; a.n = count(); dirty = true; ctx.touch(); });
    return cb;
  });
  function setN(n: number): void { checks.fill(false); for (let i = 0; i < n; i++) checks[i] = true; boxes.forEach((b, i) => (b.checked = checks[i])); a.n = count(); }
  ctx.scope.on(q('clear'), 'click', () => { setN(0); dirty = true; ctx.touch(); });

  /* ---- Kaydırıcılar ve çipler ---- */
  const ctl = q('ctl');
  const sl: Record<string, ReturnType<typeof makeSlider>> = {};
  const pct = (v: number) => `%${v}`;
  sl.intensity = makeSlider(ctx, ctl, 'int', 'Deneyimlerin sürekliliği', 'Tek seferlik mi, yıllarca süren mi: süregiden yük etkiyi artırır.', 60, 140, 100, (v) => { a.intensity = v / 100; dirty = true; }, (v) => (v < 90 ? 'tek seferlik' : v > 110 ? 'süregelen' : 'orta'), 'var(--amy)');
  sl.inst = makeSlider(ctx, ctl, 'inst', 'Kurumda bakım süresi', 'Romanya yetimhaneleri: kurumda kalış uzadıkça sonuç kötüleşir.', 0, 48, 0, (v) => { a.instMonths = v; dirty = true; }, (v) => `${v} ay`, 'var(--amy)');
  sl.attach = makeSlider(ctx, ctl, 'att', 'Güvenli bağlanma, sıcak bakım', 'İlgili anne ve kararlı bakım: stres tepkisini en çok yatıştıran etken.', 0, 100, 0, (v) => { a.attach = v / 100; dirty = true; }, pct, 'var(--gld)');
  sl.adult = makeSlider(ctx, ctl, 'adu', 'Destekleyici yetişkin', 'Öğretmen, akraba, komşu: aile dışından da olabilir.', 0, 100, 0, (v) => { a.adult = v / 100; dirty = true; }, pct, 'var(--gld)');
  sl.ses = makeSlider(ctx, ctl, 'ses', 'Aile kaynakları (SES)', 'Düşük SES, adversite olmadan da dürtü kontrolünü ve stres tepkisini zorlar.', 0, 100, 50, (v) => { a.ses = v / 100; dirty = true; }, (v) => (v < 35 ? 'düşük' : v > 65 ? 'yüksek' : 'orta'), 'var(--gld)');

  const PRESETS: Array<{ key: string; label: string; p: () => void }> = [
    { key: 'ref', label: 'Referans', p: () => apply({ n: 0 }) },
    { key: 'pov', label: 'Yoksulluk (düşük SES)', p: () => apply({ n: 2, ses: 0.1 }) },
    { key: 'rom', label: 'Romanya: 30 ay kurum', p: () => apply({ n: 0, inst: 30 }) },
    { key: 'rom6', label: 'Romanya: 6. ayda aile', p: () => apply({ n: 0, inst: 6 }) },
    { key: 'prot', label: '5 deneyim + güçlü koruma', p: () => apply({ n: 5, attach: 1, adult: 0.8, ses: 0.7 }) },
  ];
  const setPreset = chipRow(q('presets'), ctx, PRESETS.map((p) => ({ key: p.key, label: p.label })), (k) => { PRESETS.find((p) => p.key === k)!.p(); setPreset(k); }, 'Hazır senaryolar');
  const setOut = chipRow(q('outs'), ctx, OUTS.map((o) => ({ key: o, label: OUTCOMES[o].short })), (k) => { out = k as Outcome; dirty = true; }, 'Yetişkinlik sonucu');
  setOut(out);

  function apply(p: { n?: number; intensity?: number; inst?: number; attach?: number; adult?: number; ses?: number; out?: Outcome }): void {
    setN(p.n ?? 0);
    a.intensity = p.intensity ?? 1; a.instMonths = p.inst ?? 0; a.attach = p.attach ?? 0; a.adult = p.adult ?? 0; a.ses = p.ses ?? 0.5;
    if (p.out) { out = p.out; setOut(out); }
    sl.intensity.set(Math.round(a.intensity * 100)); sl.inst.set(a.instMonths); sl.attach.set(Math.round(a.attach * 100));
    sl.adult.set(Math.round(a.adult * 100)); sl.ses.set(Math.round(a.ses * 100));
    dirty = true;
  }

  /* ---- Çizim ---- */
  const dose = q<SVGSVGElement>('dose'), dens = q<SVGSVGElement>('dens'), mech = q('mech');
  mech.innerHTML = [['frontal', 'Frontal korteks işlevi', 'var(--pfc)'], ['gc', 'Glukokortikoid (stres hormonu) tepkisi', 'var(--dop)'], ['amy', 'Amigdala hacmi', 'var(--amy)']]
    .map(([k, l, c]) => `<div class="mrow"><div class="m-top"><span>${l}</span><b data-ref="mw-${k}"></b></div><div class="track"><b data-ref="mb-${k}" style="background:${c}"></b></div></div>`).join('') +
    `<p class="note">Amigdala büyümesi yalnızca kurumda bakım senaryosunda artar; bu bulgu çalışmalar arasında tutarsızdır.</p>`;

  function draw(): boolean {
    if (!dirty) return false;
    dirty = false;
    const o = OUTCOMES[out];
    q('cnt').textContent = `(${a.n} / ${ACES.length})`;
    // Doz-yanıt
    const X0 = 34, W = 276, Y0 = 8, H = 110, MAXN = ACES.length;
    const px = (n: number) => X0 + (n / MAXN) * W, py = (p: number) => Y0 + H - Math.min(1, p) * H;
    const bare: AceInput = { ...a, attach: 0, adult: 0, ses: 0.5 };
    const path = (inp: AceInput) => Array.from({ length: MAXN + 1 }, (_, n) => `${n ? 'L' : 'M'}${px(n).toFixed(1)} ${py(pHigh(out, { ...inp, n })).toFixed(1)}`).join('');
    let s = `<line class="grid" x1="${X0}" y1="${Y0 + H}" x2="${X0 + W}" y2="${Y0 + H}"/><line class="grid" x1="${X0}" y1="${Y0}" x2="${X0}" y2="${Y0 + H}"/>`;
    s += `<line x1="${X0}" y1="${py(pRef)}" x2="${X0 + W}" y2="${py(pRef)}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 4"/><text x="${X0 + W}" y="${py(pRef) - 3}" text-anchor="end">adversitesiz referans</text>`;
    s += `<path d="${path(bare)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/><path d="${path(a)}" fill="none" stroke="var(--amy)" stroke-width="2.6" stroke-linecap="round"/>`;
    const cx = px(a.n), cy = py(pHigh(out, a));
    s += `<circle cx="${cx}" cy="${cy}" r="5" fill="var(--ink)"/>`;
    for (let n = 0; n <= MAXN; n += 2) s += `<text x="${px(n)}" y="${Y0 + H + 12}" text-anchor="middle">${n}</text>`;
    s += `<text class="ax-t" x="${X0 + W / 2}" y="${Y0 + H + 26}" text-anchor="middle">Olumsuz deneyim sayısı</text><text class="ax-t" x="10" y="${Y0 + H / 2}" text-anchor="middle" transform="rotate(-90 10 ${Y0 + H / 2})">Yüksek eğilimli pay</text>`;
    dose.innerHTML = s;
    // Dağılım
    const D0 = 12, DW = 296, DY = 100, DH = 80, lo = -3, hi = 4.2, dx = (v: number) => D0 + ((v - lo) / (hi - lo)) * DW;
    const sh = shift(out, a);
    const curve = (mu: number) => { let p = ''; for (let v = lo; v <= hi + 1e-9; v += 0.1) p += `${p ? 'L' : 'M'}${dx(v).toFixed(1)} ${(DY - pdf(v, mu) * DH * 2.4).toFixed(1)}`; return p; };
    let area = `M${dx(THRESHOLD)} ${DY}`;
    for (let v = THRESHOLD; v <= hi + 1e-9; v += 0.1) area += `L${dx(v).toFixed(1)} ${(DY - pdf(v, sh) * DH * 2.4).toFixed(1)}`;
    area += `L${dx(hi)} ${DY}Z`;
    s = `<line class="grid" x1="${D0}" y1="${DY}" x2="${D0 + DW}" y2="${DY}"/><path d="${area}" fill="var(--amy)" fill-opacity=".3"/>` +
      `<path d="${curve(0)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/><path d="${curve(sh)}" fill="none" stroke="var(--amy)" stroke-width="2.6"/>` +
      `<line x1="${dx(THRESHOLD)}" y1="${DY - 62}" x2="${dx(THRESHOLD)}" y2="${DY}" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="3 3"/>` +
      `<text x="${dx(THRESHOLD) + 4}" y="${DY - 52}">yüksek eğilim bölgesi</text><text class="ax-t" x="${D0 + DW / 2}" y="${DY + 16}" text-anchor="middle">${o.label}: eğilim (düşük, yüksek)</text>`;
    dens.innerHTML = s;
    const p = pHigh(out, a);
    q('densNote').textContent = a.n === 0 && a.instMonths === 0 && sh < 0.15 ? 'Adversitesiz referans: dağılımın yalnızca küçük bir kuyruğu yüksek eğilim bölgesinde.'
      : p < 0.5 ? 'Dağılım sağa kayıyor ama çoğunluk hâlâ yüksek eğilim bölgesinin dışında: aynı yükü taşıyan çocukların büyük bölümü farklı yerlere varır.'
        : 'Dağılım belirgin biçimde kaymış; yine de herkes yüksek eğilim bölgesinde değil. Risk artar, kader belirlenmez.';
    // Mekanizma
    const m = mechanisms(a);
    for (const k of ['frontal', 'gc', 'amy'] as const) {
      q(`mw-${k}`).textContent = wordOf3(m[k]);
      q(`mb-${k}`).style.width = `${Math.round(m[k] * 100)}%`;
    }
    return true;
  }

  const bufWord = () => (buffer(a) < 0.95 ? ' Koruyucu etkenler eğriyi düzleştiriyor.' : buffer(a) > 1.05 ? ' Düşük SES yükün etkisini büyütüyor.' : '');
  return {
    draw,
    say: () => {
      const load = a.n + (a.instMonths ? ` + ${f1(instLoad(a.instMonths))} (kurum)` : '');
      return `${load} olumsuz deneyim: ${OUTCOMES[out].label.toLowerCase()} eğilimi "${levelWord(shift(out, a)).toLowerCase()}"; yüksek eğilim bölgesine geçmeyenler hâlâ ${pHigh(out, a) < 0.5 ? 'çoğunlukta' : 'azımsanmayacak sayıda'}.${bufWord()}`;
    },
    meters: (): Meter[] => OUTS.map((o) => ({ label: OUTCOMES[o].short, value: levelWord(shift(o, a)), frac: Math.min(1, pHigh(o, a) / 0.7), color: 'var(--amy)' })),
    set(p: { n?: number; intensity?: number; inst?: number; attach?: number; adult?: number; ses?: number; out?: Outcome }): void { apply(p); setPreset(null); },
  } satisfies Panel & { set(p: object): void };
}
