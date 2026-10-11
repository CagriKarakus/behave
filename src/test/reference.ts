import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

/** Orijinal HTML'deki ilk <script> (saf model çekirdeği) Node'da vm ile çalıştırılır. */
export function loadReferenceModel<T = Record<string, any>>(file: string): T { // eslint-disable-line @typescript-eslint/no-explicit-any
  const html = readFileSync(resolve(process.cwd(), 'reference/artifacts', file), 'utf8');
  const m = /<script>([\s\S]*?)<\/script>/.exec(html);
  if (!m) throw new Error('Model script bulunamadı: ' + file);
  const sandbox: { module: { exports: unknown }; Math: Math } = { module: { exports: {} }, Math };
  vm.createContext(sandbox);
  vm.runInContext(m[1], sandbox, { filename: file });
  return sandbox.module.exports as T;
}

/** Orijinal HTML'deki üst düzey bir değişmez dizi/nesne (`const NAME = [...]`) değerini çıkarır. */
export function extractConst(file: string, name: string): unknown {
  const html = readFileSync(resolve(process.cwd(), 'reference/artifacts', file), 'utf8');
  const m = new RegExp(`const ${name} = `).exec(html);
  if (!m) throw new Error(`${name} bulunamadı: ${file}`);
  let i = m.index + m[0].length;
  const start = i;
  let depth = 0;
  let quote = '';
  for (; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = '';
    } else if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  return vm.runInNewContext('(' + html.slice(start, i) + ')');
}
