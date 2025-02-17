import { FastifyRequest } from 'fastify'
import { AuthError } from './errors.js'

export function getUserFromToken(req: FastifyRequest) {
  if (!req.user) {
    throw new AuthError('Please provide your token via Authorization header')
  }

  return req.user
}
