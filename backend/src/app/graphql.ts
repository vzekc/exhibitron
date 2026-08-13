import { FastifyInstance, FastifyRequest } from 'fastify'
import { ApolloServer } from '@apollo/server'
import resolvers from '../resolvers.js'
import { readFileSync } from 'node:fs'
import fastifyApollo from '@as-integrations/fastify'
import * as path from 'node:path'
import { Context, createContext, destroyContext, NoExhibitionMatchError } from './context.js'
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

// The static file handler answers under this route: frontend assets, the SPA
// fallback, and every path a vulnerability scanner probes. None of them read
// the database, so they must not hold a pool connection — a scanner flood
// would otherwise starve the requests that do need one.
const STATIC_ROUTE = '/*'

// Routes that upgrade to a websocket and then outlive the request that opened
// them. A serial session lasts as long as somebody is logged in over it —
// hours — and onSend never runs for one, so a transaction started here would
// be held open for all of that, owning a pool connection and blocking vacuum.
// These routes read the database while they are still a request, and carry no
// transaction into the socket.
const UPGRADING_ROUTES = new Set(['/api/serial/agent', '/api/serial/data', '/api/serial/session'])

const needsDatabaseContext = (request: FastifyRequest) => {
  const routeUrl = request.routeOptions?.url
  // An unmatched route is answered by the not-found handler, which serves
  // index.html or a JSON 404.
  return routeUrl !== undefined && routeUrl !== STATIC_ROUTE && !UPGRADING_ROUTES.has(routeUrl)
}

// Settles the request transaction exactly once. Both the normal response path
// and the socket-close backstop call this, and whichever gets there first wins.
const settleTransaction = async (request: FastifyRequest, commit: boolean) => {
  const em = request.forkedEm
  if (!em || request.transactionSettled) return
  request.transactionSettled = true

  const logger = createRequestLogger(request.requestId)
  try {
    // `begin()` may have failed, leaving nothing to settle.
    if (!em.isInTransaction()) return
    if (commit) {
      logger.debug('Committing transaction')
      await em.commit()
      logger.debug('Transaction committed successfully')
    } else {
      logger.debug('Rolling back transaction')
      await em.rollback()
      logger.debug('Transaction rolled back successfully')
    }
  } catch (error) {
    logger.error({ error }, `Failed to ${commit ? 'commit' : 'roll back'} transaction`)
    // A transaction left open still owns its pool connection. Hand it back, or
    // the pool loses a slot for the lifetime of the process and the site stops
    // answering once all slots are gone.
    if (em.isInTransaction()) {
      await em.rollback().catch((rollbackError) => {
        logger.error({ rollbackError }, 'Failed to release the connection of a stuck transaction')
      })
    }
  } finally {
    logger.debug('Destroying context')
    await destroyContext(request.apolloContext, request.requestId).catch((error) => {
      logger.error({ error }, 'Failed to destroy context')
    })
  }
}

export const register = async (app: FastifyInstance) => {
  const server = await createServer()
  const db = await initORM()

  await server.start()

  app.register(fastifyApollo(server), {
    context: async (request) => request.apolloContext,
  })

  // Start a transaction and create context for each request that reads the
  // database
  app.addHook('onRequest', async (request, reply) => {
    if (!needsDatabaseContext(request)) return

    const logger = createRequestLogger(request.requestId)
    logger.debug('Starting request transaction')

    // onSend does not run when a handler never returns — a stalled upstream
    // call, or a client that stops sending its request body mid-way. The
    // response closing is the one event that always arrives, so it backstops
    // the release and keeps an abandoned request from owning a connection
    // forever. It fires once the response has been written or the connection
    // is torn down, both of which mean the request is over and its transaction
    // is safe to settle.
    //
    // The connection can drop while the transaction is still being opened,
    // before there is anything to settle. Settling then has to wait until
    // setup finishes, otherwise the transaction it is about to create outlives
    // the request that owns it.
    let setupFinished = false
    let responseClosed = reply.raw.destroyed
    reply.raw.on('close', () => {
      responseClosed = true
      if (setupFinished) void settleTransaction(request, false)
    })

    try {
      // Fork the entity manager to get a fresh one for this request
      request.forkedEm = db.em.fork()
      await request.forkedEm.begin()
      logger.debug('Transaction started successfully')
      request.apolloContext = await createContext(request)
      logger.debug('Context created with transaction')
    } catch (error) {
      if (error instanceof NoExhibitionMatchError) {
        logger.debug(error.message)
      } else {
        logger.error({ error }, 'Failed to start transaction')
      }
      throw error
    } finally {
      setupFinished = true
    }

    if (responseClosed) {
      logger.debug('Connection closed while the transaction was being opened')
      await settleTransaction(request, false)
    }
  })

  // Commit or rollback the transaction before sending the response
  app.addHook('onSend', async (request, reply) => {
    const logger = createRequestLogger(request.requestId)
    logger.debug({ statusCode: reply.statusCode }, 'Handling response')
    const succeeded = reply.statusCode >= 200 && reply.statusCode < 300
    await settleTransaction(request, succeeded)
  })

  app.addHook('onError', async (request, reply, error) => {
    const logger = createRequestLogger(request.requestId)
    if (error instanceof NoExhibitionMatchError) {
      logger.debug(error.message)
    } else {
      logger.error({ error }, 'Handling error')
    }
    await settleTransaction(request, false)
  })

  // shut down the connection when closing the app
  app.addHook('onClose', async () => {
    const logger = createRequestLogger('shutdown')
    logger.debug('Closing database connection')
    await db.orm.close()
    logger.debug('Database connection closed')
  })
}
