// İngilizce bölüm katmanını (content/en/<id>.json) Türkçe asıl kaynakla karşılaştırır.
// Kullanım: node scripts/validate-overlay.mjs ch02 [ch03 ...]   (argümansız: content/en/*.json hepsi)
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const src = JSON.parse(readFileSync(new URL('../content/chapters.json', import.meta.url), 'utf8'));
const glossary = JSON.parse(readFileSync(new URL('../content/glossary.json', import.meta.url), 'utf8'));
const dir = new URL('../content/en/', import.meta.url);
// Yalnızca Türkçe'ye özgü harfler (ı ş ğ İ) hata; ç ö ü yabancı özel adlarda (Müller, François) de geçer, uyarı verilir.
const TR_CHARS = /[ışğİŞĞ]/;
const SOFT_CHARS = /[çöüÇÖÜ]/;
const ALLOWED = new Set(['timescale', 'summary', 'keyConcepts', 'keyStudies', 'simulationIdeas', 'links', 'verifyNotes', 'experiments', '_uncertain']);
const EXP_KEYS = new Set(['name', 'researchers', 'question', 'method', 'finding', 'roleInChapter', 'caveats', 'replication']);

const nums = (s) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/[.,]/g, ''));

export function validate(id) {
  const errs = [], warns = [];
  const chap = src.chapters.find((c) => c.id === id);
  if (!chap) return { errs: [`${id}: kaynakta yok`], warns };
  const file = new URL(`${id}.json`, dir);
  if (!existsSync(file)) return { errs: [`${id}: content/en/${id}.json yok`], warns };
  let o;
  try { o = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return { errs: [`${id}: JSON hatası: ${e.message}`], warns }; }
  const E = (m) => errs.push(`${id}: ${m}`), W = (m) => warns.push(`${id}: ${m}`);
  for (const k of Object.keys(o)) if (!ALLOWED.has(k)) E(`bilinmeyen alan: ${k}`);
  const text = (path, tr, en) => {
    if (typeof en !== 'string' || !en.trim()) { E(`${path}: boş/eksik`); return; }
    if (SOFT_CHARS.test(en)) W(`${path}: ç/ö/ü var (özel ad değilse Türkçe sızmış olabilir): …${en.match(new RegExp('.{0,20}' + SOFT_CHARS.source + '.{0,20}'))?.[0]}…`);
    if (TR_CHARS.test(en)) E(`${path}: Türkçe harf var: …${en.match(new RegExp('.{0,25}' + TR_CHARS.source + '.{0,25}'))?.[0]}…`);
    const lo = en.toLowerCase();
    for (const t of glossary.terms) for (const a of t.avoid ?? []) if (a && lo.includes(a.toLowerCase())) E(`${path}: yasaklı varyant "${a}" (kullan: ${t.en})`);
    if (tr) {
      const missing = [...new Set(nums(tr))].filter((n) => n.length > 0 && !nums(en).includes(n));
      if (missing.length) W(`${path}: Türkçe'deki sayılar İngilizce'de yok: ${missing.join(', ')}`);
      if (en.length > tr.length * 1.9 + 40 || en.length < tr.length * 0.35 - 10) W(`${path}: uzunluk oranı şüpheli (TR ${tr.length}, EN ${en.length})`);
    }
  };
  if (chap.timescale) text('timescale', null, o.timescale); else if (o.timescale) E('timescale: Türkçede yok');
  text('summary', chap.summary, o.summary);
  if (chap.summary) { const a = chap.summary.split(/\n{2,}/).filter(Boolean).length, b = (o.summary ?? '').split(/\n{2,}/).filter(Boolean).length; if (a !== b) W(`summary: paragraf sayısı ${a} → ${b}`); }
  const list = (name, fields, extra) => {
    const a = chap[name] ?? [], b = o[name];
    if (!a.length) { if (b && b.length) E(`${name}: kaynakta yok`); return; }
    if (!Array.isArray(b) || b.length !== a.length) { E(`${name}: uzunluk ${a.length} olmalı (${Array.isArray(b) ? b.length : 'yok'})`); return; }
    a.forEach((x, i) => { for (const f of fields) if (x[f]) text(`${name}[${i}].${f}`, x[f], b[i]?.[f]); extra?.(x, b[i], i); });
  };
  list('keyConcepts', ['term', 'explanation']);
  list('keyStudies', ['name', 'finding']);
  list('simulationIdeas', ['title', 'shows'], (x, y, i) => {
    for (const f of ['inputs', 'outputs']) {
      if ((x[f] ?? []).length !== (y?.[f] ?? []).length) E(`simulationIdeas[${i}].${f}: uzunluk ${(x[f] ?? []).length} olmalı`);
      (y?.[f] ?? []).forEach((s, j) => text(`simulationIdeas[${i}].${f}[${j}]`, x[f][j], s));
    }
  });
  list('links', ['why']);
  const vn = chap.verifyNotes ?? [];
  if (vn.length) { if (!Array.isArray(o.verifyNotes) || o.verifyNotes.length !== vn.length) E(`verifyNotes: uzunluk ${vn.length} olmalı`); else vn.forEach((s, i) => text(`verifyNotes[${i}]`, s, o.verifyNotes[i])); }
  const exps = chap.experiments ?? [];
  const oe = o.experiments ?? {};
  for (const k of Object.keys(oe)) if (!exps.some((e) => e.id === k)) E(`experiments.${k}: kaynakta yok`);
  for (const e of exps) {
    const x = oe[e.id];
    if (!x) { E(`experiments.${e.id}: eksik`); continue; }
    for (const k of Object.keys(x)) if (!EXP_KEYS.has(k)) E(`experiments.${e.id}.${k}: bilinmeyen alan`);
    for (const f of ['name', 'researchers', 'question', 'method', 'finding', 'roleInChapter']) if (e[f]) text(`${e.id}.${f}`, e[f], x[f]);
    if (e.caveats) text(`${e.id}.caveats`, e.caveats, x.caveats); else if (x.caveats) E(`${e.id}.caveats: Türkçede null`);
    if (e.replication) {
      if (e.replication.note) text(`${e.id}.replication.note`, e.replication.note, x.replication?.note);
      const rr = e.replication.refs ?? [];
      if (rr.length) {
        const r = x.replication?.refs;
        if (!Array.isArray(r) || r.length !== rr.length) E(`${e.id}.replication.refs: uzunluk ${rr.length} olmalı`);
        else r.forEach((s, j) => text(`${e.id}.replication.refs[${j}]`, rr[j], s));
      }
    }
  }
  return { errs, warns };
}

if (process.argv[1] && process.argv[1].endsWith('validate-overlay.mjs')) {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => f.slice(0, -5)) : [];
  let bad = 0;
  for (const id of ids) {
    const { errs, warns } = validate(id);
    for (const w of warns) console.log('uyarı  ' + w);
    for (const e of errs) console.log('HATA   ' + e);
    console.log(`${id}: ${errs.length} hata, ${warns.length} uyarı`);
    bad += errs.length;
  }
  process.exit(bad ? 1 : 0);
}
