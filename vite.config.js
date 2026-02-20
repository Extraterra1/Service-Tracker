import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
