// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { simsFor } from '../registry';
import { mount } from './view';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

function raf() {
  let nextId = 1;
  const pending = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { const id = nextId++; pending.set(id, cb); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { pending.delete(id); });
  const tick = (t = performance.now() + 50) => { const cur = Array.from(pending.entries()); pending.clear(); for (const [, cb] of cur) cb(t); };
  return { pending, tick };
}
const click = (e: Element) => e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const slide = (e: HTMLInputElement, v: number) => { e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); };
const q = <T extends Element = HTMLElement>(root: ParentNode, s: string) => root.querySelector<T>(s)!;
const say = (h: HTMLElement) => q(h, '[data-ref="say"]').textContent ?? '';

describe('davranis kaydı ve bağlanma', () => {
  it('ch01 altında kayıtlı', () => {
    expect(simsFor('ch01').map((s) => s.id)).toContain('davranis');
  });
  it('bağlanır, id çakışmaz, unmount rAF ve DOM\'u temizler', () => {
    const { pending, tick } = raf();
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
    expect(pending.size).toBe(1);
    ub();
    expect(b.innerHTML).toBe('');
    expect(pending.size).toBe(0);
  });
});

describe('davranis sekmeleri', () => {
  it('harita: çip, kaydırıcı ve sıfırlama çıktı çubuğunu günceller', () => {
    const { tick } = raf();
    const host = document.createElement('div');
    document.body.append(host);
    mount(host);
    expect(say(host)).toMatch(/^Savunma: reaktif, sıcakkanlı, dürtüsel/);
    const chips = host.querySelectorAll<HTMLButtonElement>('.pane[data-pane="harita"] .chips .chip');
    expect(chips).toHaveLength(7);
    click(chips[4]);
    tick();
    expect(say(host)).toMatch(/^Planlı soğukkanlı: proaktif, soğukkanlı, planlı/);
    const sl = host.querySelectorAll<HTMLInputElement>('.pane[data-pane="harita"] input[type="range"]');
    expect(sl).toHaveLength(3);
    slide(sl[1], 5);
    tick();
    const raf1 = () => host.querySelector<HTMLElement>('.pane[data-pane="harita"] [data-ref="blur"]')!.textContent;
    expect(raf1()).toMatch(/ayrışıyor/);
    click(host.querySelector<HTMLElement>('[data-ref="r1"]')!);
    tick();
    expect(raf1()).toMatch(/aynı yönü/);
  });

  it('bağlam: bağlamı değiştirmek anlamı değiştirir, tablo yükler', () => {
    raf();
    const host = document.createElement('div');
    document.body.append(host);
    mount(host);
    const tabs = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    click(tabs[1]);
    const pane = q(host, '.pane[data-pane="baglam"]');
    expect(pane.hidden).toBe(false);
    expect(say(host)).toMatch(/Ameliyat: şifa/);
    const pre = pane.querySelectorAll<HTMLButtonElement>('[data-ref="pre"] .chip');
    click(pre[1]);
    click(tabs[1]);
    expect(say(host)).toMatch(/Saldırı: yaralama/);
    const cells = pane.querySelectorAll<HTMLButtonElement>('.cellb');
    expect(cells).toHaveLength(4);
    click(cells[3]);
    click(tabs[1]);
    expect(say(host)).toMatch(/Görev ya da meşru savunma/);
    expect(cells[0].dataset.v).toBe('good');
    expect(cells[1].dataset.v).toBe('bad');
  });

  it('yer değiştirme: adım, grafik ve kaydırıcı; rahatlatma 0 iken fark yok', () => {
    raf();
    const host = document.createElement('div');
    document.body.append(host);
    mount(host);
    click(host.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2]);
    const pane = q(host, '.pane[data-pane="yer"]');
    expect(pane.hidden).toBe(false);
    click(q(pane, '[data-ref="run"]'));
    expect(q(pane, '[data-ref="run"]').getAttribute('aria-pressed')).toBe('false');
    expect(say(host)).toMatch(/Adım 250: kimse alttakine saldırmıyor/);
    click(q(pane, '[data-ref="step"]'));
    slide(pane.querySelectorAll<HTMLInputElement>('input[type="range"]')[2], 70);
    const before = say(host);
    for (let i = 0; i < 20; i++) click(q(pane, '[data-ref="step"]'));
    host.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2].click();
    expect(say(host)).not.toBe(before);
    expect(pane.querySelectorAll('.sbar')).toHaveLength(8);
    expect(q(pane, 'polyline.ln').getAttribute('points')).toBeTruthy();
    const sl = pane.querySelectorAll<HTMLInputElement>('input[type="range"]');
    expect(sl).toHaveLength(4);
    slide(sl[3], 0);
    click(q(pane, '[data-ref="new"]'));
    for (let i = 0; i < 300; i++) click(q(pane, '[data-ref="step"]'));
    host.querySelectorAll<HTMLButtonElement>('[role="tab"]')[2].click();
    expect(say(host)).toMatch(/\(fark yok\)/);
  });

  it('tur: her sekmede ileri-geri gider ve kapanır; sekmeler klavyeyle gezilir', () => {
    raf();
    const host = document.createElement('div');
    document.body.append(host);
    mount(host);
    const tabs = host.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    for (let t = 0; t < 3; t++) {
      click(tabs[t]);
      const pane = q(host, `.pane[data-pane]:not([hidden])`);
      const tour = q(pane, '.tour');
      const next = q<HTMLButtonElement>(tour, '[data-t="next"]');
      for (let i = 0; i < 5; i++) click(next);
      expect(tour.classList.contains('is-closed')).toBe(true);
      click(q(tour, '[data-t="start"]'));
      expect(tour.classList.contains('is-closed')).toBe(false);
    }
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('notlar tembel yüklenir; sıçan kartı ve ch04 bağlantısı', async () => {
    raf();
    const host = document.createElement('div');
    document.body.append(host);
    mount(host);
    await vi.waitFor(() => expect(host.querySelectorAll('.book')).toHaveLength(3));
    expect(host.innerHTML).toContain('#/bolum/ch04?sim=hormon-baglam');
    expect(host.querySelectorAll('[data-ref="rat"] .bar-r')).toHaveLength(2);
  });

  it('notlar gelmeden unmount edilirse hiçbir şey yazılmaz', async () => {
    raf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    un();
    await new Promise((r) => setTimeout(r, 20));
    expect(host.innerHTML).toBe('');
  });
});
