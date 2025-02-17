import { FastifyInstance } from 'fastify';
import { initORM } from '../../db.js';
import { wrap } from '@mikro-orm/core';
import { BadRequestError, getUserFromToken } from '../common/utils.js';
import { User } from './user.entity.js';

const userBaseSchema = {
  type: 'object',
  properties: {
    fullName: { type: 'string' },
    bio: { type: 'string' },
    social: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        phone: { type: 'string' },
        website: { type: 'string' },
        mastodon: { type: 'string' },
        twitter: { type: 'string' },
        facebook: { type: 'string' },
        linkedin: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
};

const userResponseSchema = {
  ...userBaseSchema,
  required: ['id', 'username', 'isAdministrator'],
  properties: {
    id: { type: 'integer' },
    username: { type: 'string' },
    ...userBaseSchema.properties,
    isAdministrator: { type: 'boolean' },
  },
};

const genericErrorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  required: ['error'],
}

export async function registerUserRoutes(app: FastifyInstance) {
  const db = await initORM();

  // register new user
  app.post(
    '/sign-up',
    {
      schema: {
        description: 'Create a user account',
        body: {
          ...userBaseSchema,
          required: ['username', 'password'],
          properties: {
            ...userBaseSchema.properties,
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'The user account was created',
            ...userResponseSchema,
          },
          400: {
            description: 'The user account could not be created.',
            ...genericErrorResponseSchema
          },
        },
      },
    },
    async (request) => {
      const body = request.body as User;

      if (await db.user.exists(body.username)) {
        throw new BadRequestError(
          'This username is already registered, maybe you want to sign in?',
        );
      }

      const user = db.user.create(body);
      await db.em.flush();

      user.token = app.jwt.sign({ id: user.id });

      // after flush, we have the `user.id` set
      console.log(`User ${user.id} created`);

      return user;
    },
  );

  app.post(
    '/sign-in',
    {
      schema: {
        description: 'Log in',
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            description: 'The user was logged in',
            ...userResponseSchema,
            properties: {
              ...userResponseSchema.properties,
              token: { type: 'string' },
            },
          },
          400: {
            description: 'Invalid input parameter(s).',
            ...genericErrorResponseSchema
          },
          401: {
            description: 'Invalid username or password',
            ...genericErrorResponseSchema
          },
        },
      },
    },
    async (request) => {
      const { username, password } = request.body as {
        username: string
        password: string
      };
      const user = await db.user.login(username, password);
      user.token = app.jwt.sign({ id: user.id });
      return user;
    },
  );

  app.get('/profile', async (request) => getUserFromToken(request));

  app.get('/:id', async (request) => {
    const { id } = request.params as { id: string };
    return await db.user.lookup(id);
  });

  app.patch(
    '/profile',
    {
      schema: {
        description: 'Update user account',
        body: {
          ...userBaseSchema,
          properties: {
            ...userBaseSchema.properties,
            password: { type: 'string' },
          },
        },
        response: {
          200: {
            description: 'The user account was updated',
            ...userResponseSchema,
          },
          400: {
            description: 'The user account could not be created.',
            ...genericErrorResponseSchema
          },
        },
      },
    },
    async (request) => {
      const updates = request.body as User;
      const user = getUserFromToken(request);
      wrap(user).assign(updates);
      await db.em.flush();
      return { ...user, blub: 1 };
    },
  );
}
