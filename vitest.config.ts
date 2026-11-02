import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'jsdom',
    fileParallelism: false,
    include: ['src/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
  },
  resolve: { conditions: ['browser'] },
})
