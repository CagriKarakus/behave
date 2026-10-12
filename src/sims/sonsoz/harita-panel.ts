// Sekme 3: Kitabın özeti olarak geri bakış. Her bölümden bir cümlelik ders ve simülasyonlara bağlantılar.
import { createTour } from '../tour';
import { simsFor } from '../registry';
import { chipRow, type Ctx, type Meter, type Panel } from '../ui';
import { CHAPTERS, GROUPS, THEMES, type Group } from './harita-data';

type Filter = Group | 'hepsi';
const chapterHref = (id: string): string => `#/bolum/${id}`;
const simLinks = (id: string): string =>
  simsFor(id).map((s) => `<a class="mp-sim" href="${chapterHref(id)}?sim=${s.id}">${s.title}<span class="mp-go" aria-hidden="true"> ▸</span></a>`).join('');

export interface HaritaApi extends Panel { set(f: Filter): void; shown(): { chapters: number; withSim: number; sims: number } }

/** `goTab`: temalar listesinden bu simülasyonun öteki sekmelerine geçiş. */
export function createHaritaPanel(ctx: Ctx, host: HTMLElement, goTab: (t: 'ort' | 'biz') => void): HaritaApi {
  let filter: Filter = 'hepsi';
  let dirty = true;

  host.innerHTML =
    '<div data-ref="tour"></div>' +
    '<div class="chips" data-ref="chips"></div>' +
    '<section class="card" aria-label="Bölüm bölüm harita"><h3 class="sim-h">Bölüm bölüm harita</h3><ul class="mp-list" data-ref="list"></ul></section>' +
    '<section class="card" aria-label="Sonsöz temaları"><h3 class="sim-h">Sonsöz\'ün tekrar eden temaları</h3><ul class="mp-list mp-themes" data-ref="themes"></ul></section>' +
    '<div class="notes" data-notes="harita"></div>';
  const q = <T extends Element = HTMLElement>(n: string) => host.querySelector<T>(`[data-ref="${n}"]`)!;

  /* ---- Bölüm listesi (bir kez kurulur; süzgeç satırları gizler) ---- */
  q('list').innerHTML = CHAPTERS.map((c) => {
    const sims = simLinks(c.id);
    return `<li class="mp-row" data-g="${c.group}"><div class="mp-h"><span class="mp-n">${c.label}</span><a class="mp-t" href="${chapterHref(c.id)}">${c.title}</a></div>` +
      `<p class="mp-l">${c.lesson}</p>${sims ? `<div class="mp-sims" aria-label="Simülasyonlar">${sims}</div>` : ''}</li>`;
  }).join('');

  q('themes').innerHTML = THEMES.map((t, i) => {
    const links = t.chapters.map((id) => {
      const c = CHAPTERS.find((x) => x.id === id)!;
      return `<a class="mp-sim" href="${chapterHref(id)}">${c.label}: ${c.title}</a>${simLinks(id)}`;
    }).join('');
    const here = t.tab ? `<button type="button" class="btn mp-here" data-tab="${t.tab}">Bu simülasyonda: ${t.tab === 'ort' ? '1. sekme' : '2. sekme'}</button>` : '';
    return `<li class="mp-row" data-i="${i}"><div class="mp-h"><b class="mp-t">${t.term}</b></div><p class="mp-l">${t.text}</p><div class="mp-sims">${here}${links}</div></li>`;
  }).join('');
  for (const b of Array.from(host.querySelectorAll<HTMLButtonElement>('.mp-here'))) ctx.scope.on(b, 'click', () => goTab(b.dataset.tab as 'ort' | 'biz'));

  const setChip = chipRow(q('chips'), ctx, GROUPS.map((g) => ({ key: g.key, label: g.label })), (k) => { set(k as Filter); }, 'Bölüm grubu');

  function set(f: Filter): void { filter = f; setChip(f); dirty = true; }
  const rows = Array.from(q('list').querySelectorAll<HTMLElement>('.mp-row'));
  const shown = (): { chapters: number; withSim: number; sims: number } => {
    const list = CHAPTERS.filter((c) => filter === 'hepsi' || c.group === filter);
    return { chapters: list.length, withSim: list.filter((c) => simsFor(c.id).length).length, sims: list.reduce((n, c) => n + simsFor(c.id).length, 0) };
  };

  const tour = createTour(ctx.scope, [
    {
      title: 'Bir haritada kitap',
      text: 'Kitap bir davranışı zaman merdiveninde açar: bir saniye önceden evrime kadar. Her satırda bölümün tek cümlelik dersi ve varsa simülasyonlarına giden düğmeler var.',
      look: 'Satırların altındaki ▸ düğmeleri ilgili simülasyonu açar.',
      apply: () => set('hepsi'),
    },
    {
      title: 'Saniyelerden aylara',
      text: 'Önce beyin ve hormonlar: amigdala, frontal korteks, dopamin, hormonlar ve deneyim. Hiçbiri tek başına davranışı üretmez; bağlam hepsinin üzerinde.',
      look: 'Bölüm 4 satırı: hormon bir eğilimi büyütür, davranışı yaratmaz.',
      apply: () => set('zaman'),
    },
    {
      title: 'Gelişim, gen, kültür, evrim',
      text: 'Ergenlikten evrime uzanan basamaklarda ortak ders aynı: eğilim var, kader yok. Çocukluk, genler ve kültür birbirinden ayrılamaz.',
      look: 'Bölüm 8 satırı: genler eğilim ve kırılganlık verir.',
      apply: () => set('gelisim'),
    },
    {
      title: 'Biz/Onlar ve seçimler',
      text: 'Kitabın ikinci yarısı Biz/Onlar sınırına, uymaya, ahlaka, empatiye ve savaşa bakar. Sınırın bağlamla kayabilmesi hem tehlike hem umut.',
      look: 'Bölüm 11 ve 17 satırları: ikisi de sınırın yeniden çizilebildiğini anlatır.',
      apply: () => set('biz'),
    },
    {
      title: 'Ortak ders',
      text: 'Ortalama değil dağılım, tek neden değil bağlam, sabit değil kaydırılabilir sınır. Sonsöz buna şunu ekler: karmaşıklık umutsuzluk değil sorumluluk gerektirir; bilimsel düşünce ile şefkat karşıt değildir.',
      look: 'Temalar listesi: her tema için kitapta nereye bakılacağı yazılı.',
      apply: () => set('hepsi'),
    },
  ], { onExit: () => ctx.touch() });
  q('tour').replaceWith(tour.el);

  return {
    draw(): boolean {
      if (!dirty) return false;
      dirty = false;
      for (const r of rows) r.hidden = filter !== 'hepsi' && r.dataset.g !== filter;
      return true;
    },
    say: () => {
      const s = shown(), g = GROUPS.find((x) => x.key === filter)!.label.toLowerCase();
      return `Haritada ${s.chapters} bölüm (${g}); ${s.withSim} bölümün simülasyonu var, toplam ${s.sims} simülasyon. Bir bölümün satırından simülasyona geçilir.`;
    },
    meters: (): Meter[] => {
      const s = shown(), all = CHAPTERS.length;
      const totalSims = CHAPTERS.reduce((n, c) => n + simsFor(c.id).length, 0);
      return [
        { label: 'Gösterilen bölüm', value: `${s.chapters} / ${all}`, frac: s.chapters / all, color: 'var(--ink)' },
        { label: 'Simülasyonlu bölüm', value: `${s.withSim}`, frac: s.withSim / all, color: 'var(--pfc)' },
        { label: 'Simülasyon', value: `${s.sims}`, frac: totalSims ? s.sims / totalSims : 0, color: 'var(--dop)' },
      ];
    },
    set,
    shown,
  };
}
