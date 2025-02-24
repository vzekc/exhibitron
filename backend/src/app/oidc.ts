import 'dotenv/config'
import type { Credentials, ProviderConfiguration } from '@fastify/oauth2'
import fastifyOauth2 from '@fastify/oauth2'
import fastifyCookie from '@fastify/cookie'
import { FastifyInstance, FastifyRequest } from 'fastify'
import axios from 'axios'
import { initORM } from '../db.js'
import { AuthError } from '../modules/common/errors.js'

const woltlabBaseUrl = 'https://forum.classic-computing.de'
const woltlabAuth: ProviderConfiguration = {
  authorizeHost: woltlabBaseUrl,
  authorizePath: '/index.php?oauth2-authorize/',
  tokenHost: woltlabBaseUrl,
  tokenPath: '/index.php?oauth2-token/',
}

const administratorRanks = ['Vorstand', 'Administrator']
const memberRanks = [
  'Fördermitglied',
  'Vereinsmitglied',
  'Schiedsrichter',
  'Moderator',
  ...administratorRanks,
]

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

type WoltlabUserInfo = {
  nickname: string
  email: string
  rank: string
}

const getUserInfo = async (token: string) => {
  const userInfoEndpoint = `${woltlabBaseUrl}/index.php?open-id-user-information/`
  const response = await axios.get(userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.data as WoltlabUserInfo
}

export const register = async (app: FastifyInstance) => {
  const db = await initORM()

  const credentials = getOAuth2Credentials()
  if (!credentials) {
    app.log.warn('OIDC authentication disabled')
    app.register(fastifyCookie)
    return
  }

  app.register(fastifyOauth2, {
    name: 'forumOAuth2',
    scope: ['openid', 'nickname', 'email', 'rank', 'profile'],
    credentials,
    callbackUri: (req) => `${req.protocol}://${req.headers.host}/auth/callback`,
  })

  interface AuthForumQuery {
    redirectUrl?: string
  }

  app.get(
    '/auth/forum',
    async (request: FastifyRequest<{ Querystring: AuthForumQuery }>, reply) => {
      const redirectUrl = request.headers.referer || '/'
      const authUrl = await app.forumOAuth2.generateAuthorizationUri(
        request,
        reply,
      )
      request.session.redirectUrl = redirectUrl
      return reply.redirect(authUrl)
    },
  )

  app.get('/auth/callback', async function (request, reply) {
    const { token } =
      await this.forumOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)

    // Retrieve user info from IdP
    const userInfo = await getUserInfo(token.access_token)

    const { nickname, rank, email } = userInfo

    if (!memberRanks.includes(rank)) {
      throw new AuthError(`Dein Benutzerstatus ${rank} ist nicht ausreichend`)
    }

    const user = await db.user.ensureUser(
      nickname,
      email,
      administratorRanks.includes(rank),
    )

    request.session.user = { userId: user.id }

    const { redirectUrl } = request.session
    delete request.session['redirectUrl']

    // Redirect the user to the frontend application
    return reply.redirect(redirectUrl ?? '/')
  })
}
