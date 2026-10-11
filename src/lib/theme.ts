// Açık/koyu tema: varsayılan sistem tercihi; elle seçim localStorage'da (hata olursa yalnız bellekte).
const KEY = 'behave-theme';
export type Theme = 'light' | 'dark';

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch { return null; }
}
function writeStored(t: Theme): void {
  try { localStorage.setItem(KEY, t); } catch { /* özel pencere vb. */ }
}

export function effectiveTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initTheme(): void {
  const t = readStored();
  if (t) document.documentElement.setAttribute('data-theme', t);
}

export function toggleTheme(): Theme {
  const next: Theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  writeStored(next);
  return next;
}
