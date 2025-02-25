import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { errorSchema, PermissionDeniedError } from '../common/errors.js'
import { RegistrationStatus, Registration } from './registration.entity.js'
import { wrap } from '@mikro-orm/core'

const registrationBaseSchema = () => ({
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: Object.values(RegistrationStatus),
      examples: Object.values(RegistrationStatus),
    },
    name: { type: 'string', examples: ['John Doe'] },
    email: { type: 'string', examples: ['john@doe.com'] },
    nickname: { type: 'string', examples: ['johnny'] },
    message: { type: 'string', examples: ['Hello!'] },
    notes: { type: 'string', examples: ['In der Lärm-Ecke unterbringen! :)'] },
    data: { type: 'object', additionalProperties: true },
  },
  required: ['name', 'email', 'nickname'],
})

const registrationSchema = () => ({
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
          description: 'Timestamp when the registration was last updated',
        },
        { type: 'null' },
      ],
    },
    ...registrationBaseSchema().properties,
  },
  required: ['id', 'status', 'eventId', 'name', 'email', 'data', 'createdAt'],
})

const serializeRegistration = (registration: Registration) => ({
  ...registration,
  createdAt: registration.createdAt.toISOString(),
  updatedAt: registration.updatedAt.toISOString(),
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
        status: RegistrationStatus.NEW,
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
            description: 'List of registrations',
            type: 'object',
            properties: {
              total: {
                type: 'number',
                description: 'Total number of registrations',
              },
              items: {
                description: 'List of registrations',
                type: 'array',
                items: {
                  description: 'Registration data',
                  ...registrationSchema(),
                },
              },
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
      return {
        total: registrations.length,
        items: registrations.map(serializeRegistration),
      }
    },
  )

  app.get(
    '/:eventId/:registrationId',
    {
      schema: {
        description: 'Update a registration',
        security: [{ BearerAuth: [] }], // Requires Authorization header
        params: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'ID of the event',
              examples: ['cc2025'],
            },
            registrationId: {
              type: 'number',
              description: 'ID of the registration to update',
              examples: [1],
            },
          },
          required: ['eventId', 'registrationId'],
        },
        response: {
          200: {
            description: 'Registration data',
            ...registrationSchema(),
          },
          403: {
            description: 'Current user does not have administrative rights',
            ...errorSchema,
          },
          404: {
            description: 'Registration not found',
            ...errorSchema,
          },
        },
      },
    },
    async (request) => {
      if (!request.user || !request.user.isAdministrator) {
        throw new PermissionDeniedError(
          'Must be logged as administrator to retrieve registrations',
        )
      }
      const { registrationId } = request.params as { registrationId: number }
      return serializeRegistration(
        await db.registration.findOneOrFail({ id: registrationId }),
      )
    },
  )

  app.patch(
    '/:eventId/:registrationId',
    {
      schema: {
        description: 'Update a registration',
        security: [{ BearerAuth: [] }], // Requires Authorization header
        params: {
          type: 'object',
          properties: {
            eventId: {
              type: 'string',
              description: 'ID of the event',
              examples: ['cc2025'],
            },
            registrationId: {
              type: 'number',
              description: 'ID of the registration to update',
              examples: [1],
            },
          },
          required: ['eventId', 'registrationId'],
        },
        body: {
          description: 'Updated registration data',
          ...registrationBaseSchema(),
          required: [],
        },
        response: {
          204: {
            description: 'The registration was updated',
            ...registrationSchema(),
          },
          403: {
            description: 'Current user does not have administrative rights',
            ...errorSchema,
          },
          404: {
            description: 'Registration not found',
            ...errorSchema,
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user || !request.user.isAdministrator) {
        throw new PermissionDeniedError(
          'Must be logged as administrator to update registrations',
        )
      }
      const { registrationId } = request.params as { registrationId: number }
      const updates = request.body as Partial<Registration>
      const registration = await db.registration.findOneOrFail({
        id: registrationId,
      })
      wrap(registration).assign(updates)
      await db.em.flush()
      reply.status(204).send()
    },
  )
}
