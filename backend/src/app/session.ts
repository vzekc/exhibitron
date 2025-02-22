import 'dotenv/config'
import fastifySession from '@fastify/session'
import { FastifyInstance } from 'fastify'
import { SessionStore } from '../modules/session/session-store.js'
import { initORM } from '../db.js'

export const register = async (app: FastifyInstance) => {
  const db = await initORM()

  const getSessionSecret = () => {
    const secret = process.env.SESSION_SECRET
    if (secret) {
      return secret
    }
    app.log.warn(
      'SESSION_SECRET environment variable not set, returning preconfigured secret',
    )
    return 'oi31p2oi312po3i12p3n21be jn)@!(#d432bhjdbhbehbHJKHJG'
  }

  app.register(fastifySession, {
    store: new SessionStore(db.em),
    secret: getSessionSecret(),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
    saveUninitialized: false,
  })

  app.addHook('onRequest', async (request) => {
    if (request.session.user) {
      request.user = await db.user.findOneOrFail({
        username: request.session.user.username,
      })
      app.log.debug(`User: ${request.user.username} set from session`)
    }
  })
}
