import { NotFoundError } from '@mikro-orm/core'
import { fastify, FastifyInstance } from 'fastify'
import * as swagger from './app/swagger.js'
import * as staticFiles from './app/static.js'
import * as oidc from './app/oidc.js'
import * as orm from './app/orm.js'
import * as jwt from './app/jwt.js'
import { registerArticleRoutes } from './modules/article/routes.js'
import { registerUserRoutes } from './modules/user/routes.js'
import { AuthError } from './modules/common/utils.js'

const registerErrorHandler = (app: FastifyInstance) => {
  // register global error handler to process 404 errors from `findOneOrFail` calls
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AuthError) {
      return reply.status(401).send({ error: error.message })
    }

    if (error instanceof NotFoundError) {
      return reply.status(404).send({ error: error.message })
    }

    app.log.error(error)
    reply.status(500).send({ error: error.message })
  })
}

export async function bootstrap({ port, migrate }: { port?: number, migrate?: boolean } = {}) {
  const app = fastify()

  oidc.register(app)
  staticFiles.register(app)
  await swagger.register(app)
  await orm.register(app, !!migrate)
  await jwt.register(app)

  registerErrorHandler(app)

  // register routes here
  app.register(registerArticleRoutes, { prefix: 'article' })
  app.register(registerUserRoutes, { prefix: 'user' })

  const url = await app.listen({ port })

  return { app, url }
}
