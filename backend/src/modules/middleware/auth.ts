import { FastifyRequest } from 'fastify'
import { AuthError, PermissionDeniedError } from '../common/errors.js'

export const isAdmin = (message: string) => async (request: FastifyRequest) => {
  if (!request.user || !request.user.isAdministrator) {
    throw new PermissionDeniedError(message)
  }
}

export const isLoggedIn =
  (message: string) => async (request: FastifyRequest) => {
    if (!request.user) {
      throw new AuthError(message)
    }
  }
