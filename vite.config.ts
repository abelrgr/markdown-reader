import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  resolve: {
    alias: [
      // rehype-katex serializes through this parser inside a Worker, where DOMParser is unavailable.
      {
        find: /^hast-util-from-html-isomorphic$/,
        replacement: require.resolve('hast-util-from-html-isomorphic'),
      },
      {
        find: /^decode-named-character-reference$/,
        replacement: require.resolve('decode-named-character-reference'),
      },
    ],
  },
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari15',
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
