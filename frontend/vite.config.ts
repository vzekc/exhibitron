import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'
import * as path from 'path'
import { makeBuildInfo } from './src/build/makeBuildInfo.js' assert { type: 'js' }

const backend = {
  target: 'http://localhost:3001',
  changeOrigin: true,
  secure: false,
}

// Plugin to generate buildInfo.ts
const generateBuildInfoPlugin = (): Plugin => {
  return {
    name: 'generate-build-info',
    buildStart() {
      // Generate build info for both development and production
      const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development'
      makeBuildInfo(mode)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    generateBuildInfoPlugin(),
    tsConfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Classic Computing Katalog',
        short_name: 'CC Katalog',
        description: 'Exponat-Katalog der Classic Computing',
        theme_color: '#1f2937',
        background_color: '#f9fafb',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/graphql/, /^\/api\//, /^\/auth\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\/.*\/image\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'api-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\.(?:svg|png|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          {
            urlPattern: /\.woff2$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 365 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/graphql': backend,
      '/auth': backend,
      '/api': backend,
    },
  },
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  },
  css: {
    postcss: './postcss.config.js',
  },
})
