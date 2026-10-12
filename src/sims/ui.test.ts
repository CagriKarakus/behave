// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { Scope } from './kit';
import { bookBox, chips, repBadge, slider } from './ui';

afterEach(() => { document.body.innerHTML = ''; });

describe('ortak arayüz yardımcıları', () => {
  it('slider: etiket, değer metni ve ipucu kurar; girişte metni ve geri çağrıyı günceller; set() geri çağrıyı tetiklemez', () => {
    const scope = new Scope();
    const host = document.createElement('div');
    document.body.append(host);
    const seen: number[] = [];
    const h = slider(scope, host, { id: 't-sl', name: 'Yaş', hint: 'ipucu', min: 0, max: 10, value: 3, fmt: (v) => `${v} yaş`, color: 'var(--pfc)', cls: 'sl', onInput: (v) => seen.push(v) });
    expect(host.querySelector('label')?.getAttribute('for')).toBe('t-sl');
    expect(host.querySelector('.sl-val')?.textContent).toBe('3 yaş');
    expect(host.querySelector('.sl-hint')?.textContent).toBe('ipucu');
    expect((host.firstElementChild as HTMLElement).className).toBe('sl');
    h.inp.value = '7';
    h.inp.dispatchEvent(new Event('input'));
    expect(seen).toEqual([7]);
    expect(host.querySelector('.sl-val')?.textContent).toBe('7 yaş');
    expect(h.inp.getAttribute('aria-valuetext')).toBe('7 yaş');
    h.set(2, 'iki');
    expect(seen).toEqual([7]);
    expect(host.querySelector('.sl-val')?.textContent).toBe('iki');
    scope.dispose();
    h.inp.value = '9';
    h.inp.dispatchEvent(new Event('input'));
    expect(seen).toEqual([7]);
  });

  it('chips: basılı çipi ayarlar, tıklamada geri çağrı verir, grubu etiketler', () => {
    const scope = new Scope();
    const host = document.createElement('div');
    const clicked: string[] = [];
    const set = chips(host, scope, [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }], (k) => clicked.push(k), 'Seçim');
    expect(host.getAttribute('aria-label')).toBe('Seçim');
    host.querySelectorAll('button')[1].click();
    expect(clicked).toEqual(['b']);
    set('b');
    expect(Array.from(host.querySelectorAll('button')).map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    scope.dispose();
  });

  it('bookBox: bölümü deney kimliğinden çıkarır; rozet ve not ekler', () => {
    const host = document.createElement('div');
    host.innerHTML = bookBox([{ id: 'ch07-e4', text: 'Kohlberg' }, { id: 'ch13-e1', text: 'Knobe', rep: 'sağlam', note: 'Not.' }]);
    const links = Array.from(host.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['#/bolum/ch07?deney=ch07-e4', '#/bolum/ch13?deney=ch13-e1']);
    expect(host.querySelector('aside.book h3')?.textContent).toBe('Kitapta');
    expect(host.querySelectorAll('li')[0].querySelector('.rep')).toBeNull();
    expect(host.querySelectorAll('li')[1].querySelector('.rep')?.textContent).toBe('Replikasyon: sağlam');
    expect(host.querySelectorAll('li')[1].textContent).toContain('Not.');
    expect(repBadge('karışık')).toContain('Replikasyon: karışık');
  });
});
