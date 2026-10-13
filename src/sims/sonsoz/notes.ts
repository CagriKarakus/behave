// Sonsöz simülasyonunun sayfa altı notları ("Model nasıl çalışıyor?" ve "Kitapta"). Etkileşimli parçadan ayrı, tembel yüklenir.
// Metin okuma anında alınır (getter): dil değişince bayat kalmaz.
import { t } from '../../i18n/t';
import { bookBox } from '../ui';
import { L } from './text';

const how = (paras: string[]): string =>
  `<details class="how"><summary>${t('sim.how')}</summary><div class="how-in">${paras.map((p) => `<p>${p}</p>`).join('')}</div></details>`;

const epilogue = (text: string): string => `<li><a href="#/bolum/epilogue">${L().notes.epilogue}</a>: ${text}</li>`;

export const NOTES = {
  get ort(): string {
    const N = L().notes.ort;
    return how(N.how) + bookBox([
      { id: 'ch04-e11', text: N.football.text, rep: 'sağlam', note: N.football.note },
    ], `<ul>${epilogue(N.epi)}</ul>`);
  },

  get biz(): string {
    const N = L().notes.biz;
    return how(N.how) + bookBox([
      { id: 'ch11-e3', text: N.minimal.text, rep: 'sağlam', note: N.minimal.note },
      { id: 'ch11-e8', text: N.shirt.text, rep: 'sağlam', note: N.shirt.note },
      { id: 'ch17-e3', text: N.contact.text, rep: 'karışık', note: N.contact.note },
    ], `<p>${N.related(`<a href="#/bolum/ch11?sim=biz-onlar">${N.relA}</a>`, `<a href="#/bolum/ch17?sim=savas-baris">${N.relB}</a>`)}</p>`);
  },

  get harita(): string {
    const N = L().notes.harita;
    return how(N.how) + `<aside class="book" aria-label="${t('sim.book')}"><h3 class="sim-h">${t('sim.book')}</h3><ul>` +
      epilogue(N.epi) + `<li><a href="#/bolum/intro">${N.introLabel}</a>: ${N.intro}</li></ul></aside>`;
  },

  get foot(): string {
    return `<p class="foot">${L().notes.foot}</p>`;
  },
};
