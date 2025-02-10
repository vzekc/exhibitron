import 'dotenv/config'

import Koa from 'koa'
import Router from 'koa-router'
import { koaBody } from 'koa-body'
import koaStatic from 'koa-static'
import session from 'koa-session'
import db from './db'

import { resolvePath } from './paths'

import apiRouter from './routes/api'
import authRouter from './routes/auth'
import templateRouter from './routes/templates'

import { passportMiddleware, passportSession } from './auth'

export const app = new Koa()

app.use(
  koaBody({
    multipart: true,
    jsonLimit: '20mb',
    textLimit: '20mb',
    formLimit: '20mb',
  })
)
app.use(koaStatic(resolvePath('public')))

const sessionSecret = process.env.SESSION_SECRET
if (!sessionSecret) {
  throw new Error('Missing SESSION_SECRET environment variable')
}
app.keys = [sessionSecret]
app.use(session({}, app))

app.use(passportMiddleware)
app.use(passportSession)

app.use(db.middleware)

const router = new Router()

router.use(authRouter.routes(), authRouter.allowedMethods())
router.use(apiRouter.routes(), apiRouter.allowedMethods())
router.use(templateRouter.routes(), templateRouter.allowedMethods())

interface RouteInfo {
  Path: string
  Method: string
}

const listRoutes = (router: Router): RouteInfo[] => {
  return router.stack.map((route) => ({
    Path: route.path,
    Method: route.methods.length > 4 ? "<many>" : route.methods.join(', '),
  }))
}

// Print routes in a table format
console.log('Defined Routes:')
console.table(listRoutes(router))

app.use(router.routes())
app.use(router.allowedMethods())
