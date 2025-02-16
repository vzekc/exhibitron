import 'dotenv/config'
import type { Credentials, ProviderConfiguration } from '@fastify/oauth2'
import fastifyOauth2 from '@fastify/oauth2'
import { FastifyInstance } from 'fastify'

const woltlabBaseUrl = 'https://forum.classic-computing.de'
const woltlabAuth: ProviderConfiguration = {
  authorizeHost: woltlabBaseUrl,
  authorizePath: '/index.php?oauth2-authorize/',
  tokenHost: woltlabBaseUrl,
  tokenPath: '/index.php?oauth2-token/',
}

const getOAuth2Credentials = (): Credentials | void => {
  const { OIDC_CLIENT_ID: id, OIDC_CLIENT_SECRET: secret } = process.env

  if (!id || !secret) {
    return
  }

  return {
    client: {
      id,
      secret,
    },
    auth: woltlabAuth,
  }
}

export const register = (app: FastifyInstance) => {
  const credentials = getOAuth2Credentials()
  if (!credentials) {
    app.log.warn('OIDC authentication disabled')
    return
  }

  app.register(fastifyOauth2, {
    name: 'forumOAuth2',
    scope: ['openid', 'nickname', 'email', 'rank', 'profile'],
    credentials,
    startRedirectPath: '/auth/forum',
    callbackUri: 'http://localhost:3000/auth/callback',
  })

  app.get('/auth/callback', async function (request, reply) {
    console.log('handling oauth callback', request.cookies)

    const { token } =
      await this.forumOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)

    console.log('/auth/callback', token)

    // if later need to refresh the token this can be used
    // const { token: newToken } = await this.getNewAccessTokenUsingRefreshToken(token)

    reply.send({ access_token: token.access_token })

    app.log.info('OIDC authentication enabled')
  })
}
