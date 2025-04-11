import { FastifyInstance } from 'fastify'
import { ApolloServer } from '@apollo/server'
import resolvers from '../resolvers.js'
import { readFileSync } from 'node:fs'
import fastifyApollo from '@as-integrations/fastify'
import * as path from 'node:path'
import { Context, createContext, destroyContext } from './context.js'
import { fileURLToPath } from 'node:url'
import { initORM } from '../db.js'
import { mutationLoggerPlugin } from '../plugins/mutationLogger.js'
import { errorHandlerPlugin } from '../plugins/errorHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const typeDefs = readFileSync(path.join(__dirname, '../generated/combined-schema.graphql'), {
  encoding: 'utf-8',
})

const createServer = async () =>
  new ApolloServer<Context>({
    typeDefs,
    resolvers,
    plugins: [mutationLoggerPlugin(), errorHandlerPlugin()],
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'production',
  })

export const register = async (app: FastifyInstance) => {
  const server = await createServer()
  const db = await initORM()

  await server.start()

  app.register(fastifyApollo(server), {
    context: async (request) => request.apolloContext,
  })

  // Start a transaction for each request
  app.addHook('onRequest', async () => {
    const db = await initORM()
    await db.em.begin()
  })

  app.addHook('onRequest', async (request) => {
    request.apolloContext = await createContext(request)
  })

  // Commit or rollback the transaction
  app.addHook('onResponse', async (request, reply) => {
    try {
      if (reply.statusCode >= 200 && reply.statusCode < 300) {
        await request.apolloContext.db.em.commit()
      } else {
        await request.apolloContext.db.em.rollback()
      }
    } finally {
      await destroyContext(request.apolloContext)
    }
  })

  app.addHook('onError', async (request) => {
    // Rollback on error
    if (request.apolloContext?.db) {
      await request.apolloContext.db.em.rollback()
    }
  })

  // shut down the connection when closing the app
  app.addHook('onClose', async () => {
    await db.orm.close()
  })
}
