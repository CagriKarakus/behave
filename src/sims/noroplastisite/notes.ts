// Nöroplastisite simülasyonunun sayfa altı notları ("Model nasıl çalışıyor?", "Kitapta", dipnot): etkileşimli parçadan ayrı,
// tembel yüklenen bir parçadır (bkz. lazyNotes). Metin L()'den, yükleme anında okunur; iki dilde de aynı dosya kullanılır.
import { t } from '../../i18n/t';
import { bookBox, type RepStatus } from '../ui';
import { L } from './text';

const BOOK: Record<'syn' | 'prac' | 'str', Array<{ id: string; rep: RepStatus }>> = {
  syn: [{ id: 'ch05-e1', rep: 'sağlam' }],
  prac: [{ id: 'ch05-e7', rep: 'sağlam' }, { id: 'ch05-e8', rep: 'sağlam' }, { id: 'ch05-e12', rep: 'sağlam' }],
  str: [{ id: 'ch05-e3', rep: 'sağlam' }],
};

function block(k: 'syn' | 'prac' | 'str'): string {
  const n = L().notes[k];
  return `
<details class="more"><summary>${t('sim.how')}</summary><div>
${n.how.map((p) => `  <p>${p}</p>`).join('\n')}
</div></details>
${bookBox(BOOK[k].map((b, i) => ({ ...b, text: n.book[i].text, note: n.book[i].note })))}
<p class="foot">${n.foot}</p>
`;
}

/** Notlar çağrıldığı anda (dil o sırada neyse onunla) kurulur. */
export const notes = (): Record<'syn' | 'prac' | 'str', string> => ({ syn: block('syn'), prac: block('prac'), str: block('str') });
