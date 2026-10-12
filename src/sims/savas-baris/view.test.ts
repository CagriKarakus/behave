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
const pane = (host: HTMLElement, name: string) => host.querySelector<HTMLElement>(`.pane[data-pane="${name}"]`)!;
const say = (host: HTMLElement) => q(host, 'say').textContent!;

describe('savas-baris kaydı', () => {
  it('ch17 içinde, başlık doğru', () => {
    expect(meta.chapter).toBe('ch17');
    expect(meta.title).toBe('Savaş ve barış');
    expect(simsFor('ch17').map((s) => s.id)).toContain('savas-baris');
  });
});

describe('savas-baris görünümü', () => {
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
    tick();
    ub();
    expect(pending.size).toBe(0);
  });

  it('sekme parçaları tembel yüklenir: önce yalnızca siperler, sekme seçilince ilgili panel kurulur; erken unmount güvenlidir', async () => {
    const { host, un } = setup();
    expect(host.querySelector('[data-ref="ctChips"]')).toBeNull();
    expect(host.querySelector('[data-ref="bbChips"]')).toBeNull();
    expect(host.querySelector('[data-ref="load-tem"]')).not.toBeNull();
    tab(host, 'tem').click();
    await vi.waitFor(() => expect(host.querySelector('[data-ref="ctChips"]')).not.toBeNull());
    expect(host.querySelector('[data-ref="bbChips"]')).toBeNull();
    un();
    const early = setup();
    tab(early.host, 'bab').click();
    early.un(); // panel gelmeden unmount: hata vermemeli
    await new Promise((r) => setTimeout(r, 40));
    expect(early.host.innerHTML).toBe('');
  });

  it('üç sekme: yalnızca seçili panel görünür, ok tuşlarıyla gezilir', () => {
    const { host, un } = setup();
    const vis = () => Array.from(host.querySelectorAll<HTMLElement>('.pane')).map((p) => !p.hidden);
    expect(vis()).toEqual([true, false, false]);
    tab(host, 'tem').click();
    expect(vis()).toEqual([false, true, false]);
    tab(host, 'tem').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(vis()).toEqual([false, false, true]);
    un();
  });

  it('siperler: oynatma ilerler, kaydırıcı ve kural çipi çıktıyı değiştirir, duraklatılınca DOM durur', () => {
    const { host, tick, un } = setup();
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    const before = say(host);
    for (let i = 0; i < 30; i++) tick(250);
    expect(say(host)).not.toBe(before);
    const p1 = pane(host, 'sip');
    p1.querySelector<HTMLButtonElement>('[data-k="play"]')!.click();
    const frozen = p1.innerHTML;
    tick(500); tick(500);
    expect(p1.innerHTML).toBe(frozen);
    const scrub = p1.querySelector<HTMLInputElement>('.tp input, [data-ref="tp1"] input')!;
    input(scrub, 150);
    expect(say(host)).toContain('151. gün');
    const sl = q(host, 'tSl').querySelectorAll<HTMLInputElement>('input');
    input(sl[0], 1);
    expect(q(host, 'tSl').textContent).toContain('1 hafta');
    q(host, 'ruleChips').querySelectorAll<HTMLButtonElement>('.chip')[1].click();
    expect(q(host, 'ruleChips').querySelectorAll('.chip')[1].getAttribute('aria-pressed')).toBe('true');
    expect(q(host, 'meters').textContent).toContain('/8');
    un();
  });

  it('tur: 6 adım, adımlar ayar ve çıktıyı değiştirir', () => {
    const { host, un } = setup();
    const next = host.querySelector<HTMLButtonElement>('[data-ref="tour1"] [data-t="next"]')!;
    const title = () => host.querySelector('[data-ref="tour1"] [data-t="title"]')!.textContent;
    const t0 = title();
    next.click(); next.click(); next.click(); next.click();
    expect(title()).not.toBe(t0);
    expect(host.querySelector('[data-ref="tour1"] [data-t="n"]')!.textContent).toBe('5 / 6');
    expect(say(host)).toMatch(/gün/);
    un();
  });

  it('temas ve itibar: üç kart, odak çıktı çubuğunu belirler', async () => {
    const { host, tick, un } = setup();
    tab(host, 'tem').click();
    await vi.waitFor(() => expect(host.querySelector('[data-ref="ctChips"]')).not.toBeNull()); // sekme ayrı parçadan gelir
    for (let i = 0; i < 20; i++) tick(500);
    expect(say(host)).toContain('tur');
    const p2 = pane(host, 'tem');
    p2.querySelectorAll<HTMLButtonElement>('[data-ref="ctChips"] .chip')[0].click();
    expect(say(host)).toContain('koşul');
    input(q(host, 'foSl').querySelectorAll<HTMLInputElement>('input')[1], 90);
    expect(say(host)).toContain('orman');
    expect(q(host, 'foRead').textContent).toContain('Devriyeci');
    q(host, 'pyChips').querySelectorAll<HTMLButtonElement>('.chip')[1].click();
    expect(say(host)).toContain('İstediğin kadar öde');
    expect(q(host, 'pyChart').querySelectorAll('.py-bar').length).toBe(16);
    un();
  });

  it('babunlar: salgın kaydırıcısı kültürü değiştirir', async () => {
    const { host, un } = setup();
    tab(host, 'bab').click();
    await vi.waitFor(() => expect(host.querySelector('[data-ref="tp3"] input')).not.toBeNull()); // sekme ayrı parçadan gelir
    const scrub = q(host, 'tp3').querySelector<HTMLInputElement>('input')!;
    input(scrub, 400);
    const withKill = say(host);
    expect(withKill).toContain('2,0:1');
    q(host, 'bbChips').querySelectorAll<HTMLButtonElement>('.chip')[0].click();
    expect(say(host)).not.toBe(withKill);
    expect(q(host, 'bbRead').textContent).toContain('Dişi:erkek');
    un();
  });

  it('hareket azaltma: son durum gösterilir, oynatma başlamaz', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const { host, un } = setup();
    expect(say(host)).toContain('182. gün');
    un();
  });
});
