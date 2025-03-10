import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = {
  target: 'http://localhost:3001',
  changeOrigin: true,
  secure: false,
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/graphql': backend,
    },
  },
})
