// Sayfa altı notları (Model nasıl çalışıyor?, Kitapta, dipnot): ayrı parça olarak tembel yüklenir.
// Metin `L().notes` içindedir; rozetler ve bağlantılar kodda kurulur. Okuma anında çağrılır.
import { bookBox } from '../ui';
import { t } from '../../i18n/t';
import { L } from './text';

export type NoteKey = 'n1' | 'n2' | 'n3';

/** Her nota ait Kitapta kutusunun öğe kimlikleri ve replikasyon durumları (iç anahtarlar Türkçe kalır). */
const BOOK: Record<NoteKey, Array<{ id: string; rep: 'sağlam' | 'bilinmiyor' }>> = {
  n1: [{ id: 'ch01-e1', rep: 'sağlam' }, { id: 'ch01-e3', rep: 'bilinmiyor' }],
  n2: [{ id: 'ch01-e3', rep: 'bilinmiyor' }],
  n3: [{ id: 'ch01-e1', rep: 'sağlam' }],
};

export default function notes(): Record<NoteKey, string> {
  const N = L().notes;
  const build = (k: NoteKey): string => {
    const s = N[k] as { how: string[]; items: Array<{ text: string; note?: string }>; extra?: string; foot: string };
    const extra = s.extra ?? '';
    return `<details class="how"><summary>${t('sim.how')}</summary><div class="how-in">${s.how.map((p) => `<p>${p}</p>`).join('')}</div></details>` +
      bookBox(BOOK[k].map((b, i) => ({ ...b, text: s.items[i].text, ...(s.items[i].note ? { note: s.items[i].note } : {}) })), extra) +
      `<p class="foot">${N.nitel} ${s.foot}</p>`;
  };
  return { n1: build('n1'), n2: build('n2'), n3: build('n3') };
}
