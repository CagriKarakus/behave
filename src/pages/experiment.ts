import type { Chapter, Content, Experiment, ReplicationStatus } from '../content/types';
import { chapterLabel } from '../content/normalize';
import { html, raw, type Safe } from '../lib/html';
import { experimentHref } from '../lib/router';

export const REPL_LABEL: Record<ReplicationStatus, { icon: string; text: string }> = {
  'sağlam': { icon: '✓', text: 'Replikasyon: sağlam' },
  'karışık': { icon: '◐', text: 'Replikasyon: karışık' },
  'tartışmalı': { icon: '!', text: 'Replikasyon: tartışmalı' },
  'bilinmiyor': { icon: '?', text: 'Replikasyon: bilinmiyor' },
};
export const REPL_STATUSES: ReplicationStatus[] = ['sağlam', 'karışık', 'tartışmalı', 'bilinmiyor'];

const safeUrl = (u: string): string | null => (/^https?:\/\//i.test(u) ? u : null);

/** Bir deney kartı. link=true ise "bölümde gör" bağlantısı (liste sayfası) gösterilir. */
export function experimentCard(e: Experiment, ch: Chapter, link: boolean): Safe {
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
        const href = s.doi ? `https://doi.org/${s.doi}` : s.url ? safeUrl(s.url) : null;
        const label = [s.citation, s.journal, s.year].filter(Boolean).join(', ');
        return html`<li>${href ? html`<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>` : label}${s.doi ? html` <span class="doi">doi:${s.doi}</span>` : ''}</li>`;
      })}</ul></div>` : ''}
    </details>
  </article>`;
}

export function renderExperiments(el: HTMLElement, content: Content): () => void {
  const all = content.chapters.flatMap((c) => c.experiments.map((e) => ({ e, c })));
  const withExp = content.chapters.filter((c) => c.experiments.length);
  el.innerHTML = html`<div class="page">
    <a class="back" href="#/">← Tüm bölümler</a>
    <h1 id="page-title" tabindex="-1">Deneyler</h1>
    <p class="lede">Kitapta anlatılan deneyler ve çalışmalar; bölüme, replikasyon durumuna ve metne göre süzülebilir.</p>
    ${all.length ? html`
    <form class="filters" role="search" aria-label="Deney süzgeci" onsubmit="return false">
      <label>Arama<input type="search" data-f="q" placeholder="Ad, araştırmacı, bulgu…" /></label>
      <label>Bölüm<select data-f="ch"><option value="">Tümü</option>${withExp.map((c) => html`<option value="${c.id}">${chapterLabel(c)} · ${c.titleTr}</option>`)}</select></label>
      <label>Replikasyon<select data-f="st"><option value="">Tümü</option>${REPL_STATUSES.map((s) => html`<option value="${s}">${s}</option>`)}</select></label>
    </form>
    <p class="muted" data-count role="status" aria-live="polite"></p>
    <div class="exp-list">${all.map(({ e, c }) => html`<div class="exp-wrap" data-ch="${c.id}" data-st="${e.replication?.status ?? 'belirtilmemiş'}" data-text="${[e.name, e.researchers, e.question, e.finding, e.method].join(' ').toLocaleLowerCase('tr')}">${experimentCard(e, c, true)}</div>`)}</div>` : html`<p class="muted">Henüz deney verisi yok.</p>`}
  </div>`.value;

  const q = el.querySelector<HTMLInputElement>('[data-f=q]');
  const ch = el.querySelector<HTMLSelectElement>('[data-f=ch]');
  const st = el.querySelector<HTMLSelectElement>('[data-f=st]');
  const count = el.querySelector<HTMLElement>('[data-count]');
  const wraps = Array.from(el.querySelectorAll<HTMLElement>('.exp-wrap'));
  const apply = () => {
    const text = (q?.value ?? '').trim().toLocaleLowerCase('tr');
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
  return () => {
    for (const t of targets) { t.removeEventListener('input', apply); t.removeEventListener('change', apply); }
    el.innerHTML = '';
  };
}
