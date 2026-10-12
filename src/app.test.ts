// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import newSchema from './content/__fixtures__/new-schema.json';
import { normalizeContent } from './content/normalize';
import { sourceFromContent } from './content';
import { createApp } from './app';
import { simsFor } from './sims/registry';

const CH02_SIMS = 1; // yalnızca seçili simülasyon bağlanır (ch02 çoklu: sekmeli)

const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 10)); };
const until = async (fn: () => boolean) => { for (let i = 0; i < 200 && !fn(); i++) await new Promise((r) => setTimeout(r, 10)); };
let host: HTMLElement;
let dispose: () => void;

beforeEach(async () => {
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  location.hash = '';
  await flush(); // önceki testten kalan hashchange olayları bitsin
  host = document.createElement('div');
  document.body.appendChild(host);
});
afterEach(() => { dispose?.(); host.remove(); vi.restoreAllMocks(); });

const go = async (hash: string) => { location.hash = hash; window.dispatchEvent(new HashChangeEvent('hashchange')); await flush(); };

describe('uygulama kabuğu ve yönlendirme', () => {
  it('site altbilgisi her sayfada bulunur ve kutu kapatılsa da kalır', async () => {
    dispose = createApp(host, sourceFromContent(normalizeContent(newSchema)));
    await go('#/');
    host.querySelector<HTMLButtonElement>('[data-notice-close]')?.click();
    expect(host.querySelector('[data-notice]')).toBeNull();
    for (const h of ['#/', '#/deneyler', '#/bolum/ch02']) {
      await go(h);
      expect(host.querySelector('footer.site-foot')?.textContent).toContain('bağımsız bir okuma ve öğrenme aracıdır');
    }
  });
  it('rota değişince önceki sayfa (simülasyon dahil) temizlenir', async () => {
    dispose = createApp(host, sourceFromContent(normalizeContent(newSchema)));
    await go('#/bolum/ch02');
    await until(() => host.querySelectorAll('.sim').length === CH02_SIMS);
    expect(host.querySelectorAll('.sim').length).toBe(CH02_SIMS);
    await go('#/');
    expect(host.querySelectorAll('.sim').length).toBe(0);
    expect(host.querySelector('.ch-card')).not.toBeNull();
  });
  it('#main (atlama bağlantısı) rota değiştirmez; tıklama odağı <main>e taşır, hash değişmez', async () => {
    dispose = createApp(host, sourceFromContent(normalizeContent(newSchema)));
    await go('#/bolum/ch02');
    await until(() => host.querySelectorAll('.sim').length === CH02_SIMS);
    await go('#main');
    expect(host.querySelectorAll('.sim').length).toBe(CH02_SIMS);
    expect(host.querySelector('h1')?.textContent).toBe('Bir Saniye Önce');
    location.hash = '#/bolum/ch02';
    const skip = host.querySelector('.skip') as HTMLAnchorElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    skip.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('main'));
    expect(location.hash).toBe('#/bolum/ch02');
  });
  it('ilk yüklemede başlığa odak çalınmaz (ilk Tab atlama bağlantısına gider); sonraki rotada odak başlığa gider', async () => {
    dispose = createApp(host, sourceFromContent(normalizeContent(newSchema)));
    await flush();
    expect(document.activeElement?.tagName + '#' + document.activeElement?.id).toBe('BODY#');
    await go('#/deneyler');
    expect(document.activeElement?.id).toBe('page-title');
  });
  it('?deney= hedefi yoksa en üste kaydırır; aynı bölümde deney değişince sim yeniden kurulmaz', async () => {
    dispose = createApp(host, sourceFromContent(normalizeContent(newSchema)));
    await go('#/bolum/ch02?deney=yok');
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 0);
    await go('#/bolum/ch02?deney=ch02-e1');
    await until(() => !!host.querySelector('.sim'));
    const sim = host.querySelector('.sim');
    await go('#/bolum/ch02?deney=ch02-e2');
    expect(host.querySelector('.sim')).toBe(sim);
    expect(host.querySelector('.exp-target')?.id).toBe('exp-ch02-e2');
  });
  it('?sim= doğrudan açar; aynı bölümde sim değişince yalnızca seçili sim kalır; geçersiz sim ilkine düşer', async () => {
    const ids = simsFor('ch02').map((x) => x.id);
    dispose = createApp(host, sourceFromContent(normalizeContent(newSchema)));
    await go(`#/bolum/ch02?sim=${ids[1]}`);
    await until(() => host.querySelectorAll('.sim').length === 1);
    expect(host.querySelector<HTMLElement>('.sim-host')!.dataset.sim).toBe(ids[1]);
    const page = host.querySelector('.chapter');
    await go(`#/bolum/ch02?sim=${ids[0]}`);
    await until(() => host.querySelector<HTMLElement>('.sim-host')!.dataset.sim === ids[0] && host.querySelectorAll('.sim').length === 1);
    expect(host.querySelector('.chapter')).toBe(page); // sayfa yeniden kurulmadı
    expect(host.querySelectorAll('.sim')).toHaveLength(1);
    await go('#/bolum/ch03');
    await go('#/bolum/ch02?sim=yok');
    await until(() => host.querySelectorAll('.sim').length === 1);
    expect(host.querySelector<HTMLElement>('.sim-host')!.dataset.sim).toBe(ids[0]);
  });
  it('bilinmeyen bölüm ve rota 404 gösterir', async () => {
    dispose = createApp(host, sourceFromContent(normalizeContent(newSchema)));
    await go('#/bolum/yok');
    expect(host.querySelector('h1')?.textContent).toBe('Sayfa bulunamadı');
    await go('#/saçma');
    expect(host.querySelector('h1')?.textContent).toBe('Sayfa bulunamadı');
  });
});
