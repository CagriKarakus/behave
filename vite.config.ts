import { defineConfig } from 'vitest/config';
import { contentPlugin } from './scripts/content-plugin.ts';

// base './' : GitHub Pages altında (alt dizinde) da çalışsın diye göreli yollar.
export default defineConfig({
  base: './',
  plugins: [contentPlugin()],
  build: { outDir: 'dist', emptyOutDir: true },
  // Telifli kaynak (PDF) ve .book/ geliştirme sunucusundan da servis edilmesin.
  server: { fs: { deny: ['.book', '**/*.pdf', '.env', '.env.*', '*.{crt,pem}', '**/.git/**'] } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
