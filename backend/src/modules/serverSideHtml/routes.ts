import { FastifyInstance, FastifyReply, RouteHandlerMethod, HTTPMethods } from 'fastify'
import { initORM } from '../../db.js'
import iconv from 'iconv-lite'
import { isModernBrowser, isLegacyBrowser } from './browser-detection.js'
import { makeMenuHtml } from './utils.js'
import { homeHtml } from './pages/home.js'
import { scheduleHtml } from './pages/schedule.js'
import { exhibitorsHtml } from './pages/exhibitors.js'
import { exhibitsHtml } from './pages/exhibits.js'
import { exhibitHtml } from './pages/exhibit.js'
import { exhibitorHtml } from './pages/exhibitor.js'
import { lanHtml } from './pages/lan.js'
import { exhibitorListHtml } from './pages/exhibitorList.js'
import { GeneratePageHtmlContext } from './utils.js'
import { readFile } from 'fs/promises'
import { join } from 'path'

const servePageHtml = async (
  reply: FastifyReply,
  htmlContent: string,
  context: GeneratePageHtmlContext,
) => {
  // Skip header for exhibitor list page
  const content = context.noHeader ? htmlContent : makeMenuHtml(context) + htmlContent

  // Convert UTF-8 to ISO-8859-1 using iconv-lite
  const iso88591Content = iconv.encode(content, 'ISO-8859-1')

  return reply
    .code(200)
    .header('Content-Type', 'text/html; charset=ISO-8859-1')
    .send(iso88591Content)
}

type RouteHandlerWithoutId = (context: GeneratePageHtmlContext) => Promise<string>
type RouteHandlerWithId = (context: GeneratePageHtmlContext, id: number) => Promise<string>

type RouteConfigWithoutId = {
  path: string
  handler: RouteHandlerWithoutId
  methods?: HTTPMethods[]
  hasIdParam?: false
  noHeader?: boolean
}

type RouteConfigWithId = {
  path: string
  handler: RouteHandlerWithId
  methods?: HTTPMethods[]
  hasIdParam: true
  noHeader?: boolean
}

type RouteConfig = RouteConfigWithoutId | RouteConfigWithId

const createRoute = <T extends RouteConfig>(
  config: T,
): T & { methods: HTTPMethods[]; hasIdParam: boolean; noHeader?: boolean } => ({
  methods: ['GET'],
  hasIdParam: false,
  ...config,
})

export const registerServerSideHtmlRoutes = async (app: FastifyInstance): Promise<void> => {
  const db = await initORM()

  // Add route for logo
  app.get('/vzekc-logo.gif', async (_, reply) => {
    const logoPath = join(process.cwd(), 'vzekc-logo.gif')
    const logoBuffer = await readFile(logoPath)
    return reply.code(200).header('Content-Type', 'image/gif').send(logoBuffer)
  })

  // Browser detection middleware for home page redirection
  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/' && !isModernBrowser(request)) {
      return reply.redirect('/home.html')
    }
  })

  const routes = [
    createRoute({ path: '/home.html', handler: homeHtml }),
    createRoute({ path: '/schedule.html', handler: scheduleHtml }),
    createRoute({ path: '/exhibitors.html', handler: exhibitorsHtml }),
    createRoute({ path: '/exhibits.html', handler: exhibitsHtml }),
    createRoute({ path: '/exhibit/:id.html', handler: exhibitHtml, hasIdParam: true }),
    createRoute({
      path: '/exhibitor/:id.html',
      handler: exhibitorHtml,
      hasIdParam: true,
      methods: ['GET', 'POST'],
    }),
    createRoute({ path: '/lan.html', handler: lanHtml }),
    createRoute({ path: '/exhibitor-list.html', handler: exhibitorListHtml, noHeader: true }),
  ] as const

  for (const route of routes) {
    const handler: RouteHandlerMethod = async (request, reply) => {
      const exhibition = request.apolloContext.exhibition
      const userAgent = request.headers['user-agent'] || ''
      const gifSuffix = isLegacyBrowser(userAgent) ? 'Gif' : ''
      const context = { request, exhibition, db, gifSuffix, noHeader: route.noHeader }

      if (route.hasIdParam) {
        const id = (request.params as { id: string }).id
        const parsedId = parseInt(id, 10)
        if (isNaN(parsedId)) {
          return reply.code(400).send('Invalid ID parameter')
        }
        return servePageHtml(reply, await route.handler(context, parsedId), context)
      } else {
        return servePageHtml(reply, await route.handler(context), context)
      }
    }

    for (const method of route.methods) {
      app.route({
        method,
        url: route.path,
        handler,
      })
    }
  }
}
