import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { errorSchema, PermissionDeniedError } from '../common/errors.js'
import { exhibitorSchema } from '../exhibitor/routes.js'
import { wrap } from '@mikro-orm/core'

export async function registerTableRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.get(
    '/',
    {
      schema: {
        description: 'Retrieve the status of a table',
        params: {
          type: 'object',
          properties: {
            number: {
              type: 'integer',
              description: 'Number of the table to inspect',
            },
          },
          required: ['number'],
        },
        response: {
          200: {
            description: 'Owner of the table',
            properties: {
              exhibitor: {
                anyOf: [exhibitorSchema(), { type: 'null' }],
              },
            },
          },
          404: errorSchema,
        },
      },
    },
    async (request) => {
      const { number } = request.params as { number: string }
      const table = await db.table.findOneOrFail(
        { id: +number },
        { populate: ['exhibitor'] },
      )
      if (table.exhibitor) {
        await db.em.populate(table.exhibitor, ['user'])
      }
      console.log('table', wrap(table).toJSON())
      return wrap(table).toJSON()
    },
  )

  app.get(
    '/:number',
    {
      schema: {
        description: 'Retrieve the status of a table',
        params: {
          type: 'object',
          properties: {
            number: {
              type: 'integer',
              description: 'Number of the table to inspect',
            },
          },
          required: ['number'],
        },
        response: {
          200: {
            description: 'Owner of the table',
            properties: {
              exhibitor: {
                anyOf: [exhibitorSchema(), { type: 'null' }],
              },
            },
          },
          404: errorSchema,
        },
      },
    },
    async (request) => {
      const { number } = request.params as { number: string }
      const table = await db.table.findOneOrFail(
        { id: +number },
        { populate: ['exhibitor'] },
      )
      if (table.exhibitor) {
        await db.em.populate(table.exhibitor, ['user'])
      }
      console.log('table', wrap(table).toJSON())
      return wrap(table).toJSON()
    },
  )

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
            type: 'null',
          },
          403: {
            description: 'The table is already claimed by another user',
            ...errorSchema,
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.exhibitor) {
        throw new PermissionDeniedError('Must be logged in to claim tables')
      }
      const { number } = request.params as { number: string }
      await db.table.claim(+number, request.exhibitor)
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
            type: 'null',
          },
          403: {
            description: 'The table is not claimed by the current user',
            ...errorSchema,
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.exhibitor || !request.user) {
        throw new PermissionDeniedError('Must be logged in to claim tables')
      }
      const { number } = request.params as { number: string }
      // Administrator can release any table
      await db.table.release(
        +number,
        request.user.isAdministrator ? undefined : request.exhibitor,
      )
      await db.em.flush()
      reply.status(204).send()
    },
  )

  app.post(
    '/:number/assignTo/:userId',
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
            type: 'null',
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
      const user = await db.user.lookupOrFail(userId)
      const exhibitor = await db.exhibitor.findOneOrFail({
        user,
        exhibition: request.exhibition,
      })
      await db.table.claim(+number, exhibitor)
      await db.em.flush()
      reply.status(204).send()
    },
  )
}
