import { describe, expect, it } from 'vitest';
import { isRouteHash, parseHash } from './router';
import { esc, html } from './html';

describe('router', () => {
  it('rotaları ayrıştırır', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/bolum/ch2')).toMatchObject({ name: 'chapter', id: 'ch02' });
    expect(parseHash('#/bolum/ch12?deney=ch12-e3')).toEqual({ name: 'chapter', id: 'ch12', experiment: 'ch12-e3' });
    expect(parseHash('#/deneyler')).toEqual({ name: 'experiments' });
    expect(parseHash('#/yok').name).toBe('notfound');
  });
});
describe('sayfa içi çapalar', () => {
  it('#main (atlama bağlantısı) rota değildir', () => {
    expect(isRouteHash('#main')).toBe(false);
    expect(isRouteHash('#/bolum/ch02')).toBe(true);
    expect(isRouteHash('')).toBe(true);
    expect(isRouteHash('#')).toBe(true);
  });
});
describe('html', () => {
  it('kaçışlar', () => {
    expect(esc('<a href="x">&')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;');
    expect(html`<p>${'<b>'}</p>`.value).toBe('<p>&lt;b&gt;</p>');
    expect(html`${[html`<i>${'&'}</i>`, false, null]}`.value).toBe('<i>&amp;</i>');
  });
});
