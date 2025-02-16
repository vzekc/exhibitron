import type { Credentials } from '@fastify/oauth2'
import fastifyOauth2 from '@fastify/oauth2'
import { FastifyInstance } from 'fastify'

const getOAuth2Credentials = (): Credentials | void => {
  const {
    OIDC_ISSUER,
    OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET,
    OIDC_AUTHORIZATION_URL,
    OIDC_TOKEN_URL,
    OIDC_USERINFO_URL,
    OIDC_CALLBACK_URL
  } = process.env
}

export const register = (app: FastifyInstance) => {
  const credentials = getOAuth2Credentials()
  if (credentials) {
    app.register(fastifyOauth2, {
      name: 'forumOAuth2',
      credentials,
      startRedirectPath: '/login/forum',
      callbackUri: 'http://localhost:3001/login/forum/callback'
    })
  } else {
    app.log.warn('OIDC authentication disabled')
  }
}
