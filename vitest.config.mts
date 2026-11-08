import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

process.env.ELECTRON_OVERRIDE_DIST_PATH ||= import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(import.meta.dirname, 'src/shared'),
      '@main': resolve(import.meta.dirname, 'src/main'),
      '@': resolve(import.meta.dirname, 'src/renderer/src'),
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});

