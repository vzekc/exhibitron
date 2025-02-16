import 'dotenv/config'
import fastifySession from '@fastify/session'
import { FastifyInstance } from 'fastify'

export const register = (app: FastifyInstance) => {
  app.register(fastifySession, {
    secret: process.env.SESSION_SECRET || 'dnewndqwewjdnqw43',
  })
}
