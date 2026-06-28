import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/exercises/*.svg', 'apple-touch-icon.svg', 'favicon.svg'],
      manifest: {
        name: 'ResurGo Fitness',
        short_name: 'ResurGo',
        description: 'Coach sportif local-first, adaptatif et offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f8faf9',
        theme_color: '#12231f',
        icons: [
          { src: '/pwa-icon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: '/pwa-icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'resurgo-pages' }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/exercises/'),
            handler: 'CacheFirst',
            options: { cacheName: 'resurgo-exercise-assets' }
          }
        ]
      }
    })
  ]
});
