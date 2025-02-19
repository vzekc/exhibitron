import { expect } from 'vitest'
import { bootstrap } from '../app.js'
import { initORM } from '../db.js'
import config from '../mikro-orm.config.js'
import { TestSeeder } from '../seeders/TestSeeder.js'
import { execSync } from 'child_process'
import { FastifyInstance } from 'fastify'

const generateRandomString = (length: number): string => {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export async function initTestApp() {
  // this will create all the ORM services and cache them
  const dbName = `cc-katalog-test-${generateRandomString(8)}`
  createDatabase(dbName)
  const { orm } = await initORM({
    // first, include the main config
    ...config,
    // no need for debug information, it would only pollute the logs
    debug: process.env.TEST_LOG_LEVEL === 'debug',
    dbName,
    // this will ensure the ORM discovers TS entities, with ts-node, ts-jest and vitest
    // it will be inferred automatically, but we are using vitest here
    // preferTs: true,
  })

  await orm.schema.refreshDatabase() // Drops & re-creates schema
  await orm.seeder.seed(TestSeeder)

  const { app } = await bootstrap({
    logLevel: process.env.TEST_LOG_LEVEL || 'fatal',
  })

  return { app, dbName }
}

export const runCommand = (command: string): void => {
  try {
    execSync(command, { stdio: 'inherit' })
  } catch (error) {
    throw new Error(`Command failed: ${command}: ${error}`)
  }
}

export const createDatabase = (dbName: string) =>
  runCommand(`createdb ${dbName}`)

export const deleteDatabase = (dbName: string) => {
  if (process.env.TEST_KEEP_DB) {
    console.log(`test database ${dbName} not deleted`)
  } else {
    runCommand(`dropdb ${dbName}`)
  }
}

export const login = async (
  app: FastifyInstance,
  username: string,
  password: string = 'geheim',
) => {
  const res = await app.inject({
    method: 'post',
    url: '/user/sign-in',
    payload: {
      username,
      password,
    },
  })

  expect(res).toHaveStatus(200)
  return res.json()
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
