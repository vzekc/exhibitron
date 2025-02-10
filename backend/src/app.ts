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
import { validate as validateUuid } from 'uuid'

import db, { withClient } from './db'
import { PoolClient } from 'pg'

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

const isAdmin = async (ctx: Koa.Context, next: () => Promise<void>) =>
  isAuthenticated(ctx, async () => {
    if (ctx.state.user.is_administrator) {
      await next()
    } else {
      ctx.status = 403
      ctx.body = 'Forbidden'
    }
  })

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
router.all('/logout', async (ctx: Koa.Context) => {
  await ctx.logout()
  ctx.redirect('/')
})

const sanitzeHtmlOptions = {
  allowedTags: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'em', 'pre', 'img', 'a'],
  allowedSchemes: ['http', 'https', 'data'],
}

router.post('/api/exhibition', isAdmin, async (ctx: Koa.Context) => {
  const client = ctx.state.db as PoolClient
  const { title, description, owner } = ctx.request.body
  const result = await client.query(
    `
        INSERT INTO exhibition(title, description, owner)
        VALUES ($1, $2, $3)
        RETURNING id`,
    [title, sanitizeHtml(description, sanitzeHtmlOptions), owner]
  )
  ctx.body = result.rows[0]
  ctx.status = 200
})

const makeExhibitionsQuery =
  (where?: string) => `SELECT u.name                                                AS "username",
                                           e.title,
                                           e.description,
                                           COALESCE(ARRAY_AGG(t.number ORDER BY t.number), '{}') AS table_numbers
                                    FROM exhibition AS e
                                             JOIN "user" u ON e.owner = u.id
                                             LEFT JOIN tables t ON t.exhibition = e.id
                                    ${where ?? ''}
                                    GROUP BY u.name, e.title, e.description`

router.get('/api/exhibition', async (ctx: Koa.Context) => {
  const client = ctx.state.db as PoolClient
  const result = await client.query(makeExhibitionsQuery())
  ctx.body = { exhibitions: result.rows }
  ctx.status = 200
})

router.get('/api/exhibition/:id', async (ctx: Koa.Context) => {
  const client = ctx.state.db as PoolClient
  const { id } = ctx.params
  if (!validateUuid(id)) {
    ctx.body = { message: "invalid UUID", id}
    ctx.status = 400
    return
  }
  const result = await client.query(makeExhibitionsQuery(`WHERE e.id = '${id}'`))
  if (result.rows.length) {
    ctx.body = result.rows[0]
    ctx.status = 200
  } else {
    ctx.body = { message: "exhibition not found", id }
    ctx.status = 404
  }
})

router.get('/api/table/:number', async (ctx: Koa.Context) => {
  const client = ctx.state.db as PoolClient
  const { number } = ctx.params
  if (!number?.match(/^\d+$/)) {
    ctx.body = { message: "invalid table number", number}
    ctx.status = 400
    return
  }
  const result = await client.query('SELECT exhibition FROM tables WHERE number = $1', [number]);
  if (result.rows[0]?.exhibition) {
    ctx.redirect(`/api/exhibition/${result.rows[0]?.exhibition}`)
  } else if (result.rows.length) {
    ctx.body = { message: "table not assigned", number }
    ctx.status = 400
  } else {
    ctx.body = { message: "table not found", number }
    ctx.status = 404
  }
})

router.put(
  '/api/exhibition/:id',
  isAuthenticated,
  async (ctx: Koa.Context) => {
    const client = ctx.state.db
    const { id } = ctx.params
    // Validate the description field
    const { title, description } = ctx.request.body
    const result = await client.query(
      `
          UPDATE exhibition
          SET title       = COALESCE($2, title),
              description = COALESCE($3, description)
          WHERE id = $1
            AND ((owner = $4) OR $5)
          RETURNING id`,
      [
        id,
        title,
        sanitizeHtml(description, sanitzeHtmlOptions),
        ctx.state.user.id,
        ctx.state.user.is_admin,
      ]
    )
    ctx.status = result.rows[0]?.id ? 204 : 400
  }
)

app.use(router.routes())
app.use(router.allowedMethods())
