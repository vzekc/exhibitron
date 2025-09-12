import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { SqlEntityManager } from '@mikro-orm/postgresql'
import { logger } from '../app/logger.js'

// Singleton state
let functionsLoaded = false
const loadedFunctions = new Set<string>()

export async function loadDatabaseFunctions(em: SqlEntityManager): Promise<void> {
  // If functions are already loaded, skip
  if (functionsLoaded) {
    logger.debug('Database functions already loaded, skipping')
    return
  }

  const functionsDir = join(process.cwd(), 'src/db/functions')

  // Check if directory exists
  if (!existsSync(functionsDir)) {
    logger.warn({ functionsDir }, 'Database functions directory not found')
    return
  }

  const files = readdirSync(functionsDir).filter((file) => file.endsWith('.sql'))

  if (files.length === 0) {
    logger.warn({ functionsDir }, 'No SQL files found in database functions directory')
    return
  }

  logger.debug(
    {
      count: files.length,
      functionsDir,
      files,
    },
    'Loading database functions',
  )

  for (const file of files) {
    if (loadedFunctions.has(file)) {
      logger.debug({ file }, `Skipping already loaded function from ${file}`)
      continue
    }

    logger.debug({ file }, `Loading database function from ${file}`)
    try {
      const sql = readFileSync(join(functionsDir, file), 'utf-8')
      await em.execute(sql)
      loadedFunctions.add(file)
      logger.debug({ file }, `Successfully loaded database function from ${file}`)
    } catch (error) {
      logger.error(
        {
          file,
          error: error instanceof Error ? error.message : String(error),
        },
        `Failed to load database function from ${file}`,
      )
      throw error
    }
  }

  // Mark functions as loaded
  functionsLoaded = true

  logger.debug(
    {
      count: loadedFunctions.size,
      loadedFunctions: Array.from(loadedFunctions),
    },
    'Finished loading database functions',
  )
}
