import { FastifyInstance } from 'fastify/types/instance.js'
import { FastifyReply } from 'fastify/types/reply.js'
import { NotFoundError } from '@mikro-orm/core'
import { ZodError } from 'zod'

export class AuthError extends Error {}

export class PermissionDeniedError extends Error {}

export class BadRequestError extends Error {}

export const errorHandler = (
  app: FastifyInstance,
  error: Error,
  _request: unknown,
  reply: FastifyReply,
) => {
  if ('validation' in error && error.validation) {
    return reply.status(400).send({
      error: 'Bad Request',
      message: error.message,
      validation: error.validation,
    })
  }

  if (error instanceof AuthError) {
    return reply.status(401).send({ error: error.message })
  }

  if (error instanceof PermissionDeniedError) {
    return reply.status(403).send({ error: error.message })
  }

  if (error instanceof NotFoundError) {
    return reply.status(404).send({ error: error.message })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({ error: error.message })
  }

  if (error instanceof BadRequestError) {
    return reply.status(404).send({ error: error.message })
  }

  app.log.error(error)
  reply.status(500).send({ error: error.message })
}

export const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
  additionalProperties: true,
}
