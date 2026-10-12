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
const setup = () => {
  const raf = stubRaf();
  const host = document.createElement('div');
  document.body.append(host);
  const un = mount(host);
  return { ...raf, host, un };
};
const pane = (host: HTMLElement, k: string) => host.querySelector<HTMLElement>(`.pane[data-pane="${k}"]`)!;
const tab = (host: HTMLElement, k: string) => host.querySelector<HTMLButtonElement>(`.tab[data-pane="${k}"]`)!;
const click = (e: Element) => e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const slide = (e: HTMLInputElement, v: number) => { e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); };
const meters = (host: HTMLElement) => [0, 1, 2].map((i) => host.querySelector(`[data-ref="mv${i}"]`)!.textContent!);
const say = (host: HTMLElement) => host.querySelector('[data-ref="say"]')!.textContent!;
const btn = (root: ParentNode, text: string) => Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.includes(text))!;
const sliderOf = (root: ParentNode, name: string) => Array.from(root.querySelectorAll('.sl')).find((s) => s.textContent!.includes(name))!.querySelector('input')!;

describe('protein kaydı', () => {
  it('app3 içinde, başlık "Genden proteine"', () => {
    expect(meta.chapter).toBe('app3');
    expect(meta.title).toBe('Genden proteine');
    expect(meta.blurb.length).toBeLessThanOrEqual(60);
    expect(simsFor('app3').map((s) => s.id)).toContain('protein');
  });
});

describe('protein görünümü', () => {
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

  it('ilk sekme: sessiz mutasyon zinciri ve işlevi korur, anlamsız mutasyon keser', () => {
    const { host, tick } = setup();
    expect(host.querySelectorAll('.cd').length).toBe(11);
    expect(meters(host)[0]).toBe('%100');
    click(btn(pane(host, 'code'), 'Sessiz'));
    tick();
    expect(say(host)).toContain('Sessiz mutasyon');
    expect(meters(host)[0]).toBe('%100');
    expect(host.querySelectorAll('.b.mut').length).toBe(1);
    click(btn(pane(host, 'code'), 'Anlamsız'));
    tick();
    expect(say(host)).toContain('Anlamsız');
    expect(meters(host)[0]).toBe('%25');
    expect(meters(host)[1]).toBe('5/10');
    click(btn(pane(host, 'code'), '1 harf silme'));
    tick();
    expect(say(host)).toContain('Çerçeve kayması');
    expect(Number(meters(host)[2])).toBeGreaterThanOrEqual(7);
  });

  it('elle mutasyon: kaydırıcı ve baz çipleri durumu değiştirir', () => {
    const { host, tick } = setup();
    const p = pane(host, 'code');
    click(btn(p, 'Nokta'));
    slide(sliderOf(p, 'Konum'), 6);
    click(btn(p, 'C'));
    tick();
    expect(say(host)).toContain('Sessiz');
    slide(sliderOf(p, 'Konum'), 18);
    click(btn(p, 'A'));
    tick();
    expect(say(host)).toContain('Anlamsız');
    expect(p.querySelector('.chip[data-k="anlamsiz"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('alel kartı ilk açılışta tembel yüklenir', async () => {
    const { host, tick } = setup();
    const d = host.querySelector<HTMLDetailsElement>('details.more')!;
    expect(d.querySelector('svg')).toBeNull();
    d.open = true;
    d.dispatchEvent(new Event('toggle'));
    await vi.waitFor(() => expect(d.querySelector('svg')).not.toBeNull());
    tick();
    expect(d.querySelector('[data-ref="out"]')!.textContent).toContain('popülasyonda');
    click(btn(d, 'Yukarıdaki mutasyondan al'));
    tick();
  });

  it('düzenlenme ve şekil sekmeleri tembel yüklenir; erken unmount güvenlidir', async () => {
    const { host, un, tick } = setup();
    expect(pane(host, 'reg').children.length).toBe(0);
    click(tab(host, 'reg'));
    await vi.waitFor(() => expect(pane(host, 'reg').querySelector('.tour')).not.toBeNull());
    tick();
    expect(say(host)).toContain('A ortamında kapalı');
    expect(say(host)).toContain('B ortamında açık');
    // metilasyon kilidi B'yi kapatır
    click(btn(pane(host, 'reg'), 'B: metilasyon kilidi'));
    tick();
    expect(say(host)).toContain('B ortamında kapalı');
    click(btn(pane(host, 'reg'), 'E3'));
    tick();
    expect(say(host)).toContain('E1-E2-E4');
    expect(pane(host, 'conf').children.length).toBe(0);
    un();
    const early = setup();
    click(tab(early.host, 'conf'));
    early.un();
    await new Promise((r) => setTimeout(r, 40));
    expect(early.host.innerHTML).toBe('');
  });

  it('şekil sekmesi: tek molekül akar, ligand ve sıcaklık çubukları değiştirir', async () => {
    const { host, tick } = setup();
    click(tab(host, 'conf'));
    await vi.waitFor(() => expect(pane(host, 'conf').querySelector('.tour')).not.toBeNull());
    const p = pane(host, 'conf');
    click(btn(p, 'Doğru molekül'));
    tick();
    const good = meters(host)[1];
    expect(good).not.toContain('0,0');
    click(btn(p, 'Molekül yok'));
    tick();
    expect(meters(host)[1]).toContain('0,0');
    click(btn(p, 'Doğru molekül'));
    tick();
    expect(meters(host)[1]).toBe(good);
    slide(sliderOf(p, 'Sıcaklık'), 55);
    tick();
    expect(meters(host)[2]).not.toBe('%100');
    for (let i = 0; i < 50; i++) tick(100);
    expect(p.querySelector('.tr-ln')!.getAttribute('d')!.length).toBeGreaterThan(10);
  });

  it('turlar: her sekmede adımlar ilerler ve simülasyonu kurar', async () => {
    const { host, tick } = setup();
    const next = (k: string) => click(pane(host, k).querySelector('[data-t="next"]')!);
    next('code'); tick();
    expect(say(host)).toContain('Sessiz');
    next('code'); tick();
    expect(say(host)).toContain('Yanlış anlamlı');
    click(tab(host, 'reg'));
    await vi.waitFor(() => expect(pane(host, 'reg').querySelector('.tour')).not.toBeNull());
    next('reg'); tick();
    expect(say(host)).toContain('A ortamında kapalı');
    expect(say(host)).toContain('B ortamında kapalı');
    click(tab(host, 'conf'));
    await vi.waitFor(() => expect(pane(host, 'conf').querySelector('.tour')).not.toBeNull());
    next('conf'); tick();
    expect(say(host)).toContain('Doğru molekül');
  });

  it('ekran dışında döngü durur', () => {
    const observers: Array<{ cb: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn();
      constructor(public cb: IntersectionObserverCallback) { observers.push(this); }
      observe() {}
    });
    const { pending } = setup();
    expect(pending.size).toBe(1);
    observers[0].cb([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(0);
    observers[0].cb([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(pending.size).toBe(1);
  });

  it('notlar tembel yüklenir: Kitapta bağlantıları var', async () => {
    const { host } = setup();
    await vi.waitFor(() => expect(host.querySelector('aside.book')).not.toBeNull());
    expect(host.querySelector('a[href="#/bolum/ch07?deney=ch07-e12"]')).not.toBeNull();
    expect(host.querySelector('a[href^="#/bolum/app2"]')).not.toBeNull();
    expect(host.querySelector('details.how')).not.toBeNull();
    expect(host.querySelector('p.foot')).not.toBeNull();
  });
});
