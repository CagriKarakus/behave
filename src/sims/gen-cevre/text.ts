import { simText } from '../../i18n/sim-text';
import { TR } from './text.tr';

/** Geçerli dilin metni; yalnızca çalışma anında (mount, model fonksiyonları) çağrılır. */
export const L = (): typeof TR => simText('gen-cevre', TR);
