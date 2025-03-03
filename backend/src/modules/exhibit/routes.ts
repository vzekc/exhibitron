import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { wrap } from '@mikro-orm/core'
import { Table } from '../table/table.entity.js'
import { errorSchema, PermissionDeniedError } from '../common/errors.js'
import { userBaseSchema } from '../user/routes.js'

export const exhibitBaseSchema = () => ({
  type: 'object',
  properties: {
    title: { type: 'string', examples: ['My first computer'] },
    text: {
      type: 'string',
      examples: [
        'This is the first computer I owned, a Sinclair ZX81.  It could not do a lot, but it shaped the rest of my life.',
      ],
    },
    table: { type: 'number', examples: [23] },
  },
  additionalProperties: false,
})

export const existingExhibitSchema = () => ({
  ...exhibitBaseSchema(),
  properties: {
    id: { type: 'number' },
    ...exhibitBaseSchema().properties,
    exhibitor: {
      ...userBaseSchema(),
      properties: {
        ...userBaseSchema().properties,
        id: { type: 'number', examples: [53] },
        exhibitorId: { type: 'number', examples: [2] },
      },
    },
  },
  required: ['title', 'id', 'exhibitor'],
})

export async function registerExhibitRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.post(
    '/',
    {
      schema: {
        description: 'Create exhibit',
        body: {
          ...exhibitBaseSchema(),
          required: ['title'],
        },
        response: {
          200: {
            description: 'The exhibit was created',
            ...existingExhibitSchema(),
          },
          403: {
            description: 'Not logged in',
            ...errorSchema,
          },
        },
      },
    },
    async (request) => {
      if (!request.exhibitor) {
        throw new PermissionDeniedError(
          'You must be logged in to create exhibits',
        )
      }
      const props = request.body as {
        title: string
        text?: string
        table?: number
      }
      let table: Table | undefined = undefined
      if (props.table) {
        table = await db.table.claim(props.table, request.exhibitor)
        delete props.table
      }
      const exhibit = db.exhibit.create({
        ...props,
        exhibition: request.exhibition,
        exhibitor: request.exhibitor,
        table,
      })
      await db.em.flush()
      return {
        ...exhibit,
        table: exhibit?.table?.id,
      }
    },
  )

  app.get(
    '/:id',
    {
      schema: {
        description: 'Retrieve a single exhibit',
        params: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'The exhibit was found',
            ...existingExhibitSchema(),
          },
          404: {
            description: 'The exhibit does not exist',
            ...errorSchema,
          },
        },
      },
    },
    async (request) => {
      const params = request.params as { id: string }
      const exhibit = await db.exhibit.findOneOrFail(+params.id, {
        populate: ['exhibitor', 'table'],
        disableIdentityMap: true,
      })
      return {
        ...exhibit,
        table: exhibit.table?.id,
      }
    },
  )

  app.patch(
    '/:id',
    {
      schema: {
        description: 'Update the properties of an exhibit',
        params: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            text: { type: 'string' },
            table: { type: 'number' },
          },
          additionalProperties: false,
        },
        response: {
          204: {
            description: 'The exhibit was updated',
            type: 'null',
          },
          403: {
            description: 'The current user does not own this exhibit',
            ...errorSchema,
          },
        },
      },
    },
    async (request) => {
      const params = request.params as { id: string }
      const exhibit = await db.exhibit.findOneOrFail(+params.id, {
        populate: ['exhibitor', 'table'],
      })
      if (exhibit.exhibitor !== request.exhibitor) {
        throw new PermissionDeniedError(
          'You are not authorized to change this exhibit',
        )
      }
      const dto = request.body as {
        title?: string
        description?: string
        table?: number
      }
      if ('table' in dto && dto.table) {
        exhibit.table = await db.table.claim(dto.table, request.exhibitor)
        delete dto.table
      }
      wrap(exhibit).assign(dto)
      await db.em.flush()
      return exhibit
    },
  )
}
