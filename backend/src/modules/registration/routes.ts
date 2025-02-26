import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { errorSchema } from '../common/errors.js'
import { RegistrationStatus, Registration } from './registration.entity.js'
import { wrap } from '@mikro-orm/core'
import { isAdmin } from '../middleware/auth.js'

const registrationBaseSchema = () => ({
  type: 'object',
  properties: {
    name: { type: 'string', examples: ['John Doe'] },
    email: { type: 'string', examples: ['john@doe.com'] },
    nickname: { type: 'string', examples: ['johnny'] },
    topic: { type: 'string', examples: ['SID Inferno'] },
    message: { type: 'string', examples: ['Hello!'] },
    notes: { type: 'string', examples: ['In der Lärm-Ecke unterbringen! :)'] },
    data: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
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
    status: {
      type: 'string',
      enum: Object.values(RegistrationStatus),
      examples: Object.values(RegistrationStatus),
    },
    ...registrationBaseSchema().properties,
  },
  required: ['id', 'status', 'eventId', 'name', 'email', 'data', 'createdAt'],
})

const registrationUpdateParamsSchema = {
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
}

const registrationUpdateResponseSchema = {
  204: {
    description: 'The registration was updated',
    type: 'null',
  },
  403: {
    description: 'Current user does not have administrative rights',
    ...errorSchema,
  },
  404: {
    description: 'Registration not found',
    ...errorSchema,
  },
}

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
          200: {
            description: 'The registration was created',
            ...registrationSchema(),
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
      const { name, email, nickname, topic, message, data } = request.body as {
        name: string
        email: string
        nickname: string
        topic: string
        message?: string
        data: { [key: string]: string | number | boolean }
      }
      if (await db.registration.findOne({ email })) {
        return reply.status(409).send({
          error: 'The email address is already registered',
        })
      }

      const registration = await db.registration.register({
        status: RegistrationStatus.NEW,
        eventId,
        name,
        email,
        nickname,
        topic,
        message,
        data,
      })
      await db.em.flush()
      return serializeRegistration(registration)
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
      preHandler: isAdmin(
        'Must be logged as administrator to retrieve registrations',
      ),
    },
    async () => {
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
      preHandler: isAdmin(
        'Must be logged as administrator to retrieve registrations',
      ),
    },
    async (request) => {
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
        params: registrationUpdateParamsSchema,
        body: {
          description: 'Updated registration data',
          ...registrationBaseSchema(),
          required: [],
        },
        response: registrationUpdateResponseSchema,
      },
      preHandler: isAdmin(
        'Must be logged as administrator to update registrations',
      ),
    },
    async (request, reply) => {
      const { registrationId } = request.params as { registrationId: number }
      const registration = await db.registration.findOneOrFail({
        id: registrationId,
      })
      const updates = request.body as Partial<Registration>
      wrap(registration).assign(updates)
      await db.em.flush()
      return reply.status(204).send()
    },
  )

  app.put(
    '/:eventId/:registrationId/approve',
    {
      schema: {
        description: 'Approve a registration',
        security: [{ BearerAuth: [] }], // Requires Authorization header
        params: registrationUpdateParamsSchema,
        response: registrationUpdateResponseSchema,
      },
      preHandler: isAdmin(
        'Must be logged as administrator to approve registrations',
      ),
    },
    async (request, reply) => {
      const { registrationId } = request.params as { registrationId: number }
      const registration = await db.registration.findOneOrFail({
        id: registrationId,
      })
      await db.registration.approve(registration)
      return reply.status(204).send()
    },
  )

  app.put(
    '/:eventId/:registrationId/reject',
    {
      schema: {
        description: 'Reject a registration',
        security: [{ BearerAuth: [] }], // Requires Authorization header
        params: registrationUpdateParamsSchema,
        response: registrationUpdateResponseSchema,
      },
      preHandler: isAdmin(
        'Must be logged as administrator to reject registrations',
      ),
    },
    async (request, reply) => {
      const { registrationId } = request.params as { registrationId: number }
      const registration = await db.registration.findOneOrFail({
        id: registrationId,
      })
      await db.registration.reject(registration)
      return reply.status(204).send()
    },
  )

  app.delete(
    '/:eventId/:registrationId',
    {
      schema: {
        description: 'Delete a registration',
        security: [{ BearerAuth: [] }], // Requires Authorization header
        params: registrationUpdateParamsSchema,
        response: {
          ...registrationUpdateResponseSchema,
          409: {
            description: 'Cannot delete an approved registration',
            ...errorSchema,
          },
        },
      },
      preHandler: isAdmin(
        'Must be logged as administrator to delete registrations',
      ),
    },
    async (request, reply) => {
      const { registrationId } = request.params as { registrationId: number }
      const registration = await db.registration.findOneOrFail({
        id: registrationId,
      })
      // fixme: business logic here?
      if (registration.status === RegistrationStatus.APPROVED) {
        return reply
          .status(409)
          .send({ error: 'Cannot delete an approved registration' })
      }
      await db.em.removeAndFlush(registration)
      return reply.status(204).send()
    },
  )
}
