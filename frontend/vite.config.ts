import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import * as fs from 'fs'
import * as path from 'path'

const backend = {
  target: 'http://localhost:3001',
  changeOrigin: true,
  secure: false,
}

// Plugin to generate buildInfo.ts in development mode
const generateBuildInfoPlugin = (): Plugin => {
  return {
    name: 'generate-build-info',
    buildStart() {
      const generatedDir = path.resolve('./src/generated')
      const buildInfoPath = path.resolve(generatedDir, 'buildInfo.ts')

      // Create generated directory if it doesn't exist
      if (!fs.existsSync(generatedDir)) {
        fs.mkdirSync(generatedDir, { recursive: true })
      }

      // Create buildInfo.ts file with development info
      const buildInfo = `
import { BuildInfo } from '../types/BuildInfo'

export const buildInfo: BuildInfo = {
  deploymentDate: '${new Date().toISOString()}',
  branchName: 'development',
  commitSha: 'development',
  environment: 'development',
}
`
      fs.writeFileSync(buildInfoPath, buildInfo.trim())
      console.log('Generated development buildInfo.ts file')
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
})
