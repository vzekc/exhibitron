import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
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
    configureServer() {
      // For development mode
      makeBuildInfo('development')
    },
    buildStart() {
      // For production build
      if (process.env.NODE_ENV === 'production') {
        makeBuildInfo('production')
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), generateBuildInfoPlugin()],
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
})
