import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Version-based naming - increment this for each release
const BUILD_VERSION = '1.2.1';

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Option 1: Use version number in filename
        entryFileNames: `assets/[name]-v${BUILD_VERSION}-[hash:6].js`,
        chunkFileNames: `assets/[name]-v${BUILD_VERSION}-[hash:6].js`,
        assetFileNames: `assets/[name]-v${BUILD_VERSION}-[hash:6].[ext]`,
        
        // Option 2: Use timestamp for guaranteed uniqueness
        // const timestamp = Date.now();
        // entryFileNames: `assets/[name]-${timestamp}.js`,
        // chunkFileNames: `assets/[name]-${timestamp}.js`,
        // assetFileNames: `assets/[name]-${timestamp}.[ext]`,
        
        // Option 3: Simple hash only (default but shorter)
        // entryFileNames: `assets/[name]-[hash:8].js`,
        // chunkFileNames: `assets/[name]-[hash:8].js`,
        // assetFileNames: `assets/[name]-[hash:8].[ext]`,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['HSlogo.png', 'logo.png', 'music/**/*', 'video/**/*', 'audio/**/*'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'Drillio - Marching Band Drill Book',
        short_name: 'Drillio',
        description: 'Digital drill book for marching band performers',
        theme_color: '#dc2626',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        permissions: ['notifications'],
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3,m4a}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // 20MB to accommodate audio files
        runtimeCaching: [
          {
            urlPattern: /\.mp4$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'video-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
