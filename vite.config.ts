import { defineConfig } from 'vitest/config';

// base './' : GitHub Pages altında (alt dizinde) da çalışsın diye göreli yollar.
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
