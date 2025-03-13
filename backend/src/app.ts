import { fastify, FastifyInstance } from 'fastify'
import * as staticFiles from './app/static.js'
import * as oidc from './app/oidc.js'
import * as orm from './app/orm.js'
import * as session from './app/session.js'
import * as graphql from './app/graphql.js'
import { errorHandler } from './modules/common/errors.js'
import { registerUserRoutes } from './modules/user/routes.js'

const registerErrorHandler = (app: FastifyInstance) => {
  // register global error handler to process 404 errors from `findOneOrFail` calls
  app.setErrorHandler(errorHandler.bind(null, app))
}

export async function createApp({
  migrate,
  logLevel = 'INFO',
}: {
  migrate?: boolean
  logLevel?: string
} = {}) {
  const app = fastify({
    bodyLimit: 20 * 1024 * 1024, // 20 MB
    trustProxy: true,
    logger: {
      level: logLevel,
      transport: {
        target: 'pino-pretty', // Pretty-print logs (for development)
        options: {
          colorize: true,
        },
      },
    },
    ajv: {
      customOptions: {
        removeAdditional: false,
        useDefaults: true,
      },
    },
  })

  await oidc.register(app)
  await orm.register(app, !!migrate)
  await session.register(app)
  await graphql.register(app)

  registerErrorHandler(app)

  staticFiles.register(app)

  await registerUserRoutes(app)

  return app
}

export async function bootstrap({
  port,
  migrate,
  logLevel = 'INFO',
}: {
  port?: number
  migrate?: boolean
  logLevel?: string
} = {}) {
  const app = await createApp({ migrate, logLevel })

  const url = await app.listen({ port })

  return { app, url }
}
