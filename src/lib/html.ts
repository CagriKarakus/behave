// Küçük, güvenli HTML şablonlama: ${} içindeki metin kaçışlanır, html`` sonuçları olduğu gibi geçer.
export class Safe {
  constructor(readonly value: string) {}
  toString(): string { return this.value; }
}
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
export const raw = (s: string): Safe => new Safe(s);

function part(v: unknown): string {
  if (v instanceof Safe) return v.value;
  if (Array.isArray(v)) return v.map(part).join('');
  if (v === false || v == null) return '';
  return esc(v);
}
export function html(strings: TemplateStringsArray, ...vals: unknown[]): Safe {
  let out = '';
  strings.forEach((s, i) => { out += s + (i < vals.length ? part(vals[i]) : ''); });
  return new Safe(out);
}
