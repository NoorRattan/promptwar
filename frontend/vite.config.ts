import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'offline.html', 'firebase-messaging-sw.js'],
      manifest: {
        name: 'CrowdIQ Smart Stadium Experience',
        short_name: 'CrowdIQ',
        description: 'Real-time crowd intelligence for large-scale sporting events',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',
        scope: '/',
        start_url: '/?source=pwa',
        orientation: 'portrait-primary',
        categories: ['sports', 'navigation', 'utilities'],
        icons: [
          { src: '/favicon.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/maps\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-maps-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          },
          {
            urlPattern: /^https:\/\/maps\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'maps-static-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }
            }
          },
          {
            urlPattern: /\/locales\/.*\.json$/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'i18n-cache' }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging', 'firebase/storage'],
          maps: ['@react-google-maps/api']
        }
      }
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
