// Küçük ortak parçalar: yatay göstergeler ve SVG metin sarma.
import { pc as fmtPc, el } from '../ui';
import { L } from './text';

export interface BarDef { label: string; color: string }
/** Etiket + iz + değer satırları; dönen fonksiyon yüzdeleri (0-1) ve isteğe bağlı değer metinlerini yazar. */
export function bars(host: HTMLElement, defs: BarDef[]): (vals: number[], texts?: string[]) => void {
  const rows = defs.map((d) => {
    const r = el(host, 'div', 'bar-r', `<span class="bar-l">${d.label}</span><div class="track"><b></b></div><em></em>`);
    r.style.setProperty('--c', d.color);
    return [r.querySelector('b') as HTMLElement, r.querySelector('em') as HTMLElement] as const;
  });
  return (vals, texts) => rows.forEach(([b, e], i) => {
    b.style.width = `${Math.round(Math.max(0, Math.min(1, vals[i])) * 100)}%`;
    e.textContent = texts?.[i] ?? fmtPc(vals[i]);
  });
}

/** Sözcük sınırında satırlara böler (SVG metni için). */
export function wrap(s: string, n: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    if (cur && (cur + ' ' + w).length > n) { out.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) out.push(cur);
  return out;
}

export const chLink = (ch: string): string => `<a href="#/bolum/${ch}">${L().chapterLink(+ch.slice(2), L().chapterNames[ch] ?? '')}</a>`;
