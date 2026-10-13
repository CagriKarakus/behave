// Sayfa altı notları (model açıklaması, "Kitapta", dipnot); view.ts bunları tembel yükler.
// Metin `L().notes` içindedir; bağlantılar ve rozetler kodda kurulur. Okuma anında çağrılır.
import { bookBox, type RepStatus } from '../ui';
import { t } from '../../i18n/t';
import { L } from './text';

export type NoteKey = 'ladder' | 'cat';

/** Her nota ait Kitapta kutusunun öğe kimlikleri ve replikasyon durumları (iç anahtarlar Türkçe kalır). */
const BOOK: Record<NoteKey, Array<{ id: string; rep: RepStatus }>> = {
  ladder: [
    { id: 'ch03-e2', rep: 'sağlam' },
    { id: 'ch06-e6', rep: 'karışık' },
    { id: 'ch08-e9', rep: 'karışık' },
    { id: 'ch09-e5', rep: 'bilinmiyor' },
    { id: 'ch10-e6', rep: 'karışık' },
  ],
  cat: [{ id: 'intro-e1', rep: 'tartışmalı' }],
};

export default function notes(): Record<NoteKey, string> {
  const N = L().notes;
  const build = (k: NoteKey): string => {
    const s = N[k];
    const items = s.items.map((it, i) => ({ ...BOOK[k][i], ...it }));
    return `
<details class="how"><summary>${t('sim.how')}</summary><div class="how-in">
${s.how.map((p) => `  <p>${p}</p>`).join('\n')}
</div></details>

${bookBox(items, `<p class="note">${s.extra}</p>`)}
<p class="foot">${s.foot}</p>`;
  };
  return { ladder: build('ladder'), cat: build('cat') };
}
