import { expect } from 'vitest'
import { initORM } from '../db.js'
import config from '../mikro-orm.config.js'
import { TestSeeder } from '../seeders/TestSeeder.js'
import { execSync } from 'child_process'
import { ExecuteOperationFunction, Session } from './server.js'
import { graphql } from 'gql.tada'

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

  // Create citext extension first
  await db.orm.em.execute('CREATE EXTENSION IF NOT EXISTS citext;')

  // Use updateSchema instead of createSchema to avoid dropping the schema
  // This will create missing tables and update existing ones
  await db.orm.schema.updateSchema()

  await db.orm.seeder.seed(TestSeeder)

  return db
}

export const runCommand = (command: string): void => {
  try {
    execSync(command, { stdio: 'inherit' })
  } catch (error) {
    throw new Error(`Command failed: ${command}: ${error}`)
  }
}

export const createDatabase = (dbName: string) => {
  runCommand(`createdb ${dbName}`)
}

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

export const createRoom = async (
  graphqlRequest: ExecuteOperationFunction,
  input: { name: string; capacity?: number },
  session: Session,
) => {
  const result = await graphqlRequest(
    graphql(`
      mutation CreateRoom($name: String!, $capacity: Int) {
        createRoom(input: { name: $name, capacity: $capacity }) {
          id
        }
      }
    `),
    input,
    session,
  )
  expect(result.errors).toBeUndefined()
  return result.data!.createRoom!.id
}
