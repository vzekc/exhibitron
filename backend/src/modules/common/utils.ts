export class AuthError extends Error {}
export class PermissionDeniedError extends Error {}
export class BadRequestError extends Error {}

import { FastifyRequest } from 'fastify'

export function getUserFromToken(req: FastifyRequest) {
  if (!req.user) {
    throw new AuthError('Please provide your token via Authorization header')
  }

  return req.user
}
