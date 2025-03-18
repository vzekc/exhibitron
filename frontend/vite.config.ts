import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const backend = {
  target: 'http://localhost:3001',
  changeOrigin: true,
  secure: false,
}

function generateBuildInfoContent(mode: string): string {
  // Get Git branch name
  let branchName = 'unknown'
  try {
    branchName = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  } catch (error) {
    console.warn('Failed to get Git branch name:', error)
  }

  // Get Git commit SHA and check for uncommitted changes
  let commitSha = 'unknown'
  try {
    commitSha = execSync('git rev-parse --short HEAD').toString().trim()
    const hasChanges = execSync('git status --porcelain').toString().trim().length > 0
    if (hasChanges) {
      commitSha += '-dirty'
    }
  } catch (error) {
    console.warn('Failed to get Git commit info:', error)
  }

  // Determine environment
  const environment = process.env.NODE_ENV || 'development'

  const buildInfo = `
import { BuildInfo } from '../types/BuildInfo'

export const buildInfo: BuildInfo = {
  deploymentDate: '${new Date().toISOString()}',
  branchName: '${branchName}',
  commitSha: '${commitSha}',
  environment: '${environment}',
  buildMode: '${mode}',
}
`
  return buildInfo.trim()
}

function writeBuildInfoFile(mode: string) {
  const generatedDir = path.resolve('./src/generated')
  const buildInfoPath = path.resolve(generatedDir, 'buildInfo.ts')

  // Create generated directory if it doesn't exist
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true })
  }

  // Write the build info file
  fs.writeFileSync(buildInfoPath, generateBuildInfoContent(mode))
  console.log(`Generated buildInfo.ts file for ${mode}`)
}

// Plugin to generate buildInfo.ts
const generateBuildInfoPlugin = (): Plugin => {
  return {
    name: 'generate-build-info',
    configureServer() {
      // For development mode
      writeBuildInfoFile('development')
    },
    buildStart() {
      // For production build
      if (process.env.NODE_ENV === 'production') {
        writeBuildInfoFile('production')
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
