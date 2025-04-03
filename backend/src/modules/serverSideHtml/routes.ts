import { FastifyInstance, FastifyReply, RouteHandlerMethod, HTTPMethods } from 'fastify'
import { initORM } from '../../db.js'
import iconv from 'iconv-lite'
import { isModernBrowser } from './browser-detection.js'
import { makeMenuHtml } from './utils.js'
import { homeHtml } from './pages/home.js'
import { scheduleHtml } from './pages/schedule.js'
import { exhibitorsHtml } from './pages/exhibitors.js'
import { exhibitsHtml } from './pages/exhibits.js'
import { exhibitHtml } from './pages/exhibit.js'
import { exhibitorHtml } from './pages/exhibitor.js'
import { GeneratePageHtmlContext } from './utils.js'

const servePageHtml = async (reply: FastifyReply, htmlContent: string) => {
  // Convert UTF-8 to ISO-8859-1 using iconv-lite
  const iso88591Content = iconv.encode(makeMenuHtml() + htmlContent, 'ISO-8859-1')

  return reply
    .code(200)
    .header('Content-Type', 'text/html; charset=ISO-8859-1')
    .send(iso88591Content)
}

type RouteHandler = (context: GeneratePageHtmlContext, id?: number) => Promise<string>

type RouteConfig = {
  path: string
  handler: RouteHandler
  methods?: HTTPMethods[]
  hasIdParam?: boolean
}

export const registerServerSideHtmlRoutes = async (app: FastifyInstance): Promise<void> => {
  const db = await initORM()

  // Browser detection middleware for home page redirection
  app.addHook('onRequest', async (request, reply) => {
    const userAgent = request.headers['user-agent'] || ''
    const accept = request.headers.accept

    if (request.url === '/' && !isModernBrowser(userAgent, accept)) {
      return reply.redirect('/home.html')
    }
  })

  const routes: RouteConfig[] = [
    { path: '/home.html', handler: homeHtml },
    { path: '/schedule.html', handler: scheduleHtml },
    { path: '/exhibitors.html', handler: exhibitorsHtml },
    { path: '/exhibits.html', handler: exhibitsHtml },
    { path: '/exhibit/:id.html', handler: exhibitHtml, hasIdParam: true },
    {
      path: '/exhibitor/:id.html',
      handler: exhibitorHtml,
      hasIdParam: true,
      methods: ['GET', 'POST'],
    },
  ]

  for (const route of routes) {
    const handler: RouteHandlerMethod = async (request, reply) => {
      const exhibition = request.apolloContext.exhibition
      const context = { request, exhibition, db }

      if (route.hasIdParam) {
        const id = (request.params as { id: string }).id
        const parsedId = parseInt(id, 10)
        if (isNaN(parsedId)) {
          return reply.code(400).send('Invalid ID parameter')
        }
        return servePageHtml(reply, await route.handler(context, parsedId))
      }

      return servePageHtml(reply, await route.handler(context))
    }

    for (const method of route.methods || ['GET']) {
      app.route({
        method,
        url: route.path,
        handler,
      })
    }
  }
}
