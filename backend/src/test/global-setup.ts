import { beforeAll, afterAll } from 'vitest'
import { Services } from '../db.js'
import { createTestDatabase, deleteDatabase } from './utils.js'

process.env.SMTP_HOST = ''
process.env.DATABASE_URL = ''

let db: Services

beforeAll(async () => {
  db = await createTestDatabase()
  process.env.DATABASE_URL = `postgres://localhost/${db.dbName}`
})

afterAll(async () => {
  await db.orm.close()
  deleteDatabase(db.dbName!)
})
