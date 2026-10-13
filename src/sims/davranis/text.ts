import { simText } from '../../i18n/sim-text';
import { TR } from './text.tr';

/** Geçerli dilin metni; OKUMA ANINDA çağrılır (modül yüklenirken değil). */
export const L = (): typeof TR => simText('davranis', TR);
