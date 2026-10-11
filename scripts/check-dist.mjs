// dist denetimi: kitap metni yayına sızmasın.
//   1) dist içinde PDF ya da .book yolu var mı (dosya adı denetimi)
//   2) .book/chapters/*.txt (ve behave.txt) içinden rastgele uzun cümleler alınıp dist'in metin dosyalarında aranır.
//      Metin, bir modül içine ?raw ile gömülse bile (kaçış, satır sonu, boşluk farkları) yakalanması için
//      karşılaştırma yalnızca harf/rakamlarla yapılır.
// Kullanım: node scripts/check-dist.mjs [--dist dist] [--book .book] [--samples 40] [--seed 1]
// .book yoksa (CI gibi) metin denetimi atlanır, çıkış 0.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const dist = args.dist ?? 'dist';
const book = args.book ?? '.book';
const perFile = Number(args.samples ?? 40);
let seed = Number(args.seed ?? Date.now() % 100000);

const TEXT_EXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.txt', '.map', '.svg', '.xml', '.webmanifest']);
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const CITATION = /et al\.|“|\b(?:19|20)\d{2}\b/;
const alnum = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const rng = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

if (!existsSync(dist)) { console.error(`dist bulunamadı: ${dist} (önce npm run build)`); process.exit(2); }
const files = walk(dist);
let fail = 0;

for (const f of files) {
  if (/\.pdf$/i.test(f) || /(^|[\\/])\.book([\\/]|$)/.test(f)) { console.error(`dist içinde yasak dosya: ${f}`); fail++; }
}

if (!existsSync(book)) {
  console.log(`${book} yok: kitap metni denetimi atlandı.`);
  process.exit(fail ? 1 : 0);
}

const haystack = alnum(files.filter((f) => TEXT_EXT.has(extname(f).toLowerCase())).map((f) => readFileSync(f, 'utf8')).join('\n'));
const sources = [];
const chDir = join(book, 'chapters');
if (existsSync(chDir)) for (const n of readdirSync(chDir).sort()) if (n.endsWith('.txt')) sources.push(join(chDir, n));
if (existsSync(join(book, 'behave.txt'))) sources.push(join(book, 'behave.txt'));
if (!sources.length) { console.log(`${book} içinde metin dosyası yok: denetim atlandı.`); process.exit(fail ? 1 : 0); }

let checked = 0;
for (const file of sources) {
  const text = readFileSync(file, 'utf8').replace(/\s+/g, ' ');
  // Uzun, ayırt edici cümleler: en az 80 karakter ve 12 sözcük. Kaynakça/atıf satırları (et al., tırnaklı başlık, yıl)
  // içerik dosyasında yasal olarak atıf biçiminde yer alabilir; bunlar örneklemeden çıkarılır.
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ"“])/).filter((s) => s.length >= 80 && s.length <= 400 && s.split(' ').length >= 12 && !CITATION.test(s));
  const n = file.endsWith('behave.txt') ? perFile * 5 : perFile;
  for (let i = 0; i < Math.min(n, sentences.length); i++) {
    const s = sentences[Math.floor(rng() * sentences.length)];
    const a = alnum(s);
    const frag = a.slice(Math.max(0, (a.length >> 1) - 30), (a.length >> 1) + 30); // cümlenin ortasından 60 harf/rakam
    checked++;
    if (haystack.includes(frag)) { console.error(`KİTAP METNİ dist içinde bulundu (${file}): "${s.slice(0, 100)}…"`); fail++; }
  }
}
console.log(`dist denetimi: ${files.length} dosya, ${sources.length} kaynak, ${checked} cümle örneği arandı. ${fail ? 'BAŞARISIZ' : 'Temiz.'}`);
process.exit(fail ? 1 : 0);
