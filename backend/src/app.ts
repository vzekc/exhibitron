import { fastify, FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
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
import { startCleanupScheduler } from './app/cleanup.js'

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
  // Override log level for test environment unless explicitly set
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
  if (isTest && logLevel === 'INFO') {
    logLevel = process.env.TEST_LOG_LEVEL || 'FATAL'
  }
  const app = fastify({
    bodyLimit: 20 * 1024 * 1024, // 20 MB
    trustProxy: true,
    disableRequestLogging: true, // Disable built-in request logging
    logger: {
      level: logLevel.toLowerCase(),
      transport: {
        targets: [
          // Console output - pretty in development, systemd-friendly in production
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  target: 'pino/file',
                  level: 'info',
                  options: { destination: 1 }, // stdout
                },
              ]
            : [
                {
                  target: 'pino-pretty',
                  level: 'info',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore:
                      'pid,hostname,method,url,statusCode,responseTime,ip,user,userAgent,referer,requestId',
                    messageFormat: '{msg}',
                  },
                },
              ]),
          // JSON file output for all structured logging
          {
            target: 'pino/file',
            level: 'info',
            options: {
              destination: 'logs/app.json',
              mkdir: true,
            },
          },
        ],
      },
    },
    ajv: {
      customOptions: {
        removeAdditional: false,
        useDefaults: true,
      },
    },
  })

  // Register multipart plugin for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  })
  await app.register(fastifyFormbody)
  await app.register(fastifyAccepts)

  // Add request ID middleware
  app.addHook('onRequest', async (request, reply) => {
    // Generate a unique request ID if not already present
    const requestId =
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-correlation-id'] as string) ||
      randomUUID()

    // Store the request ID on the request object for use throughout the request lifecycle
    request.requestId = requestId

    // Set the request ID in response headers for client correlation
    reply.header('x-request-id', requestId)
  })

  await oidc.register(app)
  await orm.register(app, !!migrate)
  await session.register(app)
  await graphql.register(app)

  registerErrorHandler(app)

  // Add custom access logging - single line per request
  app.addHook('onResponse', async (request, reply) => {
    const { method, url, ip, headers } = request
    const { statusCode } = reply
    const responseTime = reply.getResponseTime()
    const responseTimeFormatted = `${responseTime.toFixed(1)}ms`
    const userAgent = headers['user-agent'] || '-'
    const referer = headers.referer || '-'
    const userDisplayName =
      request.user?.nickname?.replace(/\s+/g, '+') || request.user?.email || '-'

    // Log in a format similar to Apache/Nginx access logs with user info and request ID
    app.log.info(
      {
        requestId: request.requestId,
        method,
        url,
        statusCode,
        responseTime: responseTimeFormatted,
        ip,
        user: userDisplayName,
        userAgent,
        referer,
      },
      `${request.requestId} ${method} ${url} ${statusCode} ${responseTimeFormatted} ${ip} ${userDisplayName} ${referer}`,
    )
  })

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

  // Start cleanup scheduler in production
  if (process.env.NODE_ENV === 'production') {
    startCleanupScheduler()
  }

  return { app, url }
}
