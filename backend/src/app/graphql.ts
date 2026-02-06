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
import { createRequestLogger } from './logger.js'

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

  // Start a transaction and create context for each request
  app.addHook('onRequest', async (request) => {
    const logger = createRequestLogger(request.requestId)
    logger.debug('Starting request transaction')
    try {
      // Fork the entity manager to get a fresh one for this request
      request.forkedEm = db.em.fork()
      await request.forkedEm.begin()
      logger.debug('Transaction started successfully')
      request.apolloContext = await createContext(request)
      logger.debug('Context created with transaction')
    } catch (error) {
      logger.error({ error }, 'Failed to start transaction')
      throw error
    }
  })

  // Commit or rollback the transaction before sending the response
  app.addHook('onSend', async (request, reply) => {
    const logger = createRequestLogger(request.requestId)
    logger.debug({ statusCode: reply.statusCode }, 'Handling response')
    if (!request.forkedEm) {
      logger.debug('No forked em found, skipping transaction handling')
      return
    }
    try {
      if (reply.statusCode >= 200 && reply.statusCode < 300) {
        logger.debug('Committing transaction')
        try {
          await request.forkedEm.commit()
          logger.debug('Transaction committed successfully')
        } catch (error) {
          logger.error({ error }, 'Failed to commit transaction')
          // Don't throw here, just log the error
        }
      } else {
        logger.debug('Rolling back transaction due to error status')
        try {
          await request.forkedEm.rollback()
          logger.debug('Transaction rolled back successfully')
        } catch (error) {
          logger.error({ error }, 'Failed to rollback transaction')
          // Don't throw here, just log the error
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to handle transaction in onSend')
      // Don't throw here, just log the error
    } finally {
      logger.debug('Destroying context')
      try {
        await destroyContext(request.apolloContext, request.requestId)
        logger.debug('Context destroyed')
      } catch (error) {
        logger.error({ error }, 'Failed to destroy context')
        // Don't throw here, just log the error
      }
    }
  })

  app.addHook('onError', async (request, reply, error) => {
    const logger = createRequestLogger(request.requestId)
    logger.error({ error }, 'Handling error')
    // Rollback on error
    if (request.forkedEm) {
      try {
        logger.debug('Rolling back transaction due to error')
        await request.forkedEm.rollback()
        logger.debug('Transaction rolled back successfully')
      } catch (rollbackError) {
        logger.error({ rollbackError }, 'Failed to rollback transaction')
        // Don't throw here, just log the error
      }
    }
  })

  // shut down the connection when closing the app
  app.addHook('onClose', async () => {
    const logger = createRequestLogger('shutdown')
    logger.debug('Closing database connection')
    await db.orm.close()
    logger.debug('Database connection closed')
  })
}
