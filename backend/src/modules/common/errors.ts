import { GraphQLError } from 'graphql'
import { FastifyInstance } from 'fastify/types/instance.js'
import { FastifyReply } from 'fastify/types/reply.js'
import { NotFoundError } from '@mikro-orm/core'

export enum ErrorCode {
  // Authentication errors
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // Business logic errors
  INVALID_OPERATION = 'INVALID_OPERATION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export interface ErrorExtensions {
  code: ErrorCode
  details?: Record<string, unknown>
  http?: {
    status: number
  }
}

export class AppError extends Error {
  extensions: ErrorExtensions

  constructor(message: string, extensions: ErrorExtensions) {
    super(message)
    this.name = 'AppError'
    this.extensions = extensions
  }

  toGraphQLError(): GraphQLError {
    return new GraphQLError(this.message, {
      extensions: {
        code: this.extensions.code,
        details: this.extensions.details,
        http: this.extensions.http,
      },
    })
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, {
      code: ErrorCode.UNAUTHENTICATED,
      http: { status: 401 },
    })
  }
}

export class PermissionDeniedError extends AppError {
  constructor(message: string) {
    super(message, {
      code: ErrorCode.FORBIDDEN,
      http: { status: 403 },
    })
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      code: ErrorCode.VALIDATION_ERROR,
      details,
      http: { status: 400 },
    })
  }
}

export class UniqueConstraintError extends AppError {
  constructor(message: string, field: string, value: string) {
    super(message, {
      code: ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
      details: { field, value },
      http: { status: 409 },
    })
  }
}

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

  if (error instanceof AppError) {
    return reply.status(error.extensions.http?.status || 500).send({
      error: error.extensions.code,
      message: error.message,
      details: error.extensions.details,
    })
  }

  if (error instanceof NotFoundError) {
    return reply.status(404).send({
      error: ErrorCode.NOT_FOUND,
      message: error.message,
    })
  }

  app.log.error(error)
  reply.status(500).send({
    error: ErrorCode.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
  })
}

export const errorSchema = {
  type: 'object',
  properties: {
    error: {
      type: 'string',
      examples: [
        'Software Failure. Press left mouse button to continue. Guru Meditation #00000000.00000000',
      ],
    },
  },
  additionalProperties: true,
}
