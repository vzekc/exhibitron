import 'dotenv/config'
import type { Credentials, ProviderConfiguration } from '@fastify/oauth2'
import fastifyOauth2 from '@fastify/oauth2'
import fastifyCookie from '@fastify/cookie'
import { FastifyInstance, FastifyRequest } from 'fastify'
import axios from 'axios'
import { initORM } from '../db.js'

const woltlabBaseUrl = 'https://forum.classic-computing.de'
const woltlabAuth: ProviderConfiguration = {
  authorizeHost: woltlabBaseUrl,
  authorizePath: '/index.php?oauth2-authorize/',
  tokenHost: woltlabBaseUrl,
  tokenPath: '/index.php?oauth2-token/',
}

const administratorRanks = ['Vorstand', 'Administrator']

/*
 * Where to go once the forum has answered. Callers pass either a path or a
 * whole address, and both are read against this site: a bare path would
 * otherwise fail to parse and take the callback down with it, and an address
 * pointing somewhere else would turn the login into a way of sending people
 * off this site.
 */
export const resolveRedirect = (redirectUrl: string | undefined, origin: string) => {
  const here = new URL(origin)
  const target = new URL(redirectUrl ?? '/', here)
  return target.origin === here.origin ? target : new URL('/', here)
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
    registrationToken?: string
    helper?: string
  }

  app.get(
    '/auth/forum',
    async (request: FastifyRequest<{ Querystring: AuthForumQuery }>, reply) => {
      request.session.registrationToken = request.query.registrationToken
      request.session.redirectUrl = request.query.redirectUrl || request.headers.referer || '/'
      /* Set by the volunteer pages: a forum member who wants to help gets an
         account here, rather than being sent to the exhibitor registration. */
      request.session.forumHelperSignup = request.query.helper === '1'

      const authUrl = await app.forumOAuth2.generateAuthorizationUri(request, reply)
      return reply.redirect(authUrl)
    },
  )

  app.get('/auth/callback', async function (request: FastifyRequest, reply) {
    const { registrationToken, redirectUrl, forumHelperSignup } = request.session
    delete request.session.redirectUrl
    delete request.session.registrationToken
    delete request.session.forumHelperSignup

    const { token } = await this.forumOAuth2.getAccessTokenFromAuthorizationCodeFlow(request)

    // Retrieve user info from IdP
    const userInfo = await getUserInfo(token.access_token)

    const { nickname, email, rank } = userInfo
    const isAdministrator = administratorRanks.includes(rank)

    const user = await db.user.associateForumUser({
      nickname,
      registrationToken,
      isAdministrator,
      email,
      createIfMissing: forumHelperSignup,
    })

    const url = resolveRedirect(redirectUrl, `${request.protocol}://${request.headers.host}`)
    if (user === 'needsSetup') {
      url.pathname = '/register'
      url.search = 'forumMemberNeedsSetup'
    } else if (user) {
      request.session.userId = user.id
      request.session.canSwitchExhibitor = user.isAdministrator
    } else {
      url.pathname = '/register'
      url.search = 'forumMemberNotYetRegistered'
    }

    return reply.redirect(url.toString())
  })
}
