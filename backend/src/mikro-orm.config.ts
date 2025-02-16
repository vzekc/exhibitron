import 'dotenv/config'
import {
  defineConfig,
  GeneratedCacheAdapter,
  Options,
} from '@mikro-orm/postgresql'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'
import { existsSync, readFileSync } from 'node:fs'

const options = {} as Options

if (
  process.env.NODE_ENV === 'production' &&
  existsSync('./temp/metadata.json')
) {
  options.metadataCache = {
    enabled: true,
    adapter: GeneratedCacheAdapter,
    // temp/metadata.json can be generated via `npx mikro-orm-esm cache:generate --combine`
    options: {
      data: JSON.parse(
        readFileSync('./temp/metadata.json', { encoding: 'utf8' }),
      ),
    },
  }
} else {
  options.metadataProvider = (
    await import('@mikro-orm/reflection')
  ).TsMorphMetadataProvider
}

export default defineConfig({
  dbName: 'cc-katalog',
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  // enable debug mode to log SQL queries and discovery information
  debug: false,
  // for vitest to get around `TypeError: Unknown file extension ".ts"` (ERR_UNKNOWN_FILE_EXTENSION)
  dynamicImportProvider: (id) => import(id),
  highlighter: new SqlHighlighter(),
  ...options,
})
