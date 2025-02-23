import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { errorSchema, PermissionDeniedError } from '../common/errors.js'

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
    '/:eventId',
    {
      schema: {
        description: 'Create a registration',
        params: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'ID of the event to register for',
              examples: ['cc2025'],
            },
          },
          required: ['eventId'],
        },
        body: {
          description:
            'Registration data, the data field contains event specific properties',
          ...registrationBaseSchema(),
        },
        response: {
          204: {
            description: 'The registration was created',
            type: 'null',
          },
          409: {
            description:
              'The email address is already registered for the given event',
            ...errorSchema,
          },
        },
      },
    },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string }
      const { name, email, nickname, message, data } = request.body as {
        name: string
        email: string
        nickname: string
        message?: string
        data: { [key: string]: string | number | boolean }
      }
      if (await db.registration.findOne({ email })) {
        return reply.status(409).send({
          error: 'The email address is already registered',
        })
      }

      await db.registration.register({
        eventId,
        name,
        email,
        nickname,
        message,
        data,
      })
      await db.em.flush()
      reply.status(204).send()
    },
  )

  app.get(
    '/:eventId',
    {
      schema: {
        description: 'Retrieve all registrations',
        params: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'ID of the event to register for',
              examples: ['cc2025'],
            },
          },
          required: ['eventId'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'number',
                  description: 'Unique ID of the registration',
                },
                createdAt: {
                  type: 'string',
                  description: 'Timestamp when the registration was created',
                },
                updatedAt: {
                  oneOf: [
                    {
                      type: 'string',
                      description:
                        'Timestamp when the registration was last updated',
                    },
                    { type: 'null' },
                  ],
                },
                ...registrationBaseSchema().properties,
              },
              required: ['id', 'eventId', 'name', 'email', 'data', 'createdAt'],
            },
          },
          403: {
            description: 'Current user does not have administrative rights',
            ...errorSchema,
          },
        },
      },
    },
    async (request) => {
      if (!request.user || !request.user.isAdministrator) {
        throw new PermissionDeniedError(
          'Must be logged as administrator retrieve registrations',
        )
      }
      const registrations = await db.registration.findAll()
      return registrations.map((registration) => ({
        ...registration,
        createdAt: registration.createdAt.toISOString(),
        updatedAt: registration.updatedAt.toISOString(),
      }))
    },
  )
}
