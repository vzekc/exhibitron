import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'

const registrationBaseSchema = () => ({
  type: 'object',
  properties: {
    name: { type: 'string', examples: ['John Doe'] },
    email: { type: 'string', examples: ['john@doe.com'] },
    nickname: { type: 'string', examples: ['johnny'] },
    message: { type: 'string', examples: ['Hello!'] },
    data: { type: 'object', additionalProperties: true },
  },
  required: ['name', 'email', 'nickname'],
})

export async function registerRegistrationRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.post(
    '/',
    {
      schema: {
        description: 'Create a registration',
        body: {
          description:
            'Registration data, note that other properties are' +
            ' allowed and stored in the registration data field',
          ...registrationBaseSchema(),
        },
        response: {
          204: {
            description: 'The registration was created',
            type: 'null',
          },
        },
      },
    },
    async (request, reply) => {
      const { name, email, nickname, message, data } = request.body as {
        name: string
        email: string
        nickname: string
        message?: string
        data: { [key: string]: string | number | boolean }
      }
      const registration = db.registration.create({
        name,
        email,
        nickname,
        message,
        data,
      })
      db.em.persist(registration)
      await db.em.flush()
      reply.status(204).send()
    },
  )
}
