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
