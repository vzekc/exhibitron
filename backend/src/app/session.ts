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
    if (request.session.userId) {
      const user = await db.user.findOne({
        id: request.session.userId,
      })
      if (user) {
        request.user = user
        app.log.debug(`User: ${request.user.email} set from session`)
      } else {
        app.log.warn(
          `User with ID ${request.session.userId} not found, invalid session ignored`,
        )
      }
    }
  })

  app.post(
    '/api/auth/logout',
    {
      schema: {
        description: 'Log out the current user and destroy the session',
        response: {
          204: {
            description:
              'The user was logged out and the session was destroyed',
            type: 'null',
          },
        },
      },
    },
    async (request, reply) => {
      if (request.session) {
        await request.session.destroy()
      }
      reply
        .setCookie('sessionid', '', { path: '/', expires: new Date(0) })
        .status(204)
        .send()
    },
  )
}
