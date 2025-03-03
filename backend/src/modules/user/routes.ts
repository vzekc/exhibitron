import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { wrap } from '@mikro-orm/core'
import { User } from './user.entity.js'
import { BadRequestError, errorSchema } from '../common/errors.js'
import { existingExhibitSchema } from '../exhibit/routes.js'
import { isAdmin, isLoggedIn } from '../middleware/auth.js'
import { Exhibitor } from '../exhibitor/exhibitor.entity.js'

export const userBaseSchema = () => ({
  type: 'object',
  properties: {
    fullName: { type: 'string', examples: ['Daffy Duck'] },
    email: { type: 'string', examples: ['daffy@duck.com'] },
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

// An existing user reported without their tables or exhibitions
export const userBaseResponseSchema = () => ({
  ...userBaseSchema(),
  required: ['id', 'email', 'isAdministrator'],
  properties: {
    id: { type: 'integer', examples: [23] },
    nickname: { type: 'string', examples: ['donald'] },
    ...userBaseSchema().properties,
    isAdministrator: { type: 'boolean' },
  },
})

export const userResponseSchema = () => ({
  ...userBaseResponseSchema(),
  required: ['id', 'email', 'isAdministrator'],
  properties: {
    ...userBaseResponseSchema().properties,
    tables: { type: 'array', items: { type: 'number' } },
    exhibits: { type: 'array', items: existingExhibitSchema() },
  },
})

export async function registerUserRoutes(app: FastifyInstance) {
  const db = await initORM()

  const makeExhibitorResponse = async (exhibitor_: Exhibitor) => {
    // If we directly serialize the user object, it is somehow changed and
    // then cannot be written back to the database.  By creating a copy
    // that is not connected to the identity map, we can avoid this problem.
    // There should be a better way to do this, but I have not found it yet.
    // This is what toJSON is for, fix this eventually
    // https://chatgpt.com/c/67c41f12-98e4-800d-86d2-3c3ead33e902
    const token = exhibitor_.user.token
    const exhibitor = await db.em.findOneOrFail(
      Exhibitor,
      { id: exhibitor_.id },
      { populate: ['exhibits', 'tables'], disableIdentityMap: true },
    )
    return {
      ...exhibitor,
      token,
      tables: exhibitor.tables.map(({ id }) => id),
      exhibits: exhibitor.exhibits.map(({ table, ...exhibit }) => ({
        ...exhibit,
        table: table?.id,
      })),
    }
  }

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
          200: {
            description: 'The user was logged in',
            ...userResponseSchema(),
            properties: {
              ...userResponseSchema().properties,
              token: {
                type: 'string',
                examples: [
                  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzA3ODQ5NjAwfQ.9mYrO5fRBY3eCQ7fFbUs89QXH8-Q5uD7eZFYd58XGWA',
                ],
              },
            },
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
      user.token = app.jwt.sign({ id: user.id })
      request.session.userId = user.id
      return wrap(user).toJSON()
    },
  )

  app.get(
    '/current',
    {
      schema: {
        description:
          'Retrieve the profile of the currently logged in user, if any',
        response: {
          200: {
            description:
              'The profile of the currently logged in user is returned',
            ...userResponseSchema(),
          },
          204: {
            description: 'No user is currently logged in',
            type: 'null',
          },
        },
      },
    },
    async (request, response) => request.user ?? response.status(204).send(),
  )

  // fixme move to exhibitor
  app.get(
    '/profile',
    {
      schema: {
        description: 'Retrieve the profile of the currently logged in user',
        response: {
          200: {
            description:
              'The profile of the currently logged in user is returned',
            ...userResponseSchema(),
          },
          401: {
            description: 'No user is currently logged in',
            ...errorSchema,
          },
        },
      },
      preHandler: [isLoggedIn('You must be logged in to view your profile')],
    },
    async (request) => {
      return makeExhibitorResponse(request.exhibitor!)
    },
  )

  app.get(
    '/',
    {
      schema: {
        description: 'Retrieve the full user list',
        response: {
          200: {
            description: 'The user list is returned',
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: userResponseSchema(),
              },
              total: { type: 'number' },
            },
          },
          403: {
            description:
              'You must be logged in as administrator to see the user list',
            ...errorSchema,
          },
        },
      },
      preHandler: [
        isAdmin('You must be logged in as administrator to see the user list'),
      ],
    },
    async () => {
      const users = await db.user.findAll()
      return {
        items: users.map((user) => wrap(user).toJSON()),
        total: users.length,
      }
    },
  )

  app.get(
    '/:id',
    {
      schema: {
        description: 'Retrieve the profile of the user identified by ID',
        params: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description:
                'Username, email address or ID of the user to look up',
            },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'The profile of the user is returned',
            ...userResponseSchema(),
          },
          404: {
            description: 'No user was found matching the given ID',
            ...errorSchema,
          },
        },
      },
    },
    async (request) => {
      const { id } = request.params as { id: string }
      const user = await db.user.lookupOrFail(id)
      return wrap(user).toJSON()
    },
  )

  // fixme move to exhibitor
  app.patch(
    '/profile',
    {
      schema: {
        description: 'Update user account',
        body: {
          ...userBaseSchema(),
          properties: {
            ...userBaseSchema().properties,
            password: { type: 'string', examples: ['geheim'] },
          },
        },
        response: {
          200: {
            description: 'The user account was updated',
            ...userResponseSchema(),
          },
          400: {
            description: 'The user account could not be updated.',
            ...errorSchema,
          },
        },
      },
      preHandler: [isLoggedIn('You must be logged in to view your profile')],
    },
    async (request) => {
      const updates = request.body as User
      const user = request.user!
      wrap(user).assign(updates)
      await db.em.flush()
      return wrap(user).toJSON()
    },
  )

  app.post(
    '/requestPasswordReset',
    {
      schema: {
        description: 'Request a password reset',
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', examples: ['donald@duck.com'] },
            resetUrl: { type: 'string', examples: ['/passwordReset?token='] },
          },
          required: ['email', 'resetUrl'],
          additionalProperties: false,
        },
        response: {
          204: {
            description: 'The password reset was requested',
            type: 'null',
          },
        },
      },
    },
    async (request, response) => {
      const { email, resetUrl } = request.body as {
        email: string
        resetUrl: string
      }
      if (!resetUrl.match(/^\/\w+/)) {
        throw new BadRequestError('The reset URL must be a relative path')
      }
      await db.user.requestPasswordReset(
        email,
        `${request.protocol}://${request.headers.host}${resetUrl}`,
      )
      return response.status(204).send()
    },
  )

  app.post(
    '/resetPassword',
    {
      schema: {
        description: 'Reset password using token',
        body: {
          type: 'object',
          properties: {
            token: { type: 'string', examples: ['djdri34nn4'] },
            password: { type: 'string', examples: ['duck-eat-sponge-foot'] },
          },
          required: ['token', 'password'],
          additionalProperties: false,
        },
        response: {
          204: {
            description: 'The password reset was requested',
            type: 'null',
          },
          403: {
            description: 'The password reset token is invalid or expired',
            ...errorSchema,
          },
        },
      },
    },
    async (request, response) => {
      const { token, password } = request.body as {
        token: string
        password: string
      }
      await db.user.resetPassword(token, password)
      return response.status(204).send()
    },
  )
}
