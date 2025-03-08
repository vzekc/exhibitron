import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { AuthError, errorSchema } from '../common/errors.js'

export async function registerUserRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.post(
    '/login',
    {
      schema: {
        description: 'Log in',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', examples: ['donald@example.com'] },
            password: { type: 'string', examples: ['geheim'] },
          },
          additionalProperties: false,
        },
        response: {
          204: {
            description: 'The user was logged in',
            type: 'null',
          },
          400: {
            description: 'Invalid input parameter(s).',
            ...errorSchema,
          },
          401: {
            description: 'Invalid email address or password',
            ...errorSchema,
          },
        },
      },
    },
    async (request) => {
      const { email, password } = request.body as {
        email: string
        password: string
      }
      const user = await db.user.login(email, password)
      if (!user) {
        throw new AuthError('Invalid email address or password')
      }
      request.session.userId = user.id
    },
  )
}
