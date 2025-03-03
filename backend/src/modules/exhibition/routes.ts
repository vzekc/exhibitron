import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'

export async function registerExhibitionRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.get(
    '/:id',
    {
      schema: {
        description: 'Retrieve all data for the exhibition',

        response: {
          200: {
            description: 'One page of exhibits',
            type: 'object',
            properties: {
              items: { type: 'array', items: { type: 'string' } }, // fixme exhibitListingSchema
              total: { type: 'number' },
              freeTables: {
                description: 'Array with numbers of table that are not claimed',
                type: 'array',
                items: { type: 'number' },
              },
            },
          },
        },
      },
    },
    async (request) => {
      const { limit, offset } = request.query as {
        limit?: number
        offset?: number
      }
      const { items, total, freeTables } = await db.exhibit.listExhibits({
        limit,
        offset,
      })

      return { items, total, freeTables }
    },
  )
}
