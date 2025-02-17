import { NotFoundError } from '@mikro-orm/core'
import { fastify, FastifyInstance } from 'fastify'
//import responseValidator from '@fastify/response-validation'
import * as swagger from './app/swagger.js'
import * as staticFiles from './app/static.js'
import * as oidc from './app/oidc.js'
import * as orm from './app/orm.js'
import * as jwt from './app/jwt.js'
import * as session from './app/session.js'
import { registerUserRoutes } from './modules/user/routes.js'
import {
  AuthError,
  BadRequestError,
  PermissionDeniedError,
} from './modules/common/utils.js'
import { registerExhibitionRoutes } from './modules/exhibition/routes.js'
import { ZodError } from 'zod'
import { registerTableRoutes } from './modules/table/routes.js'

const registerErrorHandler = (app: FastifyInstance) => {
  // register global error handler to process 404 errors from `findOneOrFail` calls
  app.setErrorHandler((error, _request, reply) => {
    if (error.validation) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
        validation: error.validation,
      })
    }

    if (error instanceof AuthError) {
      return reply.status(401).send({ error: error.message })
    }

    if (error instanceof PermissionDeniedError) {
      return reply.status(403).send({ error: error.message })
    }

    if (error instanceof NotFoundError) {
      return reply.status(404).send({ error: error.message })
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({ error: error.message })
    }

    if (error instanceof BadRequestError) {
      return reply.status(404).send({ error: error.message })
    }

    app.log.error(error)
    reply.status(500).send({ error: error.message })
  })
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
  const app = fastify({
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
  /*
  await app.register(responseValidator, {
    ajv: {
      coerceTypes: true
    }
  })
 */

  oidc.register(app)
  staticFiles.register(app)
  await swagger.register(app)
  await orm.register(app, !!migrate)
  await jwt.register(app)
  session.register(app)

  registerErrorHandler(app)

  // register routes here
  app.register(registerUserRoutes, { prefix: 'user' })
  app.register(registerExhibitionRoutes, { prefix: 'exhibition' })
  app.register(registerTableRoutes, { prefix: 'table' })

  const url = await app.listen({ port })

  return { app, url }
}
