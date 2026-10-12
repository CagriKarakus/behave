import type { ChapterMeta, Experiment, ReplicationStatus } from '../content/types';
import type { ContentSource } from '../content';
import { chapterLabel, cleanDoi } from '../content/normalize';
import { html, raw, type Safe } from '../lib/html';
import { experimentHref } from '../lib/router';
import type { Page } from './page';

export const REPL_LABEL: Record<ReplicationStatus, { icon: string; text: string }> = {
  'sağlam': { icon: '✓', text: 'Replikasyon: sağlam' },
  'karışık': { icon: '◐', text: 'Replikasyon: karışık' },
  'tartışmalı': { icon: '!', text: 'Replikasyon: tartışmalı' },
  'bilinmiyor': { icon: '?', text: 'Replikasyon: bilinmiyor' },
};
export const REPL_STATUSES: ReplicationStatus[] = ['sağlam', 'karışık', 'tartışmalı', 'bilinmiyor'];
/** Replikasyon bilgisi hiç verilmemiş deneyler için süzgeç değeri. */
export const REPL_UNSPECIFIED = 'belirtilmemiş';

/**
 * Arama için katlama: büyük/küçük harf, Türkçe i/ı/İ/I ayrımı ve aksanlar eşitlenir.
 * ("Implicit" -> "ımplicit" gibi Türkçe küçük harf tuzağına düşmeden İngilizce adlar da bulunur.)
 */
export const fold = (s: string): string =>
  s.toLocaleLowerCase('tr').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const safeUrl = (u: string): string | null => (/^https?:\/\//i.test(u) ? u : null);

/** Bir deney kartı. link=true ise "bölümde gör" bağlantısı (liste sayfası) gösterilir. */
export function experimentCard(e: Experiment, ch: ChapterMeta, link: boolean): Safe {
  const rows: [string, string][] = [['Soru', e.question], ['Yöntem', e.method], ['Bulgu', e.finding], ['Bölümdeki rolü', e.roleInChapter]];
  const meta = [e.researchers, e.year != null ? String(e.year) : ''].filter(Boolean).join(' · ');
  return html`<article class="exp" id="exp-${e.id}" data-exp="${e.id}">
    <header class="exp-head">
      <h3 class="exp-name">${e.name}</h3>
      ${meta ? html`<p class="exp-meta">${meta}</p>` : ''}
      <p class="badges">
        ${e.replication ? html`<span class="badge repl repl-${e.replication.status}"><span aria-hidden="true">${REPL_LABEL[e.replication.status].icon}</span> ${REPL_LABEL[e.replication.status].text}</span>` : raw('<span class="badge repl repl-bilinmiyor"><span aria-hidden="true">?</span> Replikasyon: belirtilmemiş</span>')}
        ${e.simulatable ? raw('<span class="badge">Simüle edilebilir</span>') : ''}
        ${link ? html`<a class="badge exp-chlink" href="${experimentHref(ch.id, e.id)}">${chapterLabel(ch)} · ${ch.titleTr}</a>` : ''}
      </p>
    </header>
    <details class="exp-body">
      <summary>Soru, yöntem, bulgu</summary>
      <dl class="exp-dl">${rows.filter(([, v]) => v).map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
      ${e.replication && e.replication.note ? html`<p class="exp-repl-note"><strong>Replikasyon notu.</strong> ${e.replication.note}</p>` : ''}
      ${e.replication && e.replication.refs.length ? html`<p class="exp-refs">${e.replication.refs.join(' · ')}</p>` : ''}
      ${e.caveats ? html`<div class="exp-caveats"><strong>Dikkat.</strong> ${e.caveats}</div>` : ''}
      ${e.sources.length ? html`<div class="exp-sources"><h4>Kaynaklar</h4><ul>${e.sources.map((s) => {
        const doi = cleanDoi(s.doi);
        const href = doi ? `https://doi.org/${doi}` : s.url ? safeUrl(s.url) : null;
        const label = [s.citation, s.journal, s.year].filter(Boolean).join(', ');
        return html`<li>${href ? html`<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>` : label}${doi ? html` <span class="doi">doi:${doi}</span>` : ''}</li>`;
      })}</ul></div>` : ''}
    </details>
  </article>`;
}

/** Deney listesi. Her bölümün deneyleri o bölümün ayrıntı parçasından gelir; hepsi yüklenince liste çizilir. */
export function renderExperiments(el: HTMLElement, src: ContentSource, focus?: 'durum'): Page {
  let disposed = false;
  let teardown: () => void = () => {};
  el.innerHTML = html`<div class="page">
    <a class="back" href="#/">← Tüm bölümler</a>
    <h1 id="page-title" tabindex="-1">Deneyler</h1>
    <p class="repl-note" role="note">Replikasyon durumları 2026 itibarıyla bilinen çalışmalara göre özetlenmiştir; yeni çalışmalarla değişebilir.</p>
    <p class="lede">Kitapta anlatılan deneyler ve çalışmalar; bölüme, replikasyon durumuna ve metne göre süzülebilir.</p>
    <div data-slot="list" aria-busy="true"><p class="muted" role="status">Yükleniyor…</p></div>
  </div>`.value;

  const ready = Promise.all(src.index.chapters.map(async (c) => ({ c, d: await src.detail(c.id) }))).then((rows) => {
    if (disposed) return false;
    teardown = fill(el.querySelector<HTMLElement>('[data-slot="list"]') as HTMLElement, rows.flatMap(({ c, d }) => d.experiments.map((e) => ({ e, c }))), rows.filter(({ d }) => d.experiments.length).map(({ c }) => c));
    if (focus === 'durum') el.querySelector<HTMLSelectElement>('[data-f=st]')?.focus({ preventScroll: false });
    return false;
  }).catch((err) => {
    console.error(err);
    if (!disposed) el.querySelector('[data-slot="list"]')!.innerHTML = '<p class="muted" role="alert">Deneyler yüklenemedi. Bağlantını denetleyip sayfayı yenile.</p>';
    return false;
  });

  return {
    dispose() { disposed = true; teardown(); el.innerHTML = ''; },
    ready,
  };
}

function fill(slot: HTMLElement, all: Array<{ e: Experiment; c: ChapterMeta }>, withExp: ChapterMeta[]): () => void {
  slot.removeAttribute('aria-busy');
  slot.innerHTML = all.length ? html`
    <form class="filters" role="search" aria-label="Deney süzgeci" onsubmit="return false">
      <label>Arama<input type="search" data-f="q" placeholder="Ad, araştırmacı, bulgu…" /></label>
      <label>Bölüm<select data-f="ch"><option value="">Tümü</option>${withExp.map((c) => html`<option value="${c.id}">${chapterLabel(c)} · ${c.titleTr}</option>`)}</select></label>
      <label>Replikasyon<select data-f="st"><option value="">Tümü</option>${[...REPL_STATUSES, REPL_UNSPECIFIED].map((s) => html`<option value="${s}">${s}</option>`)}</select></label>
    </form>
    <p class="muted" data-count role="status" aria-live="polite"></p>
    <div class="exp-list">${all.map(({ e, c }) => html`<div class="exp-wrap" data-ch="${c.id}" data-st="${e.replication?.status ?? REPL_UNSPECIFIED}" data-text="${fold([e.name, e.researchers, e.question, e.finding, e.method].join(' '))}">${experimentCard(e, c, true)}</div>`)}</div>`.value
    : html`<p class="muted">Henüz deney verisi yok.</p>`.value;

  const q = slot.querySelector<HTMLInputElement>('[data-f=q]');
  const ch = slot.querySelector<HTMLSelectElement>('[data-f=ch]');
  const st = slot.querySelector<HTMLSelectElement>('[data-f=st]');
  const count = slot.querySelector<HTMLElement>('[data-count]');
  const wraps = Array.from(slot.querySelectorAll<HTMLElement>('.exp-wrap'));
  const apply = () => {
    const text = fold((q?.value ?? '').trim());
    let n = 0;
    for (const w of wraps) {
      const ok = (!ch?.value || w.dataset.ch === ch.value) && (!st?.value || w.dataset.st === st.value) && (!text || (w.dataset.text ?? '').includes(text));
      w.hidden = !ok;
      if (ok) n++;
    }
    if (count) count.textContent = `${n} / ${wraps.length} deney`;
  };
  const targets = [q, ch, st].filter((x): x is HTMLInputElement & HTMLSelectElement => !!x);
  for (const t of targets) { t.addEventListener('input', apply); t.addEventListener('change', apply); }
  apply();
  return () => { for (const t of targets) { t.removeEventListener('input', apply); t.removeEventListener('change', apply); } };
}
