
export class AuthError extends Error {}
export class PermissionDeniedError extends Error {}

import { FastifyRequest } from 'fastify'
import { User } from '../user/user.entity.js'

export function getUserFromToken(req: FastifyRequest) {
  if (!req.user) {
    throw new AuthError('Please provide your token via Authorization header')
  }

  return req.user
}
