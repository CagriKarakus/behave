// Tarayıcı doğrulaması: `npm run build` sonrası `vite preview` çalışırken kullanılır.
// Kullanım: PW=/opt/node-tools/node_modules/playwright [CHROME_PATH=...] node scripts/verify.mjs http://localhost:4173/
// Çıkış kodu 0 değilse en az bir denetim başarısız olmuştur. Ekran görüntüleri docs/screenshots/ (küçük bir set).
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const base = process.argv[2] || 'http://localhost:4173/';
const OUT = process.env.SHOTS || 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

// Chromium yolu: CHROME_PATH, yoksa /opt/pw-browsers altındaki ilk chromium, yoksa Playwright varsayılanı.
function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = '/opt/pw-browsers';
  if (existsSync(root)) {
    const dir = readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
    if (dir && existsSync(`${root}/${dir}/chrome-linux/chrome`)) return `${root}/${dir}/chrome-linux/chrome`;
  }
  return undefined;
}
const browser = await chromium.launch({ executablePath: chromePath(), args: ['--no-sandbox'] });
let fail = 0;
const check = (ok, msg) => { console.log(ok ? '  OK  ' : ' HATA ', msg); if (!ok) fail++; };

// ---- Sayfa içi yardımcı (WCAG kontrastı) ----
const contrastProbe = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.99) return c; } return parse(getComputedStyle(document.body).backgroundColor); };
  const bad = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!el.getClientRects().length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) < 1 || el.closest('[hidden]')) continue;
    const isSvg = el instanceof SVGElement;
    const fg = parse(isSvg ? cs.fill : cs.color);
    if (!fg || fg.a < 0.99) continue;
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const r = ratio(fg, bgOf(el));
    const key = (el.className?.baseVal ?? el.className) + '|' + cs.color + cs.fill;
    if (r < need && !seen.has(key)) { seen.add(key); bad.push(`${el.tagName.toLowerCase()}.${el.className?.baseVal ?? el.className} "${el.textContent.trim().slice(0, 24)}" ${r.toFixed(2)}<${need}`); }
  }
  // Denetim kenarlıkları (>= 3:1)
  for (const el of document.querySelectorAll('.chip, .sim .btn, .theme-btn, .filters input, .filters select')) {
    if (!el.getClientRects().length || el.matches('[aria-pressed="true"]')) continue;
    const cs = getComputedStyle(el);
    const r = ratio(parse(cs.borderTopColor), bgOf(el.parentElement));
    const key = 'b|' + el.className + cs.borderTopColor;
    if (r < 3 && !seen.has(key)) { seen.add(key); bad.push(`kenar ${el.tagName.toLowerCase()}.${el.className} ${r.toFixed(2)}<3`); }
  }
  return bad;
};

const routes = [['home', '#/'], ['ch02', '#/bolum/ch02'], ['app2', '#/bolum/app2'], ['ch11', '#/bolum/ch11'], ['deneyler', '#/deneyler']];
for (const w of [390, 1280]) {
  console.log(`\n=== ${w}px ===`);
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
  const page = await ctx.newPage();
  const errors = [];
  const requested = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => requested.push(r.url()));
  await page.addInitScript(() => {
    window.__raf = 0;
    const o = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { window.__raf++; return o(cb); };
  });
  const open = async (hash, wait = 600) => { await page.goto(base + hash); await page.reload(); await page.waitForTimeout(wait); };

  // 1) Sayfalar: yatay taşma yok, başlık var; küçük ekran görüntüleri
  for (const [name, hash] of routes) {
    await open(hash, 900);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, h1: document.querySelector('h1')?.textContent }));
    check(m.sw <= m.iw && !!m.h1, `${name}: taşma yok, h1="${(m.h1 || '').slice(0, 30)}"`);
    if (name !== 'ch11' && name !== 'deneyler') await page.screenshot({ path: `${OUT}/${name}-${w}.png` });
  }

  // 2) Ana sayfa yalnızca ana paketi indirir (bölüm ayrıntısı/sim parçası yok)
  requested.length = 0;
  await open('#/', 800);
  const js = [...new Set(requested.filter((u) => /\.js(\?|$)/.test(u)).map((u) => u.split('/').pop()))];
  check(js.length === 1, `ana sayfa tek JS parçası ister: ${js.join(', ')}`);

  // 3) Atlama bağlantısı: ilk Tab ona gider; Enter rotayı bozmaz, odak <main>'e geçer
  await open('#/bolum/ch02', 900);
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.className);
  check(first === 'skip', `ilk Tab atlama bağlantısında (${first})`);
  if (w === 1280) await page.screenshot({ path: `${OUT}/skiplink-focused-${w}.png`, clip: { x: 0, y: 0, width: 640, height: 120 } });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const sk = await page.evaluate(() => ({ hash: location.hash, sims: document.querySelectorAll('.sim').length, active: document.activeElement?.id }));
  check(sk.hash === '#/bolum/ch02' && sk.sims >= 1 && sk.active === 'main', `atlama sonrası: ${JSON.stringify(sk)}`);

  // 4) Alt çubuk
  await open('#/bolum/ch02', 900);
  const geo = () => page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom) }; };
    return { bar: r('.sim-bar'), stage: r('.sim .stage'), rest: r('.ch-rest'), vh: innerHeight };
  });
  if (w === 390) {
    let g = await geo();
    check(g.bar.top >= g.vh, `açılışta çubuk görünüme girmiyor (bar.top=${g.bar.top}, vh=${g.vh})`);
    await page.evaluate(() => window.scrollTo(0, document.querySelector('.sim').getBoundingClientRect().top + scrollY + 500));
    await page.waitForTimeout(200);
    g = await geo();
    check(g.bar.bottom === g.vh, `sim içinde çubuk ekranın altına yapışık (bottom=${g.bar.bottom})`);
    await page.screenshot({ path: `${OUT}/ch02-${w}-bar.png` });
    await page.evaluate(() => window.scrollTo(0, document.querySelector('.ch-rest').getBoundingClientRect().top + scrollY - 120));
    await page.waitForTimeout(200);
    g = await geo();
    check(g.bar.bottom <= g.rest.top + 1, `sim bitince çubuk bölüm metninin üstünde kalır (bar.bottom=${g.bar.bottom}, rest.top=${g.rest.top})`);
    await page.screenshot({ path: `${OUT}/ch02-${w}-bar-end.png` });
  } else {
    const g = await geo();
    check(g.bar.bottom <= g.stage.top + 1, `masaüstü: çubuk diyagramın üstünde, örtmüyor (bar.bottom=${g.bar.bottom}, stage.top=${g.stage.top})`);
    await page.screenshot({ path: `${OUT}/ch02-${w}.png` });
    await page.evaluate(() => { document.querySelector('.ch-sim').scrollTop = 300; });
    await page.waitForTimeout(150);
    const g2 = await geo();
    check(g2.bar.top >= 0 && g2.bar.top < 140, `masaüstü: panel kayınca çubuk panelin üstünde kalır (top=${g2.bar.top})`);
    await page.evaluate(() => { document.querySelector('.ch-sim').scrollTop = 0; });
  }

  // 5) Performans: duraklatılınca ve ekran dışında çizim durur
  await open('#/bolum/ch02', 700);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('.sim').getBoundingClientRect().top + scrollY - 60)); await page.waitForTimeout(300);
  const raf = () => page.evaluate(async () => { const a = window.__raf; await new Promise((r) => setTimeout(r, 500)); return window.__raf - a; });
  const running = await raf();
  check(running > 10, `çalışırken rAF/500ms=${running}`);
  const mutations = () => page.evaluate(async () => {
    let n = 0; const mo = new MutationObserver((l) => { n += l.length; });
    mo.observe(document.querySelector('.sim'), { subtree: true, attributes: true, characterData: true, childList: true });
    await new Promise((r) => setTimeout(r, 500)); mo.disconnect(); return n;
  });
  await page.click('.sim [data-ref="pause"]'); await page.waitForTimeout(400);
  const pausedMut = await mutations();
  check(pausedMut === 0, `duraklatılmışken DOM değişimi=${pausedMut}`);
  await page.click('.sim [data-ref="pause"]');
  if (w === 390) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(500);
    const off = await raf();
    check(off === 0, `sim ekran dışındayken rAF/500ms=${off}`);
  }

  // 6) Gezinme: sim döngüsü durur
  await open('#/bolum/ch02', 500);
  await page.evaluate(() => { location.hash = '#/bolum/ch11'; });
  await page.waitForTimeout(500);
  const stopped = await raf();
  const gone = await page.evaluate(() => document.querySelectorAll('.sim').length);
  check(stopped === 0 && gone === 0, `ch11'de rAF=${stopped}, kalan .sim=${gone}`);

  // 7) Etkileşim ve tema
  await open('#/bolum/ch02', 500);
  await page.click('.sim .chip:nth-child(2)'); await page.waitForTimeout(1500);
  console.log('   say:', (await page.textContent('.sim .say')).slice(0, 80));
  await page.evaluate(() => { location.hash = '#/bolum/app2'; }); await page.waitForTimeout(700);
  await page.click('.sim .tab:nth-child(2)'); await page.waitForTimeout(300);
  await page.click('.sim [data-ref="rcChips"] .chip:nth-child(2)'); await page.waitForTimeout(300);
  check((await page.evaluate(() => document.querySelectorAll('[data-ref="rcSvg"] g g').length)) === 0, 'reseptör mutasyonu: yuva yok');
  await page.click('.sim [data-ref="rcChips"] .chip:nth-child(1)'); await page.waitForTimeout(300);
  check((await page.evaluate(() => document.querySelectorAll('[data-ref="rcSvg"] g g').length)) > 0, 'reseptör normal: yuvalar çizildi');
  await page.click('#theme-btn'); await page.waitForTimeout(200);
  if (w === 1280) await page.screenshot({ path: `${OUT}/app2-dark-${w}.png` });
  console.log('   tema:', await page.evaluate(() => document.documentElement.dataset.theme));
  await page.click('#theme-btn'); // açığa dön

  // 8) Gerçek deney verisi
  await open('#/deneyler', 900);
  const ex = await page.evaluate(() => ({ n: document.querySelectorAll('.exp-wrap').length, count: document.querySelector('[data-count]')?.textContent, dd: [...document.querySelectorAll('.exp-sources a')].filter((a) => /doi\.org\/https?:/.test(a.href)).length, doi: document.querySelectorAll('.exp-sources a[href^="https://doi.org/10."]').length }));
  check(ex.n > 100 && ex.dd === 0, `deneyler: ${ex.count}, doi bağlantısı ${ex.doi}, çift önekli ${ex.dd}`);
  // Türkçe büyük/küçük harf tuzağı: gerçek bir deney adındaki ilk Latin sözcükle (küçük ve Türkçe büyük harf) ara.
  const term = await page.evaluate(() => { const n = [...document.querySelectorAll('.exp-name')].map((e) => e.textContent); return (n.join(' ').match(/[A-Za-z]{6,}/) || ['experiment'])[0]; });
  await page.fill('[data-f=q]', term.toLowerCase()); await page.waitForTimeout(150);
  const q1 = await page.evaluate(() => document.querySelector('[data-count]').textContent);
  await page.fill('[data-f=q]', term.toLocaleUpperCase('tr')); await page.waitForTimeout(150);
  const q2 = await page.evaluate(() => document.querySelector('[data-count]').textContent);
  check(q1 === q2 && !q1.startsWith('0 '), `arama "${term}": "${q1}" = "${q2}"`);
  await page.fill('[data-f=q]', '');
  await page.selectOption('[data-f=st]', 'sağlam'); await page.waitForTimeout(100);
  const st = await page.evaluate(() => document.querySelector('[data-count]').textContent);
  check(!st.startsWith('0 '), `durum süzgeci sağlam: ${st}`);
  await page.selectOption('[data-f=st]', '');
  await page.screenshot({ path: `${OUT}/deneyler-${w}.png` });
  const link = await page.evaluate(() => document.querySelector('.exp-chlink')?.getAttribute('href'));
  await open(link, 1000);
  const card = await page.evaluate(() => { const c = document.querySelector('.exp-target'); return c ? { open: c.querySelector('details').open, top: Math.round(c.getBoundingClientRect().top) } : null; });
  check(!!card && card.open && card.top < 200 && card.top >= 0, `?deney= kartı açıldı ve görünüme kaydırıldı ${JSON.stringify(card)} (${link})`);
  await page.screenshot({ path: `${OUT}/deney-karti-${w}.png` });

  // 9) ?deney=bulunamaz -> başa kaydır
  await open('#/', 600);
  await page.evaluate(() => window.scrollTo(0, 1500)); await page.waitForTimeout(150);
  await page.evaluate(() => { location.hash = '#/bolum/ch12?deney=yok'; }); await page.waitForTimeout(900);
  const sy = await page.evaluate(() => scrollY);
  check(sy === 0, `bulunamayan ?deney= başa kaydırır (scrollY=${sy})`);

  // 10) Geri tuşunda kaydırma konumu
  await open('#/', 600);
  await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/bolum/ch03'; }); await page.waitForTimeout(700);
  await page.goBack(); await page.waitForTimeout(900);
  const back = await page.evaluate(() => scrollY);
  check(Math.abs(back - 900) < 40, `geri tuşunda kaydırma konumu geri geldi (${back})`);

  // 11) Kontrast, açık ve koyu tema
  for (const theme of ['light', 'dark']) {
    await page.evaluate((t) => { try { localStorage.setItem('behave-theme', t); } catch { /* */ } }, theme);
    const bad = [];
    for (const [name, hash] of [...routes, ['deney', '#/bolum/ch12?deney=ch12-e1']]) {
      await open(hash, 700);
      if (name === 'app2') for (const t of [2, 3]) { await page.click(`.sim .tab:nth-child(${t})`); await page.waitForTimeout(200); bad.push(...(await page.evaluate(contrastProbe)).map((b) => `[app2/${t}] ${b}`)); }
      if (name === 'deneyler') await page.evaluate(() => document.querySelectorAll('.exp-body').forEach((d) => d.setAttribute('open', '')));
      if (name === 'ch02') { await page.click('.sim .chip:nth-child(10)'); await page.waitForTimeout(300); }
      bad.push(...(await page.evaluate(contrastProbe)).map((b) => `[${name}] ${b}`));
    }
    check(bad.length === 0, `kontrast (${theme}, ${w}px): ${bad.length} sorun ${bad.slice(0, 6).join(' | ')}`);
  }
  await page.evaluate(() => { try { localStorage.removeItem('behave-theme'); } catch { /* */ } });

  check(errors.length === 0, `konsol hataları: ${errors.length} ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}
await browser.close();
console.log(fail ? `\n${fail} denetim BAŞARISIZ` : '\nTüm denetimler geçti');
process.exit(fail ? 1 : 0);
