import '../sim.css';
import './view.css';
import { Scope, pct, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  CHANCE, COLS, EMOTIONS, EMO_NAME, GINI_MAX, GINI_MIN, KURZBAN_DEFAULT, MATRICES, TAJFEL_DEFAULT, TARGETS,
  behaviors, classify, col, confusion, corr, describeKurzban, describePos, describeTajfel, dominant, emotions,
  mixedShare, simulateMemory, simulateTajfel, society, strategyCols, userProfile, mulberry32,
  type KurzbanInputs, type Pos, type TajfelInputs,
} from './model';

type Tab = 'tajfel' | 'kurzban' | 'fiske';
const TABS: Array<[Tab, string]> = [['tajfel', 'Minimal grup'], ['kurzban', 'Kategoriyi yeniden çiz'], ['fiske', 'Sıcaklık–yetkinlik']];
const METHODS: Array<[string, string, [string, string]]> = [
  ['coin', 'Yazı tura', ['Yazı', 'Tura']],
  ['art', 'Klee / Kandinsky', ['Klee', 'Kandinsky']],
  ['dots', 'Nokta tahmini', ['Fazla tahminci', 'Az tahminci']],
];
const SIGNED = (n: number) => (n > 0 ? `+${n}` : String(n));
const EMO_VAR: Record<string, string> = { gurur: '--pfc', kiskanclik: '--dop', acima: '--pit', tiksinme: '--amy' };
const BEH: Array<[keyof ReturnType<typeof behaviors>, string]> = [
  ['yardim', 'Yardım (aktif)'], ['iliski', 'İlişki kurma (pasif)'], ['dislama', 'Dışlama (pasif)'], ['saldiri', 'Saldırı (aktif)'],
];
const RACE_NAME = ['Beyaz', 'Siyah'];
/** Şematik figürlerde yalnızca ten rengi tonu değişir (başka özellik yok). */
const SKIN = ['#E9C9A6', '#7B4B2E'];
const ORDER = [0, 3, 6, 5, 2, 1, 4, 7];

const GROUPS: Array<{ name: string; p: Pos }> = [
  { name: 'Kendi grubum', p: { w: 0.84, c: 0.84 } },
  { name: 'Yaşlılar', p: { w: 0.82, c: 0.24 } },
  { name: 'Zenginler', p: { w: 0.2, c: 0.86 } },
  { name: 'Evsizler', p: { w: 0.12, c: 0.12 } },
  { name: 'Yeni grup', p: { w: 0.55, c: 0.45 } },
];

const TEMPLATE = (id: string) => `
<div class="sim sim-biz">
  <p class="lede">"Biz" ve "Onlar" ayrımını ne kadar çabuk ve ne kadar keyfi kurarız, ve bu ayrım nasıl yeniden çizilir?</p>
  <div class="tabs" role="tablist" aria-label="Bölümler" data-ref="tabs">
    ${TABS.map(([k, n]) => `<button type="button" role="tab" class="chip" id="${id}-t-${k}" aria-controls="${id}-p-${k}" data-tab="${k}">${n}</button>`).join('')}
  </div>
  <div class="sim-bar" role="group" aria-label="Anlık çıktılar">
    <div class="sim-bar-in">
      <p class="say" data-ref="say"></p>
      <div class="meters">
        ${[0, 1, 2].map((i) => `<div class="m" style="--c: var(${['--amy', '--pfc', '--dop'][i]})"><div class="m-top"><span data-ref="l${i}"></span><b data-ref="v${i}"></b></div><div class="track"><b data-ref="b${i}"></b></div></div>`).join('')}
      </div>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section role="tabpanel" id="${id}-p-tajfel" aria-labelledby="${id}-t-tajfel" data-ref="p-tajfel" class="panel">
    <div class="box">
      <h3 class="sim-h">1. Keyfi etiket</h3>
      <div class="chips" role="group" aria-label="Etiket yöntemi" data-ref="t-methods"></div>
      <div class="row"><button class="btn btn-go" type="button" data-ref="t-draw">Etiketimi ver</button></div>
      <p class="t-label" data-ref="t-label"></p>
    </div>
    <div class="box">
      <h3 class="sim-h" data-ref="m-title"></h3>
      <p class="hintline" data-ref="m-cap"></p>
      <div class="mx" data-ref="m-grid" role="group" aria-label="Puan dağıtma matrisi"></div>
      <div class="mx mx-h" data-ref="m-hist" hidden aria-label="Sanal katılımcıların seçimleri"></div>
      <div class="mx mx-tags" data-ref="m-tags" hidden></div>
      <p class="fb" data-ref="m-fb"></p>
      <div class="row">
        <button class="btn" type="button" data-ref="m-prev">Önceki matris</button>
        <button class="btn" type="button" data-ref="m-next">Sonraki matris</button>
      </div>
    </div>
    <section aria-label="Minimal grup girdileri"><h3 class="sim-h">Sanal katılımcılar</h3><div class="sliders" data-ref="t-in"></div></section>
  </section>

  <section role="tabpanel" id="${id}-p-kurzban" aria-labelledby="${id}-t-kurzban" data-ref="p-kurzban" class="panel" hidden>
    <div class="chips" data-ref="k-presets" role="group" aria-label="Kurzban senaryoları"></div>
    <div class="stage">
      <svg viewBox="0 0 360 132" role="img" aria-label="Sekiz şematik kişi: ten rengi tonu ve forma rengi değişir" data-ref="k-stage"></svg>
      <div class="legend" data-ref="k-legend"></div>
    </div>
    <section class="chart" aria-label="Kim ne dedi hataları">
      <h3 class="sim-h">Yanlış atfedilen cümleler nereye düştü?</h3>
      <svg viewBox="0 0 360 96" role="img" aria-label="Hatalı atıfların aynı ırktan ve aynı formadan kişilere düşme oranları, şans düzeyiyle birlikte" data-ref="k-chart"></svg>
      <p class="tally" data-ref="k-tally"></p>
    </section>
    <section aria-label="Kurzban girdileri"><h3 class="sim-h">Girdiler</h3><div class="sliders" data-ref="k-in"></div></section>
    <div class="row"><button class="btn" type="button" data-ref="k-rerun">Yeni sanal katılımcılar</button></div>
  </section>

  <section role="tabpanel" id="${id}-p-fiske" aria-labelledby="${id}-t-fiske" data-ref="p-fiske" class="panel" hidden>
    <div class="stage">
      <svg viewBox="0 0 360 304" role="group" aria-label="Sıcaklık–yetkinlik haritası. Grupları sürükle ya da ok tuşlarıyla taşı." data-ref="f-stage"></svg>
      <div class="legend"><span>Daire: bir grubun haritadaki yeri (sürükle)</span><span>Soluk noktalar: bir toplumun grupları</span></div>
    </div>
    <div class="box">
      <h3 class="sim-h" data-ref="f-name"></h3>
      <div class="bars" data-ref="f-emo"></div>
      <div class="bars" data-ref="f-beh"></div>
      <p class="note" data-ref="f-note"></p>
      <label class="sl-name" for="${id}-gname">Seçili grubun adı</label>
      <input type="text" class="txt" id="${id}-gname" maxlength="24" data-ref="f-gname" autocomplete="off">
    </div>
    <section aria-label="Eşitsizlik girdileri"><h3 class="sim-h">Toplum katmanı</h3><div class="sliders" data-ref="f-in"></div></section>
  </section>

  <details class="how">
    <summary>Model nasıl çalışıyor?</summary>
    <p><b>Minimal grup.</b> Her sanal katılımcı, matristeki her sütunu dört çekimin ağırlıklı toplamıyla değerlendirir: toplam kazanç, iç grubun kazancı, iç grup lehine fark ve adalet (eşitlik). Seçim bu değerlerin yumuşak (softmax) karışımıdır. Fark ağırlığı etikete bağlılıkla büyür; iki alıcı da iç gruptaysa neredeyse sıfırlanır.</p>
    <p><b>Kurzban.</b> Bir cümle yanlış kişiye atfedilirken aday kişiler, ortak işaret sayısına göre ağırlıklanır. Irk ağırlığı sabit değildir: forma hem göze çarpıyor hem de kimin kiminle birlikte olduğunu gösteriyorsa (koalisyon ipucu), ırkın ağırlığı düşer, formanınki artar. Forma anlamsızsa ırk aynen kalır. Bu koşullu ağırlıklama kitaptaki sonucun yönünü verir; büyüklükleri modelin varsayımıdır.</p>
    <p><b>Sıcaklık–yetkinlik.</b> Haritadaki konumdan dört duygunun payı çift doğrusal biçimde hesaplanır (toplamı 1). Davranış eğilimleri bu duyguların sabit ağırlıklı toplamıdır. Toplum katmanında düşük eşitsizlikte sıcaklık ve yetkinlik birlikte gider; eşitsizlik arttıkça gruplar karışık köşelere kayar.</p>
    <p>Varsayımlar: sanal katılımcılar bağımsızdır; gerçek insanlardaki bağlam, kültür ve kişilik farkları modele girmez.</p>
  </details>

  <aside class="book" aria-label="Kitapta">
    <h3 class="sim-h">Kitapta</h3>
    <ul>
      <li><a href="#/bolum/ch11?deney=ch11-e3">Tajfel minimal grup deneyleri</a> (replikasyon: sağlam). Anlamsız bir ölçütle ayrılan katılımcılar kaynakları isimsiz iç grup üyelerine kayırdı; kitaba göre bu çoğunlukla dış grubu kötülemekten çok iç grubu yüceltme yönünde işler. Meta-analize göre etki, karşılıklılık beklentisi olduğunda güçlü.</li>
      <li><a href="#/bolum/ch11?deney=ch11-e8">Kurzban ve ark.: forma rengiyle yeniden kategorileştirme</a> (replikasyon: sağlam). Bu çalışma, ırkın otomatik ve değişmez bir kategori olmadığını, koalisyon ipucu olarak işlendiğini ve yeniden çizilebildiğini gösterir. Önceden kayıtlı replikasyon etkiyi orijinalden küçük buldu; ırk tamamen silinmiyor, belirgin biçimde azalıyor.</li>
      <li><a href="#/bolum/ch11?deney=ch11-e10">Harris ve Fiske: sıcaklık–yetkinlik ve beyin</a> (replikasyon: bilinmiyor; küçük fMRI örneklemi). Düşük sıcaklık ve düşük yetkinlikteki grupların görüntülerinde amigdala ve insula etkinleşti. Sıcaklık–yetkinlik yapısı kültürler arası çalışmalarla geniş biçimde desteklendi.</li>
      <li><a href="#/bolum/ch11?deney=ch11-e12">Durante ve ark.: 37 ülkede gelir eşitsizliği</a> (replikasyon: sağlam, ilişki korelasyonel). Eşitsizliği yüksek ülkelerde "sıcak ama yetkinsiz" ya da "yetkin ama soğuk" ikircikli algılar daha yaygındı.</li>
      <li><a href="#/bolum/ch11?deney=ch11-e1">Örtük ilişkilendirme testi (IAT)</a> burada simüle edilmedi. Replikasyon: tartışmalı. Ortalama grup etkileri büyük örneklemlerde tekrarlanıyor; ama test-tekrar güvenirliği düşük ve bireysel davranışı öngörme gücü zayıf. Örtük ölçümleri değiştiren müdahaleler davranışı değiştirmedi (Forscher ve ark. 2019).</li>
      <li><a href="#/bolum/ch11?deney=ch11-e2">Makaklarda örtük grup önyargısı</a> (Mahajan ve ark. 2011) 2014'te geri çekildi, bu yüzden bu bulguya dayanılmamalı.</li>
      <li>Temas hipotezi: gruplar arası temas önyargıyı yalnızca dar koşullarda azaltır (eşit sayı, eşit muamele, uzun temas, ortak üstün hedef). Devamı için <a href="#/bolum/ch17">Savaş ve Barış</a> bölümüne bakılabilir.</li>
    </ul>
  </aside>

  <p class="foot">Nitel model: sayılar ölçüm değildir, ilişkilerin yönünü gösterir. Kitaptan gelenler: keyfi etiketle bile iç grup kayırmacılığı (Tajfel), forma ipucunda ırka göre kümelenmenin belirgin azalması ama silinmemesi (Kurzban ve ark.), sıcaklık–yetkinlik köşelerinin duyguları, düşük–düşük köşede amigdala ve insula etkinleşmesi, eşitsizlikle artan karışık algı. Sütun puanları, ağırlıklar, yüzdeler, davranış eğilimi eşleşmeleri ve grupların haritadaki yerleri modelin varsayımıdır.</p>
</div>`;

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('biz');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  const S = {
    tab: 'tajfel' as Tab,
    seed: 3,
    t: { ...TAJFEL_DEFAULT } as TajfelInputs,
    method: 0, mine: null as 0 | 1 | null, draws: 0, mi: 0, picks: [null, null, null, null] as Array<number | null>,
    k: { ...KURZBAN_DEFAULT } as KurzbanInputs, sel: 0, kSeed: 1,
    gini: 0.35, layer: false, gsel: 0,
  };
  const gpos: Pos[] = GROUPS.map((g) => ({ ...g.p }));
  const gname: string[] = GROUPS.map((g) => g.name);
  let tRes = simulateTajfel(S.t, S.seed);
  let kRes = simulateMemory(S.k, S.kSeed);
  let soc = society(S.gini, 1);

  // ---- Alt çubuk ----
  const sayEl = $('say');
  const poke = scope.announcer($('live'), () => sayEl.textContent ?? '');
  scope.on(root, 'click', poke);
  scope.on(root, 'input', poke);
  const meter = (i: number, label: string, v: number, text?: string) => {
    $(`l${i}`).textContent = label;
    $(`v${i}`).textContent = text ?? pct(v) + '%';
    $(`b${i}`).style.width = pct(Math.min(1, Math.max(0, v))) + '%';
  };
  function renderBar(): void {
    if (S.tab === 'tajfel') {
      sayEl.textContent = describeTajfel(S.t, tRes);
      meter(0, 'İç grup lehine', tRes.favorShare);
      meter(1, 'Kazançtan vazgeçip fark', tRes.sacrificeShare);
      meter(2, 'Eşit dağıtan', tRes.fairShare);
    } else if (S.tab === 'kurzban') {
      sayEl.textContent = describeKurzban(S.k, kRes);
      meter(0, 'Irka göre karışma', kRes.sameRace);
      meter(1, 'Formaya göre karışma', kRes.sameShirt, S.k.shirts ? undefined : '—');
      if (!S.k.shirts) $('b1').style.width = '0%';
      meter(2, 'Hatalı atıf', kRes.errors / 160, String(kRes.errors));
    } else {
      const p = gpos[S.gsel], d = dominant(p);
      sayEl.textContent = describePos(gname[S.gsel], p);
      meter(0, EMO_NAME[d], emotions(p)[d]);
      meter(1, 'Yardım eğilimi', behaviors(p).yardim);
      meter(2, 'Karışık algı (toplum)', mixedShare(soc));
    }
  }

  // ---- Arayüz yardımcıları ----
  function addSlider(parent: HTMLElement, key: string, name: string, hint: string, min: number, max: number, step: number,
    fmt: (v: number) => string, onInput: (v: number) => void): (v: number) => void {
    const w = document.createElement('div');
    w.innerHTML = `<div class="sl-top"><label class="sl-name" for="${id}-s-${key}">${name}</label><span class="sl-val"></span></div>` +
      `<input type="range" id="${id}-s-${key}" min="${min}" max="${max}" step="${step}"><p class="sl-hint">${hint}</p>`;
    parent.appendChild(w);
    const inp = w.querySelector('input') as HTMLInputElement, val = w.querySelector('.sl-val') as HTMLElement;
    const set = (v: number) => { inp.value = String(v); val.textContent = fmt(v); inp.setAttribute('aria-valuetext', fmt(v)); };
    scope.on(inp, 'input', () => { const v = Number(inp.value); set(v); onInput(v); });
    return set;
  }
  function addToggle(parent: HTMLElement, name: string, hint: string, onToggle: () => void): (on: boolean) => void {
    const w = document.createElement('div');
    w.innerHTML = `<button type="button" class="btn tg" aria-pressed="false">${name}</button><p class="sl-hint">${hint}</p>`;
    parent.appendChild(w);
    const b = w.querySelector('button') as HTMLButtonElement;
    scope.on(b, 'click', onToggle);
    return (on) => b.setAttribute('aria-pressed', String(on));
  }
  function addChips(host: HTMLElement, names: string[], onPick: (i: number) => void): (i: number) => void {
    const bs = names.map((n, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = n; b.setAttribute('aria-pressed', 'false');
      scope.on(b, 'click', () => onPick(i));
      host.appendChild(b);
      return b;
    });
    return (i) => bs.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j)));
  }
  function bars(host: HTMLElement, defs: Array<[string, string]>): (vals: number[]) => void {
    const rows = defs.map(([label, cv]) => {
      const r = document.createElement('div');
      r.className = 'bar-r';
      r.style.setProperty('--c', `var(${cv})`);
      r.innerHTML = `<span class="bar-l">${label}</span><div class="track"><b></b></div><em></em>`;
      host.appendChild(r);
      return [r.querySelector('b') as HTMLElement, r.querySelector('em') as HTMLElement];
    });
    return (vals) => rows.forEach(([b, e], i) => { b.style.width = pct(vals[i]) + '%'; e.textContent = pct(vals[i]) + '%'; });
  }

  // =================================================================== 1) Tajfel
  const names = () => METHODS[S.method][2];
  const grpName = (g: number) => `${names()[g]} grubu`;
  const mGrid = $('m-grid'), mHist = $('m-hist'), mTags = $('m-tags');
  const colBtns: HTMLButtonElement[] = [];
  const rowLab = document.createElement('div');
  rowLab.className = 'rl';
  rowLab.innerHTML = '<span>İç</span><span>Dış</span>';
  mGrid.appendChild(rowLab);
  for (let c = 0; c < COLS; c++) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cell'; b.innerHTML = '<span class="a"></span><span class="b"></span>';
    scope.on(b, 'click', () => pick(c));
    mGrid.appendChild(b); colBtns.push(b);
  }
  mHist.appendChild(Object.assign(document.createElement('div'), { className: 'rl' }));
  mTags.appendChild(Object.assign(document.createElement('div'), { className: 'rl' }));
  const histBars: Array<[HTMLElement, HTMLElement]> = [], tagEls: HTMLElement[] = [];
  for (let c = 0; c < COLS; c++) {
    const h = document.createElement('div');
    h.className = 'hb'; h.innerHTML = '<i></i><span></span>';
    mHist.appendChild(h); histBars.push([h.querySelector('i') as HTMLElement, h.querySelector('span') as HTMLElement]);
    const t = document.createElement('span');
    t.className = 'tg2'; mTags.appendChild(t); tagEls.push(t);
  }
  function pick(c: number): void {
    S.picks[S.mi] = c;
    renderMatrix(); renderBar();
  }
  function renderLabel(): void {
    $('t-label').textContent = S.mine === null
      ? 'Henüz etiket yok. Yöntem seçilip "Etiketimi ver"e basılınca puan dağıtma matrisi açılır.'
      : `Etiketin: ${grpName(S.mine)}. Ölçüt anlamsız: etiket rastgele verildi. Puanlar isimsiz kişilere gidecek; yalnızca hangi grupta olduğu bilinir.`;
  }
  function drawLabel(): void {
    S.draws++;
    S.mine = mulberry32(S.seed * 31 + S.draws)() < 0.5 ? 0 : 1;
    S.picks = [null, null, null, null];
    renderLabel(); renderMatrix(); renderBar();
  }
  function renderMatrix(): void {
    const m = MATRICES[S.mi], mine = S.mine, picked = S.picks[S.mi];
    $('m-title').textContent = `2. Puan dağıt: matris ${S.mi + 1} / ${MATRICES.length} (${m.kind} türü)`;
    const other = mine === null ? '' : S.t.control ? `${grpName(mine)}'ndan başka biri` : `${grpName(1 - mine)}'ndan biri`;
    $('m-cap').textContent = mine === null
      ? 'Önce etiket gerekli.'
      : `Bir sütun seç. Üst sayı: ${grpName(mine)}'ndan biri alır. Alt sayı: ${other} alır.`;
    colBtns.forEach((b, c) => {
      const i = col(m, c);
      b.querySelector('.a')!.textContent = String(i.own);
      b.querySelector('.b')!.textContent = String(i.other);
      b.disabled = mine === null;
      b.setAttribute('aria-pressed', String(picked === c));
      b.setAttribute('aria-label', `Sütun ${c + 1}: üst ${i.own}, alt ${i.other}`);
    });
    mHist.hidden = mTags.hidden = picked === null;
    ($('m-prev') as HTMLButtonElement).disabled = S.mi === 0;
    ($('m-next') as HTMLButtonElement).disabled = S.mi === MATRICES.length - 1;
    if (picked === null) { $('m-fb').textContent = mine === null ? '' : 'Seçimden sonra sanal katılımcıların dağılımı görünür.'; return; }
    const s = strategyCols(m), i = col(m, picked), k = classify(m, picked);
    histBars.forEach(([bar, t], c) => { bar.style.height = Math.round(tRes.hist[S.mi][c] * 100 * 1.1) + 'px'; t.textContent = pct(tRes.hist[S.mi][c]) + '%'; });
    tagEls.forEach((t, c) => {
      t.textContent = [c === s.mjp ? 'T' : '', c === s.mip ? 'İ' : '', c === s.md ? 'F' : '', c === s.fair ? '=' : ''].join('');
    });
    const prof = userProfile(S.picks);
    $('m-fb').textContent = `Seçim: üst ${i.own}, alt ${i.other} (fark ${SIGNED(i.diff)}, toplam ${i.joint}). ` +
      (k.fair ? 'Eşit dağıttı. ' : k.favors ? (k.sacrifices ? 'İç grubun mutlak kazancından vazgeçip farkı büyüttü. ' : 'İç grup lehine. ') : 'Dış grup lehine. ') +
      (prof.kind !== 'none' ? `Şimdiye kadar: ${prof.text}. ` : '') + 'Sütun işaretleri: T en büyük toplam, İ en büyük iç grup kazancı, F en büyük fark, = eşit.';
  }
  scope.on($('m-prev'), 'click', () => { S.mi = Math.max(0, S.mi - 1); renderMatrix(); });
  scope.on($('m-next'), 'click', () => { S.mi = Math.min(MATRICES.length - 1, S.mi + 1); renderMatrix(); });
  scope.on($('t-draw'), 'click', drawLabel);
  const setMethod = addChips($('t-methods'), METHODS.map((m) => m[1]), (i) => { S.method = i; setMethod(i); S.mine = null; S.picks = [null, null, null, null]; renderLabel(); renderMatrix(); });
  const tIn = $('t-in');
  function changeT(): void { tRes = simulateTajfel(S.t, S.seed); renderMatrix(); renderBar(); }
  const sIdent = addSlider(tIn, 'id', 'Etikete bağlılık', 'Yüksek: "biz" duygusu güçlü; fark ağırlığı artar.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.t.ident = v; changeT(); });
  const sFair = addSlider(tIn, 'fa', 'Adalet duyarlılığı', 'Yüksek: eşit dağıtmaya yönelim güçlenir.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.t.fair = v; changeT(); });
  const tgControl = addToggle(tIn, 'Kontrol: iki alıcı da iç grup', 'Etiket ayrımı kalkınca fark seçimi de azalır.', () => { S.t.control = !S.t.control; syncT(); changeT(); });
  const rerunT = document.createElement('button');
  rerunT.type = 'button'; rerunT.className = 'btn'; rerunT.textContent = 'Yeni sanal katılımcılar';
  tIn.appendChild(rerunT);
  scope.on(rerunT, 'click', () => { S.seed++; changeT(); });
  function syncT(): void { sIdent(S.t.ident); sFair(S.t.fair); tgControl(S.t.control); setMethod(S.method); }

  // =================================================================== 2) Kurzban
  const kStage = $<SVGElement>('k-stage');
  const defs = svg('defs', {}, kStage);
  const patId = `${id}-stripe`;
  const pat = svg('pattern', { id: patId, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  svg('rect', { width: 6, height: 6, class: 'sh1' }, pat);
  svg('rect', { width: 2.4, height: 6, class: 'stripe' }, pat);
  const people = ORDER.map((ti, k) => {
    const t = TARGETS[ti], x = 28 + k * 43.5;
    const g = svg('g', { transform: `translate(${x},0)`, class: 'pp', tabindex: 0, role: 'button' }, kStage);
    svg('rect', { class: 'sel', x: -19, y: 6, width: 38, height: 70, rx: 8 }, g);
    svg('circle', { class: 'head', cx: 0, cy: 19, r: 8, fill: SKIN[t.race] }, g);
    const body = svg('rect', { class: 'body', x: -14, y: 30, width: 28, height: 38, rx: 7 }, g);
    if (t.race === 0) svg('circle', { class: 'badge', cx: 0, cy: 48, r: 4.5 }, g); else svg('rect', { class: 'badge', x: -4.5, y: 43.5, width: 9, height: 9 }, g);
    svgText(g, { class: 'nm', y: 88, 'text-anchor': 'middle' }, `${ti + 1}`);
    const pr = svgText(g, { class: 'pr', y: 104, 'text-anchor': 'middle' }, '');
    scope.on(g as unknown as HTMLElement, 'click', () => { S.sel = ti; renderK(); });
    scope.on(g as unknown as HTMLElement, 'keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); S.sel = ti; renderK(); } });
    return { ti, g, body, pr, t };
  });
  svgText(kStage, { class: 'cap', x: 180, y: 126, 'text-anchor': 'middle' }, '');
  const kCap = kStage.lastChild as SVGElement;
  $('k-legend').innerHTML = `<span>Ten rengi tonu: açık = ${RACE_NAME[0]}, koyu = ${RACE_NAME[1]} (şematik figürler; başka özellik yok)</span>` +
    '<span>Rozet: daire ya da kare (yalnızca okunurluk için, anlam taşımaz)</span><span>Forma: düz = sarı takım, çizgili = gri takım</span>';
  const kChart = $<SVGElement>('k-chart');
  const CX0 = 132, CX1 = 336, cx = (v: number) => CX0 + v * (CX1 - CX0);
  svg('line', { class: 'ch-line', x1: cx(CHANCE.same), x2: cx(CHANCE.same), y1: 6, y2: 66 }, kChart);
  svgText(kChart, { class: 'ch-t', x: cx(CHANCE.same), y: 82, 'text-anchor': 'middle' }, 'şans düzeyi %43');
  const kBars = [0, 1].map((i) => {
    const y = 12 + i * 28;
    svgText(kChart, { class: 'ch-t', x: 4, y: y + 12 }, i === 0 ? 'Aynı ırktan kişiye' : 'Aynı formadan kişiye');
    const r = svg('rect', { class: i === 0 ? 'cb race' : 'cb shirt', x: CX0, y, height: 18, width: 0 }, kChart);
    const t = svgText(kChart, { class: 'ch-v', y: y + 13 }, '');
    return { r, t };
  });
  function renderK(): void {
    const u = S.k;
    const w = confusion(u, S.sel);
    people.forEach((p) => {
      p.body.setAttribute('class', 'body ' + (u.shirts ? (p.t.shirt === 1 ? 'b1' : 'sh0') : 'sh-n'));
      if (u.shirts && p.t.shirt === 1) p.body.setAttribute('fill', `url(#${patId})`); else p.body.removeAttribute('fill');
      p.g.classList.toggle('on', p.ti === S.sel);
      p.g.setAttribute('aria-pressed', String(p.ti === S.sel));
      p.g.setAttribute('aria-label', `Kişi ${p.ti + 1}: ${RACE_NAME[p.t.race]}${u.shirts ? ', ' + (p.t.shirt ? 'gri' : 'sarı') + ' forma' : ''}`);
      p.pr.textContent = p.ti === S.sel ? 'cümle' : '%' + pct(w[p.ti]);
    });
    kCap.textContent = `Seçili kişi ${S.sel + 1}: cümlesi yanlış atfedilirse her kişiye düşme olasılığı altta.`;
    const vals = [kRes.sameRace, u.shirts ? kRes.sameShirt : 0];
    kBars.forEach((b, i) => {
      b.r.setAttribute('width', String(vals[i] * (CX1 - CX0)));
      b.t.setAttribute('x', String(cx(vals[i]) + 4));
      b.t.textContent = i === 1 && !u.shirts ? 'forma yok' : pct(vals[i]) + '%';
    });
    $('k-tally').textContent = `${kRes.errors} hatalı atıf (40 sanal katılımcı x 8 cümle). Her çubuk, hatalı atıfların o ortak işarete sahip kişilere düşen payıdır.`;
    markK(KP.findIndex((p) => JSON.stringify(p[1]) === JSON.stringify(S.k))); renderBar();
  }
  const KP: Array<[string, KurzbanInputs]> = [
    ['Aşama 1: yalnızca ırk', { ...KURZBAN_DEFAULT }],
    ['Aşama 2: forma eklendi', { ...KURZBAN_DEFAULT, shirts: true }],
    ['Forma var ama anlamsız', { ...KURZBAN_DEFAULT, shirts: true, coalition: 0 }],
  ];
  const markK = addChips($('k-presets'), KP.map((p) => p[0]), (i) => { S.k = { ...KP[i][1] }; changeK(true); });
  const kIn = $('k-in');
  const tgShirts = addToggle(kIn, 'Formalar giyildi', 'İki takım forması: sarı ve gri.', () => { S.k.shirts = !S.k.shirts; changeK(true); });
  const sVis = addSlider(kIn, 'vis', 'Forma ne kadar göze çarpıyor', 'Yüksek: forma rengi hemen fark edilir.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.k.shirtVis = v; changeK(); });
  const sCoal = addSlider(kIn, 'coal', 'Forma koalisyonu belli ediyor mu', 'Yüksek: forma kimin kiminle birlikte olduğunu gösterir. Sıfır: anlamsız giysi.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.k.coalition = v; changeK(); });
  const sRace = addSlider(kIn, 'race', 'Irk ipucunun ağırlığı', 'Forma yokken ırk, mevcut tek koalisyon ipucu gibi işlenir.', 0, 1, 0.05, (v) => pct(v) + '%', (v) => { S.k.raceSal = v; changeK(); });
  function changeK(sync = false): void {
    kRes = simulateMemory(S.k, S.kSeed);
    if (sync) { tgShirts(S.k.shirts); sVis(S.k.shirtVis); sCoal(S.k.coalition); sRace(S.k.raceSal); }
    renderK();
  }
  scope.on($('k-rerun'), 'click', () => { S.kSeed++; changeK(); });

  // =================================================================== 3) Fiske
  const fStage = $<SVGElement>('f-stage');
  const X0 = 44, X1 = 346, Y0 = 12, Y1 = 262;
  const px = (w: number) => X0 + w * (X1 - X0), py = (c: number) => Y1 - c * (Y1 - Y0);
  const xm = px(0.5), ym = py(0.5);
  const Q: Array<[string, number, number, number, number, string, string]> = [
    ['gurur', xm, Y0, X1, ym, 'Gurur', 'end'], ['kiskanclik', X0, Y0, xm, ym, 'Kıskançlık', 'start'],
    ['acima', xm, ym, X1, Y1, 'Acıma', 'end'], ['tiksinme', X0, ym, xm, Y1, 'Tiksinme', 'start'],
  ];
  for (const [k, x0, y0, x1, y1, lab, anc] of Q) {
    svg('rect', { class: 'quad', x: x0, y: y0, width: x1 - x0, height: y1 - y0, style: `fill: var(${EMO_VAR[k]})` }, fStage);
    svgText(fStage, { class: 'qlab', x: anc === 'end' ? x1 - 6 : x0 + 6, y: y0 + 14, 'text-anchor': anc }, lab);
  }
  svg('rect', { class: 'frame', x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0 }, fStage);
  svgText(fStage, { class: 'ax', x: xm, y: 284, 'text-anchor': 'middle' }, 'Sıcaklık (iyi niyet algısı) →');
  svgText(fStage, { class: 'ax', x: X0, y: 276, 'text-anchor': 'start' }, 'düşük');
  svgText(fStage, { class: 'ax', x: X1, y: 276, 'text-anchor': 'end' }, 'yüksek');
  svgText(fStage, { class: 'ax', x: 0, y: 0, 'text-anchor': 'middle', transform: `translate(12,${(Y0 + Y1) / 2}) rotate(-90)` }, 'Yetkinlik →');
  const layer = svg('g', { class: 'soc' }, fStage);
  const dots = soc.map(() => svg('circle', { r: 3.2 }, layer));
  const toks = GROUPS.map((_, i) => {
    const g = svg('g', { class: 'tok', tabindex: 0, role: 'button' }, fStage);
    svg('circle', { class: 'hit', r: 22 }, g);
    svg('circle', { class: 'dot', r: 13 }, g);
    svgText(g, { class: 'tl', y: 4, 'text-anchor': 'middle' }, String(i + 1));
    const nm = svgText(g, { class: 'tn', y: 29, 'text-anchor': 'middle' }, '');
    return { g, nm };
  });
  function placeAll(): void {
    toks.forEach((t, i) => {
      t.g.style.transform = `translate(${px(gpos[i].w).toFixed(1)}px, ${py(gpos[i].c).toFixed(1)}px)`;
      t.g.classList.toggle('on', i === S.gsel);
      t.nm.textContent = gname[i];
      t.g.setAttribute('aria-label', `${gname[i]}: sıcaklık %${pct(gpos[i].w)}, yetkinlik %${pct(gpos[i].c)}`);
    });
  }
  const emoBars = bars($('f-emo'), EMOTIONS.map((e) => [EMO_NAME[e], EMO_VAR[e]] as [string, string]));
  const behBars = bars($('f-beh'), BEH.map(([, l]) => [l, '--ink'] as [string, string]));
  const NOTE_AMY = 'Kitapta (Harris ve Fiske): düşük sıcaklık ve düşük yetkinlikteki grupların görüntülerinde amigdala ve insula etkinleşti, iğrenç nesnelere verilen tepkiye benzer biçimde. Küçük fMRI örneklemi; replikasyonu bilinmiyor.';
  const NOTE_MIX = 'Kitapta (Harris ve Fiske): karışık köşelerdeki grupların görüntülerinde vmPFC etkinleşti. Aynı grubu birey olarak düşünmek (ör. hangi yemeği seveceğini) beyin tepkisini değiştirebiliyor.';
  function renderF(): void {
    const p = gpos[S.gsel];
    placeAll();
    $('f-name').textContent = `${gname[S.gsel]}: sıcaklık %${pct(p.w)}, yetkinlik %${pct(p.c)}`;
    emoBars(EMOTIONS.map((e) => emotions(p)[e]));
    const b = behaviors(p);
    behBars(BEH.map(([k]) => b[k]));
    $('f-note').textContent = dominant(p) === 'tiksinme' ? NOTE_AMY : (dominant(p) === 'gurur' ? 'Yüksek sıcaklık ve yüksek yetkinlik: kendi gruba benzeyen gruplar için tipik köşe.' : NOTE_MIX);
    const inp = $<HTMLInputElement>('f-gname');
    if (document.activeElement !== inp) inp.value = gname[S.gsel];
    renderBar();
  }
  function renderSoc(): void {
    soc = society(S.gini, 1);
    dots.forEach((d, i) => { d.setAttribute('cx', px(soc[i].w).toFixed(1)); d.setAttribute('cy', py(soc[i].c).toFixed(1)); });
    layer.setAttribute('visibility', S.layer ? 'visible' : 'hidden');
    $('f-corr').textContent = `Toplumdaki ${soc.length} grup: karışık köşede %${pct(mixedShare(soc))}; sıcaklık ile yetkinlik arasındaki ilişki r = ${corr(soc).toFixed(2).replace('.', ',')}.`;
    renderBar();
  }
  // Sürükleme ve klavye
  let drag = -1;
  const toPos = (ev: PointerEvent): Pos => {
    const m = (fStage as unknown as SVGSVGElement).getScreenCTM()!.inverse();
    const pt = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m);
    const cl = (v: number) => Math.min(0.97, Math.max(0.03, v));
    return { w: cl((pt.x - X0) / (X1 - X0)), c: cl((Y1 - pt.y) / (Y1 - Y0)) };
  };
  toks.forEach((t, i) => {
    scope.on(t.g as unknown as HTMLElement, 'pointerdown', (ev: PointerEvent) => {
      drag = i; S.gsel = i; t.g.classList.add('drag');
      (t.g as unknown as Element).setPointerCapture?.(ev.pointerId);
      ev.preventDefault(); renderF();
    });
    scope.on(t.g as unknown as HTMLElement, 'pointermove', (ev: PointerEvent) => {
      if (drag !== i) return;
      gpos[i] = toPos(ev); renderF();
    });
    const end = () => { if (drag === i) { drag = -1; t.g.classList.remove('drag'); poke(); } };
    scope.on(t.g as unknown as HTMLElement, 'pointerup', end);
    scope.on(t.g as unknown as HTMLElement, 'pointercancel', end);
    scope.on(t.g as unknown as HTMLElement, 'focus', () => { if (S.gsel !== i) { S.gsel = i; renderF(); } });
    scope.on(t.g as unknown as HTMLElement, 'keydown', (ev) => {
      const d: Record<string, [number, number]> = { ArrowLeft: [-0.04, 0], ArrowRight: [0.04, 0], ArrowUp: [0, 0.04], ArrowDown: [0, -0.04] };
      const v = d[ev.key];
      if (!v) return;
      ev.preventDefault();
      gpos[i] = { w: Math.min(0.97, Math.max(0.03, gpos[i].w + v[0])), c: Math.min(0.97, Math.max(0.03, gpos[i].c + v[1])) };
      S.gsel = i; renderF(); poke();
    });
  });
  scope.on($('f-gname'), 'input', () => {
    gname[S.gsel] = ($('f-gname') as HTMLInputElement).value.trim() || `Grup ${S.gsel + 1}`;
    placeAll(); renderBar();
  });
  const fIn = $('f-in');
  const tgLayer = addToggle(fIn, 'Bir toplumun gruplarını göster', 'Soluk noktalar bir ülkedeki 40 grubun algılanan yerleridir.', () => { S.layer = !S.layer; tgLayer(S.layer); renderSoc(); });
  const sGini = addSlider(fIn, 'gini', 'Gelir eşitsizliği (Gini)', 'Arttıkça gruplar "sıcak ama yetkinsiz" ya da "yetkin ama soğuk" köşelere kayar.', GINI_MIN, GINI_MAX, 0.01, (v) => v.toFixed(2).replace('.', ','), (v) => { S.gini = v; renderSoc(); });
  const corrEl = document.createElement('p');
  corrEl.className = 'sl-hint'; corrEl.setAttribute('data-ref', 'f-corr');
  fIn.appendChild(corrEl);

  // =================================================================== Sekmeler
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  function setTab(t: Tab): void {
    S.tab = t;
    tabs.forEach((b) => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.setAttribute('aria-pressed', String(on)); b.tabIndex = on ? 0 : -1; });
    for (const [k] of TABS) $(`p-${k}`).hidden = k !== t;
    renderBar();
  }
  tabs.forEach((b, i) => {
    scope.on(b, 'click', () => setTab(b.dataset.tab as Tab));
    scope.on(b, 'keydown', (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const nb = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      nb.focus(); setTab(nb.dataset.tab as Tab);
    });
  });

  syncT(); renderLabel(); renderMatrix();
  changeK(true);
  sGini(S.gini); tgLayer(S.layer); renderSoc(); renderF();
  setTab('tajfel');

  // =================================================================== Tur
  const setPos = (i: number, w: number, c: number) => { gpos[i] = { w, c }; S.gsel = i; };
  const tour = createTour(scope, [
    {
      title: 'Keyfi bir etiket',
      text: 'Yazı tura gibi anlamsız bir ölçütle iki gruptan birine atanırsın. Sonra iki isimsiz kişiye puan dağıtırsın: biri senin grubundan, biri öbüründen.',
      look: 'Matriste bir sütun seç; ilk sayı iç grup üyesinin, ikincisi dış grup üyesinin puanı.',
      apply: () => { setTab('tajfel'); S.t = { ...TAJFEL_DEFAULT }; syncT(); if (S.mine === null) drawLabel(); else changeT(); },
    },
    {
      title: 'Fark mı, kazanç mı?',
      text: 'Matris 1\'de en büyük toplam ve en büyük iç grup kazancı sağ uçtadır; en büyük fark sol uçtadır. Sanal katılımcıların çoğu, iç grubun mutlak kazancından vazgeçip farkı seçer (kitapta: kayırmacılık, keyfi etiketle bile).',
      look: 'Sütun altlarındaki dağılımda sol uçta (F) kümelenme. "Kontrol" anahtarı ikinci alıcıyı da iç grup yapar ve fark seçimi çöker.',
      apply: () => { setTab('tajfel'); S.t = { ...TAJFEL_DEFAULT }; syncT(); S.mi = 0; if (S.mine === null) drawLabel(); if (S.picks[0] === null) S.picks[0] = 1; changeT(); },
    },
    {
      title: 'Irk: koalisyon ipucu',
      text: 'Kim ne dedi? Forma yokken yanlış atıflar çoğunlukla aynı ırktan kişiye gider. Irk burada otomatik bir kategori gibi görünür.',
      look: 'Irka göre çubuğun şans düzeyinin (%43) çok üstünde olması.',
      apply: () => { setTab('kurzban'); S.k = { ...KURZBAN_DEFAULT }; S.sel = 0; changeK(true); },
    },
    {
      title: 'Forma gelince',
      text: 'İki takımın forması giyilince ve forma koalisyonu belli edince karışmalar formaya göre kümelenir; ırka göre kümelenme belirgin azalır ama tamamen silinmez. Irk değişmez bir kategori değil, yeniden çizilebilir bir ipucudur.',
      look: 'Irk çubuğunun küçülüp forma çubuğunun büyümesi. "Forma var ama anlamsız" çipine geçince ne olur?',
      apply: () => { setTab('kurzban'); S.k = { ...KURZBAN_DEFAULT, shirts: true }; changeK(true); },
    },
    {
      title: 'Sıcaklık–yetkinlik haritası',
      text: 'Gruplar iki eksende konumlanır ve köşe duyguyu belirler. "Yeni grup" düşük–düşük köşeye sürüklenince tiksinme ve dışlama baskın olur. Sağ altta duran "Yaşlılar" ise acıma ve yardım uyandırır.',
      look: 'Bir daireyi sürükle; alt çubukta duygu ve davranış çubukları değişir.',
      apply: () => { setTab('fiske'); S.layer = false; tgLayer(false); renderSoc(); setPos(4, 0.14, 0.2); renderF(); },
    },
    {
      title: 'Eşitsizlik ve karışık algı',
      text: 'Toplum katmanını aç ve Gini\'yi yükselt: gruplar karışık köşelere kayar ve karışık stereotip payı artar. Kitaptaki 37 ülke bulgusu korelasyoneldir.',
      look: 'Alt çubukta "Karışık algı (toplum)" yüzdesi.',
      apply: () => { setTab('fiske'); S.layer = true; tgLayer(true); S.gini = 0.5; sGini(0.5); renderSoc(); renderF(); },
    },
  ]);
  root.querySelector('.lede')!.after(tour.el);

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
