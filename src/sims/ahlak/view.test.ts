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

describe('ahlak kaydı', () => {
  it('ch13 içinde, başlık ve sıra doğru', () => {
    expect(meta.chapter).toBe('ch13');
    expect(meta.title).toBe('Ahlak ve sezgi');
    expect(simsFor('ch13').map((s) => s.id)).toContain('ahlak');
  });
});

describe('ahlak görünümü', () => {
  it('sayfa altı notları (nasıl çalışıyor + Kitapta) ayrı parçadan her panele gelir; erken unmount güvenlidir', async () => {
    const { host, un } = setup();
    expect(host.querySelectorAll('.book')).toHaveLength(0);
    await vi.waitFor(() => expect(host.querySelectorAll('.pane .book')).toHaveLength(3));
    expect(host.querySelectorAll('.pane details.how')).toHaveLength(3);
    expect(host.querySelector('.book a')?.getAttribute('href')).toMatch(/^#\/bolum\/ch13\?deney=ch13-e\d+$/);
    un();
    const early = setup();
    early.un(); // notlar gelmeden unmount: hata vermemeli
    await new Promise((r) => setTimeout(r, 30));
    expect(early.host.innerHTML).toBe('');
  });

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

  it('üç sekme: yalnızca seçili panel görünür, ok tuşlarıyla gezilir', () => {
    const { host, un } = setup();
    const panes = () => Array.from(host.querySelectorAll<HTMLElement>('.pane')).map((p) => !p.hidden);
    expect(panes()).toEqual([true, false, false]);
    tab(host, 'pg').click();
    expect(panes()).toEqual([false, true, false]);
    expect(tab(host, 'pg').getAttribute('aria-selected')).toBe('true');
    tab(host, 'pg').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(panes()).toEqual([false, false, true]);
    un();
  });

  it('trolley: karar verilir, sonuç listesi ve profil güncellenir; model aynı senaryoda kitap aralığını verir', () => {
    const { host, un } = setup();
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    const chip = (name: string) => Array.from(host.querySelectorAll<HTMLButtonElement>('#' + host.querySelector('.pane')!.id + ' .chips .chip')).find((c) => c.textContent === name)!;
    const meter = () => q(host, 'meters').querySelector('.m b')!.textContent!;
    chip('Anahtar').click();
    expect(meter()).toBe('%67');
    q<HTMLButtonElement>(host, 'yes').click();
    expect(q(host, 'scRes').textContent).toContain('Evet dedin');
    expect(q(host, 'scRes').textContent).toContain('%60-70');
    chip('Köprüden itme').click();
    expect(meter()).toBe('%30');
    q<HTMLButtonElement>(host, 'no').click();
    expect(q(host, 'prof').textContent).toContain('Beş senaryoyu');
    chip('Kazara itme').click(); q<HTMLButtonElement>(host, 'yes').click();
    chip('Sopayla itme').click(); q<HTMLButtonElement>(host, 'no').click();
    chip('Döngü').click(); q<HTMLButtonElement>(host, 'yes').click();
    expect(q(host, 'res').children.length).toBe(5);
    expect(q(host, 'prof').textContent).toContain('Senaryoya göre değiştin');
    expect(q(host, 'prof').textContent).toContain('Anahtara evet, itmeye hayır');
    // kurtarılan sayısı: özel ayar, karar düğmeleri kapanır
    chip('Köprüden itme').click();
    input(q<HTMLInputElement>(host, 'savedSl').querySelector('input')!, 30);
    expect(q<HTMLButtonElement>(host, 'yes').disabled).toBe(true);
    expect(Number(meter().replace('%', ''))).toBeGreaterThan(30);
    // Greene ayrımı
    q<HTMLButtonElement>(host, 'gThem').click();
    expect(q(host, 'gText').textContent).toContain('Biz mi, Onlar mı');
    un();
  });

  it('Knobe kartı kitaptaki iki oranı gösterir', () => {
    const { host, un } = setup();
    expect(q(host, 'kRes').hidden).toBe(true);
    q<HTMLButtonElement>(host, 'kYes').click();
    expect(q(host, 'kRes').hidden).toBe(false);
    expect(q(host, 'kRes').textContent).toContain('%85');
    expect(q(host, 'kRes').textContent).toContain('%23');
    q<HTMLButtonElement>(host, 'kHelp').click();
    expect(q(host, 'kRes').hidden).toBe(true);
    un();
  });

  it('kamu malı: tur tur oynar, ceza kapatılınca oklar kalkar, toplum çipi sürgüleri eşler', () => {
    const { host, tick, un } = setup();
    tab(host, 'pg').click();
    const tourNext = host.querySelectorAll<HTMLButtonElement>('[data-t="next"]')[1];
    tourNext.click(); // adım 2: yüksek sosyal sermaye, ceza açık
    for (let i = 0; i < 80; i++) tick(100);
    const slider = q<HTMLInputElement>(host, 'roundSl').querySelector('input')!;
    expect(slider.value).toBe('10');
    expect(q(host, 'groups').querySelectorAll('.ar').length).toBeGreaterThan(0);
    tourNext.click(); // adım 3: düşük sosyal sermaye
    for (let i = 0; i < 80; i++) tick(100);
    expect(q(host, 'groups').querySelectorAll('.ar.anti').length).toBeGreaterThan(0);
    expect(q(host, 'groups').querySelectorAll('.a-dia:not(.hide)').length).toBeGreaterThan(0);
    const [cap, law] = Array.from(q(host, 'socSl').querySelectorAll<HTMLInputElement>('input'));
    expect(cap.value).toBe('15'); expect(law.value).toBe('15');
    expect(host.querySelector('#' + host.querySelectorAll('.pane')[1].id + ' [data-ref="socChips"] [aria-pressed="true"]')!.textContent).toContain('Düşük');
    // ceza aşamasını kapat
    Array.from(q(host, 'punChips').querySelectorAll('button')).find((b) => b.textContent!.includes('kapalı'))!.click();
    expect(q(host, 'groups').querySelectorAll('.ar').length).toBe(0);
    // tur sürgüsü
    input(slider, 3);
    expect(q(host, 'say').textContent).toContain('3. tur');
    un();
  });

  it('Henrich: Hadza ve büyük topluluk çipleri eğriyi ve okumayı değiştirir', () => {
    const { host, un } = setup();
    tab(host, 'pg').click();
    const chips = Array.from(q(host, 'mkChips').querySelectorAll<HTMLButtonElement>('button'));
    chips[0].click();
    const thr = () => Array.from(q(host, 'mkRead').querySelectorAll('.ro b')).map((b) => b.textContent);
    const h = thr();
    chips[1].click();
    const b = thr();
    expect(h[0]).toBe('%27'); expect(b[0]).toMatch(/^%(49|50)$/);
    expect(Number(b[1]!.slice(1))).toBeGreaterThan(Number(h[1]!.slice(1)) + 15);
    expect(chips[1].getAttribute('aria-pressed')).toBe('true');
    un();
  });

  it('zar: karışım sürgüsü dağılımı değiştirir, zar atılır, yeniden çalıştır tohumu değiştirir', () => {
    const { host, un } = setup();
    tab(host, 'dice').click();
    const hist = q(host, 'hist');
    const label = () => hist.getAttribute('aria-label')!;
    host.querySelectorAll<HTMLButtonElement>('[data-ref="mixChips"] .chip')[0].click();
    const flat = label();
    host.querySelectorAll<HTMLButtonElement>('[data-ref="mixChips"] .chip')[3].click();
    expect(label()).toContain('5 için %100');
    expect(label()).not.toBe(flat);
    host.querySelectorAll<HTMLButtonElement>('[data-ref="mixChips"] .chip')[0].click();
    q<HTMLButtonElement>(host, 'rerun').click();
    expect(label()).not.toBe(flat);
    expect(q(host, 'diceRead').textContent).toContain('2,50');
    q<HTMLButtonElement>(host, 'roll').click();
    expect(q(host, 'dice').querySelectorAll('.die').length).toBe(2);
    expect(q(host, 'rollRes').children.length).toBe(3);
    // tam yalan sürgüsü haklı dürüstlükle toplamı 1'i aşamaz
    const [j, l] = Array.from(q(host, 'mixSl').querySelectorAll<HTMLInputElement>('input'));
    input(j, 80); input(l, 50);
    expect(Number(l.value)).toBe(50);
    expect(q(host, 'diceRead').textContent).toContain('%0');
    un();
  });

  it('turlar: üç tur da 1. adımda, son adımda Bitir ve kapanır', () => {
    const { host, un } = setup();
    expect(host.querySelectorAll('.tour').length).toBe(3);
    const next = host.querySelector<HTMLButtonElement>('[data-t="next"]')!;
    expect(host.querySelector('[data-t="n"]')!.textContent).toBe('1 / 6');
    for (let i = 0; i < 5; i++) next.click();
    expect(next.textContent).toBe('Bitir');
    next.click();
    expect(host.querySelector('.tour')!.classList.contains('is-closed')).toBe(true);
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
