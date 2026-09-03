import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// The mastery engine is imported as SOURCE, not as a built package and not
// across an API. It is the same TypeScript the eval harness drives under
// Node, so the browser and the harness cannot drift -- which is the entire
// reason there is only one implementation of it.
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('../engine/src', import.meta.url)),
    },
  },
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
})
