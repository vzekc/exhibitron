// src/types/fastify.d.ts
import '@fastify/session'
import { OAuth2Namespace } from '@fastify/oauth2'
import { User } from '../modules/user/entity.js'
import { Exhibition } from '../modules/exhibition/entity.js'
import { Exhibitor } from '../modules/exhibitor/entity.js'
import { Context } from '../app/context.js'

declare module 'fastify' {
  interface FastifyInstance {
    forumOAuth2: OAuth2Namespace
  }

  interface FastifyRequest {
    apolloContext: Context
    user: User | null
    exhibitor: Exhibitor | null
    exhibition: Exhibition
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: User | null // Define user type
  }
}

declare module '@fastify/session' {
  interface FastifySessionObject {
    userId?: number
    redirectUrl?: string
    registrationToken?: string
  }
}
