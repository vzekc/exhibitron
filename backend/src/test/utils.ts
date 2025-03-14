import { expect } from 'vitest'
import { bootstrap } from '../app.js'
import { initORM } from '../db.js'
import config from '../mikro-orm.config.js'
import { TestSeeder } from '../seeders/TestSeeder.js'
import { execSync } from 'child_process'

const generateRandomString = (length: number): string => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export const createTestDatabase = async () => {
  const dbName = `exhibitron-test-${generateRandomString(8)}`
  createDatabase(dbName)

  const db = await initORM({
    ...config,
    debug: process.env.TEST_LOG_LEVEL === 'debug',
    dbName,
  })

  await db.orm.schema.refreshDatabase() // Drops & re-creates schema
  await db.orm.seeder.seed(TestSeeder)

  return db
}

export async function initTestApp() {
  // this will create all the ORM services and cache them
  const db = await createTestDatabase()

  const { app } = await bootstrap({
    logLevel: process.env.TEST_LOG_LEVEL || 'fatal',
  })

  return { app, db }
}

export const runCommand = (command: string): void => {
  try {
    execSync(command, { stdio: 'inherit' })
  } catch (error) {
    throw new Error(`Command failed: ${command}: ${error}`)
  }
}

export const createDatabase = (dbName: string) => runCommand(`createdb ${dbName}`)

export const deleteDatabase = (dbName: string) => {
  if (process.env.TEST_KEEP_DB) {
    console.log(`test database ${dbName} not deleted`)
  } else {
    runCommand(`dropdb ${dbName}`)
  }
}

expect.extend({
  toHaveStatus(received, expectedStatusCode) {
    const { statusCode, statusMessage, body } = received
    const pass = statusCode === expectedStatusCode
    if (pass) {
      return {
        message: () => `expected ${statusCode} not to be ${expectedStatusCode}`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${statusCode} to be ${expectedStatusCode}\nMessage: ${statusMessage}\nBody: ${body}`,
        pass: false,
      }
    }
  },
})
