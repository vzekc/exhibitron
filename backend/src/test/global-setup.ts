import { beforeAll, afterAll } from 'vitest'
import { Services } from '../db.js'
import { createTestDatabase, deleteDatabase } from './utils.js'
import config from '../mikro-orm.config.js'

process.env.SMTP_HOST = ''
process.env.DATABASE_URL = ''

let db: Services

beforeAll(async () => {
  db = await createTestDatabase()
  console.log('DATABASE_URL', db.dbName)
  config.clientUrl = `postgres://localhost/${db.dbName}`
  process.env.DATABASE_URL = config.clientUrl
  console.log('config.clientUrl', config.clientUrl)
})

afterAll(async () => {
  await db.orm.close()
  deleteDatabase(db.dbName!)
})
