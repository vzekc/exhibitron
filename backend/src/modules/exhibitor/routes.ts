import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { wrap } from '@mikro-orm/core'
import { errorSchema } from '../common/errors.js'
import { existingExhibitSchema } from '../exhibit/routes.js'
import { isExhibitor } from '../middleware/auth.js'
import { Exhibitor } from './exhibitor.entity.js'

export const exhibitorSchema = () => ({
  type: 'object',
  properties: {
    user: { type: 'number', examples: [42] },
    name: { type: 'string', examples: ['Daffy Duck'] },
    nickname: { type: 'string', examples: ['daffy'] },
    bio: {
      type: 'string',
      examples: ['I was born with a plastic spoon in my mouth.'],
    },
    contacts: {
      type: 'object',
      properties: {
        email: { type: 'string', examples: ['daffy@duck.com'] },
        phone: { type: 'string', examples: ['0123 567 7890'] },
        website: { type: 'string', examples: ['https://daffy-duck.com/'] },
        mastodon: { type: 'string', examples: ['@daffyduck@mastodon.social'] },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
})

export const makeExhibitorPOJO = (exhibitor: Exhibitor) => {
  const pojo = {
    ...wrap(exhibitor).toJSON(),
    ...wrap(exhibitor.user).toJSON(),
  }
  console.log(pojo)
  return pojo
}

export async function registerExhibitorRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.get(
    '/profile',
    {
      schema: {
        description: 'Retrieve the profile of the currently logged in user',
        response: {
          200: {
            description:
              'The profile of the currently logged in user is returned',
            ...exhibitorSchema(),
          },
          401: {
            description: 'No user is currently logged in',
            ...errorSchema,
          },
        },
      },
      preHandler: [isExhibitor('You must be logged in to view your profile')],
    },
    async (request) => makeExhibitorPOJO(request.exhibitor!),
  )

  app.get(
    '/',
    {
      schema: {
        description: 'Retrieve the exhibitor list',
        response: {
          200: {
            description: 'The exhibitor list is returned',
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: exhibitorSchema(),
              },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    async (request) => {
      const exhibitors = await db.exhibitor.find({
        exhibition: request.exhibition,
      })
      return {
        items: exhibitors.map(makeExhibitorPOJO),
        total: exhibitors.length,
      }
    },
  )

  app.get(
    '/:id',
    {
      schema: {
        description: 'Retrieve the profile of the exhibitor identified by ID',
        params: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID of the exhibitor to look up',
            },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'The profile of the exhibitor is returned',
            ...exhibitorSchema(),
          },
          404: {
            description: 'No exhibitor was found matching the given ID',
            ...errorSchema,
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: number }
      const exhibitor = await db.exhibitor.findOneOrFail({ id })
      return makeExhibitorPOJO(exhibitor)
    },
  )
}
