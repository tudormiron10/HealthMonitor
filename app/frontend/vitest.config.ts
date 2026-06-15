import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Standalone vitest config. Re-declares the `@/` alias so co-located *.test.ts
// files resolve imports the same way the app does. jsdom provides browser globals
// (localStorage, etc.) for the storage/util tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
  },
})
