// Sekme 1: Kodon çevirisi. DNA -> mRNA -> amino asit zinciri; nokta mutasyonu, silme, ekleme.
import { chips, pc, slider, type Ctx, type Meter } from '../ui';
import {
  AA, CLASS_TR, CRIT, KIND_TR, NO_MUT, REF_DNA, allPointOutcomes, analyze, cards, outcomesAt, toMrna, type AaClass, type Analysis, type Mut,
} from './model';

const GLYPH: Record<AaClass, string> = { hid: '●', pol: '■', pos: '▲', neg: '▼', ozel: '◆' };
const CLS_COLOR: Record<AaClass, string> = { hid: 'var(--dop)', pol: 'var(--pfc)', pos: 'var(--amy)', neg: 'var(--pit)', ozel: 'var(--gld)' };

export type Preset = 'none' | 'sessiz' | 'yanlis' | 'anlamsiz' | 'sil1' | 'ekle1' | 'sil3';
const PRESETS: Array<{ key: Preset; label: string; m: Mut }> = [
  { key: 'none', label: 'Değişiklik yok', m: NO_MUT },
  { key: 'sessiz', label: 'Sessiz', m: { kind: 'point', pos: 5, base: 'C', n: 1 } },
  { key: 'yanlis', label: 'Yanlış anlamlı', m: { kind: 'point', pos: 18, base: 'G', n: 1 } },
  { key: 'anlamsiz', label: 'Anlamsız (dur)', m: { kind: 'point', pos: 17, base: 'A', n: 1 } },
  { key: 'sil1', label: '1 harf silme', m: { kind: 'del', pos: 7, base: 'A', n: 1 } },
  { key: 'ekle1', label: '1 harf ekleme', m: { kind: 'ins', pos: 7, base: 'A', n: 1 } },
  { key: 'sil3', label: '3 harf silme', m: { kind: 'del', pos: 12, base: 'A', n: 3 } },
];

const aaName = (a: string): string => (a === '*' ? 'DUR' : AA[a].three);
const glyph = (a: string): string => (a === '*' ? '■' : GLYPH[AA[a].cls]);

function text(a: Analysis, m: Mut): string {
  const cls = (c: string): string => CLASS_TR[AA[c].cls];
  const L = a.mut.aas.length;
  switch (a.kind) {
    case 'degisim-yok': return 'Normal gen: on amino asitlik zincir. Bir harf değiştirmek için bir mutasyon seç.';
    case 'sessiz': return 'Kodon değişti ama aynı amino asidi belirtiyor (kodon fazlalığı). Zincir aynı, işlev aynı.';
    case 'yanlis': {
      const o = a.ref.aas[a.firstDiff], n = a.mut.aas[a.firstDiff];
      const same = AA[o].cls === AA[n].cls;
      const crit = a.firstDiff >= CRIT[0] && a.firstDiff <= CRIT[1];
      return `${a.firstDiff + 1}. amino asit ${aaName(o)} yerine ${aaName(n)}: ${same ? `ikisi de ${cls(o)}, etki küçük` : `${cls(o)} yerine ${cls(n)}, özellik değişti`}${crit ? '; üstelik aktif bölgede' : ''}.`;
    }
    case 'anlamsiz': return `Dur kodonu erken belirdi: zincir ${L} amino asitte kesildi, kalan ${a.ref.aas.length - L} amino asit hiç yapılmıyor.`;
    case 'kayma': return `Okuma çerçevesi kaydı: ${a.firstDiff + 1}. amino asitten sonrası tamamen farklı${a.mut.stopped ? `, zincir ${L} amino asitte bitiyor` : ''}.`;
    case 'cerceve-ici': return `Çerçeve korundu: ${m.n / 3} amino asit ${m.kind === 'del' ? 'eksik' : 'fazla'}, geri kalanı aynı sırada.`;
    case 'baslangic': return 'Başlangıç kodonu (ATG) bozuldu: okuma başlamıyor ya da başka bir yerden başlıyor.';
    default: return 'Dur kodonu başka bir amino asite dönüştü: okuma durmadan sürdü, zincir uzadı.';
  }
}

export function createCodePanel(ctx: Ctx, host: HTMLElement) {
  let m: Mut = NO_MUT;
  let active: Preset | null = 'none';
  let dirty = true;
  let a: Analysis = analyze(REF_DNA, m);
  const all = allPointOutcomes(REF_DNA);

  host.innerHTML =
    '<p class="note">Kısa bir genin DNA\'sı (kodlayan iplik) mRNA\'ya, mRNA da amino asit zincirine çevrilir. Bir harf değiştirip zincire ve işleve bak.</p>' +
    '<div class="chips" data-ref="pre"></div>' +
    '<div class="stage"><div class="cds" data-ref="cds" role="group" aria-label="Kodon kutuları"></div>' +
    '<div class="legend"><span>Kutuda üstten alta: DNA, mRNA, amino asit</span>' +
    (Object.keys(GLYPH) as AaClass[]).map((c) => `<span><b class="gl" style="border-color:${CLS_COLOR[c]}">${GLYPH[c]}</b>${CLASS_TR[c]}</span>`).join('') +
    '</div></div>' +
    '<div class="card"><h3 class="sim-h">Amino asit zinciri</h3><div class="chain" data-ref="c0"></div><div class="chain" data-ref="c1"></div>' +
    '<p class="note">Çerçeveli beyaz kutu: normal zincirden farklı. Alt çizgili: aktif bölge (modelin varsayımı).</p></div>' +
    '<div class="card verdict" data-ref="verdict"><p class="v-kind" data-ref="vk"></p><p data-ref="vt"></p>' +
    '<div class="m-top"><span>İşlev (modelin varsayımı)</span><b data-ref="vf"></b></div><div class="track"><b data-ref="vb"></b></div>' +
    '<p class="note" data-ref="vp"></p></div>' +
    '<div class="card"><h3 class="sim-h">Mutasyon</h3><div class="chips" data-ref="ty"></div><div class="chips" data-ref="sz"></div><div class="chips" data-ref="ba"></div><div class="sliders" data-ref="sl"></div></div>' +
    '<details class="more" data-ref="al"><summary>Küçük ek: bir varyant popülasyonda yayılır mı?</summary><div data-ref="alb"></div></details>';

  const q = <T extends HTMLElement = HTMLElement>(k: string): T => host.querySelector<T>(`[data-ref="${k}"]`)!;
  const mark = (): void => { dirty = true; ctx.touch(); };

  const setPre = chips(q('pre'), ctx.scope, PRESETS.map((p) => ({ key: p.key, label: p.label })), (k) => preset(k as Preset), 'Hazır mutasyonlar');
  const setTy = chips(q('ty'), ctx.scope, [{ key: 'none', label: 'Yok' }, { key: 'point', label: 'Nokta' }, { key: 'del', label: 'Silme' }, { key: 'ins', label: 'Ekleme' }],
    (k) => { m = { ...m, kind: k as Mut['kind'] }; manual(); }, 'Mutasyon türü');
  const setSz = chips(q('sz'), ctx.scope, [{ key: '1', label: '1 harf' }, { key: '3', label: '3 harf' }], (k) => { m = { ...m, n: k === '3' ? 3 : 1 }; manual(); }, 'Silinen ya da eklenen harf sayısı');
  const setBa = chips(q('ba'), ctx.scope, ['A', 'T', 'G', 'C'].map((b) => ({ key: b, label: b })), (k) => { m = { ...m, base: k }; manual(); }, 'Yeni baz');
  const pos = slider(ctx.scope, q('sl'), {
    id: `${ctx.id}-pos`, name: 'Konum', hint: 'Kaçıncı harf? İlk üçü ATG (başlangıç), son üçü TAA (dur).', min: 1, max: REF_DNA.length, value: 1, cls: 'sl', color: 'var(--ink)',
    fmt: (v) => `${v}. harf (${REF_DNA[v - 1]}, kodon ${Math.ceil(v / 3)})`, onInput: (v) => { m = { ...m, pos: v - 1 }; manual(); },
  });

  function sync(): void {
    setTy(m.kind); setSz(String(m.n)); setBa(m.base); setPre(active);
    pos.set(m.pos + 1);
    q('sz').hidden = m.kind !== 'del' && m.kind !== 'ins';
    q('ba').hidden = m.kind !== 'point' && m.kind !== 'ins';
    q('sl').hidden = m.kind === 'none';
  }
  function manual(): void {
    active = null;
    // Her konum için bir ön ayar ile tam eşleşiyorsa onu işaretle.
    for (const p of PRESETS) if (p.m.kind === m.kind && (m.kind === 'none' || (p.m.pos === m.pos && p.m.n === m.n && (m.kind === 'del' || p.m.base === m.base)))) active = p.key;
    sync(); mark();
  }
  function preset(k: Preset): void { active = k; m = { ...PRESETS.find((p) => p.key === k)!.m }; sync(); mark(); }
  /** Dışarıdan (tur) bir ön ayarı kur. */
  function setPreset(k: Preset): void { active = k; m = { ...PRESETS.find((p) => p.key === k)!.m }; sync(); dirty = true; }

  /* ---------- Çizim ---------- */
  function baseHtml(dna: string, i0: number): string {
    // Değişen bazları vurgula (nokta: o baz, ekleme: eklenen bazlar, silme: kesim yeri).
    return Array.from(dna, (b, k) => {
      const i = i0 + k;
      const hit = (m.kind === 'point' && i === m.pos && a.dna !== REF_DNA) || (m.kind === 'ins' && i >= m.pos && i < m.pos + m.n);
      const cut = m.kind === 'del' && i === m.pos;
      return `<i class="b${hit ? ' mut' : ''}${cut ? ' cut' : ''}">${b}</i>`;
    }).join('');
  }
  const bead = (c: string, cls: string): string => `<span class="bd${cls}" data-c="${AA[c].cls}"><span aria-hidden="true">${GLYPH[AA[c].cls]}</span>${AA[c].three}</span>`;
  function chain(aas: string, other: string, isMut: boolean): string {
    return Array.from(aas, (c, i) => bead(c, (i >= CRIT[0] && i <= CRIT[1] ? ' crit' : '') + (isMut && other[i] !== c ? ' diff' : ''))).join('') || '<span class="note">zincir yok</span>';
  }

  function render(): void {
    a = analyze(REF_DNA, m);
    const cs = cards(a.dna);
    let off = 0;
    q('cds').innerHTML = cs.map((c) => {
      const html = baseHtml(c.dna, off);
      off += c.dna.length;
      if (!c.read && !c.aa) return `<div class="cd is-off"><span class="cd-d">${html}</span><span class="cd-r">${toMrna(c.dna)}</span><span class="cd-a">–</span></div>`;
      const idx = c.aa === '*' ? 'stop' : AA[c.aa].cls;
      return `<div class="cd" data-c="${idx}"><span class="cd-d">${html}</span><span class="cd-r">${toMrna(c.dna)}</span><span class="cd-a"><span aria-hidden="true">${glyph(c.aa)}</span> ${aaName(c.aa)}</span></div>`;
    }).join('');
    q('c0').innerHTML = `<span class="ck">Normal</span>${chain(a.ref.aas, a.ref.aas, false)}`;
    q('c1').innerHTML = `<span class="ck">Mutant</span>${chain(a.mut.aas, a.ref.aas, true)}`;
    q('vk').innerHTML = `<b>${KIND_TR[a.kind]}</b>`;
    q('vt').textContent = text(a, m);
    q('vf').textContent = pc(a.f);
    const b = q('vb');
    b.style.width = pc(a.f);
    b.style.background = a.f > 0.7 ? 'var(--gld)' : a.f > 0.3 ? 'var(--eff)' : 'var(--red)';
    if (m.kind === 'point') {
      const o = outcomesAt(REF_DNA, m.pos);
      q('vp').textContent = `Bu harfin üç olası değişiminden: ${o.sessiz} sessiz, ${o.yanlis} yanlış anlamlı, ${o.anlamsiz} anlamsız${o.diger ? `, ${o.diger} başka` : ''}. Tüm ${all.toplam} nokta değişiminin ${pc(all.sessiz / all.toplam)}'i sessiz.`;
    } else q('vp').textContent = `Karşılaştırma için: ${all.toplam} olası nokta değişiminin ${pc(all.sessiz / all.toplam)}'i sessiz, ${pc(all.anlamsiz / all.toplam)}'i anlamsız.`;
  }

  /* ---------- Küçük ek: alel frekansı (ilk açılışta ayrı parçadan) ---------- */
  let allele: { draw(): boolean } | undefined;
  let alLoading = false;
  let gone = false;
  ctx.scope.onDispose(() => { gone = true; });
  ctx.scope.on(q('al'), 'toggle', () => {
    if (!(q('al') as HTMLDetailsElement).open || alLoading) return;
    alLoading = true;
    void import('./allele').then((mod) => { if (!gone) allele = mod.createAllele(ctx, q('alb'), () => a.f); });
  });

  sync();
  return {
    say(): string { return `${KIND_TR[a.kind]}. ${text(a, m)} İşlev yaklaşık ${pc(a.f)}.`; },
    meters(): Meter[] {
      const L0 = a.ref.aas.length;
      return [
        { label: 'İşlev', value: pc(a.f), frac: a.f, color: a.f > 0.7 ? 'var(--gld)' : a.f > 0.3 ? 'var(--eff)' : 'var(--red)' },
        { label: 'Zincir uzunluğu', value: `${a.mut.aas.length}/${L0}`, frac: Math.min(1, a.mut.aas.length / L0), color: 'var(--pfc)' },
        { label: 'Değişen amino asit', value: String(a.diff.length), frac: Math.min(1, a.diff.length / L0), color: 'var(--amy)' },
      ];
    },
    draw(): boolean { const r = allele?.draw() ?? false; if (!dirty) return r; dirty = false; render(); return true; },
    setPreset,
    get analysis(): Analysis { return a; },
  };
}
