// Tarayıcı doğrulaması: `npm run build` sonrası `vite preview` çalışırken kullanılır.
// Kullanım: PW=/node-tools/node_modules/playwright node scripts/verify.mjs http://localhost:4173/
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const base = process.argv[2] || 'http://localhost:4173/';
const root = '/opt/pw-browsers';
const dir = readdirSync(root).find((d) => /^chromium-\d+$/.test(d));
const executablePath = `${root}/${dir}/chrome-linux/chrome`;
mkdirSync('docs/screenshots', { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
let fail = 0;
const routes = [['home', '#/'], ['ch02', '#/bolum/ch02'], ['app2', '#/bolum/app2'], ['ch11', '#/bolum/ch11'], ['deneyler', '#/deneyler']];
for (const w of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_(NAME|INTERNET|CONNECTION|TUNNEL)|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    window.__raf = 0;
    const o = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { window.__raf++; return o(cb); };
  });
  for (const [name, hash] of routes) {
    await page.goto(base + hash);
    await page.reload();
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, h1: document.querySelector('h1')?.textContent }));
    const ok = m.sw <= m.iw;
    if (!ok) fail++;
    console.log(w, name, JSON.stringify(m), ok ? 'OK' : 'YATAY TAŞMA');
    await page.screenshot({ path: `docs/screenshots/${name}-${w}.png`, fullPage: w === 390 });
  }
  // Dokunma hedefi taraması (görünür düğme/bağlantı/girdi)
  await page.goto(base + '#/bolum/ch02'); await page.waitForTimeout(400);
  const small = await page.evaluate(() => [...document.querySelectorAll('button, a.ch-card, .topnav a, input, select, summary')]
    .filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ t: (e.textContent || e.id || e.tagName).trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 40));
  console.log(w, 'küçük hedefler:', JSON.stringify(small));
  // Gezinme: sim döngüsü durmalı
  await page.goto(base + '#/bolum/ch02'); await page.waitForTimeout(400);
  const running = await page.evaluate(async () => { const a = window.__raf; await new Promise((r) => setTimeout(r, 400)); return window.__raf - a; });
  await page.evaluate(() => { location.hash = '#/bolum/ch11'; });
  await page.waitForTimeout(500);
  const stopped = await page.evaluate(async () => { const a = window.__raf; await new Promise((r) => setTimeout(r, 600)); return window.__raf - a; });
  const gone = await page.evaluate(() => document.querySelectorAll('.sim').length);
  console.log(w, 'rAF çalışırken', running, 'ch11\'de', stopped, 'kalan .sim', gone);
  if (running < 5 || stopped !== 0 || gone !== 0) fail++;
  // ch02 <-> app2 geçişleri ve sim etkileşimi
  await page.goto(base + '#/bolum/ch02'); await page.waitForTimeout(300);
  await page.click('.sim .chip:nth-child(2)'); await page.waitForTimeout(1500);
  console.log(w, 'say:', await page.textContent('.sim .say'));
  await page.evaluate(() => { location.hash = '#/bolum/app2'; }); await page.waitForTimeout(500);
  await page.click('.sim .tab:nth-child(2)'); await page.waitForTimeout(300);
  console.log(w, 'endo say:', await page.textContent('.sim .say'));
  // Tema düğmesi
  await page.click('#theme-btn'); await page.waitForTimeout(200);
  await page.screenshot({ path: `docs/screenshots/app2-dark-${w}.png` });
  console.log(w, 'tema:', await page.evaluate(() => document.documentElement.dataset.theme));
  if (w === 1280) { // sticky + çubuk
    await page.goto(base + '#/bolum/ch02'); await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, 400)); await page.waitForTimeout(200);
    const r = await page.evaluate(() => { const p = document.querySelector('.ch-sim').getBoundingClientRect(); const b = document.querySelector('.sim-bar').getBoundingClientRect(); return { panelTop: Math.round(p.top), barPos: getComputedStyle(document.querySelector('.sim-bar')).position, barBottom: Math.round(b.bottom), panelBottom: Math.round(p.bottom) }; });
    console.log('sticky', JSON.stringify(r));
    await page.screenshot({ path: 'docs/screenshots/ch02-1280-scrolled.png' });
  }
  console.log(w, 'konsol hataları:', errors.length, errors.slice(0, 3));
  if (errors.length) fail++;
  await ctx.close();
}
await browser.close();
process.exit(fail ? 1 : 0);
