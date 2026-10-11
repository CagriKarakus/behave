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
  const tick = (t: number) => { const cur = Array.from(pending.values()); pending.clear(); for (const cb of cur) cb(t); };
  return { pending, tick };
}
const q = <T extends Element = HTMLElement>(root: ParentNode, ref: string) => root.querySelector<T>(`[data-ref="${ref}"]`)!;

describe('ultimatum kaydı', () => {
  it('ch02 içinde, Bir Saniye Önce devresinden sonra gelir', () => {
    const list = simsFor('ch02').map((s) => s.id);
    expect(meta.order).toBe(2);
    expect(list.indexOf('ultimatum')).toBeGreaterThan(list.indexOf('bir-saniye-once'));
  });
});

describe('ultimatum görünümü', () => {
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
    tick(performance.now() + 50);
    ub();
    expect(b.innerHTML).toBe('');
    expect(pending.size).toBe(0);
  });

  it('8 tur oynanır, günlük ve özet oluşur, yeniden oyna yeni sıra getirir', () => {
    stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    // Rehberli turu kapat; oyun kartı etkileşimi
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    const firstOffers: string[] = [];
    for (let i = 0; i < 8; i++) {
      firstOffers.push(q(host, 'offerText').textContent!);
      (i % 2 ? q<HTMLButtonElement>(host, 'accept') : q<HTMLButtonElement>(host, 'reject')).click();
      expect(q(host, 'result').hidden).toBe(false);
      if (i < 7) q<HTMLButtonElement>(host, 'next').click();
    }
    expect(q(host, 'log').children.length).toBe(8);
    expect(q(host, 'score').textContent).toContain('8 turda 4 kez reddettin');
    expect(q(host, 'next').textContent).toBe('Yeniden oyna');
    q<HTMLButtonElement>(host, 'next').click();
    expect(q(host, 'log').children.length).toBe(0);
    expect(q(host, 'round').textContent).toBe('Tur 1 / 8');
    un();
  });

  it('koşul çipleri ve teklif kaydırıcısı çıktıyı modelden günceller', () => {
    stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    host.querySelector<HTMLButtonElement>('[data-t="exit"]')!.click();
    const off = q<HTMLInputElement>(host, 'off');
    const setOffer = (v: number) => { off.value = String(v); off.dispatchEvent(new Event('input', { bubbles: true })); };
    const chip = (name: string) => Array.from(host.querySelectorAll<HTMLButtonElement>('.chip')).find((c) => c.textContent === name)!;
    const p = () => Number(q(host, 'm-p').textContent!.replace('%', ''));
    setOffer(5);
    const fair = p();
    setOffer(2);
    const human = p();
    expect(human).toBeGreaterThan(fair + 40);
    chip('Teklif eden: bilgisayar').click();
    expect(p()).toBeLessThan(human);
    chip('Teklif eden: insan').click();
    chip('TMS sağ dlPFC').click();
    expect(p()).toBeLessThan(human);
    expect(chip('TMS sağ dlPFC').getAttribute('aria-pressed')).toBe('true');
    chip('TMS sağ dlPFC').click();
    chip('Serotonin düşük').click();
    const trp = p();
    expect(trp).toBeGreaterThan(human);
    q<HTMLButtonElement>(host, 'sess').click();
    expect(p()).toBe(human);
    un();
  });

  it('tur adımları koşulları ayarlar ve son adımda kapanır', () => {
    stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const next = host.querySelector<HTMLButtonElement>('[data-t="next"]')!;
    expect(host.querySelector('[data-t="n"]')!.textContent).toBe('1 / 6');
    next.click(); // adım 2: çok adaletsiz
    expect(q(host, 'offerText').textContent).toContain('1 ₺');
    next.click(); // adım 3: bilgisayar
    expect(host.querySelector('.chip[aria-pressed="true"]')!.textContent).toBe('Teklif eden: bilgisayar');
    next.click(); // adım 4: TMS
    expect(host.querySelectorAll('.chip[aria-pressed="true"]').length).toBe(2);
    next.click(); // adım 5: triptofan
    next.click(); // adım 6: sonuç
    expect(next.textContent).toBe('Bitir');
    next.click();
    expect(host.querySelector('.tour')!.classList.contains('is-closed')).toBe(true);
    un();
  });

  it('bir bölgeye tıklanınca ayrıntı açılır; amigdala düğmesi hasarı değiştirir', () => {
    stubRaf();
    const host = document.createElement('div');
    document.body.append(host);
    const un = mount(host);
    const amy = host.querySelector<SVGElement>('g.node[aria-label^="Amigdala"]')!;
    amy.dispatchEvent(new Event('click'));
    expect(q(host, 'detail').textContent).toContain('Amigdala');
    q<HTMLButtonElement>(host, 'dTog').click();
    expect(host.querySelector<HTMLButtonElement>('.chip[aria-pressed="true"]')).not.toBeNull();
    expect(Array.from(host.querySelectorAll('.chip[aria-pressed="true"]')).some((c) => c.textContent === 'Amigdala hasarı')).toBe(true);
    un();
  });
});
