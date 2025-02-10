import 'dotenv/config'

import Koa from 'koa'
import passport from 'koa-passport'
import {
  Strategy as OIDCStrategy,
  StrategyOptions,
  type VerifyCallback as OIDCVerifyCallback,
} from 'passport-openidconnect'
import { Strategy as LocalStrategy } from 'passport-local'

import db, { withClient } from './db'

// Initialize passport middleware
export const passportMiddleware = passport.initialize()
export const passportSession = passport.session()

type Claims = {
  nickname: string
  rank: string
}

const verifyForumLogin = async (
  _issuer: string,
  uiProfile: object,
  _idProfile: object,
  _context: object,
  _idToken: string | object,
  _accessToken: string | object,
  _refreshToken: string,
  _params: unknown,
  done: OIDCVerifyCallback
) => {
  // The verify strategy callback must have this signature so that the raw
  // profile information is available in the `idProfile` parameter.

  if (!('_json' in uiProfile)) {
    throw new Error('missing _json property')
  }
  const claims = uiProfile._json as Claims
  const username = claims.nickname.toLowerCase()
  const userId = await db.getUserId(username)
  if (
    !userId &&
    !claims.rank?.match(
      /^(Fördermitglied|Schiedsrichter|Vereinsmitglied|Vorstand|Moderator|Administrator)$/
    )
  ) {
    console.log('unauthorized forum user', username, claims.rank)
    return done(null, false, {
      message:
        'Dieses System ist nur für Mitglieder des VzEkC e.V. zugänglich.',
    })
  }
  return done(null, {
    username: username,
    id: userId,
  })
}

const getOIDCStrategyOptions = () => {
  const environmentVariableMapping = {
    issuer: 'OIDC_ISSUER',
    clientID: 'OIDC_CLIENT_ID',
    clientSecret: 'OIDC_CLIENT_SECRET',
    callbackURL: 'OIDC_CALLBACK_URL',
    authorizationURL: 'OIDC_AUTHORIZATION_URL',
    tokenURL: 'OIDC_TOKEN_URL',
    userInfoURL: 'OIDC_USERINFO_URL',
  } as const
  const missing = Object.values(environmentVariableMapping).filter(
    (variable) => !process.env[variable]
  )
  if (missing.length) {
    throw new Error(`Missing OIDC environment variable(s) ${missing.join(',')}`)
  }
  return {
    ...Object.fromEntries(
      Object.entries(environmentVariableMapping).map(([key, variable]) => [
        key,
        process.env[variable],
      ])
    ),
    scope: ['openid', 'nickname', 'email', 'rank', 'profile'],
  } as StrategyOptions
}

// GitHub OAuth2 configuration
passport.use(
  'oidc',
  new OIDCStrategy(getOIDCStrategyOptions(), verifyForumLogin)
)

// Define the Local strategy for username/password authentication
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      // Call the checkUser function to verify the username/password
      const user = await db.checkPassword(username, password)

      if (user) {
        // If the user is found and the password is correct, return the user
        done(null, user)
      } else {
        // If the user is not found or the password is incorrect, return false
        done(null, false)
      }
    } catch (error) {
      done(error)
    }
  })
)

type User = {
  username: string,
  id: string,
  is_administrator: boolean,
}

// Serialize user into session
passport.serializeUser(async (user, done) => {
  const { username } = user as User
  const dbUser = await withClient(async (client) => {
    let result = await client.query(`SELECT name, id, is_administrator
                                     FROM "user"
                                     WHERE name = $1`, [username])
    if (!result.rows.length) {
      console.log(`creating new user ${username}`)
      result = await client.query(`INSERT INTO "user"(name, is_administrator)
                                   VALUES ($1, FALSE)
                                   RETURNING name, id, is_administrator`, [username])
    }
    console.log('user', result.rows[0])
    return result.rows[0]
  })
  done(null, dbUser)
})

// Deserialize user from session
passport.deserializeUser((user: undefined, done) => {
  done(null, user)
})

export const isAuthenticated = async (ctx: Koa.Context, next: () => Promise<void>) => {
  if (ctx.isAuthenticated()) {
    await next()
  } else {
    if (ctx.accepts('html')) {
      ctx.redirect('/login?path=' + ctx.path)
    } else {
      ctx.status = 403
      ctx.body = 'Forbidden'
    }
  }
}

export const isAdmin = async (ctx: Koa.Context, next: () => Promise<void>) =>
  isAuthenticated(ctx, async () => {
    if (ctx.state.user.is_administrator) {
      await next()
    } else {
      ctx.status = 403
      ctx.body = 'Forbidden'
    }
  })
