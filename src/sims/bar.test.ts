// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { enhanceSimBar } from './bar';

const HTML = '<div class="sim"><div class="sim-bar"><div class="sim-bar-in"><p class="say">metin</p><div class="meters"></div></div></div></div>';
beforeEach(() => { try { sessionStorage.clear(); } catch { /* */ } });
afterEach(() => { document.body.innerHTML = ''; });

describe('çıktı çubuğu küçültme düğmesi', () => {
  it('düğme ekler, tıklayınca küçültür ve büyütür; tercih oturumda hatırlanır; kaldırılınca temizlenir', () => {
    const host = document.createElement('div');
    host.innerHTML = HTML;
    document.body.append(host);
    const bar = host.querySelector<HTMLElement>('.sim-bar')!;
    const off = enhanceSimBar(host);
    const btn = host.querySelector<HTMLButtonElement>('.bar-toggle')!;
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(btn.getAttribute('aria-controls')).toBe(host.querySelector('.sim-bar-in')!.id);
    expect(bar.dataset.collapsed).toBe('false');
    btn.click();
    expect(bar.dataset.collapsed).toBe('true');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(btn.getAttribute('aria-label')).toBe('Çıktı çubuğunu büyüt');
    off();
    expect(host.querySelector('.bar-toggle')).toBeNull();
    // Başka bir simülasyon aynı tercihle açılır.
    const host2 = document.createElement('div');
    host2.innerHTML = HTML;
    document.body.append(host2);
    enhanceSimBar(host2);
    expect(host2.querySelector<HTMLElement>('.sim-bar')!.dataset.collapsed).toBe('true');
    host2.querySelector<HTMLButtonElement>('.bar-toggle')!.click();
    expect(host2.querySelector<HTMLElement>('.sim-bar')!.dataset.collapsed).toBe('false');
  });

  it('çubuk yoksa ya da iki kez çağrılırsa bir şey bozulmaz', () => {
    const empty = document.createElement('div');
    expect(() => enhanceSimBar(empty)()).not.toThrow();
    const host = document.createElement('div');
    host.innerHTML = HTML;
    enhanceSimBar(host);
    enhanceSimBar(host);
    expect(host.querySelectorAll('.bar-toggle')).toHaveLength(1);
  });
});
