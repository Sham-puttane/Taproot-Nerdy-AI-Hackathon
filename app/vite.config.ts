import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// Two hosts, two different roots, and the difference is not cosmetic: a
// service worker's scope is ABSOLUTE, so unlike the rest of the app it cannot
// be made relative and left to sort itself out.
//
//   GitHub Pages  serves from /<repo>/, so every asset path needs that prefix
//   Vercel        serves from /, and the Pages prefix would 404 every asset
//   dev           serves from /
//
// Vercel sets VERCEL=1 during its builds, which is how we tell them apart
// without a second config or a manual flag someone has to remember to flip.
const BASE = process.env.VERCEL
  ? '/'
  : process.env.NODE_ENV === 'production'
    ? '/Taproot-Nerdy-AI-Hackathon/'
    : '/'

// The mastery engine is imported as SOURCE, not as a built package and not
// across an API. It is the same TypeScript the eval harness drives under
// Node, so the browser and the harness cannot drift -- which is the entire
// reason there is only one implementation of it.
// Stamped into the bundle so a person can read which build they are looking
// at without asking anyone. Three separate caches froze this app on an old
// version in two days, and every time the first ten minutes went on
// establishing what was actually running.
const BUILD_STAMP = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  define: {
    __BUILD__: JSON.stringify(BUILD_STAMP),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // We register the worker ourselves in src/sw-update.ts. The injected
      // snippet omits updateViaCache, never calls update(), and never reloads
      // on controllerchange -- which froze the live site on a days-old bundle
      // and made every downstream feature look broken.
      injectRegister: null,
      // The pack is the whole point of offline: it holds every question the
      // descent can ask beneath this wall, so a child who loses connection
      // mid-diagnosis can still finish it.
      includeAssets: ['pack.json', 'favicon.svg'],
      manifest: {
        name: 'Taproot',
        short_name: 'Taproot',
        description:
          'Finds the maths gap underneath the one you are stuck on.',
        theme_color: '#fdf6e8',
        background_color: '#fdf6e8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        // Without these a new service worker sits in "waiting" until every tab
        // on the origin is closed, so a returning visitor keeps getting the
        // build they first saw -- a hard reload does not help, because the old
        // worker answers the request. That is how three shipped commits stayed
        // invisible on the live site. Take over on the next load instead.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // A pack can be a few hundred KB; the default cap would silently skip
        // it and the app would look installed while being unable to ask a
        // single question offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('pack.json'),
            // NetworkFirst, not StaleWhileRevalidate. Stale-while-revalidate
            // hands back the OLD pack on every load and only updates the copy
            // behind it, so a person on a fresh bundle kept being served last
            // week's questions. Three seconds is generous for a 400KB file and
            // still falls back to the cache on a bad connection.
            handler: 'NetworkFirst',
            options: {
              cacheName: 'taproot-packs',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: BASE,
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('../engine/src', import.meta.url)),
    },
  },
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: true },
})
