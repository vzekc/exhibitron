import { FastifyInstance, FastifyReply, RouteHandlerMethod } from 'fastify'
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

const servePageHtml = async (reply: FastifyReply, htmlContent: string) => {
  // Convert UTF-8 to ISO-8859-1 using iconv-lite
  const iso88591Content = iconv.encode(makeMenuHtml() + htmlContent, 'ISO-8859-1')

  return reply
    .code(200)
    .header('Content-Type', 'text/html; charset=ISO-8859-1')
    .send(iso88591Content)
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

  app.get(`/home.html`, async (request, reply) => {
    const exhibition = request.apolloContext.exhibition
    return servePageHtml(reply, await homeHtml({ request, exhibition, db }))
  })

  app.get(`/schedule.html`, async (request, reply) => {
    const exhibition = request.apolloContext.exhibition
    return servePageHtml(reply, await scheduleHtml({ request, exhibition, db }))
  })

  app.get('/exhibitors.html', async (request, reply) => {
    const exhibition = request.apolloContext.exhibition
    return servePageHtml(reply, await exhibitorsHtml({ request, exhibition, db }))
  })

  app.get('/exhibits.html', async (request, reply) => {
    const exhibition = request.apolloContext.exhibition
    return servePageHtml(reply, await exhibitsHtml({ request, exhibition, db }))
  })

  app.get('/exhibit/:id.html', async (request, reply) => {
    const exhibition = request.apolloContext.exhibition
    const { id } = request.params as { id: number }
    return servePageHtml(reply, await exhibitHtml({ request, exhibition, db }, id))
  })

  const exhibitorHandler: RouteHandlerMethod = async (request, reply) => {
    const exhibition = request.apolloContext.exhibition
    const { id } = request.params as { id: number }
    return servePageHtml(reply, await exhibitorHtml({ request, exhibition, db }, id))
  }

  app.get('/exhibitor/:id.html', exhibitorHandler)
  app.post('/exhibitor/:id.html', exhibitorHandler)
}
