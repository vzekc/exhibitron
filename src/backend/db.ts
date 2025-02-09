import pg from 'pg'
import Koa from 'koa'

const pool = new pg.Pool({
  connectionTimeoutMillis: 5000,
  max: 100,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE || 'retrostar',
  port: parseInt(process.env.PGPORT || '5432'),
})

export const connect = async () => pool.connect()

export const closePool = async () => pool.end()

// Middleware function to allocate PostgreSQL database connection and manage transactions
export const withClient = async <T>(handler: (client: pg.PoolClient) => Promise<T>) => {
  const client = await connect()
  let result = null
  try {
    await client.query('BEGIN')
    result = await handler(client)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  return result
}

export const middleware = async (ctx: Koa.Context, next: () => Promise<void>) =>
  withClient(async (client) => {
    ctx.state.db = client
    await next()
  })

export const checkPassword = async (username: string, password: string) =>
  withClient(async (client) => {
    const result = await client.query('SELECT check_password($1, $2)', [
      username,
      password,
    ])
    if (!result.rows[0].check_password) {
      return null
    }
    const user = await client.query(
      'SELECT id, name AS username FROM "user" WHERE name = $1',
      [username]
    )
    return user.rows[0]
  })

export const checkPasswordResetKey = async (key: string) =>
  withClient(async (client) => {
    const result = await client.query(
      `SELECT password_reset_key_expires_at < NOW() AS expired, NOW(), password_reset_key_expires_at
       FROM "user"
       WHERE password_reset_key = $1`,
      [key]
    )
    if (result.rows.length === 0) {
      console.log('invalid password reset key:', key)
      return false
    } else if (result.rows[0].expired) {
      console.log('expired password reset key:', result.rows[0])
      return false
    } else {
      return true
    }
  })

export const resetPassword = async (key: string, password: string) =>
  withClient(async (client) => {
    const result = await client.query(
      `SELECT reset_password_with_key($1, $2)`,
      [key, password]
    )
    return result.rows.length > 0
  })

export const setPassword = async (username: string, password: string) =>
  withClient(async (client) => {
    const result = await client.query(`SELECT set_password($1, $2)`, [
      username,
      password,
    ])
    return result.rows.length > 0
  })

export const getUserId = async (username: string) =>
  withClient(async (client) => {
    const result = await client.query(
      `SELECT id
       FROM "user"
       WHERE name = $1`,
      [username]
    )
    return result.rows[0]?.id
  })

export default {
  connect,
  closePool,
  withClient,
  middleware,
  checkPassword,
  checkPasswordResetKey,
  resetPassword,
  setPassword,
  getUserId,
}
