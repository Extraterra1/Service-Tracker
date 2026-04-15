import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const buildTime = new Date().toISOString()
const buildId = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? buildTime

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
    'import.meta.env.VITE_APP_BUILD_TIME': JSON.stringify(buildTime),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) {
            return 'ui-icons'
          }

          if (
            id.includes('node_modules/firebase/auth') ||
            id.includes('node_modules/@firebase/auth')
          ) {
            return 'firebase-auth'
          }

          if (
            id.includes('node_modules/firebase/firestore') ||
            id.includes('node_modules/@firebase/firestore')
          ) {
            return 'firebase-firestore'
          }

          return undefined
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'Service Tracker',
        short_name: 'Tracker',
        description: 'Checklist diário de entregas e recolhas com sincronização da equipa.',
        theme_color: '#e3293b',
        background_color: '#f4f5f7',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'pwa-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/manifest\.webmanifest$/, /^\/.*\.(?:json|webmanifest)$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/getjson'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'service-api-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 5,
              },
            },
          },
        ],
      },
    }),
  ],
})
