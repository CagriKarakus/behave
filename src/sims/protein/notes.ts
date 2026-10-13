// Genden proteine: sayfa altı notları ("Model nasıl çalışıyor?", "Kitapta", dipnot). Tembel yüklenen ayrı parça.
// Metin okuma anında (`notes()` çağrısında) dile göre alınır; bu modül yüklenirken metin hesaplanmaz.
import { t } from '../../i18n/t';
import { bookBox } from '../ui';
import { L } from './text';

const how = (paras: string[]): string =>
  `<details class="how"><summary>${t('sim.how')}</summary><div class="how-in">${paras.map((p) => `<p>${p}</p>`).join('')}</div></details>`;

export function notes(): { how: string; book: string; foot: string } {
  const n = L().notes;
  return {
    how: how(n.how),
    book: bookBox([{ id: 'ch07-e12', text: n.bookText, rep: 'karışık', note: n.bookNote }], n.bookExtra.join('')),
    foot: n.foot,
  };
}
