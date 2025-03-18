import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function makeBuildInfo(mode) {
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
  const generatedDir = path.resolve(__dirname, '../generated')
  const buildInfoPath = path.resolve(generatedDir, 'buildInfo.ts')

  // Create generated directory if it doesn't exist
  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true })
  }

  // Write the build info file
  fs.writeFileSync(buildInfoPath, buildInfo.trim())
  console.log('Generated buildInfo.ts file')
}

// Generate build info if this file is run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url)
if (isMainModule) {
  makeBuildInfo(process.env.NODE_ENV ?? 'development')
}
