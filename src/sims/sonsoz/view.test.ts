// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './view';
import { meta } from './meta';
import { simsFor } from '../registry';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

function stubRaf() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
  let t = performance.now();
  const tick = (ms = 100) => { t += ms; const cur = Array.from(pending.values()); pending.clear(); for (const cb of cur) cb(t); };
  return { pending, tick };
}
const q = <T extends Element = HTMLElement>(root: ParentNode, ref: string) => root.querySelector<T>(`[data-ref="${ref}"]`)!;
const click = (e: Element) => e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const input = (e: HTMLInputElement, v: number) => { e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); };
const setup = () => {
  const raf = stubRaf();
  const host = document.createElement('div');
  document.body.append(host);
  const un = mount(host);
  return { ...raf, host, un };
};
const tab = (host: HTMLElement, name: string) => host.querySelector<HTMLButtonElement>(`.tab[data-pane="${name}"]`)!;
const pane = (host: HTMLElement, name: string) => host.querySelector<HTMLElement>(`.pane[data-pane="${name}"]`)!;
const slider = (host: HTMLElement, pn: string, key: string) => pane(host, pn).querySelector<HTMLInputElement>(`input[id$="-sl-${key}"]`)!;
const say = (host: HTMLElement) => q(host, 'say').textContent!;
const tourNext = (host: HTMLElement, pn: string) => click(pane(host, pn).querySelector('[data-t="next"]')!);

describe('sonsoz kaydı', () => {
  it('epilogue bölümünde ve doğru başlıkla', () => {
    expect(meta.chapter).toBe('epilogue');
    expect(meta.title).toBe('Ortalama değil, dağılım');
    expect(simsFor('epilogue').map((s) => s.id)).toContain('sonsoz');
  });
});

describe('sonsoz görünümü', () => {
  it('bağlanır, id çakışmaz, unmount rAF ve DOM\'u temizler', () => {
    const { pending, tick } = stubRaf();
    const a = document.createElement('div'), b = document.createElement('div');
    document.body.append(a, b);
    const ua = mount(a), ub = mount(b);
    const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(pending.size).toBe(2);
    ua();
    expect(a.innerHTML).toBe('');
    expect(pending.size).toBe(1);
    tick();
    ub();
    expect(b.innerHTML).toBe('');
    expect(pending.size).toBe(0);
  });

  it('yerleşim sırası: soru, sekmeler, çubuk, canlı bölge, paneller; her panel kendi turuyla açılır', () => {
    const { host } = setup();
    const sim = host.firstElementChild!;
    const order = Array.from(sim.children).map((c) => (c.classList.contains('lede') ? 'lede' : c.classList.contains('tabs') ? 'tabs' : c.classList.contains('sim-bar') ? 'bar' : c.classList.contains('sr-only') ? 'live' : c.classList.contains('pane') ? 'pane' : 'other'));
    expect(order.slice(0, 7)).toEqual(['lede', 'tabs', 'bar', 'live', 'pane', 'pane', 'pane']);
    for (const p of ['ort', 'biz', 'harita']) expect(pane(host, p).firstElementChild!.classList.contains('tour')).toBe(true);
    expect(host.querySelectorAll('[role="tab"]')).toHaveLength(3);
  });

  it('sekme 1: varsayılan durum, kaydırıcılar çubuğu ve çizimi günceller', () => {
    const { host, tick } = setup();
    tick();
    expect(say(host)).toMatch(/Ortalama aynı \(50\)/);
    expect(q(host, 'ml0').textContent).toMatch(/A: eşiği aşan/);
    const svgBefore = q(host, 'plot').innerHTML;
    input(slider(host, 'ort', 'ctx'), 8);
    tick();
    expect(say(host)).toMatch(/Ortalama aynı \(58\)/);
    expect(q(host, 'plot').innerHTML).not.toBe(svgBefore);
    const bBefore = q(host, 'mv1').textContent;
    input(slider(host, 'ort', 'sdB'), 24);
    tick();
    expect(q(host, 'mv1').textContent).not.toBe(bBefore);
    // iki tepeli düğmesi ve çekim
    click(host.querySelectorAll('[data-ref="shape"] .chip')[1]);
    tick();
    expect(q(host, 'plot').getAttribute('aria-label')).toMatch(/Ortalama aynı/);
    click(q(host, 'pick'));
    tick();
    expect(q(host, 'pickNote').textContent).toMatch(/Çekilen kişiler/);
    // eşik bağlam çizgisi sayfada
    expect(q(host, 'plot').querySelectorAll('rect').length).toBeGreaterThan(10);
  });

  it('sekme 1 turu: 5 adım, serbest oyna kapatır; adımlar kaydırıcıları ayarlar', () => {
    const { host, tick } = setup();
    const steps = () => pane(host, 'ort').querySelector('.tour-n')!.textContent;
    expect(steps()).toBe('1 / 5');
    tourNext(host, 'ort'); tourNext(host, 'ort');
    tick();
    expect(steps()).toBe('3 / 5');
    expect(slider(host, 'ort', 'ctx').value).toBe('8');
    tourNext(host, 'ort');
    tick();
    expect(slider(host, 'ort', 'thr').value).toBe('60');
    expect(say(host)).toMatch(/Ortalama aynı/);
    tourNext(host, 'ort'); tourNext(host, 'ort');
    expect(pane(host, 'ort').querySelector('.tour')!.classList.contains('is-closed')).toBe(true);
  });

  it('sekme 2: kişiler çizilir, merkez değişir, kaydırıcılar sınırı kaydırır, oynat zamanı ilerletir', () => {
    const { host, tick } = setup();
    click(tab(host, 'biz'));
    expect(pane(host, 'biz').hidden).toBe(false);
    expect(pane(host, 'ort').hidden).toBe(true);
    expect(host.querySelectorAll('.pp')).toHaveLength(24);
    expect(host.querySelectorAll('.pp.t-biz')).toHaveLength(11);
    expect(host.querySelectorAll('.pp.t-ego')).toHaveLength(1);
    expect(say(host)).toMatch(/11 \/ 23 kişi "biz"/);
    // başka kişi merkez olur (klavye)
    const p5 = host.querySelectorAll<SVGElement>('.pp')[5];
    p5.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    tick();
    expect(host.querySelector('.pp.t-ego')).toBe(p5);
    // ortak etiket + hedef
    input(slider(host, 'biz', 'label'), 100);
    input(slider(host, 'biz', 'goal'), 100);
    tick();
    expect(host.querySelectorAll('.pp.t-biz').length).toBeGreaterThan(11);
    expect(say(host)).toMatch(/Sınır/);
    expect(host.querySelectorAll('.tie[visibility="visible"]').length).toBe(host.querySelectorAll('.pp.t-biz').length);
    // oynat
    input(slider(host, 'biz', 'time'), 0);
    click(q(host, 'play'));
    expect(q(host, 'play').textContent).toBe('Duraklat');
    tick(100); tick(2000);
    expect(+slider(host, 'biz', 'time').value).toBeGreaterThan(10);
    click(q(host, 'play'));
    expect(q(host, 'play').textContent).toBe('Zamanı oynat');
  });

  it('sekme 2 turu: altı adım, tehdit adımında "biz" daralır; negatif zaman farkı yok sayılır', () => {
    const { host, tick, un } = setup();
    click(tab(host, 'biz'));
    const n = () => host.querySelectorAll('.pp.t-biz').length;
    for (let i = 0; i < 3; i++) tourNext(host, 'biz');
    tick();
    const calm = n();
    tourNext(host, 'biz'); tick();
    const tense = n();
    expect(tense).toBeLessThan(calm);
    expect(slider(host, 'biz', 'threat').value).toBe('100');
    tourNext(host, 'biz'); tick();
    expect(n()).toBeGreaterThan(tense);
    // rAF ilk karesinde zaman farkı negatif olabilir
    click(q(host, 'play'));
    tick(-500);
    tick(-500);
    expect(+slider(host, 'biz', 'time').value).toBeGreaterThanOrEqual(90);
    un();
  });

  it('sekme 3: harita bölümleri listeler, süzgeç çalışır, bağlantılar kayıtla uyumlu', () => {
    const { host, tick } = setup();
    click(tab(host, 'harita'));
    const rows = pane(host, 'harita').querySelectorAll<HTMLElement>('.mp-list:not(.mp-themes) .mp-row');
    expect(rows).toHaveLength(21);
    expect(say(host)).toMatch(/Haritada 21 bölüm/);
    const hrefs = Array.from(pane(host, 'harita').querySelectorAll<HTMLAnchorElement>('a.mp-sim')).map((a) => a.getAttribute('href')!);
    expect(hrefs).toContain('#/bolum/ch11?sim=biz-onlar');
    expect(hrefs).toContain('#/bolum/ch17?sim=savas-baris');
    expect(hrefs).toContain('#/bolum/ch02?sim=bir-saniye-once');
    for (const h of hrefs.filter((x) => x.includes('?sim='))) {
      const m = /#\/bolum\/(\w+)\?sim=([\w-]+)/.exec(h)!;
      expect(simsFor(m[1]).map((s) => s.id)).toContain(m[2]);
    }
    click(host.querySelectorAll('[data-ref="chips"] .chip')[3]);
    tick();
    const visible = Array.from(rows).filter((r) => !r.hidden);
    expect(visible).toHaveLength(7);
    expect(visible.every((r) => r.dataset.g === 'biz')).toBe(true);
    expect(say(host)).toMatch(/Haritada 7 bölüm/);
    // temadan simülasyon sekmesine geç
    click(pane(host, 'harita').querySelector('.mp-here[data-tab="biz"]')!);
    expect(pane(host, 'biz').hidden).toBe(false);
  });

  it('sekme 3 turu süzgeci değiştirir; son adım hepsini gösterir', () => {
    const { host, tick } = setup();
    click(tab(host, 'harita'));
    const rows = pane(host, 'harita').querySelectorAll<HTMLElement>('.mp-list:not(.mp-themes) .mp-row');
    tourNext(host, 'harita');
    tick();
    expect(Array.from(rows).filter((r) => !r.hidden)).toHaveLength(4);
    for (let i = 0; i < 3; i++) tourNext(host, 'harita');
    tick();
    expect(Array.from(rows).filter((r) => !r.hidden)).toHaveLength(21);
  });

  it('klavyeyle sekme gezinti ve ekran dışında döngü durur', () => {
    const observers: Array<{ cb: IntersectionObserverCallback }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      cb: IntersectionObserverCallback;
      constructor(cb: IntersectionObserverCallback) { this.cb = cb; observers.push(this); }
      observe() {} disconnect() {}
    });
    const { host, pending } = setup();
    tab(host, 'ort').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tab(host, 'biz').getAttribute('aria-selected')).toBe('true');
    expect(tab(host, 'biz').tabIndex).toBe(0);
    expect(pending.size).toBe(1);
    observers[0].cb([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(0);
    observers[0].cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(1);
  });

  it('sayfa altı notları tembel gelir: nasıl çalışır, kitapta kutusu ve dipnot', async () => {
    const { host } = setup();
    await vi.waitFor(() => expect(host.querySelectorAll('.book').length).toBe(3));
    expect(host.querySelectorAll('details.how')).toHaveLength(3);
    expect(host.querySelector('.foot')!.textContent).toMatch(/modelin varsayımı/);
    for (const a of Array.from(host.querySelectorAll<HTMLAnchorElement>('.book a'))) expect(a.getAttribute('href')).toMatch(/^#\/bolum\//);
  });

  it('notlar gelmeden kapanırsa hiçbir şey yazılmaz', async () => {
    const { host, un } = setup();
    un();
    await new Promise((r) => setTimeout(r, 30));
    expect(host.innerHTML).toBe('');
  });
});
