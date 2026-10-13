import { simText } from '../../i18n/sim-text';
import { TR } from './text.tr';

/** Geçerli dilin metni; yalnızca çalışma anında (mount, model işlevleri) çağrılır. */
export const L = (): typeof TR => simText('isbirligi-evrimi', TR);
