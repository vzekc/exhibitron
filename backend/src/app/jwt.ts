import { FastifyInstance } from 'fastify'
import fastifyJWT from '@fastify/jwt'
import { initORM } from '../db.js'

export const register = async (app: FastifyInstance) => {
  const db = await initORM()

  // register JWT plugin
  app.register(fastifyJWT, {
    secret: process.env.JWT_SECRET ?? '12345678' // fallback for testing
  })

  // register auth hook after the ORM one to use the context
  app.addHook('onRequest', async (request) => {
    try {
      const ret = await request.jwtVerify<{ id: number }>()
      request.user = await db.user.findOneOrFail(ret.id)
    } catch (e) {
      app.log.error(e)
      // ignore token errors, we validate the request.user exists only where needed
    }
  })
}
