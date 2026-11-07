import { resolve } from 'node:path';
import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { Plugin } from 'vite';
import { buildCsp } from './config/csp';

function cspPlugin(isDev: boolean): Plugin {
  return {
    name: 'buddy-csp',
    transformIndexHtml: (html) => html.replace('%CSP%', buildCsp(isDev)),
  };
}

const shared = resolve(__dirname, 'src/shared');

export default defineConfig(({ command }) => {
  const isDev = command === 'serve';
  return {
    main: {
      resolve: { alias: { '@shared': shared, '@main': resolve(__dirname, 'src/main') } },
      build: { outDir: 'out/main' },
    },
    preload: {
      resolve: { alias: { '@shared': shared } },
      build: { outDir: 'out/preload' },
    },
    renderer: {
      root: resolve(__dirname, 'src/renderer'),
      resolve: { alias: { '@shared': shared, '@': resolve(__dirname, 'src/renderer/src') } },
      plugins: [react(), tailwindcss(), cspPlugin(isDev)],
      build: {
        outDir: 'out/renderer',
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'src/renderer/index.html'),
            overlay: resolve(__dirname, 'src/renderer/overlay.html'),
          },
        },
      },
    },
  };
});
