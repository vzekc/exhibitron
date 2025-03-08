import { FastifyInstance } from 'fastify'
import { ApolloServer } from '@apollo/server'
import resolvers from '../resolvers.js'
import { readFileSync } from 'node:fs'
import fastifyApollo from '@as-integrations/fastify'
import * as path from 'node:path'
import { createContext, destroyContext } from './context.js'
import { RequestContext } from '@mikro-orm/core'
import { fileURLToPath } from 'node:url'
import { initORM } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const typeDefs = readFileSync(path.join(__dirname, '../schema.graphql'), {
  encoding: 'utf-8',
})

const createServer = async () =>
  new ApolloServer({
    typeDefs,
    resolvers,
  })

export const register = async (app: FastifyInstance) => {
  const server = await createServer()
  const db = await initORM()

  await server.start()

  app.register(fastifyApollo(server), {
    context: async (request) => request.apolloContext,
  })

  app.addHook('onRequest', (_request, _reply, done) => {
    RequestContext.create(db.em, done)
  })

  app.addHook('onRequest', async (request, reply) => {
    request.apolloContext = await createContext(request, reply)
  })

  app.addHook('onResponse', async (request) => {
    await destroyContext(request.apolloContext)
  })

  // shut down the connection when closing the app
  app.addHook('onClose', async () => {
    await db.orm.close()
  })
}

export const createTestServer = async () => {
  const server = await createServer()
  await server.start()
  return server
}
