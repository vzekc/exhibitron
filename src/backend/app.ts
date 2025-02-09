import 'dotenv/config'

import fs from 'fs'
import * as Marked from 'marked'
import ejs from 'ejs'
import Koa from 'koa'
import Router from 'koa-router'
import { koaBody } from 'koa-body'
import koaStatic from 'koa-static'
import session from 'koa-session'
import passport from 'koa-passport'
import {
  Strategy as OIDCStrategy,
  StrategyOptions,
  type VerifyCallback as OIDCVerifyCallback,
} from 'passport-openidconnect'
import { Strategy as LocalStrategy } from 'passport-local'
import sanitizeHtml from 'sanitize-html'
import path from 'path'

import db from './db'

const resolvePath = (...components: string[]) =>
  path.join(__dirname, '../..', ...components)

const readFileSync = (...components: string[]) =>
  fs.readFileSync(resolvePath(...components), { encoding: 'utf8' })

export const app = new Koa()
const router = new Router()

app.use(
  koaBody({
    multipart: true,
    jsonLimit: '20mb',
    textLimit: '20mb',
    formLimit: '20mb',
  })
)
app.use(koaStatic(resolvePath('public')))

// Session middleware
const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) {
  throw new Error('Missing SESSION_SECRET environment variable')
}
app.keys = [sessionSecret]
app.use(session({}, app))

// Initialize passport middleware
const passportMiddleware = passport.initialize()
app.use(passportMiddleware)
const passportSession = passport.session()
app.use(passportSession)

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

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user)
})

// Deserialize user from session
passport.deserializeUser((user: undefined, done) => {
  done(null, user)
})

const isAuthenticated = async (ctx: Koa.Context, next: () => Promise<void>) => {
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

app.use(db.middleware)

const renderTemplate = (
  content: string,
  state: ejs.Data,
  data: ejs.Data = {}
) => ejs.render(content, { ...state, ...data })
const renderTemplateFile = (
  filename: string,
  state: ejs.Data,
  data: ejs.Data = {}
) => renderTemplate(readFileSync('templates', filename), state, data)

const markdownOptions = {
  renderer: new Marked.Renderer(),
  gfm: true,
  breaks: false,
}

router.get(
  '/set-password',
  async (ctx: Koa.Context, next: () => Promise<void>) => {
    const key = ctx.request.query.key
    if (typeof key !== 'string') {
      throw new Error('unexpected key parameter')
    }
    if (key) {
      ctx.state.keyValid = await db.checkPasswordResetKey(key)
      ctx.state.key = key
    } else {
      ctx.state.keyValid = false
      ctx.state.key = ''
    }
    return next()
  }
)

router.get('/login', (ctx: Koa.Context, next: () => Promise<void>) => {
  if (ctx.session?.messages) {
    ctx.state.message = ctx.session.messages[0]
    delete ctx.session.messages
  } else {
    ctx.state.message = null
  }
  return next()
})

router.get('/:page/:arg?', (ctx: Koa.Context, next: () => Promise<void>) => {
  if (ctx.params.page === 'auth') {
    return next()
  }

  let content = null
  if (fs.existsSync(resolvePath('templates', `${ctx.params.page}.md`))) {
    content = Marked.parse(
      renderTemplateFile(`${ctx.params.page}.md`, ctx.state),
      markdownOptions
    )
  } else if (
    fs.existsSync(resolvePath('templates', `${ctx.params.page}.html`))
  ) {
    content = renderTemplate(
      readFileSync('templates', `${ctx.params.page}.html`),
      ctx.state
    )
  }

  if (content) {
    // Send the HTML response
    ctx.type = 'text/html'
    ctx.body = renderTemplateFile('layout.ejs', ctx.state, {
      content,
      page_name: ctx.params.page,
    })
  } else {
    return next()
  }
})

router.redirect('/', '/status')

const sanitzeHtmlOptions = {
  allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'pre', 'img', 'a'],
  allowedSchemes: ['http', 'https', 'data'],
}

router.put(
  '/api/host/:mac_address',
  isAuthenticated,
  async (ctx: Koa.Context) => {
    // Validate the description field
    const { description } = ctx.request.body
    if (description) {
      ctx.request.body.description = sanitizeHtml(
        description,
        sanitzeHtmlOptions
      )
    }

    ctx.status = 204
  }
)

router.get('/auth', passport.authenticate('oidc'))

router.get(
  '/auth/callback',
  passport.authenticate('oidc', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureMessage: true,
  })
)

router.post(
  '/auth/login',
  async (ctx: Koa.Context, next: () => Promise<void>) => {
    // Check if the request body contains username and password
    const { username, password } = ctx.request.body

    if (username && password) {
      // Attempt Local authentication
      await passport.authenticate('local', async (err, user) => {
        if (err) {
          ctx.status = 500
          ctx.body = 'Internal Server Error'
        } else if (!user) {
          if (ctx.accepts('html')) {
            ctx.redirect(
              '/login?error=1&path=' + (ctx.request.query.path || '/')
            )
          } else {
            ctx.status = 403
          }
        } else {
          // If Local authentication succeeds, log in the user
          await ctx.login(user)
          ctx.redirect((ctx.request.query.path as string) || '/')
        }
      })(ctx, next)
    } else {
      // If username or password is missing, attempt OIDC authentication
      await passport.authenticate('oidc')(ctx, next)
    }
  }
)

router.post('/auth/set-password', async (ctx: Koa.Context) => {
  if (ctx.request.body.key) {
    await db.resetPassword(ctx.request.body.key, ctx.request.body.password)
  } else if (ctx.state.user) {
    await db.setPassword(ctx.state.user.username, ctx.request.body.password)
  } else {
    ctx.status = 400
    return
  }
  ctx.redirect('/login?reset-success=1')
})

// Logout route
router.post('/logout', async (ctx: Koa.Context) => {
  await ctx.logout()
  ctx.redirect('/')
})

app.use(router.routes())
app.use(router.allowedMethods())
