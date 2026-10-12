// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import chapters from '../../../content/chapters.json';
import { mount } from './view';
import { meta } from './meta';
import { simsFor } from '../registry';
import { LIBET, markAngle } from './model';

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
const sliders = (host: HTMLElement, ref: string) => Array.from(q(host, ref).querySelectorAll<HTMLInputElement>('input'));
const meter = (host: HTMLElement, i: number) => q(host, 'meters').querySelectorAll('.m')[i].querySelector('.m-top b')!.textContent!;

describe('kayıt ve içerik bağları', () => {
  it('ch16 içinde, başlık doğru', () => {
    expect(meta.chapter).toBe('ch16');
    expect(meta.title).toBe('Sorumluluk ve özgür irade');
    expect(simsFor('ch16').map((s) => s.id)).toContain('ozgur-irade');
  });
  it('"Kitapta" bağlantılarındaki deney kimlikleri chapters.json içinde var', () => {
    const { host, un } = setup();
    const ids = Array.from(host.querySelectorAll<HTMLAnchorElement>('.book a')).map((a) => new URL(a.href, 'http://x/').hash.match(/deney=([\w-]+)/)![1]);
    const ch = (chapters as unknown as { chapters: { id: string; experiments: { id: string }[] }[] }).chapters.find((c) => c.id === 'ch16')!;
    const have = new Set(ch.experiments.map((e) => e.id));
    expect(ids.length).toBeGreaterThanOrEqual(5);
    for (const i of ids) expect(have.has(i)).toBe(true);
    un();
  });
});

describe('görünüm', () => {
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
    tab(host, 'cok').click();
    expect(panes()).toEqual([false, true, false]);
    expect(tab(host, 'cok').getAttribute('aria-selected')).toBe('true');
    tab(host, 'cok').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(panes()).toEqual([false, false, true]);
    un();
  });

  it('turlar: üç tur 1. adımda; sonda Bitir kapatır', () => {
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

  it('Libet: saat oyunu başlar, hareketle durur, W işaretlenir ve kaydedilir', () => {
    const { host, tick, un } = setup();
    const go = q<HTMLButtonElement>(host, 'go'), save = q<HTMLButtonElement>(host, 'save');
    expect(go.textContent).toBe('Başlat');
    expect(save.disabled).toBe(true);
    go.click(); tick(); tick(700);
    expect(go.textContent).toBe('Hareket!');
    go.click();
    expect(go.textContent).toBe('Yeniden dene');
    expect(q(host, 'clock').textContent).toContain('−200 ms');
    expect(save.disabled).toBe(false);
    input(sliders(host, 'wSl')[0], -300);
    expect(q(host, 'clock').textContent).toContain('−300 ms');
    save.click();
    expect(save.disabled).toBe(true);
    expect(q(host, 'tries').textContent).toContain('Denemeler: 1');
    expect(q(host, 'tries').textContent).toContain('−300 ms');
    un();
  });

  it('Libet: halkaya dokunmak W\'yi değiştirir', () => {
    const { host, tick, un } = setup();
    q<HTMLButtonElement>(host, 'go').click(); tick(); tick(500);
    q<HTMLButtonElement>(host, 'go').click();
    const svgEl = q<SVGSVGElement>(host, 'clock');
    svgEl.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 220, right: 360, bottom: 220, x: 0, y: 0, toJSON() {} });
    // Donmuş noktanın açısı (hareket anı); ondan 500 ms geri işaret
    const dot = svgEl.querySelector('.dot')!;
    const press = ((Math.atan2(Number(dot.getAttribute('cx')) - 180, -(Number(dot.getAttribute('cy')) - 108)) * 180) / Math.PI + 360) % 360;
    const ang = markAngle(press, -500);
    const x = 180 + 80 * Math.sin((ang * Math.PI) / 180), y = 108 - 80 * Math.cos((ang * Math.PI) / 180);
    const ev = new Event('pointerdown', { bubbles: true }) as Event & { clientX: number; clientY: number };
    ev.clientX = x; ev.clientY = y;
    svgEl.dispatchEvent(ev);
    expect(Math.abs(Number(sliders(host, 'wSl')[0].value) + 500)).toBeLessThanOrEqual(30);
    expect(LIBET.wRef).toBe(-200);
    un();
  });

  it('Libet: RP önce başlar, kayma artefakt payını ve veto penceresini günceller', () => {
    const { host, un } = setup();
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    expect(meter(host, 0)).toBe('500 ms');
    expect(meter(host, 1)).toBe('100 ms');
    expect(meter(host, 2)).toBe('%0');
    const [noRet, shift] = sliders(host, 'vetoSl');
    input(shift, 150);
    expect(meter(host, 2)).toBe('%30');
    expect(q(host, 'vetoRead').textContent).toContain('350 ms');
    input(noRet, 250);
    expect(q(host, 'vetoRead').textContent).toContain('Hayır');
    input(sliders(host, 'wSl')[0], -600);
    expect(q(host, 'vetoRead').textContent).toContain('Evet');
    un();
  });

  it('Libet: Schurger görünümü ek eğri ve sürgüler getirir; Libet görünümünde gizlidir', () => {
    const { host, un } = setup();
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    const chips = Array.from(q(host, 'viewChips').querySelectorAll<HTMLButtonElement>('button'));
    expect(q(host, 'schSl').hidden).toBe(true);
    expect(q(host, 'rp').querySelectorAll('.ln.sch').length).toBe(0);
    chips[1].click();
    expect(q(host, 'schSl').hidden).toBe(false);
    expect(q(host, 'rp').querySelectorAll('.ln.sch').length).toBe(1);
    expect(q(host, 'rp').querySelectorAll('.ln.libet').length).toBe(0);
    expect(q(host, 'say').textContent).toContain('hizalı ortalama');
    chips[2].click();
    expect(q(host, 'rp').querySelectorAll('.ln.libet').length).toBe(1);
    const d1 = q(host, 'rp').querySelector('.ln.sch')!.getAttribute('d');
    q<HTMLButtonElement>(host, 'rerun').click();
    expect(q(host, 'rp').querySelector('.ln.sch')!.getAttribute('d')).not.toBe(d1);
    un();
  });

  it('çok etkenli: etken eklendikçe öngörü %10, %25, %40 olur; altısıyla %50\'nin biraz üstü', () => {
    const { host, un } = setup();
    tab(host, 'cok').click();
    host.querySelectorAll<HTMLButtonElement>('[data-t="exit"]')[1].click();
    const btns = Array.from(q(host, 'facts').querySelectorAll<HTMLButtonElement>('button'));
    expect(btns.length).toBe(6);
    expect(meter(host, 0)).toBe('%0');
    btns[0].click(); expect(meter(host, 0)).toBe('%10');
    btns[1].click(); expect(meter(host, 0)).toBe('%25');
    btns[2].click(); expect(meter(host, 0)).toBe('%40');
    btns[3].click(); btns[4].click(); btns[5].click();
    expect(Number(meter(host, 0).slice(1))).toBe(52);
    expect(btns[0].getAttribute('aria-pressed')).toBe('true');
    expect(q(host, 'grid').querySelectorAll('circle').length).toBe(100);
    expect(q(host, 'grid').querySelectorAll('circle.hit').length).toBeGreaterThan(5);
    // gen katkısı sıfırlanınca toplam %42
    input(sliders(host, 'geneSl')[0], 0);
    expect(meter(host, 0)).toBe('%42');
    un();
  });

  it('çok etkenli: tur son adımda gen katkısını sıfırlar; başka örneklem halkaları değiştirir', () => {
    const { host, un } = setup();
    tab(host, 'cok').click();
    const next = host.querySelectorAll<HTMLButtonElement>('[data-t="next"]')[1];
    for (let i = 0; i < 4; i++) next.click();
    expect(meter(host, 0)).toBe('%42');
    const before = q(host, 'grid').innerHTML;
    q<HTMLButtonElement>(host, 'reseedC').click();
    expect(q(host, 'grid').innerHTML).not.toBe(before);
    un();
  });

  it('ceza: ödül ağırlığı sıfırlanınca r düşer; bedel artınca cezalandıran azalır', () => {
    const { host, un } = setup();
    tab(host, 'ceza').click();
    host.querySelectorAll<HTMLButtonElement>('[data-t="exit"]')[2].click();
    const read = () => Array.from(q(host, 'punRead').querySelectorAll('.ro b')).map((b) => b.textContent!);
    const [unf, cost, rew] = sliders(host, 'punSl');
    input(unf, 1); input(cost, 0); input(rew, 3);
    const free = Number(read()[0].split('/')[0]);
    expect(free).toBeGreaterThan(35);
    expect(Number(read()[2].replace(',', '.'))).toBeGreaterThan(0.4);
    input(cost, 5);
    expect(Number(read()[0].split('/')[0])).toBeLessThan(free);
    input(cost, 0); input(rew, 0);
    expect(Number(read()[2].replace(',', '.'))).toBeLessThan(0.3);
    expect(q(host, 'say').textContent).toContain('ödül bağı yok');
    un();
  });

  it('ceza: biyolojik açıklama sorumluluğu düşürür, ceza dürtüsü neredeyse sabit kalır', () => {
    const { host, un } = setup();
    tab(host, 'ceza').click();
    host.querySelectorAll<HTMLButtonElement>('[data-t="exit"]')[2].click();
    const chips = Array.from(q(host, 'caseChips').querySelectorAll<HTMLButtonElement>('button'));
    chips[3].click(); // neden bulunamadı
    const bio = sliders(host, 'bioSl')[0];
    const val = (i: number) => Number(q(host, 'dual').querySelectorAll('.bv')[i].textContent!.replace('%', ''));
    expect(bio.value).toBe('10');
    const cold0 = val(0), hot0 = val(1);
    input(bio, 100);
    expect(cold0 - val(0)).toBeGreaterThan(60);
    expect(hot0 - val(1)).toBeLessThan(20);
    expect(q(host, 'dualNote').textContent).toContain('soğuk devre vazgeçiyor');
    expect(q(host, 'say').textContent).toContain('Neden bulunamadı');
    un();
  });

  it('ceza: suçlama ve tehlikelilik ayrı verilir; vaka grafiğe düşer, öneri tehlikeliliğe bakar', () => {
    const { host, un } = setup();
    tab(host, 'ceza').click();
    host.querySelectorAll<HTMLButtonElement>('[data-t="exit"]')[2].click();
    expect(q(host, 'quad').querySelectorAll('.qp').length).toBe(0);
    const [blame, danger] = sliders(host, 'rateSl');
    input(blame, 10); input(danger, 70);
    expect(q(host, 'quad').querySelectorAll('.qp').length).toBe(1);
    expect(q(host, 'advice').textContent).toContain('onarım');
    expect(q(host, 'advice').textContent).toContain('tamir bölgesi');
    input(blame, 90); input(danger, 10);
    expect(q(host, 'advice').textContent).toContain('yalnızca ceza dürtüsünü doyuruyor');
    // önlem seçimi
    const resp = Array.from(q(host, 'resps').querySelectorAll<HTMLButtonElement>('button'));
    resp[0].click();
    const sat = () => q(host, 'outs').querySelectorAll('.bv')[2].textContent;
    const satCeza = sat();
    resp[2].click();
    expect(sat()).toBe('%0');
    expect(satCeza).not.toBe('%0');
    // vaka değişince puanlar vakaya özgü
    Array.from(q(host, 'caseChips').querySelectorAll<HTMLButtonElement>('button'))[1].click();
    expect(blame.value).toBe('50');
    expect(q(host, 'quad').querySelectorAll('.qp').length).toBe(1);
    un();
  });

  it('ekran dışında döngü durur, geri gelince devam eder', () => {
    const observers: Array<{ cb: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal('IntersectionObserver', class {
      disconnect = vi.fn();
      constructor(public cb: IntersectionObserverCallback) { observers.push(this); }
      observe() {}
    });
    const { pending, tick, un } = setup();
    expect(pending.size).toBe(1);
    const fire = (v: boolean) => observers[0].cb([{ isIntersecting: v } as IntersectionObserverEntry], {} as IntersectionObserver);
    fire(false);
    tick();
    expect(pending.size).toBe(0);
    fire(true);
    expect(pending.size).toBe(1);
    un();
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(pending.size).toBe(0);
  });
});
