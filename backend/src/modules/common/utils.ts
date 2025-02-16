import { Article } from '../article/article.entity.js'

export class AuthError extends Error {}

import { FastifyRequest } from 'fastify'
import { User } from '../user/user.entity.js'

export function getUserFromToken(req: FastifyRequest): User {
  if (!req.user) {
    throw new AuthError('Please provide your token via Authorization header')
  }

  return req.user as User
}

export function verifyArticlePermissions(user: User, article: Article): void {
  if (article.author.id !== user.id) {
    throw new Error('You are not the author of this article!')
  }
}
