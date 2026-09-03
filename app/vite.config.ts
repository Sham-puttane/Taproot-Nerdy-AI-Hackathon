import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// GitHub Pages serves from a repo subpath. A service worker's scope is
// absolute, so unlike the rest of the app it cannot use relative URLs -- the
// base has to be the real path in production and root in dev.
const BASE = process.env.NODE_ENV === 'production'
  ? '/Taproot-Nerdy-AI-Hackathon/'
  : '/'

// The mastery engine is imported as SOURCE, not as a built package and not
// across an API. It is the same TypeScript the eval harness drives under
// Node, so the browser and the harness cannot drift -- which is the entire
// reason there is only one implementation of it.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'taproot-packs' },
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
