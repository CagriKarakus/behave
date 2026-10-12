import { describe, expect, it } from 'vitest';
import { isRouteHash, parseHash, withSim } from './router';
import { esc, html } from './html';

describe('router', () => {
  it('rotaları ayrıştırır', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/bolum/ch2')).toMatchObject({ name: 'chapter', id: 'ch02' });
    expect(parseHash('#/bolum/ch12?deney=ch12-e3')).toEqual({ name: 'chapter', id: 'ch12', experiment: 'ch12-e3' });
    expect(parseHash('#/bolum/ch02?sim=ultimatum')).toEqual({ name: 'chapter', id: 'ch02', experiment: undefined, sim: 'ultimatum' });
    expect(parseHash('#/bolum/ch02?deney=ch02-e1&sim=ultimatum')).toMatchObject({ experiment: 'ch02-e1', sim: 'ultimatum' });
    expect(parseHash('#/deneyler')).toEqual({ name: 'experiments' });
    expect(parseHash('#/deneyler?odak=durum')).toEqual({ name: 'experiments', focus: 'durum' });
    expect(parseHash('#/yok').name).toBe('notfound');
  });
});
describe('withSim', () => {
  it('sim parametresini yazar, deney parametresini korur', () => {
    expect(withSim('#/bolum/ch02', 'ch02', 'ultimatum')).toBe('#/bolum/ch02?sim=ultimatum');
    expect(withSim('#/bolum/ch02?deney=ch02-e1&sim=a', 'ch02', 'b')).toBe('#/bolum/ch02?deney=ch02-e1&sim=b');
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
