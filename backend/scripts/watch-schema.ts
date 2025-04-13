import { watch } from 'chokidar'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const execAsync = promisify(exec)
const backendDir = path.resolve(__dirname, '..')
const frontendDir = path.resolve(__dirname, '../../frontend')

async function generateTypes() {
  try {
    // Generate backend types
    await execAsync('pnpm --filter backend run generate')

    // Generate frontend types
    await execAsync('pnpm --filter frontend run generate')

    console.log('✅ GraphQL types generated successfully')
  } catch (error) {
    console.error('❌ Error generating types:', error)
  }
}

// Watch for changes in schema files
const watcher = watch(
  [path.join(backendDir, 'src/**/*.graphql'), path.join(backendDir, 'src/**/*.gql')],
  {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
  },
)

let timeout: NodeJS.Timeout
watcher.on('change', (path) => {
  console.log(`📝 Schema file changed: ${path}`)

  // Debounce the type generation
  if (timeout) {
    clearTimeout(timeout)
  }

  timeout = setTimeout(() => {
    generateTypes()
  }, 500)
})

console.log('👀 Watching for GraphQL schema changes...')
