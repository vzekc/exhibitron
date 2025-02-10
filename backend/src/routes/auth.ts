import 'dotenv/config'

import Koa from 'koa'
import Router from 'koa-router'
import passport from 'koa-passport'

import db from '../db'

const router = new Router();

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

export default router
