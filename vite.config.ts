import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const isElectron = process.env.ELECTRON === 'true'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
      renderer: {},
    }),
    // Only enable PWA for web builds, not Electron
    !isElectron && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon.ico'],
      manifest: {
        name: 'Aura',
        short_name: 'Aura',
        description: 'Your tables, your time. Manage tables and notes with cloud sync.',
        theme_color: '#191919',
        background_color: '#191919',
        display: 'standalone',
        orientation: 'portrait-primary',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icon.ico',
            sizes: '256x256',
            type: 'image/x-icon'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  build: {
    outDir: 'dist',
  },
})
