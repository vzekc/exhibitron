import 'dotenv/config'
import fastifySession from '@fastify/session'
import { FastifyInstance } from 'fastify'

export const register = (app: FastifyInstance) => {
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
    secret: getSessionSecret(),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
    saveUninitialized: false,
  })
}
