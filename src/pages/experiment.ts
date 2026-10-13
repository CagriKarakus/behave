import type { ChapterMeta, Experiment, ReplicationStatus } from '../content/types';
import type { ContentSource } from '../content';
import { chapterLabel, cleanDoi } from '../content/normalize';
import { html, raw, type Safe } from '../lib/html';
import { getLocale } from '../i18n/locale';
import { t } from '../i18n/t';
import type { MsgKey } from '../i18n/messages';
import { experimentHref } from '../lib/router';
import type { Page } from './page';

const REPL_ICON: Record<ReplicationStatus, string> = { 'sağlam': '✓', 'karışık': '◐', 'tartışmalı': '!', 'bilinmiyor': '?' };
/** Replikasyon rozeti: simge + geçerli dilde metin. İç anahtarlar (Türkçe) veri, CSS sınıfı ve süzgeç değeri olarak aynı kalır. */
export const replLabel = (st: ReplicationStatus): { icon: string; text: string } => ({ icon: REPL_ICON[st], text: t('repl.badge', { s: t(`repl.${st}` as MsgKey) }) });
export const REPL_STATUSES: ReplicationStatus[] = ['sağlam', 'karışık', 'tartışmalı', 'bilinmiyor'];
/** Replikasyon bilgisi hiç verilmemiş deneyler için süzgeç değeri. */
export const REPL_UNSPECIFIED = 'belirtilmemiş';

/**
 * Arama için katlama: büyük/küçük harf, Türkçe i/ı/İ/I ayrımı ve aksanlar eşitlenir.
 * ("Implicit" -> "ımplicit" gibi Türkçe küçük harf tuzağına düşmeden İngilizce adlar da bulunur.)
 */
export const fold = (s: string): string =>
  (getLocale() === 'tr' ? s.toLocaleLowerCase('tr').replace(/ı/g, 'i') : s.toLowerCase().replace(/ı/g, 'i')).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const safeUrl = (u: string): string | null => (/^https?:\/\//i.test(u) ? u : null);

/** Bir deney kartı. link=true ise "bölümde gör" bağlantısı (liste sayfası) gösterilir. */
export function experimentCard(e: Experiment, ch: ChapterMeta, link: boolean): Safe {
  const rows: [string, string][] = [[t('exp.q'), e.question], [t('exp.m'), e.method], [t('exp.f'), e.finding], [t('exp.role'), e.roleInChapter]];
  const meta = [e.researchers, e.year != null ? String(e.year) : ''].filter(Boolean).join(' · ');
  return html`<article class="exp" id="exp-${e.id}" data-exp="${e.id}">
    <header class="exp-head">
      <h3 class="exp-name">${e.name}</h3>
      ${meta ? html`<p class="exp-meta">${meta}</p>` : ''}
      <p class="badges">
        ${e.replication ? html`<span class="badge repl repl-${e.replication.status}"><span aria-hidden="true">${replLabel(e.replication.status).icon}</span> ${replLabel(e.replication.status).text}</span>` : raw(`<span class="badge repl repl-bilinmiyor"><span aria-hidden="true">?</span> ${t('repl.badge', { s: t('repl.belirtilmemiş') })}</span>`)}
        ${e.simulatable ? raw(`<span class="badge">${t('exp.simulatable')}</span>`) : ''}
        ${link ? html`<a class="badge exp-chlink" href="${experimentHref(ch.id, e.id)}">${chapterLabel(ch)} · ${ch.titleTr}</a>` : ''}
      </p>
    </header>
    <details class="exp-body">
      <summary>${t('exp.summary')}</summary>
      <dl class="exp-dl">${rows.filter(([, v]) => v).map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
      ${e.replication && e.replication.note ? html`<p class="exp-repl-note"><strong>${t('exp.replNote')}</strong> ${e.replication.note}</p>` : ''}
      ${e.replication && e.replication.refs.length ? html`<p class="exp-refs">${e.replication.refs.join(' · ')}</p>` : ''}
      ${e.caveats ? html`<div class="exp-caveats"><strong>${t('exp.caveat')}</strong> ${e.caveats}</div>` : ''}
      ${e.sources.length ? html`<div class="exp-sources"><h4>${t('exp.sources')}</h4><ul>${e.sources.map((s) => {
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
    <a class="back" href="#/">${t('ch.back')}</a>
    <h1 id="page-title" tabindex="-1">${t('exp.title')}</h1>
    <p class="repl-note" role="note">${t('exp.replDisclaimer')}</p>
    <p class="lede">${t('exp.lede')}</p>
    <div data-slot="list" aria-busy="true"><p class="muted" role="status">${t('ch.loading')}</p></div>
  </div>`.value;

  const ready = Promise.all(src.index.chapters.map(async (c) => ({ c, d: await src.detail(c.id) }))).then((rows) => {
    if (disposed) return false;
    teardown = fill(el.querySelector<HTMLElement>('[data-slot="list"]') as HTMLElement, rows.flatMap(({ c, d }) => d.experiments.map((e) => ({ e, c }))), rows.filter(({ d }) => d.experiments.length).map(({ c }) => c));
    if (focus === 'durum') el.querySelector<HTMLSelectElement>('[data-f=st]')?.focus({ preventScroll: false });
    return false;
  }).catch((err) => {
    console.error(err);
    if (!disposed) el.querySelector('[data-slot="list"]')!.innerHTML = `<p class="muted" role="alert">${t('exp.loadFailed')}</p>`;
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
    <form class="filters" role="search" aria-label="${t('exp.filterAria')}" onsubmit="return false">
      <label>${t('exp.search')}<input type="search" data-f="q" placeholder="${t('exp.searchPh')}" /></label>
      <label>${t('exp.chapter')}<select data-f="ch"><option value="">${t('exp.all')}</option>${withExp.map((c) => html`<option value="${c.id}">${chapterLabel(c)} · ${c.titleTr}</option>`)}</select></label>
      <label>${t('exp.repl')}<select data-f="st"><option value="">${t('exp.all')}</option>${[...REPL_STATUSES, REPL_UNSPECIFIED].map((s) => html`<option value="${s}">${t(`repl.${s}` as MsgKey)}</option>`)}</select></label>
    </form>
    <p class="muted" data-count role="status" aria-live="polite"></p>
    <div class="exp-list">${all.map(({ e, c }) => html`<div class="exp-wrap" data-ch="${c.id}" data-st="${e.replication?.status ?? REPL_UNSPECIFIED}" data-text="${fold([e.name, e.researchers, e.question, e.finding, e.method].join(' '))}">${experimentCard(e, c, true)}</div>`)}</div>`.value
    : html`<p class="muted">${t('exp.none')}</p>`.value;

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
    if (count) count.textContent = t('exp.count', { n, total: wraps.length });
  };
  const targets = [q, ch, st].filter((x): x is HTMLInputElement & HTMLSelectElement => !!x);
  for (const t of targets) { t.addEventListener('input', apply); t.addEventListener('change', apply); }
  apply();
  return () => { for (const t of targets) { t.removeEventListener('input', apply); t.removeEventListener('change', apply); } };
}
