import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'
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
  plugins: [react(), generateBuildInfoPlugin(), tsConfigPaths()],
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
