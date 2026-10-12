// Sekme 3: Ahlaki gelişim (Kohlberg): Heinz ikilemi, yaşa göre aşama dağılımı, eleştiriler ve Blake'in adalet çalışması.
import { LEVEL_NAMES, actProb, fairness, levelOf, levelShares, stageDist } from './model';
import { bookBox, chipRow, el, makeSlider, pc, type Ctx, type Meter, type Panel } from './ui';

type Stance = 'yes' | 'no';
type Crit = 'culture' | 'gender' | 'action';
type Society = 'late' | 'none';
const LEVEL_COLORS = ['var(--dop)', 'var(--pfc)', 'var(--pit)'];

// Heinz gerekçeleri: aynı karar her aşamadan savunulabilir. Metinler özgündür.
const REASONS: Record<Stance, string[]> = {
  yes: [
    'Karısını ölüme bırakırsa herkes onu suçlar, başı derde girer.',
    'Karısına ihtiyacı var; o da ileride ona aynı iyiliği yapar.',
    'İyi bir koca karısını kurtarmak ister; herkes bunu anlar.',
    'Karısına bakmak görevidir; bu görev bu kez yasanın önüne geçer.',
    'Yaşama hakkı mülkiyet hakkından önce gelir; böyle bir yasa adil değildir.',
    'Bir insanın hayatı her kuralın üstündedir; vicdan bunu gerektirir.',
  ],
  no: [
    'Çalarsa yakalanır ve hapse girer.',
    'Hapse düşerse kendine hiçbir yararı kalmaz.',
    'Hırsız diye anılmak ailesini utandırır; iyi insan böyle yapmaz.',
    'Yasa herkes için geçerli; çalmak düzeni bozar.',
    'Mülkiyet toplumsal anlaşmanın parçası; çare yasal yoldan aranmalı.',
    'Başkasının hakkını çiğnemek ilkeye aykırı; adil bir yol bulunmalı.',
  ],
};

export function createMoralPanel(ctx: Ctx, host: HTMLElement) {
  let age = 30, stance: Stance = 'yes', stage = 3, crit: Crit = 'culture', society: Society = 'late', pressure = 0.3, fAge = 10;
  let dirty = true;

  host.innerHTML =
    `<p class="note">Kohlberg ahlaki ikilemlerde <em>kararı</em> değil <em>gerekçeyi</em> sınıflandırır. Önce aynı kararın farklı aşamalardan nasıl savunulduğuna, sonra yaşa göre dağılıma bak.</p>` +
    `<div class="card"><h3 class="sim-h">Heinz ikilemi</h3><p>Heinz'in karısı ölümcül hasta. Kurtaracak tek ilaç eczacıda ve çok pahalı; Heinz parayı bulamıyor. İlacı çalmalı mı?</p>` +
    `<div class="chips" data-ref="stance"></div><div class="chips" data-ref="stage"></div>` +
    `<blockquote class="quote"><b data-ref="qhead"></b><span data-ref="qtext"></span></blockquote>` +
    `<p class="note">Aynı karar, farklı aşamalardan savunulabilir. Aşamayı belirleyen karar değil, gerekçedir.</p></div>` +
    `<div class="card"><h3 class="sim-h">Yaşa göre gerekçe düzeyi (sanal nüfus)</h3><div class="sliders" data-ref="ctl"></div>` +
    `<div class="chart"><svg viewBox="0 0 320 150" role="img" aria-label="Yaşa göre Kohlberg aşama dağılımı" data-ref="dist"></svg></div>` +
    `<div class="legend"><span><i style="background:var(--dop)"></i>Gelenek öncesi (ceza/ödül)</span><span><i style="background:var(--pfc)"></i>Geleneksel (ilişki/kural)</span><span><i style="background:var(--pit)"></i>Gelenek sonrası (ilke)</span></div></div>` +
    `<div class="card"><h3 class="sim-h">Kitaptaki eleştiriler</h3><div class="chips" data-ref="crit"></div><div class="critbody" data-ref="cbody"></div></div>` +
    bookBox([
      { id: 'ch07-e4', text: 'Kohlberg aşamaları: sıra desteklenmiş, evrensellik ve cinsiyet yanlılığı eleştirilmiş (karışık)' },
      { id: 'ch07-e3', text: 'Blake: yedi toplumda adalet duygusunun gelişimi' },
      { id: 'ch07-e1', text: 'Young: sağ TPJ (zihin kuramı) bozulunca niyet yargıda daha az hesaba katılır' },
      { id: 'ch07-e2', text: 'Decety: çocuk beyninde empatinin olgunlaşması' },
    ]) +
    `<details class="more"><summary>Model nasıl çalışıyor?</summary><p>Aşama dağılımı yaşla yükselen bir ortalama etrafında geniş bir yayılımdır; üst aşamalara güçlü ceza verilir. Kitaptan gelen nitel desen: çocuklar 8-10 yaşa dek çoğunlukla ilk düzeyde, ergen ve yetişkinlerin çoğu geleneksel düzeyde, 5. ve 6. aşamada tutarlı akıl yürüten neredeyse kimse yok. Yüzdeler modelin varsayımıdır. Zihin kuramı ve sağ TPJ: niyeti hesaba katmak ahlaki yargının bir bileşenidir; bu simülasyon o devreyi modellemez.</p><p>Ahlaki eylem olasılığı illüstratiftir: aşamanın eğimi küçük, bağlam baskısının etkisi büyük seçilmiştir. Bu, kitabın "akıl yürütme düzeyi eylemi nadiren öngörür" vurgusunun nitel karşılığıdır.</p></details>`;

  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;

  const setStance = chipRow(q('stance'), ctx, [{ key: 'yes', label: 'Heinz çalmalı' }, { key: 'no', label: 'Heinz çalmamalı' }], (k) => { stance = k as Stance; dirty = true; }, 'Karar');
  const setStage = chipRow(q('stage'), ctx, [1, 2, 3, 4, 5, 6].map((n) => ({ key: String(n), label: `${n}. aşama` })), (k) => { stage = +k; dirty = true; }, 'Gerekçenin aşaması');
  const ageSl = makeSlider(ctx, q('ctl'), 'mage', 'Yaş', 'Küçük çocuklar çoğunlukla ceza/ödül gerekçesi kullanır; yetişkinler çoğunlukla kural ve ilişki gerekçesi.', 5, 70, age, (v) => { age = v; dirty = true; }, (v) => `${v} yaş`, 'var(--pfc)');
  const setCrit = chipRow(q('crit'), ctx, [{ key: 'culture', label: 'Kültür (Blake)' }, { key: 'gender', label: 'Cinsiyet (Gilligan)' }, { key: 'action', label: 'Düşünce ≠ eylem' }], (k) => { crit = k as Crit; buildCrit(); dirty = true; }, 'Eleştiri');

  /* ---- Eleştiri paneli ---- */
  const cbody = q('cbody');
  let fairSvg: SVGSVGElement | null = null, actEls: Array<{ b: HTMLElement; v: HTMLElement }> = [];
  function buildCrit(): void {
    fairSvg = null; actEls = [];
    cbody.innerHTML = '';
    if (crit === 'culture') {
      el(cbody, 'p', '', 'Blake ve arkadaşları yedi toplumda 4-15 yaş çocukları haksız paylaşımlar karşısında izledi. Kendi aleyhine eşitsizliğe tepki 4-6 yaştan itibaren her toplumda vardı. Kendi lehine, öbür çocuğun aleyhine eşitsizliğe tepki ise ancak 8-10 yaşlarında ve yalnızca bazı toplumlarda ortaya çıktı.');
      const row = el(cbody, 'div', 'chips');
      const setSoc = chipRow(row, ctx, [{ key: 'late', label: 'Geç gelişen toplum' }, { key: 'none', label: 'Hiç gelişmeyen toplum' }], (k) => { society = k as Society; setSoc(society); dirty = true; }, 'Toplum tipi');
      setSoc(society);
      const ch = el(cbody, 'div', 'chart', '<svg viewBox="0 0 320 150" role="img" aria-label="Yaşa göre adalet tepkisi"></svg>');
      fairSvg = ch.firstChild as SVGSVGElement;
      const age2 = makeSlider(ctx, cbody, 'fage', 'İşaretli yaş', 'Çizgilerin o yaştaki değerini okumak için.', 4, 15, fAge, (v) => { fAge = v; dirty = true; }, (v) => `${v} yaş`, 'var(--dop)');
      void age2;
      el(cbody, 'p', 'note', 'Eğriler nitel: biçimleri modelin varsayımıdır, yaşlar ve "bazı toplumlar" ayrımı kitaptandır. Kohlberg aşamalarının sırası kültürlerarası çalışmalarda büyük ölçüde desteklenmiş; üst aşamaların evrenselliği ise eleştirilmiştir.');
    } else if (crit === 'gender') {
      el(cbody, 'p', '', 'Kohlberg\'in ilk örneklemi Amerikalı erkeklerden oluşuyordu. Gilligan, kadınların ikilemlerde adaletten çok bakımı ve ilişkiyi öne çıkardığını savundu. Aynı ikilem iki sesle yanıtlanabilir:');
      el(cbody, 'blockquote', 'quote', '<b>Adalet sesi</b><span>İlaç herkesin hakkı olmalı; kural herkese aynı uygulanmalı.</span>');
      el(cbody, 'blockquote', 'quote', '<b>Bakım sesi</b><span>Heinz ve karısı arasındaki bağ korunmalı; eczacıyla konuşup bir çıkış yolu bulunmalı.</span>');
      el(cbody, 'p', 'note', 'Yalnızca adalet ölçütüyle bakan bir sınıflama bakım odaklı gerekçeleri ilişkisel (3. aşama) görünümüne iterek geride bırakabilir. Kitap ayrıca aşama modellerinin katı alınmaması gerektiğini, geçişlerin keskin olmadığını ve aşamanın bağlama göre değişebildiğini söyler.');
    } else {
      el(cbody, 'p', '', 'Ahlaki akıl yürütme düzeyi, ahlaki eylemi nadiren öngörür. Aşağıda her aşama için "ikilemin gerçek hayat karşılığında yardım etme" olasılığı (illüstratif) var: aşamanın eğimi küçük, durumun baskısı büyük.');
      makeSlider(ctx, cbody, 'press', 'Durumun baskısı', 'Kalabalık, acele, risk, çıkar çatışması: eylemi bastırır.', 0, 100, Math.round(pressure * 100), (v) => { pressure = v / 100; dirty = true; }, (v) => (v < 30 ? 'düşük' : v > 70 ? 'yüksek' : 'orta'), 'var(--red)');
      const lst = el(cbody, 'div', 'actlist');
      actEls = [1, 2, 3, 4, 5, 6].map((n) => {
        const row = el(lst, 'div', 'arow', `<span>${n}. aşama</span><div class="track"><b></b></div><b class="av"></b>`);
        return { b: row.querySelector('.track > b') as HTMLElement, v: row.querySelector('.av') as HTMLElement };
      });
      el(cbody, 'p', 'note', 'Yüzdeler modelin varsayımıdır (kitapta yok). Gözlenecek şey eğimin düzlüğü: baskı kaydırıcısı aşamalar arasındaki farktan çok daha fazla şeyi değiştirir.');
    }
  }
  buildCrit();

  function draw(): boolean {
    if (!dirty) return false;
    dirty = false;
    setStance(stance); setStage(String(stage)); setCrit(crit);
    q('qhead').textContent = `${LEVEL_NAMES[levelOf(stage)]} · ${stage}. aşama gerekçesi: `;
    q('qtext').textContent = REASONS[stance][stage - 1];
    // Aşama dağılımı
    const d = stageDist(age);
    const X0 = 14, W = 292, bw = W / 6, base = 112, H = 88;
    let s = `<line class="grid" x1="${X0}" y1="${base}" x2="${X0 + W}" y2="${base}"/>`;
    d.forEach((p, i) => {
      const h = Math.max(1, p * H * 1.4), x = X0 + i * bw + 6;
      s += `<rect x="${x}" y="${base - h}" width="${bw - 12}" height="${h}" rx="3" fill="${LEVEL_COLORS[levelOf(i + 1)]}"/><text class="v-lbl" x="${x + (bw - 12) / 2}" y="${base - h - 4}" text-anchor="middle">${pc(p)}</text><text x="${x + (bw - 12) / 2}" y="${base + 13}" text-anchor="middle">${i + 1}</text>`;
    });
    s += `<text class="ax-t" x="${X0 + W / 2}" y="${base + 30}" text-anchor="middle">Ahlaki akıl yürütme aşaması (Kohlberg)</text>`;
    q<SVGSVGElement>('dist').innerHTML = s;
    if (fairSvg) {
      const X = 34, WW = 272, Y0 = 10, HH = 104, px = (a: number) => X + ((a - 4) / 11) * WW, py = (v: number) => Y0 + HH - v * HH;
      const line = (f: (a: number) => number) => Array.from({ length: 45 }, (_, i) => { const a = 4 + (i * 11) / 44; return `${i ? 'L' : 'M'}${px(a).toFixed(1)} ${py(f(a)).toFixed(1)}`; }).join('');
      const me = fairness(fAge, society);
      let t = `<line class="grid" x1="${X}" y1="${Y0 + HH}" x2="${X + WW}" y2="${Y0 + HH}"/><line class="grid" x1="${X}" y1="${Y0}" x2="${X}" y2="${Y0 + HH}"/>`;
      t += `<path d="${line((a) => fairness(a, society).self)}" fill="none" stroke="var(--amy)" stroke-width="2.6"/><path d="${line((a) => fairness(a, society).other)}" fill="none" stroke="var(--pit)" stroke-width="2.6" stroke-dasharray="6 4"/>`;
      t += `<line x1="${px(fAge)}" y1="${Y0}" x2="${px(fAge)}" y2="${Y0 + HH}" stroke="var(--ink)" stroke-width="1" stroke-dasharray="2 3"/><circle cx="${px(fAge)}" cy="${py(me.self)}" r="4.5" fill="var(--amy)"/><circle cx="${px(fAge)}" cy="${py(me.other)}" r="4.5" fill="var(--pit)"/>`;
      for (let a = 4; a <= 15; a += 2) t += `<text x="${px(a)}" y="${Y0 + HH + 12}" text-anchor="middle">${a}</text>`;
      t += `<text x="${X + 6}" y="${Y0 + 12}" fill="var(--red-text)" class="lbl-self">kendi aleyhine (sürekli çizgi)</text><text x="${X + 6}" y="${Y0 + 26}" class="lbl-other">başkası aleyhine (kesikli çizgi)</text>`;
      t += `<text class="ax-t" x="${X + WW / 2}" y="${Y0 + HH + 28}" text-anchor="middle">Yaş</text><text class="ax-t" x="10" y="${Y0 + HH / 2}" text-anchor="middle" transform="rotate(-90 10 ${Y0 + HH / 2})">Eşitsizliğe tepki eğilimi</text>`;
      fairSvg.innerHTML = t;
    }
    actEls.forEach((e, i) => { const p = actProb(i + 1, pressure); e.b.style.width = `${Math.round(p * 100)}%`; e.b.style.background = 'var(--red)'; e.v.textContent = pc(p); });
    return true;
  }
  void ageSl;

  return {
    draw,
    say: () => {
      const [a, b, c] = levelShares(stageDist(age));
      return `${age} yaş: gerekçelerin ${pc(a)}'i ceza/ödül, ${pc(b)}'i ilişki/kural, ${pc(c)}'i ilke odaklı. ${c < 0.07 ? '5. ve 6. aşamada tutarlı akıl yürüten neredeyse kimse yok.' : 'Üst aşamalar nadir.'}`;
    },
    meters: (): Meter[] => {
      const sh = levelShares(stageDist(age));
      return LEVEL_NAMES.map((n, i) => ({ label: n.split(' (')[0], value: pc(sh[i]), frac: sh[i], color: LEVEL_COLORS[i] }));
    },
    set(p: { age?: number; stance?: Stance; stage?: number; crit?: Crit }): void {
      if (p.age !== undefined) { age = p.age; ageSl.set(age); }
      if (p.stance) stance = p.stance;
      if (p.stage) stage = p.stage;
      if (p.crit && p.crit !== crit) { crit = p.crit; buildCrit(); }
      dirty = true;
    },
  } satisfies Panel & { set(p: object): void };
}
