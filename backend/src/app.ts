import Fastify, { FastifyInstance } from 'fastify'
import * as staticFiles from './app/static.js'
import * as oidc from './app/oidc.js'
import * as orm from './app/orm.js'
import * as session from './app/session.js'
import * as graphql from './app/graphql.js'
import fastifyMultipart from '@fastify/multipart'
import fastifyAccepts from '@fastify/accepts'
import fastifyFormbody from '@fastify/formbody' // Add this import
import { errorHandler } from './modules/common/errors.js'
import { registerUserRoutes } from './modules/user/routes.js'
import { registerImageRoutes } from './modules/image/routes.js'
import { registerExhibitImageRoutes } from './modules/exhibit/routes.js'
import { registerServerSideHtmlRoutes } from './modules/serverSideHtml/routes.js'
import { registerScheduleRoutes } from './modules/schedule/routes.js'
import { MikroORM } from '@mikro-orm/core'
import config from './mikro-orm.config.js'

const registerErrorHandler = (app: FastifyInstance) => {
  // register global error handler to process 404 errors from `findOneOrFail` calls
  app.setErrorHandler(errorHandler.bind(null, app))
}

export async function createApp({
  migrate = true,
  logLevel = 'info',
  orm: mikroOrm,
}: {
  migrate?: boolean
  logLevel?: string
  orm?: MikroORM
} = {}) {
  const app = Fastify({
    bodyLimit: 20 * 1024 * 1024, // 20 MB
    trustProxy: true,
    logger: {
      level: logLevel,
      transport: {
        target: 'pino-pretty',
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

  // Initialize MikroORM
  const mikroORM = mikroOrm || (await MikroORM.init(config))
  app.decorate('orm', mikroORM)

  // Register plugins
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  })
  await app.register(fastifyFormbody)
  await app.register(fastifyAccepts)

  await oidc.register(app)
  await orm.register(app, !!migrate)
  await session.register(app, mikroORM)
  await graphql.register(app)

  registerErrorHandler(app)

  staticFiles.register(app)

  await registerServerSideHtmlRoutes(app)
  await registerUserRoutes(app)
  await registerImageRoutes(app)
  await registerExhibitImageRoutes(app)
  await registerScheduleRoutes(app)

  return app
}

export async function bootstrap({
  host,
  port,
  migrate,
  logLevel = 'INFO',
}: {
  host?: string
  port?: number
  migrate?: boolean
  logLevel?: string
} = {}) {
  const app = await createApp({ migrate, logLevel })

  const url = await app.listen({ host, port })

  return { app, url }
}
