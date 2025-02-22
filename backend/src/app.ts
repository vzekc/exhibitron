import { fastify, FastifyInstance } from 'fastify'
import responseValidator from '@fastify/response-validation'
import * as swagger from './app/swagger.js'
import * as staticFiles from './app/static.js'
import * as oidc from './app/oidc.js'
import * as orm from './app/orm.js'
import * as jwt from './app/jwt.js'
import * as session from './app/session.js'
import { registerUserRoutes } from './modules/user/routes.js'
import { registerExhibitRoutes } from './modules/exhibit/routes.js'
import { registerTableRoutes } from './modules/table/routes.js'
import { errorHandler } from './modules/common/errors.js'

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

  await app.register(responseValidator, {
    ajv: {
      coerceTypes: true,
    },
  })
  await oidc.register(app)
  await swagger.register(app)
  await orm.register(app, !!migrate)
  await jwt.register(app)
  session.register(app)

  registerErrorHandler(app)

  // register routes here
  app.register(registerUserRoutes, { prefix: '/api/user' })
  app.register(registerExhibitRoutes, { prefix: '/api/exhibit' })
  app.register(registerTableRoutes, { prefix: '/api/table' })

  staticFiles.register(app)

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
