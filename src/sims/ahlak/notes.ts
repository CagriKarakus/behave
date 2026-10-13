// Ahlak simülasyonunun sayfa altı notları ("Model nasıl çalışıyor?" ve "Kitapta"). Etkileşimli parçadan ayrı, tembel
// yüklenen bir parçadır: görünümün ilk açılış boyutu küçük kalır; notlar etkileşim kurulduktan hemen sonra gelir.
// Metin `L()` ile OKUMA ANINDA alınır (bookBox rozetleri de geçerli dili kullanır).
import { bookBox, type BookItem } from '../ui';
import { t } from '../../i18n/t';
import { PG } from './model';
import { L } from './text';

export type NoteKey = 'tro' | 'pg' | 'dice';

const how = (...paras: string[]): string =>
  `<details class="how"><summary>${t('sim.how')}</summary><div class="how-in">${paras.map((p) => `<p>${p}</p>`).join('')}</div></details>`;
const item = (id: string, b: { text: string; note: string }, rep: BookItem['rep']): BookItem => ({ id, text: b.text, rep, note: b.note });

/** Metin okuma anında kurulur. */
export default function notes(): Record<NoteKey, string> {
  const N = L().notes;
  return {
    tro: how(N.tro.p1, N.tro.p2) + bookBox([
      item('ch13-e4', N.tro.book.greene, 'karışık'),
      item('ch13-e1', N.tro.book.knobe, 'sağlam'),
      item('ch13-e2', N.tro.book.hamlin, 'tartışmalı'),
    ]),
    pg: how(N.pg.p1, N.pg.p2(PG.E, PG.mpcr * PG.groupSize, PG.cost, PG.impact), N.pg.p3) + bookBox([
      item('ch13-e7', N.pg.book.herrmann, 'sağlam'),
      item('ch13-e8', N.pg.book.henrich, 'karışık'),
      item('ch13-e9', N.pg.book.rand, 'tartışmalı'),
    ]),
    dice: how(N.dice.p1, N.dice.p2) + bookBox([
      item('ch13-e10', N.dice.book.gachter, 'sağlam'),
      item('ch13-e5', N.dice.book.cohn, 'karışık'),
    ]),
  };
}
