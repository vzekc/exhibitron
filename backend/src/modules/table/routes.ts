import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { errorSchema, PermissionDeniedError } from '../common/errors.js'

export async function registerTableRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.post(
    '/:number/claim',
    {
      schema: {
        description: 'Claim a table to associate it with the current user',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            number: {
              type: 'integer',
              description: 'Number of the table to claim',
            },
          },
          required: ['number'],
        },
        response: {
          204: {
            description: 'The table was claimed',
            ...errorSchema,
          },
          403: {
            description: 'The table is already claimed by another user',
            ...errorSchema,
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new PermissionDeniedError('Must be logged in to claim tables')
      }
      const { number } = request.params as { number: string }
      await db.table.claim(+number, request.user)
      await db.em.flush()
      reply.status(204).send()
    },
  )

  app.post(
    '/:number/release',
    {
      schema: {
        description:
          'Release a table so that it can be claimed by another user',
        security: [{ BearerAuth: [] }], // Requires Authorization header
        params: {
          type: 'object',
          properties: {
            number: {
              type: 'integer',
              description: 'Number of the table to release',
            },
          },
          required: ['number'],
        },
        response: {
          204: {
            description: 'The table was released',
            ...errorSchema,
          },
          403: {
            description: 'The table is not claimed by the current user',
            ...errorSchema,
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw new PermissionDeniedError('Must be logged in to claim tables')
      }
      const { number } = request.params as { number: string }
      // Administrator can release any table
      await db.table.release(
        +number,
        request.user.isAdministrator ? undefined : request.user,
      )
      await db.em.flush()
      reply.status(204).send()
    },
  )

  app.post(
    '/:number/assign-to/:userId',
    {
      schema: {
        description: 'Assign a table to a user',
        security: [{ BearerAuth: [] }], // Requires Authorization header
        params: {
          type: 'object',
          properties: {
            number: {
              type: 'integer',
              description: 'Number of the table to assign',
            },
            userId: {
              type: 'string',
              description: 'Username or id of the user',
            },
          },
          required: ['number'],
        },
        response: {
          204: {
            description: 'The table was claimed',
            ...errorSchema,
          },
          403: {
            description: 'Current user does not have administrative rights',
            ...errorSchema,
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user || !request.user.isAdministrator) {
        throw new PermissionDeniedError(
          'Must be logged as administrator to assign tables',
        )
      }
      const { number, userId } = request.params as {
        number: string
        userId: string
      }
      const user = await db.user.lookup(userId)
      await db.table.claim(+number, user)
      await db.em.flush()
      reply.status(204).send()
    },
  )
}
