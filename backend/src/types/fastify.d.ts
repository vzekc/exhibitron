// src/types/fastify.d.ts
import { OAuth2Namespace, Token } from '@fastify/oauth2'
import { User } from '../modules/user/user.entity.js'

declare module 'fastify' {
  interface FastifyInstance {
    forumOAuth2: OAuth2Namespace
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: User | undefined // Define user type
  }
}

declare module '@fastify/session' {
  interface FastifySessionObject {
    user?: {
      token: Token
      userInfo: WoltlabUserInfo
    }
  }
}
