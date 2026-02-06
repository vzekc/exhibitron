import { FastifyRequest } from 'fastify'
import { AuthError, PermissionDeniedError } from '../common/errors.js'

export const isAdmin = (message: string) => async (request: FastifyRequest) => {
  if (request.apolloContext?.isAdmin) return
  if (!request.user || !request.user.isAdministrator) {
    throw new PermissionDeniedError(message)
  }
}

export const isLoggedIn = (message: string) => (request: FastifyRequest) => {
  if (!request.user) {
    throw new AuthError(message)
  }
}

export const isExhibitor = (message: string) => (request: FastifyRequest) => {
  isLoggedIn(message)(request)
  if (!request.exhibitor) {
    throw new PermissionDeniedError(message)
  }
}
