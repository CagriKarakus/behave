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
const setup = () => {
  const raf = stubRaf();
  const host = document.createElement('div');
  document.body.append(host);
  const un = mount(host);
  return { ...raf, host, un };
};
const tab = (host: HTMLElement, name: string) => host.querySelector<HTMLButtonElement>(`.tab[data-pane="${name}"]`)!;
const input = (el: HTMLInputElement, v: number) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); };
const chip = (host: HTMLElement, ref: string, name: string) => Array.from(q(host, ref).querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.includes(name))!;
const gauge = (host: HTMLElement, i: number) => Number(q(host, 'gauges').querySelectorAll('.g')[i].querySelector('.g-top b')!.textContent);
const slider = (host: HTMLElement, i = 0) => q(host, 'inp').querySelectorAll<HTMLInputElement>('input[type="range"]')[i];
const setMode = (host: HTMLElement, m: 'book' | 'repl') => host.querySelector<HTMLButtonElement>(`[data-mode="${m}"]`)!.click();

describe('metaforlar kaydı', () => {
  it('ch15 içinde, başlık doğru', () => {
    expect(meta.chapter).toBe('ch15');
    expect(meta.title).toBe('Metaforlar ve kutsal değerler');
    expect(simsFor('ch15').map((s) => s.id)).toContain('metaforlar');
  });
});

describe('metaforlar görünümü', () => {
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

  it('iki sekme: yalnızca seçili panel görünür, ok tuşuyla gezilir', () => {
    const { host, un } = setup();
    const panes = () => Array.from(host.querySelectorAll<HTMLElement>('.pane')).map((p) => !p.hidden);
    expect(panes()).toEqual([true, false]);
    tab(host, 'kut').click();
    expect(panes()).toEqual([false, true]);
    expect(tab(host, 'kut').getAttribute('aria-selected')).toBe('true');
    tab(host, 'kut').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(panes()).toEqual([true, false]);
    un();
  });

  it('kartlar: altı kart, her kartta replikasyon rozeti; sıcak fincan tartışmalı', () => {
    const { host, un } = setup();
    expect(q(host, 'cardChips').querySelectorAll('.chip').length).toBe(6);
    expect(q(host, 'ovs').querySelectorAll('.ov').length).toBe(6);
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    for (const c of ['Cyberball', 'İnsula', 'Sıcak fincan', 'Ağır pano', 'Macbeth', 'Bakteri']) {
      chip(host, 'cardChips', c).click();
      expect(q(host, 'cTags').querySelectorAll('.tag').length).toBeGreaterThan(0);
      expect(q(host, 'cNote').textContent).toContain('Replikasyon');
      expect(q(host, 'stage').children.length).toBeGreaterThan(3);
      expect(q(host, 'stage').getAttribute('aria-label')).toBeTruthy();
    }
    chip(host, 'cardChips', 'Sıcak fincan').click();
    expect(q(host, 'cTags').textContent).toContain('tartışmalı');
    chip(host, 'cardChips', 'İnsula').click();
    expect(q(host, 'cTags').textContent).toContain('sağlam');
    un();
  });

  it('sıcak fincan: kaydırıcı yargıyı kaydırır; replikasyon moduna geçince kayma tabana iner', () => {
    const { host, un } = setup();
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    chip(host, 'cardChips', 'Sıcak fincan').click();
    setMode(host, 'book');
    input(slider(host), 100);
    const book = gauge(host, 0);
    expect(book).toBeGreaterThan(65);
    expect(gauge(host, 2)).toBe(50); // kontrol sabit
    setMode(host, 'repl');
    expect(gauge(host, 0)).toBeLessThan(55);
    expect(host.querySelector('[data-mode="repl"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(q(host, 'say').textContent).toContain('replikasyon sonrası tahminde');
    input(slider(host), 0);
    setMode(host, 'book');
    expect(gauge(host, 0)).toBeLessThan(35);
    expect(q(host, 'inp').querySelector('.sl-val')!.textContent).toBe('buzlu');
    un();
  });

  it('insula: ihlal kaydırıcısı bozuk tat yokken de insulayı ve reddi yükseltir; replikasyonda reddetme sabit', () => {
    const { host, un } = setup();
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    chip(host, 'cardChips', 'İnsula').click();
    input(slider(host, 0), 0); input(slider(host, 1), 0);
    const i0 = gauge(host, 0);
    input(slider(host, 1), 90);
    expect(gauge(host, 0)).toBeGreaterThan(i0 + 40);
    const rej = gauge(host, 1);
    setMode(host, 'repl');
    expect(gauge(host, 1)).toBe(rej);
    input(slider(host, 0), 100);
    expect(gauge(host, 2)).toBeLessThan(55); // bozuk tat -> yargı: replikasyonda kaybolur
    setMode(host, 'book');
    expect(gauge(host, 2)).toBeGreaterThan(70);
    un();
  });

  it('Cyberball: top atılır, sayaç artar, arıza dACC\'yi düşürür, yeniden başlatma sayacı sıfırlar', () => {
    const { host, tick, un } = setup();
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    chip(host, 'cardChips', 'Cyberball').click();
    input(slider(host), 100);
    for (let i = 0; i < 40; i++) tick(100);
    const txt = () => Array.from(q(host, 'stage').querySelectorAll('text')).map((t) => t.textContent!).find((t) => t.startsWith('Sana atılan'))!;
    expect(txt()).toMatch(/Sana atılan: 0 \/ [1-9]\d* /);
    const acc = gauge(host, 1);
    expect(acc).toBe(100);
    chip(host, 'inp', 'Arıza').click();
    expect(gauge(host, 1)).toBeLessThan(15);
    expect(gauge(host, 0)).toBeGreaterThan(40); // öznel acı kısmen durur
    input(slider(host), 0);
    for (let i = 0; i < 120; i++) tick(100);
    expect(txt()).not.toMatch(/Sana atılan: 0 \//);
    chip(host, 'inp', 'yeniden').click();
    expect(txt()).toMatch(/Sana atılan: 0 \/ 0/);
    un();
  });

  it('Macbeth: kanal ve el yıkama seçenekleri göstergeleri değiştirir', () => {
    const { host, un } = setup();
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    chip(host, 'cardChips', 'Macbeth').click();
    input(slider(host), 100);
    expect(gauge(host, 0)).toBeGreaterThan(gauge(host, 1)); // sözlü: gargara
    chip(host, 'inp', 'Yazılı').click();
    expect(gauge(host, 1)).toBeGreaterThan(gauge(host, 0)); // yazılı: sabun
    const help = gauge(host, 2);
    chip(host, 'inp', 'yıkadı').click();
    expect(gauge(host, 2)).toBeLessThan(help);
    un();
  });

  it('genel bakış satırı kartı seçer', () => {
    const { host, un } = setup();
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    q(host, 'ovs').querySelector<HTMLButtonElement>('[data-card="clip"]')!.click();
    expect(q(host, 'cTitle').textContent).toContain('Ağır pano');
    expect(q(host, 'ovs').querySelector('[data-card="clip"]')!.getAttribute('aria-pressed')).toBe('true');
    un();
  });

  it('kutsal değerler: maddi teklif büyüyünce destek düşer, sembolik jest artırır, çip ve kalabalık güncellenir', () => {
    const { host, un } = setup();
    tab(host, 'kut').click();
    host.querySelectorAll<HTMLButtonElement>('[data-t="exit"]')[1].click();
    const sl = (i: number) => q(host, 'kSl').querySelectorAll<HTMLInputElement>('input')[i];
    const sup = () => Number(meterText(host, 0).replace('%', ''));
    input(sl(1), 100);
    chip(host, 'kindChips', 'Maddi').click();
    input(sl(0), 0);
    const s0 = sup();
    input(sl(0), 100);
    expect(sup()).toBeLessThan(s0);
    expect(q(host, 'crowd').querySelectorAll('path[stroke="var(--amy)"]').length).toBeGreaterThan(30);
    chip(host, 'kindChips', 'Sembolik').click();
    input(sl(0), 0);
    const y0 = sup();
    input(sl(0), 100);
    expect(sup()).toBeGreaterThan(y0 + 30);
    expect(q(host, 'crowd').getAttribute('aria-label')).toMatch(/100 kişiden/);
    // sıradan çıkar: maddi teklif artırır
    chip(host, 'kindChips', 'Maddi').click();
    input(sl(1), 0); input(sl(0), 0);
    const o0 = sup();
    input(sl(0), 100);
    expect(sup()).toBeGreaterThan(o0 + 30);
    // yeniden çek
    const before = q(host, 'crowd').innerHTML;
    q<HTMLButtonElement>(host, 'rerun').click();
    expect(q(host, 'crowd').innerHTML).not.toBe(before);
    un();
  });

  it('turlar: iki tur, 6 ve 5 adım; son adımda Bitir ve kapanır; adımlar durumu kurar', () => {
    const { host, un } = setup();
    expect(host.querySelectorAll('.tour').length).toBe(2);
    const next = host.querySelectorAll<HTMLButtonElement>('[data-t="next"]');
    expect(host.querySelectorAll('[data-t="n"]')[0].textContent).toBe('1 / 6');
    expect(host.querySelectorAll('[data-t="n"]')[1].textContent).toBe('1 / 5');
    next[0].click();
    expect(q(host, 'cTitle').textContent).toContain('Cyberball');
    next[0].click();
    expect(q(host, 'inp').querySelector('[aria-pressed="true"]')!.textContent).toContain('Arıza');
    next[0].click(); next[0].click();
    expect(q(host, 'cTitle').textContent).toContain('Sıcak fincan');
    expect(host.querySelector('[data-mode="repl"]')!.getAttribute('aria-pressed')).toBe('true');
    next[0].click();
    expect(q(host, 'cTitle').textContent).toContain('Bakteri');
    expect(next[0].textContent).toBe('Bitir');
    next[0].click();
    expect(host.querySelector('.tour')!.classList.contains('is-closed')).toBe(true);
    tab(host, 'kut').click();
    for (let i = 0; i < 4; i++) next[1].click();
    expect(next[1].textContent).toBe('Bitir');
    expect(Number(q(host, 'kSl').querySelectorAll<HTMLInputElement>('input')[1].value)).toBe(50);
    un();
  });

  it('ekran dışında döngü durur, geri gelince devam eder', () => {
    const observers: Array<{ cb: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn();
      constructor(public cb: IntersectionObserverCallback) { observers.push(this); }
      observe() {}
    });
    const { pending, tick, host, un } = setup();
    expect(pending.size).toBe(1);
    const fire = (v: boolean) => observers[0].cb([{ isIntersecting: v } as IntersectionObserverEntry], {} as IntersectionObserver);
    fire(false);
    tick();
    expect(pending.size).toBe(0);
    fire(true);
    expect(pending.size).toBe(1);
    un();
    expect(host.innerHTML).toBe('');
    expect(observers[0].disconnect).toHaveBeenCalled();
  });
});

function meterText(host: HTMLElement, i: number): string {
  return host.querySelectorAll('.meters .m')[i].querySelector('.m-top b')!.textContent!;
}
