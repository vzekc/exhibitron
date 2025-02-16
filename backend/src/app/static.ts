import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import fastifyStatic from '@fastify/static'
import { FastifyInstance } from 'fastify'

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const register = (app: FastifyInstance) => {
  app.register(fastifyStatic, {
    root: path.join(__dirname, '../../../frontend/dist'),
  })
}
