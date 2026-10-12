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
const tab = (host: HTMLElement, name: string) => host.querySelector<HTMLButtonElement>(`.tab[data-pane="${name}"]`)!;
const input = (el: HTMLInputElement, v: number) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); };
const say = (host: HTMLElement) => host.querySelector('[data-ref="say"]')!.textContent!;

describe('zaman merdiveni kaydı', () => {
  it('intro bölümünde, başlık doğru', () => {
    expect(meta.chapter).toBe('intro');
    expect(meta.title).toBe('Zaman merdiveni');
    expect(simsFor('intro').map((s) => s.id)).toContain('zaman-merdiveni');
  });
});

describe('zaman merdiveni görünümü', () => {
  it('yerleşim sırası: lede, sekmeler, çubuk, canlı bölge, paneller; her panelin ilk öğesi turu', () => {
    const { host, un } = setup();
    const kids = Array.from(host.querySelector('.sim')!.children).map((c) => c.className.split(' ')[0] || c.tagName);
    expect(kids.slice(0, 4)).toEqual(['lede', 'tabs', 'sim-bar', 'sr-only']);
    for (const p of host.querySelectorAll('.pane')) expect(p.firstElementChild!.className).toContain('tour');
    un();
  });

  it('id çakışmaz, unmount rAF ve DOM\'u temizler', () => {
    const raf = stubRaf();
    const a = document.createElement('div'), b = document.createElement('div');
    document.body.append(a, b);
    const ua = mount(a), ub = mount(b);
    const ids = Array.from(document.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(raf.pending.size).toBe(2);
    ua();
    expect(a.innerHTML).toBe('');
    expect(raf.pending.size).toBe(1);
    ub();
    expect(raf.pending.size).toBe(0);
    raf.tick();
    expect(raf.pending.size).toBe(0);
  });

  it('merdiven: dokuz kart, davranış değişince kartlar değişir, derinlik kaydırıcısı basamakları açar', () => {
    const { host, tick, un } = setup();
    const cards = () => Array.from(host.querySelectorAll<HTMLElement>('.rung .c-title')).map((e) => e.textContent);
    expect(host.querySelectorAll('.rung')).toHaveLength(9);
    const first = cards()[0];
    const chip = host.querySelector<HTMLButtonElement>('.chip[data-k="tetik"]')!;
    chip.click(); tick();
    expect(cards()[0]).not.toBe(first);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    const depth = host.querySelector<HTMLInputElement>('input[id$="-sl-depth"]')!;
    input(depth, 9); tick();
    expect(host.querySelectorAll('.rung.off')).toHaveLength(0);
    expect(say(host)).toContain('tüm merdiven');
    input(depth, 1); tick();
    expect(host.querySelectorAll('.rung.off')).toHaveLength(8);
    expect(say(host)).toContain('yalnızca bir saniye öncesine');
    un();
  });

  it('merdiven: karta basınca bağlar açılır ve ok şeridi çizilir', () => {
    const { host, tick, un } = setup();
    input(host.querySelector<HTMLInputElement>('input[id$="-sl-depth"]')!, 9); tick();
    const card = host.querySelector<HTMLButtonElement>('.rung[data-i="2"] .card')!;
    card.click(); tick();
    expect(card.getAttribute('aria-pressed')).toBe('true');
    const links = host.querySelector<HTMLElement>('.rung[data-i="2"] .c-links')!;
    expect(links.hidden).toBe(false);
    expect(links.textContent).toContain('Saatler-günler → Bir saniye önce');
    expect(say(host)).toContain('Saatler-günler');
    card.click(); tick();
    expect(links.hidden).toBe(true);
    un();
  });

  it('merdiven: her basamakta bölüme ve simülasyona bağlantı var', () => {
    const { host, un } = setup();
    const hrefs = Array.from(host.querySelectorAll<HTMLAnchorElement>('.r-go')).map((a) => a.getAttribute('href'));
    expect(hrefs).toHaveLength(9);
    expect(hrefs[0]).toBe('#/bolum/ch02?sim=bir-saniye-once');
    expect(hrefs.every((h) => /^#\/bolum\/ch(0[2-9]|10)\?sim=[a-z-]+$/.test(h!))).toBe(true);
    un();
  });

  it('kategori sekmesi: sınır ikisinin arasındayken algılanan fark büyür, kaydırınca küçülür', () => {
    const { host, tick, un } = setup();
    tab(host, 'cat').click(); tick();
    expect(host.querySelector<HTMLElement>('.pane[data-pane="cat"]')!.hidden).toBe(false);
    const off = host.querySelector<HTMLInputElement>('input[id$="-sl-off"]')!;
    const str = host.querySelector<HTMLInputElement>('input[id$="-sl-str"]')!;
    input(str, 60); input(off, 0); tick();
    expect(say(host)).toContain('sınır ikisinin arasında');
    expect(say(host)).toContain('katına çıkıyor');
    input(off, 100); tick();
    expect(say(host)).toContain('aynı kutuda');
    input(str, 0); tick();
    expect(say(host)).toContain('Kategori yok');
    expect(host.querySelectorAll('svg[data-ref="map"] line.curve').length).toBeGreaterThan(1);
    un();
  });

  it('turlar baştan sona gezilir; her adım çubuğu günceller', () => {
    const { host, tick, un } = setup();
    for (const name of ['ladder', 'cat']) {
      tab(host, name).click(); tick();
      const pane = host.querySelector<HTMLElement>(`.pane[data-pane="${name}"]`)!;
      const next = pane.querySelector<HTMLButtonElement>('[data-t="next"]')!;
      const seen = new Set<string>();
      for (let i = 0; i < 8 && !pane.querySelector('.tour.is-closed'); i++) { seen.add(say(host)); next.click(); tick(); }
      expect(pane.querySelector('.tour.is-closed')).not.toBeNull();
      expect(seen.size).toBeGreaterThan(2);
      pane.querySelector<HTMLButtonElement>('[data-t="start"]')!.click(); tick();
    }
    un();
  });

  it('notlar ayrı parçadan gelir; Kitapta bağlantıları deney kimliğine gider; erken unmount güvenlidir', async () => {
    const { host, un } = setup();
    expect(host.querySelectorAll('.book')).toHaveLength(0);
    await vi.waitFor(() => expect(host.querySelectorAll('.pane .book')).toHaveLength(2));
    expect(host.querySelectorAll('.pane details.how')).toHaveLength(2);
    expect(host.querySelector('.pane[data-pane="cat"] .book a')?.getAttribute('href')).toBe('#/bolum/intro?deney=intro-e1');
    expect(host.querySelector('.pane[data-pane="cat"] .book')!.textContent).toContain('tartışmalı');
    for (const a of host.querySelectorAll<HTMLAnchorElement>('.book a')) expect(a.getAttribute('href')).toMatch(/^#\/bolum\/(intro|ch\d\d)\?deney=[a-z0-9]+-e\d+$/);
    un();
    const early = setup();
    early.un();
    await new Promise((r) => setTimeout(r, 30));
    expect(early.host.innerHTML).toBe('');
  });

  it('ekran dışına çıkınca döngü durur', () => {
    const observers: Array<{ cb: IntersectionObserverCallback }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      constructor(public cb: IntersectionObserverCallback) { observers.push(this); }
      observe() {} disconnect() {}
    });
    const { pending, tick, un } = setup();
    expect(pending.size).toBe(1);
    observers[0].cb([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    tick();
    expect(pending.size).toBe(0);
    un();
  });
});
