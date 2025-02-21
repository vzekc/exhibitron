import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyStatic from '@fastify/static'
import { FastifyInstance } from 'fastify'

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const register = (app: FastifyInstance) => {
  const distDir = path.join(__dirname, '../../../frontend/dist')

  app.register(fastifyStatic, {
    root: distDir,
  })

  app.setNotFoundHandler((request, reply) => {
    if (
      !request.url.match(/^\/(api|auth)\//) &&
      request.headers.accept?.includes('text/html')
    ) {
      reply.sendFile('index.html')
    } else {
      reply.code(404).send({ error: 'Not Found' })
    }
  })
}
