import '../sim.css';
import './view.css';
import { Scope, pct, ref, svg, svgText, uid } from '../kit';
import { createTour } from '../tour';
import {
  BASE, DECK, FAIR, POT, curve, describe, evaluate, threshold, trpActive,
  type Activity, type Conditions, type RegionId,
} from './model';
import { mulberry32, shuffle } from '../rng';

type NodeId = RegionId | 'tek' | 'dec';
interface NodeDef { id: NodeId; ab: string; cap: string; grp: string; x: number; y: number }
const R = 26;
const NODES: NodeDef[] = [
  { id: 'tek', ab: 'TEKLİF', cap: '', grp: 'io', x: 180, y: 40 },
  { id: 'amy', ab: 'AMG', cap: 'amigdala · kuşku', grp: 'amy', x: 72, y: 140 },
  { id: 'insula', ab: 'INS', cap: 'insula · haksızlık', grp: 'ins', x: 72, y: 250 },
  { id: 'caud', ab: 'KAU', cap: 'kaudat · ret tatmini', grp: 'cau', x: 72, y: 360 },
  { id: 'dlpfc', ab: 'dlPFC', cap: 'adalet hedefi', grp: 'pfc', x: 288, y: 140 },
  { id: 'vm', ab: 'vmPFC', cap: 'değer · OFC', grp: 'val', x: 288, y: 250 },
  { id: 'dec', ab: 'RET', cap: 'ret eğilimi', grp: 'io', x: 180, y: 360 },
];
const byId = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<NodeId, NodeDef>;

interface EdgeDef { from: NodeId; to: NodeId; inh?: boolean }
const EDGES: EdgeDef[] = [
  { from: 'tek', to: 'amy' }, { from: 'tek', to: 'insula' }, { from: 'tek', to: 'dlpfc' }, { from: 'tek', to: 'vm' },
  { from: 'insula', to: 'caud' },
  { from: 'amy', to: 'dec' }, { from: 'insula', to: 'dec' }, { from: 'caud', to: 'dec' }, { from: 'dlpfc', to: 'dec' },
  { from: 'vm', to: 'dec', inh: true },
];

export const INFO: Record<RegionId, [string, string]> = {
  insula: ['İnsula (insula)', 'Bedenden gelen hoşnutsuzluk, iğrenme ve acı duygularını işleyen bölge. İnsandan gelen adaletsiz teklifte etkinleşir; etkinliği yükseldikçe teklifin reddi artar. Bilgisayardan gelen aynı teklifte daha az etkinleşir. İnsulanın burada iğrenmeyi mi yoksa genel bir beklenti ihlalini mi yansıttığı tartışmalıdır.'],
  amy: ['Amigdala (amygdala)', 'Tehdit ve sosyal tetikte olmayı değerlendirir. Haksız tekliften sonra etkinliği arttıkça ret olasılığı artar. Amigdalası hasarlı kişiler olağandışı cömert davranır ve haksız tekliflerde ret oranını artırmaz; kitap bunu, amigdalanın sosyal kararlara örtük bir kuşku kattığı biçiminde yorumlar (ölçüm değil, yorum).'],
  caud: ['Kaudat çekirdek (caudate)', 'Ödül devresinin bir parçası. Normu çiğneyeni cezalandırmak bu bölgeyi etkinleştirir, ceza bedelliyse daha belirgin. Reddetmenin "tatmini" budur: bedel ödense de bir şey kazandırır. Ölçülen doğrudan dopamin salımı değil, bölgedeki kan akımıdır.'],
  dlpfc: ['dlPFC (dorsolateral prefrontal korteks)', 'Genel rolü uzun vadeli çıkar ve dürtü kontrolüdür. Bu oyunda sürpriz var: sağ dlPFC susturulunca kişi adaletsiz teklifi daha sık kabul etti, ama teklifi yine adaletsiz buldu. Bölge, dürtüyü dizginleyen taraftan çok adalet hedefini eyleme çeviren taraf gibi davrandı. Yalnızca insana karşı; sol dlPFC etkisiz kaldı.'],
  vm: ['vmPFC/OFC (değer)', 'Seçeneklerin değerini ve sosyal bağlamı bağlar. Modelde teklifin parasal değerini temsil eder ve kabule doğru çeker: pay büyüdükçe etkinliği artar. Bu bölgenin ultimatum oyunundaki bu rolü kitaptaki bir ölçüme değil, modelin varsayımına dayanır.'],
};

const SLIDER_HINT = 'Karşı tarafın sana önerdiği pay. 5 ₺ eşit paydır, 0 ₺ hiçbir şey demektir';
const TURNS = DECK.length;
const f1 = (x: number): string => x.toFixed(1).replace('.', ',');

const TEMPLATE = (id: string) => `
<div class="sim sim-ult">
  <p class="lede">Adaletsiz bir teklifi, kendi zararına olsa bile neden reddederiz ve beynin hangi parçaları bu kararı çekiştirir?</p>
  <div class="chips" data-ref="chips" role="group" aria-label="Koşullar"></div>

  <div class="sim-bar" role="group" aria-label="Anlık çıktılar" data-ref="bar">
    <div class="sim-bar-in">
      <p class="say" data-ref="say"></p>
      <div class="meters">
        <div class="m" style="--c: var(--amy)"><div class="m-top"><span>Ret olasılığı</span><b data-ref="m-p">0%</b></div><div class="track"><b data-ref="b-p"></b></div></div>
        <div class="m" style="--c: var(--edge)"><div class="m-top"><span>Adaletsiz buluyor</span><b data-ref="m-j">0%</b></div><div class="track"><b data-ref="b-j"></b></div></div>
        <div class="m" style="--c: var(--edge)"><div class="m-top"><span>Kabul eşiği</span><b data-ref="m-t">0 ₺</b></div><div class="track"><b data-ref="b-t"></b></div></div>
      </div>
    </div>
  </div>
  <p class="sr-only" aria-live="polite" data-ref="live"></p>

  <section class="game" aria-label="Oyun">
    <div class="g-top"><span class="g-round" data-ref="round"></span><span class="g-who" data-ref="who"></span></div>
    <p class="g-offer" data-ref="offerText"></p>
    <div class="split" role="img" data-ref="split"><i class="me" data-ref="sMe"></i><i class="them"></i></div>
    <div class="split-lab"><span data-ref="labMe"></span><span data-ref="labThem"></span></div>
    <p class="g-rule">Kabul edersen ikiniz de teklifteki payı alırsınız. Reddedersen ikiniz de 0 ₺ alırsınız.</p>
    <div class="row g-btns" data-ref="btns">
      <button class="btn btn-acc" type="button" data-ref="accept">Kabul et</button>
      <button class="btn btn-rej" type="button" data-ref="reject">Reddet</button>
    </div>
    <div class="g-result" data-ref="result" hidden>
      <p data-ref="resultText"></p>
      <button class="btn tour-next" type="button" data-ref="next"></button>
    </div>
    <p class="g-score" data-ref="score" hidden></p>
    <ol class="g-log" data-ref="log" aria-label="Tur günlüğü"></ol>
  </section>

  <section aria-label="Beyin paneli">
    <h3 class="sim-h">Beyin paneli</h3>
    <div class="stage">
      <svg viewBox="0 0 360 428" role="group" aria-label="Dokunulabilir beyin devresi diyagramı: teklif, insula, amigdala, kaudat, dlPFC, vmPFC ve ret eğilimi" data-ref="net">
        <defs>
          <marker id="${id}-mx" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path class="mk" d="M0,1 L10,5 L0,9 z"/></marker>
          <marker id="${id}-mi" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path class="mk-bar" d="M5,0 L5,10"/></marker>
        </defs>
        <g data-ref="edges"></g>
        <g data-ref="nodes"></g>
        <text class="ser-tag" x="180" y="422" text-anchor="middle" data-ref="serTag"></text>
      </svg>
      <div class="legend">
        <span><i style="background:var(--pit)"></i>İnsula</span>
        <span><i style="background:var(--amy)"></i>Amigdala</span>
        <span><i style="background:var(--dop)"></i>Kaudat</span>
        <span><i style="background:var(--pfc)"></i>dlPFC</span>
        <span><i style="background:var(--gld)"></i>vmPFC/OFC</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="20" y2="5" stroke="var(--edge)" stroke-width="2"/><path d="M17,1 L25,5 L17,9 z" fill="var(--edge)"/></svg>ret yönünde</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><line x1="1" y1="5" x2="22" y2="5" stroke="var(--edge)" stroke-width="2" stroke-dasharray="5 3"/><line x1="23" y1="0" x2="23" y2="10" stroke="var(--edge)" stroke-width="2.4"/></svg>kabul yönünde</span>
        <span><svg viewBox="0 0 26 10" aria-hidden="true"><circle cx="13" cy="5" r="4.2" fill="none" stroke="var(--lesion)" stroke-width="1.6" stroke-dasharray="3 2"/><line x1="9" y1="9" x2="17" y2="1" stroke="var(--lesion)" stroke-width="1.6"/></svg>devre dışı</span>
      </div>
    </div>
  </section>

  <section class="detail" data-ref="detail"></section>

  <section class="chart" aria-label="Ret olasılığı eğrisi">
    <h3 class="sim-h">Teklife göre ret olasılığı</h3>
    <svg viewBox="0 0 360 232" role="img" aria-label="Teklif büyüdükçe ret olasılığının düşüşü; geçerli koşul ve ortalama kişi eğrisi" data-ref="chart"></svg>
  </section>

  <section aria-label="Girdiler">
    <h3 class="sim-h">Girdiler</h3>
    <div class="sliders">
      <div class="sl-off">
        <div class="sl-top"><label class="sl-name" for="${id}-off">Teklif (₺)</label><span class="sl-val" data-ref="offV"></span></div>
        <input type="range" id="${id}-off" min="0" max="${FAIR}" step="1" data-ref="off">
        <p class="sl-hint">${SLIDER_HINT}</p>
      </div>
    </div>
    <div class="row sess">
      <button class="btn" type="button" aria-pressed="false" data-ref="sess">İkinci oturum</button>
      <p class="sl-hint" data-ref="sessHint"></p>
    </div>
  </section>

  <details class="how">
    <summary>Model nasıl çalışıyor?</summary>
    <div class="how-in">
      <p>Teklif 5 ₺'nin altına indikçe "adaletsizlik" büyür. Her bölgenin etkinliği buna bağlıdır: insula ve amigdala insana karşı tam, bilgisayara karşı kısmen devreye girer; kaudat insulanın ardından ret etmenin tatminini hazırlar; dlPFC adalet hedefini yalnızca insana karşı uygular; vmPFC/OFC teklifin parasal değerini taşır ve kabule çeker.</p>
      <p>Bölgelerin katkıları toplanıp S biçimli bir eğriden (lojistik) ret olasılığına çevrilir. Çıktı, ortalama bir kişinin davranış eğilimidir; tek bir bireyin yanıtı rastlantıya ve kişisel farka açıktır, bu yüzden senin yanıtınla model aynı olmak zorunda değildir.</p>
      <p>"Adaletsiz buluyor" göstergesi yalnızca payın aritmetiğinden gelir. TMS koşulunda değişmemesi kitaptaki bulgudur (kötü teklifleri kontroller kadar haksız buldular), diğer koşullarda bu bir varsayımdır.</p>
      <p>Tur teklifleri tohumlu karıştırılır: aynı tohumla aynı sıra gelir, "Yeniden oyna" yeni bir sıra seçer.</p>
    </div>
  </details>

  <section class="book" aria-label="Kitapta">
    <h3 class="sim-h">Kitapta</h3>
    <ul class="book-list">
      <li><a href="#/bolum/ch15?deney=ch15-e6">Sanfey ve ark. (2003), Bölüm 15</a>: insandan gelen adaletsiz teklif insulayı etkinleştirir, bilgisayardan gelen daha az; insula etkinliği arttıkça ret artar. Replikasyon: sağlam. Tartışma: insulanın iğrenmeyi mi, genel bir beklenti ihlalini mi yansıttığı.</li>
      <li><a href="#/bolum/ch02?deney=ch02-e5">Knoch, Fehr ve ark. (2006)</a>: sağ dlPFC baskılanınca kötü teklifler daha çok kabul edilir; teklifler yine adaletsiz bulunur. Yalnızca insana karşı; sol dlPFC etkisiz. Replikasyon: karışık (bazı rTMS çalışmaları kabul oranını değiştirmedi, yalnızca karar süresini uzattı).</li>
      <li><a href="#/bolum/ch02?deney=ch02-e3">Amigdala hasarı (2013)</a>: haksız tekliften sonra amigdala etkinliği arttıkça ret artar; hasarlı kişiler cömerttir ve ret oranını artırmaz. Replikasyon: bilinmiyor; hasar bulgusu yalnızca üç hastaya dayanır.</li>
      <li><a href="#/bolum/ch02?deney=ch02-e12">Wood ve ark. (2006)</a>: serotonin azalınca işbirliği ilk oturumda düştü. Haksız tekliflerin daha sık reddi ise replikasyon notunda anılan başka çalışmalardan gelir. Replikasyon: karışık.</li>
      <li><a href="#/bolum/ch02?deney=ch02-e9">de Quervain ve ark. (2004)</a>: cezalandırma kaudatı etkinleştirir, bedel ödenince daha belirgin. Replikasyon: bilinmiyor; ölçülen şey kan akımıdır, doğrudan dopamin değil.</li>
    </ul>
  </section>

  <p class="foot">Nitel model: eğri biçimleri, ağırlıklar ve yüzdeler ölçüm değildir; bulguların yönünü ve sırasını gösterir. Kitaptan yalnızca yönler alındı (insula ve amigdala ile ret arasında artan ilişki, insana karşı daha güçlü; TMS ile kabulün artması; amigdala hasarında ret artışının olmaması; serotoninle ret artışı ilk oturumda; cezalandırmada kaudat etkinliği). Kitapta ret yüzdesi ya da eşik değeri verilmediği için bunlar uydurulmadı; 10 ₺'lik pay ve teklif sırası kurgudur. Gerçek beyin bundan çok daha karmaşıktır.</p>
</div>`;

interface LogEntry { offer: number; proposer: Conditions['proposer']; rejected: boolean; p: number }

export function mount(container: HTMLElement): () => void {
  const scope = new Scope();
  const id = uid('ult');
  container.innerHTML = TEMPLATE(id);
  const root = container.firstElementChild as HTMLElement;
  const $ = <T extends Element = HTMLElement>(name: string) => ref<T>(root, name);

  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  interface State {
    c: Conditions; offer: number; sel: RegionId | null;
    seed: number; deck: number[]; turn: number; decided: boolean; log: LogEntry[];
  }
  const S: State = { c: { ...BASE }, offer: DECK[0], sel: null, seed: 1, deck: [], turn: 0, decided: false, log: [] };
  const dealDeck = (): void => { S.deck = shuffle(DECK, mulberry32(S.seed)); S.turn = 0; S.offer = S.deck[0]; S.decided = false; S.log = []; };
  dealDeck();

  let ev = evaluate(S.offer, S.c);
  // Ekranda gösterilen (yumuşatılmış) etkinlikler
  const disp: Activity & { dec: number } = { ...ev.act, dec: ev.pReject };
  let dirtyNet = true;
  const target = (): Activity & { dec: number } => ({ ...ev.act, dec: ev.pReject });

  // ---- Ağ diyagramı ----
  const edgesG = $('edges'), nodesG = $('nodes');
  function edgePath(a: NodeDef, b: NodeDef): string {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
    const f = (n: number) => n.toFixed(1);
    return `M${f(a.x + ux * (R + 2))},${f(a.y + uy * (R + 2))} L${f(b.x - ux * (R + 3))},${f(b.y - uy * (R + 3))}`;
  }
  const edgeEls = EDGES.map((e) => ({
    e,
    p: svg('path', { class: 'edge' + (e.inh ? ' inh' : ''), d: edgePath(byId[e.from], byId[e.to]), 'marker-end': e.inh ? `url(#${id}-mi)` : `url(#${id}-mx)` }, edgesG),
  }));
  const nodeEls = {} as Record<NodeId, { g: SVGElement; fill: SVGElement; slash: SVGElement; pc: SVGElement }>;
  const label = (n: NodeDef): string => (n.id === 'tek' ? 'Teklif' : n.id === 'dec' ? 'Ret eğilimi' : INFO[n.id as RegionId][0]);
  for (const n of NODES) {
    const interactive = n.id !== 'tek' && n.id !== 'dec';
    const g = svg('g', { class: `node grp-${n.grp}`, transform: `translate(${n.x},${n.y})`, ...(interactive ? { tabindex: '0', role: 'button', 'aria-pressed': 'false', 'aria-label': label(n) } : { role: 'img', 'aria-label': label(n) }) }, nodesG);
    if (interactive) svg('circle', { r: R + 10, fill: 'transparent' }, g);
    svg('circle', { class: 'ring', r: R + 5 }, g);
    svg('circle', { class: 'base', r: R }, g);
    const fill = svg('circle', { class: 'fill', r: R - 0.8, 'fill-opacity': 0 }, g);
    const slash = svg('line', { class: 'slash', x1: -R * 0.7, y1: R * 0.7, x2: R * 0.7, y2: -R * 0.7, opacity: 0 }, g);
    svgText(g, { class: 'ab', y: -2 }, n.ab);
    const pc = svgText(g, { class: 'pct', y: 10 }, '');
    if (n.cap) svgText(g, { class: 'cap', y: R + 14 }, n.cap);
    if (interactive) {
      scope.on(g as unknown as HTMLElement, 'click', () => select(n.id as RegionId));
      scope.on(g as unknown as HTMLElement, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n.id as RegionId); } });
    }
    nodeEls[n.id] = { g, fill, slash, pc };
  }
  const serTag = $<SVGElement>('serTag');

  function silenced(rid: NodeId): boolean {
    return (rid === 'amy' && S.c.amyLesion) || (rid === 'dlpfc' && S.c.tmsRight);
  }
  function drawNet(): void {
    const d = disp;
    const partOf = (rid: string): number => Math.abs(ev.parts.find((p) => p.id === rid)?.v ?? 0);
    for (const { e, p } of edgeEls) {
      let mag: number;
      if (e.to === 'dec') mag = Math.min(1, partOf(e.from) / 3.2);
      else if (e.from === 'tek') mag = d[e.to as RegionId];
      else mag = d[e.to as RegionId];
      if (silenced(e.from)) mag = 0;
      p.style.strokeWidth = (1 + 2.2 * mag).toFixed(2);
      p.style.opacity = (0.12 + 0.78 * mag).toFixed(2);
    }
    for (const n of NODES) {
      const o = nodeEls[n.id];
      if (n.id === 'tek') {
        o.fill.setAttribute('fill-opacity', '0.08');
        o.pc.textContent = `${S.offer} ₺`;
        continue;
      }
      const les = silenced(n.id);
      const v = n.id === 'dec' ? d.dec : d[n.id];
      o.fill.setAttribute('fill-opacity', les ? '0' : (0.08 + 0.92 * v).toFixed(2));
      o.slash.setAttribute('opacity', les ? '1' : '0');
      o.g.classList.toggle('les', les);
      o.g.classList.toggle('sel', S.sel === n.id);
      o.pc.textContent = les ? '' : pct(v) + '%';
    }
    serTag.textContent = trpActive(S.c) ? 'serotonin düşük: dürtü freni zayıf' : '';
  }

  // ---- Ayrıntı paneli ----
  const detail = $('detail');
  function buildDetail(): void {
    if (!S.sel) {
      detail.innerHTML = '<p class="hint">Bir bölgeye dokun: rolünü, bu koşulda ne kadar etkin olduğunu ve ret eğilimine katkısını gör. Dolgusu koyulaştıkça bölge daha etkin, çizgiler kalınlaştıkça etki daha güçlü.</p>';
      return;
    }
    const rid = S.sel;
    const btn = rid === 'amy'
      ? `<div class="row"><button class="btn" data-ref="dTog" type="button" aria-pressed="${S.c.amyLesion}">${S.c.amyLesion ? 'Hasarı kaldır' : 'Amigdala hasarı ver'}</button></div>`
      : rid === 'dlpfc'
        ? `<div class="row"><button class="btn" data-ref="dTog" type="button" aria-pressed="${S.c.tmsRight}">${S.c.tmsRight ? 'TMS\'yi kaldır' : 'Sağ dlPFC\'ye TMS uygula'}</button></div>`
        : '';
    detail.innerHTML =
      `<div class="d-head grp-${NODES.find((n) => n.id === rid)!.grp}"><span class="d-name">${INFO[rid][0]}</span><span class="d-pct" data-ref="dPct">0%</span></div>` +
      `<div class="track grp-${NODES.find((n) => n.id === rid)!.grp}"><b data-ref="dFill"></b></div>` +
      `<p>${INFO[rid][1]}</p>` +
      `<ul class="d-list" data-ref="dList"></ul>` + btn;
    updateDetail();
  }
  scope.on(detail, 'click', (e) => {
    if (!S.sel || !(e.target as Element).closest('[data-ref="dTog"]')) return;
    if (S.sel === 'amy') S.c.amyLesion = !S.c.amyLesion;
    else if (S.sel === 'dlpfc') S.c.tmsRight = !S.c.tmsRight;
    syncUi();
    refresh();
    buildDetail();
  });
  function updateDetail(): void {
    if (!S.sel) return;
    const rid = S.sel;
    const off = silenced(rid);
    ref(detail, 'dPct').textContent = off ? 'devre dışı' : pct(ev.act[rid]) + '%';
    ref(detail, 'dFill').style.width = (off ? 0 : pct(ev.act[rid])) + '%';
    const part = ev.parts.find((p) => p.id === rid);
    const rows: string[] = [];
    if (part) rows.push(`<li><span>Ret eğilimine katkı</span><span class="v">${part.v < 0 ? '−' : '+'}${Math.abs(part.v).toFixed(2)}</span></li>`);
    rows.push(`<li><span>${part && part.v < 0 ? 'Kabule doğru çeker' : 'Reddetmeye doğru çeker'}</span><span class="v">${off ? 'yok' : ''}</span></li>`);
    if (rid === 'dlpfc' && S.c.tmsLeft) rows.push('<li><span>Sol dlPFC susturuldu: etkisiz kaldı</span></li>');
    if (rid === 'dlpfc' && S.c.proposer === 'computer') rows.push('<li><span>Bilgisayar karşıda: adalet hedefi devreye girmiyor</span></li>');
    ref(detail, 'dList').innerHTML = rows.join('');
  }
  function select(rid: RegionId): void {
    S.sel = S.sel === rid ? null : rid;
    for (const n of NODES) if (n.id !== 'tek' && n.id !== 'dec') nodeEls[n.id].g.setAttribute('aria-pressed', String(S.sel === n.id));
    dirtyNet = true;
    buildDetail();
  }

  // ---- Koşul çipleri ----
  type ChipDef = { id: string; name: string; on: () => boolean; set: () => void };
  const CHIPS: ChipDef[] = [
    { id: 'human', name: 'Teklif eden: insan', on: () => S.c.proposer === 'human', set: () => { S.c.proposer = 'human'; } },
    { id: 'computer', name: 'Teklif eden: bilgisayar', on: () => S.c.proposer === 'computer', set: () => { S.c.proposer = 'computer'; } },
    { id: 'tmsR', name: 'TMS sağ dlPFC', on: () => S.c.tmsRight, set: () => { S.c.tmsRight = !S.c.tmsRight; } },
    { id: 'tmsL', name: 'TMS sol dlPFC', on: () => S.c.tmsLeft, set: () => { S.c.tmsLeft = !S.c.tmsLeft; } },
    { id: 'amy', name: 'Amigdala hasarı', on: () => S.c.amyLesion, set: () => { S.c.amyLesion = !S.c.amyLesion; } },
    { id: 'trp', name: 'Serotonin düşük', on: () => S.c.trp, set: () => { S.c.trp = !S.c.trp; } },
  ];
  const chips = $('chips');
  const chipEls = CHIPS.map((ch) => {
    const b = document.createElement('button');
    b.className = 'chip'; b.type = 'button'; b.textContent = ch.name; b.setAttribute('aria-pressed', 'false');
    scope.on(b, 'click', () => { ch.set(); syncUi(); refresh(); buildDetail(); });
    chips.appendChild(b);
    return b;
  });

  // ---- Girdiler ----
  const offInput = $<HTMLInputElement>('off'), offV = $('offV'), sessBtn = $('sess'), sessHint = $('sessHint');
  scope.on(offInput, 'input', () => { S.offer = Number(offInput.value); syncUi(); refresh(); });
  scope.on(sessBtn, 'click', () => { S.c.session = S.c.session === 1 ? 2 : 1; syncUi(); refresh(); });
  function syncUi(): void {
    CHIPS.forEach((ch, i) => chipEls[i].setAttribute('aria-pressed', String(ch.on())));
    offInput.value = String(Math.min(FAIR, S.offer));
    offInput.setAttribute('aria-valuetext', `${S.offer} lira`);
    offV.textContent = `${S.offer} ₺`;
    sessBtn.setAttribute('aria-pressed', String(S.c.session === 2));
    sessHint.textContent = S.c.session === 2
      ? 'Sonraki oturum: triptofan etkisi kitapta yalnızca ilk oturumda görüldü, bu yüzden kalkar.'
      : 'İlk oturum: serotonin düşüklüğü yalnızca burada ret olasılığını artırır.';
  }

  // ---- Oyun kartı ----
  const accept = $<HTMLButtonElement>('accept'), reject = $<HTMLButtonElement>('reject');
  const resultBox = $('result'), resultText = $('resultText'), nextBtn = $('next'), scoreEl = $('score'), logEl = $('log');
  const who = (c: Conditions['proposer']): string => (c === 'human' ? 'İnsan' : 'Bilgisayar');
  function verdict(en: LogEntry): string {
    const p = Math.round(en.p * 100);
    const money = en.rejected ? 'İkiniz de 0 ₺ aldınız.' : `Sen ${en.offer} ₺, karşı taraf ${POT - en.offer} ₺ aldı.`;
    let cmp: string;
    if (en.p > 0.35 && en.p < 0.65) cmp = `Ortalama bir kişi için de kararsız bir teklif (ret olasılığı %${p}).`;
    else if ((en.p >= 0.65) === en.rejected) cmp = `Ortalama bir kişiyle aynı yöndesin: ret olasılığı %${p}.`;
    else cmp = `Ortalama kişiden farklı davrandın: onun ret olasılığı %${p}.`;
    return `${en.rejected ? 'Reddettin.' : 'Kabul ettin.'} ${money} ${cmp}`;
  }
  function drawGame(): void {
    $('round').textContent = `Tur ${Math.min(S.turn + 1, TURNS)} / ${TURNS}`;
    $('who').textContent = `Teklif eden: ${who(S.c.proposer)}`;
    $('offerText').innerHTML = `10 ₺'dan sana <b>${S.offer} ₺</b> öneriyor`;
    const me = (S.offer / POT) * 100;
    $('sMe').style.width = me + '%';
    $('split').setAttribute('aria-label', `Pay dağılımı: sen ${S.offer} lira, karşı taraf ${POT - S.offer} lira`);
    $('labMe').textContent = `Sen ${S.offer} ₺`;
    $('labThem').textContent = `Karşı taraf ${POT - S.offer} ₺`;
    const done = S.log.length >= TURNS;
    $('btns').hidden = S.decided;
    accept.disabled = reject.disabled = S.decided;
    resultBox.hidden = !S.decided;
    if (S.decided) {
      const last = S.log[S.log.length - 1];
      resultText.textContent = verdict(last) + (last.rejected && ev.satisfaction > 0.3 ? ` Kaudat ("ret etmenin tatmini") bu teklifte %${pct(ev.satisfaction)} etkin.` : '');
      nextBtn.textContent = done ? 'Yeniden oyna' : 'Sonraki teklif';
    }
    logEl.innerHTML = S.log
      .map((en, i) => `<li><span>${i + 1}. ${who(en.proposer)} · ${en.offer} ₺</span><span>${en.rejected ? 'Ret' : 'Kabul'} · model %${pct(en.p)}</span></li>`)
      .join('');
    if (S.log.length) {
      const mine = S.log.filter((l) => l.rejected).length;
      const exp = S.log.reduce((a, l) => a + l.p, 0);
      scoreEl.hidden = false;
      scoreEl.textContent = `${S.log.length} turda ${mine} kez reddettin. Model, ortalama bir kişi için yaklaşık ${f1(exp)} ret bekliyordu.` + (done ? ' Fark bireysel farktan ve rastlantıdan gelir; tek bir kişinin yanıtı ortalama eğriyle birebir örtüşmez.' : '');
    } else scoreEl.hidden = true;
  }
  let liveOverride = '';
  function decide(rejected: boolean): void {
    if (S.decided) return;
    S.log.push({ offer: S.offer, proposer: S.c.proposer, rejected, p: ev.pReject });
    S.decided = true;
    refresh();
    liveOverride = resultText.textContent ?? '';
    announce();
  }
  scope.on(accept, 'click', () => decide(false));
  scope.on(reject, 'click', () => decide(true));
  scope.on(nextBtn, 'click', () => {
    if (S.log.length >= TURNS) { S.seed++; dealDeck(); }
    else { S.turn++; S.offer = S.deck[S.turn]; S.decided = false; }
    syncUi(); refresh();
  });

  // ---- Eğri grafiği ----
  const CH = { x0: 36, x1: 348, top: 12, bot: 150 };
  const chart = $<SVGElement>('chart');
  const xOf = (o: number) => CH.x0 + ((CH.x1 - CH.x0) * o) / FAIR;
  const yOf = (p: number) => CH.bot - (CH.bot - CH.top) * p;
  for (const v of [0, 0.5, 1]) {
    svg('line', { class: 'grid', x1: CH.x0, x2: CH.x1, y1: yOf(v), y2: yOf(v) }, chart);
    svgText(chart, { x: CH.x0 - 6, y: yOf(v) + 3.5, 'text-anchor': 'end' }, pct(v) + '%');
  }
  for (let o = 0; o <= FAIR; o++) svgText(chart, { x: xOf(o), y: CH.bot + 14, 'text-anchor': o === 0 ? 'start' : o === FAIR ? 'end' : 'middle' }, `${o} ₺`);
  svgText(chart, { x: (CH.x0 + CH.x1) / 2, y: CH.bot + 28, 'text-anchor': 'middle' }, 'teklif edilen pay');
  const refLine = svg('polyline', { class: 'ln ref', points: '' }, chart);
  const curLine = svg('polyline', { class: 'ln cur', points: '' }, chart);
  const curDot = svg('circle', { class: 'cur-dot', r: 4.5, cx: CH.x0, cy: CH.bot }, chart);
  const marks = svg('g', {}, chart);
  const lgY = 200, lgY2 = 218;
  svg('line', { class: 'ln ref', x1: CH.x0, x2: CH.x0 + 18, y1: lgY - 4, y2: lgY - 4 }, chart);
  svgText(chart, { x: CH.x0 + 24, y: lgY }, 'ortalama kişi (insan)');
  svg('line', { class: 'ln cur', x1: CH.x0 + 150, x2: CH.x0 + 168, y1: lgY - 4, y2: lgY - 4 }, chart);
  svgText(chart, { x: CH.x0 + 174, y: lgY }, 'seçili koşul');
  svg('circle', { class: 'mk-rej', r: 3.6, cx: CH.x0 + 4, cy: lgY2 - 4 }, chart);
  svgText(chart, { x: CH.x0 + 14, y: lgY2 }, 'senin reddin');
  svg('circle', { class: 'mk-acc', r: 3.6, cx: CH.x0 + 104, cy: lgY2 - 4 }, chart);
  svgText(chart, { x: CH.x0 + 114, y: lgY2 }, 'senin kabulün');
  const refPts = curve(BASE).filter((c) => c.offer <= FAIR).map((c) => `${xOf(c.offer).toFixed(1)},${yOf(c.p).toFixed(1)}`).join(' ');
  refLine.setAttribute('points', refPts);
  function drawChart(): void {
    curLine.setAttribute('points', curve(S.c).filter((c) => c.offer <= FAIR).map((c) => `${xOf(c.offer).toFixed(1)},${yOf(c.p).toFixed(1)}`).join(' '));
    curDot.setAttribute('cx', xOf(Math.min(S.offer, FAIR)).toFixed(1));
    curDot.setAttribute('cy', yOf(ev.pReject).toFixed(1));
    marks.replaceChildren();
    const seen: Record<string, number> = {};
    for (const en of S.log) {
      const k = `${en.offer}|${en.rejected}`;
      const n = (seen[k] = (seen[k] ?? 0) + 1) - 1;
      svg('circle', { class: en.rejected ? 'mk-rej' : 'mk-acc', r: 3.6, cx: (xOf(en.offer) + n * 7).toFixed(1), cy: en.rejected ? CH.top - 3 : CH.bot + 0 }, marks);
    }
  }

  // ---- Alt çubuk ve metin ----
  const sayEl = $('say');
  const mP = $('m-p'), bP = $('b-p'), mJ = $('m-j'), bJ = $('b-j'), mT = $('m-t'), bT = $('b-t');
  function drawBar(): void {
    mP.textContent = pct(ev.pReject) + '%'; bP.style.width = pct(ev.pReject) + '%';
    mJ.textContent = pct(ev.judge) + '%'; bJ.style.width = pct(ev.judge) + '%';
    const t = threshold(S.c);
    mT.textContent = t === 0 ? 'hepsi' : `≥ ${t} ₺`; bT.style.width = pct(t / FAIR) + '%';
    sayEl.textContent = describe(S.offer, S.c, ev);
  }

  function refresh(): void {
    ev = evaluate(S.offer, S.c);
    drawBar(); drawGame(); drawChart(); updateDetail();
    dirtyNet = true;
    if (reduce) Object.assign(disp, target());
  }

  const announce = scope.announcer($('live'), () => { const t = liveOverride || (sayEl.textContent ?? ''); liveOverride = ''; return t; }, 700);
  scope.on(root, 'click', announce);
  scope.on(root, 'input', announce);

  // ---- Rehberli tur ----
  const setState = (c: Partial<Conditions>, offer: number): void => {
    S.c = { ...BASE, ...c };
    S.offer = offer;
    syncUi(); refresh(); buildDetail();
  };
  const tour = createTour(scope, [
    { title: 'Adil teklif', text: 'Karşı taraf 10 ₺\'dan 5 ₺ öneriyor: eşit pay. Kabul etmek hem kârlı hem adil olduğundan çoğu kişi için sorun yok.', look: 'Ret olasılığı çubuğu ve insula neredeyse sönük.', apply: () => setState({}, 5) },
    { title: 'Çok adaletsiz teklif', text: '1 ₺ kabul edilse de elde bir şey kalır. Yine de insula ve amigdala belirir, kaudat reddetmenin tatminini hazırlar. Kitaba göre insula etkinliği yükseldikçe ret artar.', look: 'İnsula parlıyor, ret olasılığı yüksek.', apply: () => setState({}, 1) },
    { title: 'Karşıda bilgisayar', text: 'Aynı 1 ₺, ama bir insan haksızlık etmiyor: sadece bir program. İnsula daha az etkinleşir, ret azalır. Ret kararı parayla birlikte "kim yaptı" bilgisine de bağlı.', look: 'Aynı teklifte insula ve ret olasılığı düşer.', apply: () => setState({ proposer: 'computer' }, 1) },
    { title: 'Sağ dlPFC susturuldu (TMS)', text: 'Teklif 2 ₺, karşıda yine bir insan. Sağ dlPFC susturulunca kişi aynı teklifi daha sık kabul eder, ama yine de adaletsiz bulur: adalet hedefini eyleme çeviremez. Sol dlPFC\'de ya da bilgisayara karşı bu etki yok. Bulgu karışık; bazı rTMS çalışmaları kabul oranında fark bulmadı.', look: '"Adaletsiz buluyor" aynı kalır, ret olasılığı düşer, dlPFC çizgili.', apply: () => setState({ tmsRight: true }, 2) },
    { title: 'Serotonin düşük (triptofan yoksunluğu)', text: 'Aynı 2 ₺ teklifi, bu kez serotonin azaltılmış. Ret artar ve kabul eşiği yukarı kayar. Wood\'un etkisi yalnızca ilk oturumda görüldü: "İkinci oturum" düğmesine basınca etki kalkar.', look: 'Ret olasılığı yükselir, eşik büyür.', apply: () => setState({ trp: true }, 2) },
    { title: 'Sonuç', text: 'Ret, "para mı onur mu" tartısından çok bir çekişme: insula ve amigdala reddetmeyi, kaudat tatmini, sağ dlPFC adalet hedefini öne iter; vmPFC/OFC paranın değeriyle kabule çeker. Koşullar bu dengeyi kaydırır. Şimdi koşulları bozmadan oyna ve kendi yanıtlarını ortalama eğriyle karşılaştır.', look: 'Eğrideki ret (kırmızı) ve kabul (boş) noktaları.', apply: () => setState({}, 3) },
  ]);
  root.querySelector('.lede')!.after(tour.el);

  syncUi();
  refresh();
  buildDetail();
  Object.assign(disp, target());

  // ---- Döngü: yalnızca etkinlikler hedefe doğru kayarken ve girdi değişince çizer ----
  let last = performance.now();
  function frame(now: number): void {
    const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
    last = now;
    const tg = target();
    const k = reduce ? 1 : 1 - Math.exp(-dt * 9);
    let moving = false;
    for (const key of Object.keys(tg) as Array<keyof typeof tg>) {
      const diff = tg[key] - disp[key];
      if (Math.abs(diff) > 0.002) { disp[key] += diff * k; moving = true; } else disp[key] = tg[key];
    }
    if (!moving && !dirtyNet) return;
    dirtyNet = moving;
    drawNet();
  }
  drawNet();
  scope.loop(frame, { root, onResume: () => { last = performance.now(); dirtyNet = true; } });

  return () => {
    scope.dispose();
    container.innerHTML = '';
  };
}
