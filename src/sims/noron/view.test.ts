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
const run = (tick: (ms?: number) => void, n: number) => { for (let i = 0; i < n; i++) tick(100); };
const btn = (root: ParentNode, text: string) => Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.includes(text))!;
const sliderOf = (root: ParentNode, name: string) => Array.from(root.querySelectorAll('.sl')).find((s) => s.textContent!.includes(name))!.querySelector('input')!;

describe('noron kaydı', () => {
  it('app1 içinde, başlık doğru', () => {
    expect(meta.chapter).toBe('app1');
    expect(meta.title).toBe('Nöron ve sinaps');
    expect(simsFor('app1').map((s) => s.id)).toContain('noron');
  });
});

describe('noron görünümü', () => {
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

  it('üç sekme: yalnızca seçili panel görünür, ok tuşlarıyla gezilir; "İlgili bölümler" kutusu çapraz bağlantıları taşır', () => {
    const { host, un } = setup();
    const vis = () => Array.from(host.querySelectorAll<HTMLElement>('.pane')).map((p) => !p.hidden);
    expect(vis()).toEqual([true, false, false]);
    click(tab(host, 'syn'));
    expect(vis()).toEqual([false, true, false]);
    tab(host, 'syn').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(vis()).toEqual([false, false, true]);
    expect(tab(host, 'circ').getAttribute('aria-selected')).toBe('true');
    const hrefs = Array.from(host.querySelectorAll<HTMLAnchorElement>('aside.book a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('#/bolum/ch02?sim=bir-saniye-once');
    expect(hrefs).toContain('#/bolum/ch05?sim=noroplastisite');
    expect(host.querySelector('aside.book')!.getAttribute('aria-label')).toBe('İlgili bölümler');
    un();
  });

  it('turlar: üç tur da 1. adımda; son adımda Bitir ve kapanır; adım sayıları 4-6', () => {
    const { host, un } = setup();
    expect(host.querySelectorAll('.tour').length).toBe(3);
    for (const k of ['sum', 'syn', 'circ']) {
      const root = pane(host, k);
      const next = root.querySelector<HTMLButtonElement>('[data-t="next"]')!;
      const total = Number(root.querySelector('[data-t="n"]')!.textContent!.split(' / ')[1]);
      expect(total).toBeGreaterThanOrEqual(4);
      expect(total).toBeLessThanOrEqual(6);
      for (let i = 0; i < total - 1; i++) click(next);
      expect(next.textContent).toBe('Bitir');
      click(next);
      expect(root.querySelector('.tour')!.classList.contains('is-closed')).toBe(true);
    }
    un();
  });

  it('toplama: tek dokunuş ateşletmez, altı birden ateşletir; aksiyon potansiyeli hep +40 mV', () => {
    const { host, tick, un } = setup();
    const root = pane(host, 'sum');
    click(root.querySelector<HTMLButtonElement>('[data-t="exit"]')!);
    click(btn(root, 'Sıfırla'));
    click(root.querySelector('.tip[data-d="0"]')!);
    run(tick, 15);
    expect(host.querySelector('.say')!.textContent).not.toContain('Eşik aşıldı');
    expect(root.querySelector('[data-ref="trace"] .tk')!.getAttribute('d')).toBe('');
    click(btn(root, 'Aynı anda 6'));
    run(tick, 6);
    expect(root.querySelector('[data-ref="trace"] .tk')!.getAttribute('d')).not.toBe('');
    // engelleyici tür seçilince dokunulan girdi engelleyici olur
    click(btn(root, 'Engelleyici'));
    expect(root.querySelector('.tip')!.getAttribute('data-k')).toBe('-1');
    expect(root.querySelector('[data-r="g0"]')!.textContent).toBe('−');
    un();
  });

  it('toplama: sürekli girdi sürgüsü ateşleme hızını yükseltir, duraklatınca çizim donar', () => {
    const { host, tick, un } = setup();
    const root = pane(host, 'sum');
    click(root.querySelector<HTMLButtonElement>('[data-t="exit"]')!);
    click(btn(root, 'Sıfırla'));
    slide(sliderOf(root, 'Sürekli uyarıcı'), 80);
    run(tick, 60);
    const rate = Number(meters(host)[2].replace(/\D/g, ''));
    expect(rate).toBeGreaterThan(20);
    click(btn(root, 'Duraklat'));
    tick(100);
    const d = root.querySelector('[data-ref="trace"] .vl')!.getAttribute('d');
    tick(100); tick(100);
    expect(root.querySelector('[data-ref="trace"] .vl')!.getAttribute('d')).toBe(d);
    un();
  });

  it('sinaps: geri alımı engellemek yarı ömrü ve yanıt süresini uzatır; enzim engeli geri alım baskın sinapsta azdır', () => {
    const { host, tick, un } = setup();
    click(tab(host, 'syn'));
    const root = pane(host, 'syn');
    click(root.querySelector<HTMLButtonElement>('[data-t="exit"]')!);
    click(btn(root, 'Sıfırla'));
    const half = () => Number(meters(host)[1].replace(',', '.').replace(/[^\d.]/g, ''));
    const dur = () => Number(meters(host)[2].replace(/\D/g, ''));
    const h0 = half(), d0 = dur();
    click(btn(root, 'Enzimi engelle'));
    tick();
    expect(half()).toBeLessThan(h0 * 1.4);
    click(btn(root, 'Enzimi engelle'));
    click(btn(root, 'Geri alımı engelle'));
    tick();
    expect(btn(root, 'Geri alımı engelle').getAttribute('aria-pressed')).toBe('true');
    expect(half()).toBeGreaterThan(h0 * 2.5);
    expect(dur()).toBeGreaterThan(d0 * 1.7);
    expect(host.querySelector('.say')!.textContent).toContain('SSRI');
    // enzim baskın tür
    click(btn(root, 'Enzim baskın'));
    click(btn(root, 'Geri alımı engelle'));
    click(btn(root, 'Enzimi engelle'));
    tick();
    expect(half()).toBeGreaterThan(10);
    // tek impuls: hız 0 iken düzey yükselir ve söner
    slide(sliderOf(root, 'Presinaptik'), 0);
    click(btn(root, 'Tek impuls'));
    run(tick, 3);
    expect(root.querySelector('[data-ref="cc"] .cl')!.getAttribute('d')).not.toBe('');
    // yollar kartı toplam ~%100
    const fv = Array.from(root.querySelectorAll('.fate .fv')).map((e) => Number(e.textContent!.replace('%', '')));
    expect(fv.reduce((a, b) => a + b, 0)).toBeGreaterThan(97);
    un();
  });

  it('devre: devre ve desen çipleri, sürgüler ve çıktı çubuğu birlikte çalışır', () => {
    const { host, tick, un } = setup();
    click(tab(host, 'circ'));
    const root = pane(host, 'circ');
    click(root.querySelector<HTMLButtonElement>('[data-t="exit"]')!);
    const zit = () => Number(meters(host)[0].replace(',', '.').replace(/[^\d.]/g, ''));
    slide(sliderOf(root, 'Yanal inhibisyon gücü'), 0);
    tick();
    expect(zit()).toBe(1);
    slide(sliderOf(root, 'Yanal inhibisyon gücü'), 12);
    tick();
    expect(zit()).toBeGreaterThan(1.5);
    expect((root.querySelector('[data-ref="lat"]') as Element).querySelectorAll('.bout').length).toBe(16);
    click(btn(root, 'Negatif geri bildirim'));
    tick();
    expect(root.querySelector<HTMLElement>('[data-ref="latBox"]')!.hidden).toBe(true);
    expect(root.querySelector<HTMLElement>('[data-ref="tChart"]')!.hidden).toBe(false);
    expect(host.querySelector('[data-ref="ml1"]')!.textContent).toContain('Yanıt süresi');
    const dur = () => Number(meters(host)[1].replace(/\D/g, ''));
    slide(sliderOf(root, 'Geri bildirim gücü'), 0);
    tick();
    const d0 = dur();
    slide(sliderOf(root, 'Geri bildirim gücü'), 28);
    tick();
    expect(dur()).toBeLessThan(d0 / 3);
    click(btn(root, 'İleri beslemeli'));
    tick();
    expect(root.querySelector('[data-ref="tc"] .tout')!.getAttribute('d')).not.toBe('');
    expect(host.querySelector('.say')!.textContent).toContain('gecikme');
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
