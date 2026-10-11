// Yazı tipleri yerelden sunulur (Google'a istek yok). Türkçe karakterler için latin-ext dahil.
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-ext-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-ext-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-ext-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-ext-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-ext-500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { createApp } from './app';
import { createContentSource } from './content';
import { initTheme } from './lib/theme';

initTheme();
createApp(document.getElementById('app') as HTMLElement, createContentSource());
