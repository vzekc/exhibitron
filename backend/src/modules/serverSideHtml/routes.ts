import { FastifyInstance, FastifyReply, FastifyRequest, RouteHandlerMethod } from 'fastify'
import { initORM } from '../../db.js'
import { Services } from '../../db.js'
import iconv from 'iconv-lite'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Exhibit } from '../exhibit/entity.js'
import { sendEmail } from '../common/sendEmail.js'
import { makeVisitorContactEmail } from '../registration/emails.js'
import { isModernBrowser } from './browser-detection.js'

type GeneratePageHtmlContext = {
  db: Services
  exhibition: Exhibition
  request: FastifyRequest
}

const serverContentPageHtml = async ({ db, exhibition }: GeneratePageHtmlContext, key: string) => {
  const page = await db.page.findOneOrFail({ exhibition, key })

  return page.content?.html || ''
}

const compareExhibitors = (a: Exhibitor, b: Exhibitor) => {
  const nameA = a.user.fullName.toLowerCase()
  const nameB = b.user.fullName.toLowerCase()

  return nameA.localeCompare(nameB)
}

const makeExhibitorLink = (exhibitor: Exhibitor) =>
  `<a href="/exhibitor/${exhibitor.id}.html">${exhibitor.user.fullName}${exhibitor.user.nickname ? ' (' + exhibitor.user.nickname + ')' : ''}</a>`

const makeExhibitLink = (exhibit: Exhibit) =>
  `<a href="/exhibit/${exhibit.id}.html">${exhibit.title}</a>`

const ITEMS_PER_PAGE = 10

const makePaginationControls = (currentPage: number, totalPages: number, baseUrl: string) => {
  if (totalPages <= 1) return ''

  const makePageLink = (page: number, text: string) => {
    if (page === currentPage) return `<strong>${text}</strong>`
    return `<a href="${baseUrl}?page=${page}">${text}</a>`
  }

  const controls = []

  // First page
  if (currentPage > 1) {
    controls.push(makePageLink(1, '<< First'))
    if (currentPage > 2) {
      controls.push(makePageLink(currentPage - 1, '< Previous'))
    }
  }

  // Page numbers
  const startPage = Math.max(1, currentPage - 2)
  const endPage = Math.min(totalPages, currentPage + 2)

  for (let i = startPage; i <= endPage; i++) {
    controls.push(makePageLink(i, i.toString()))
  }

  // Last page
  if (currentPage < totalPages) {
    if (currentPage < totalPages - 1) {
      controls.push(makePageLink(currentPage + 1, 'Next >'))
    }
    controls.push(makePageLink(totalPages, 'Last >>'))
  }

  return `<div class="pagination">${controls.join(' | ')}</div>`
}

const exhibitorsHtml = async ({ db, exhibition, request }: GeneratePageHtmlContext) => {
  const page = parseInt((request.query as { page?: string }).page || '1')
  const offset = (page - 1) * ITEMS_PER_PAGE

  const [exhibitors, total] = await Promise.all([
    db.exhibitor.findAll({
      where: { exhibition },
      populate: ['user', 'exhibits'],
      limit: ITEMS_PER_PAGE,
      offset,
    }),
    db.exhibitor.count({ exhibition }),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const paginationControls = makePaginationControls(page, totalPages, '/exhibitors.html')

  const exhibitorsList = exhibitors
    .sort(compareExhibitors)
    .map((exhibitor) => {
      return `<div>
      <h2>${makeExhibitorLink(exhibitor)}</h2>
      ${exhibitor.topic ? '<p>' + exhibitor.topic + '</p>' : ''}
    </div>`
    })
    .join('')

  return `${paginationControls}${exhibitorsList}${paginationControls}`
}

const compareExhibits = (a: Exhibit, b: Exhibit) => {
  const nameA = a.title.toLowerCase()
  const nameB = b.title.toLowerCase()

  return nameA.localeCompare(nameB)
}

const exhibitsHtml = async ({ db, exhibition, request }: GeneratePageHtmlContext) => {
  const page = parseInt((request.query as { page?: string }).page || '1')
  const offset = (page - 1) * ITEMS_PER_PAGE

  const [exhibits, total] = await Promise.all([
    db.exhibit.findAll({
      where: { exhibition },
      populate: ['exhibitor', 'exhibitor.user', 'mainImage', 'mainImage.image'],
      limit: ITEMS_PER_PAGE,
      offset,
    }),
    db.exhibit.count({ exhibition }),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const paginationControls = makePaginationControls(page, totalPages, '/exhibits.html')

  const exhibitsList = exhibits
    .sort(compareExhibits)
    .map((exhibit) => {
      return `<div>
      <h2>${makeExhibitLink(exhibit)}</h2>
      ${exhibit.mainImage ? `<img src="/api/images/${exhibit.mainImage.image.slug}/htmlThumbnail" alt="${exhibit.title}" /><br/>` : ''}
      <p>${makeExhibitorLink(exhibit.exhibitor)}</p>
      <hr/>
    </div>`
    })
    .join('')

  return `${paginationControls}${exhibitsList}${paginationControls}`
}

const exhibitHtml = async ({ db }: GeneratePageHtmlContext, id: number) => {
  const exhibit = await db.exhibit.findOneOrFail(
    { id },
    { populate: ['exhibitor', 'exhibitor.user', 'mainImage', 'mainImage.image'] },
  )

  const makeExhibitAttributesTable = () => {
    return `<h2>Datenblatt</h2>
    <table>
      ${exhibit.attributes
        ?.map((attribute) => {
          const [name, value] = attribute
          return `<tr>
          <td>${name}</td>
          <td>${value}</td>
        </tr>`
        })
        .join('')}
    </table>`
  }

  const transformImageUrls = (html: string) => {
    return html.replace(/<img src="\/api\/images\/([^"]+)"/g, '<img src="/api/images/$1/htmlLarge"')
  }

  return `<div>
    <h2>${exhibit.title}</h2>
    <p>${makeExhibitorLink(exhibit.exhibitor)}</p>
    ${exhibit.table?.number ? '<p>Tisch ' + exhibit.table.number + '</p>' : ''}
    ${exhibit.mainImage ? `<img src="/api/images/${exhibit.mainImage.image.slug}/htmlSmall" alt="${exhibit.title}" />` : ''}
    ${(exhibit.attributes?.length && makeExhibitAttributesTable()) || ''}
    <p>
      ${exhibit.description?.html ? transformImageUrls(exhibit.description.html) : ''}
      ${exhibit.descriptionExtension?.html ? transformImageUrls(exhibit.descriptionExtension.html) : ''}
    </p>
  </div>`
}

const exhibitorHtml = async ({ db, exhibition, request }: GeneratePageHtmlContext, id: number) => {
  const exhibitor = await db.exhibitor.findOneOrFail(
    { id },
    { populate: ['user', 'exhibits', 'tables'] },
  )

  const makeEmailContactElements = async () => {
    if (request.method === 'POST') {
      const { message } = request.body as { message: string }
      await sendEmail(
        makeVisitorContactEmail(
          user.email,
          `Nachricht von einem Besucher der ${exhibition.title}`,
          message,
        ),
      )
      return '<hr/><p>Vielen Dank für Deine Nachricht!</p>'
    } else {
      return `<hr/>
        <form method="POST">
          <label for="message">Direktkontakt (Kontaktinformation für Rückantwort nicht vergessen!):</label>
          <br/>
          <textarea id="message" name="message" rows="10" cols="50"></textarea>
          <br/>
          <button type="submit">Absenden</button>
        </form>`
    }
  }

  const { user, tables, exhibits } = exhibitor
  return `<div>
    <h2>${user.fullName}${user.nickname ? ' (' + user.nickname + ')' : ''}</h2>
    ${exhibitor.topic ? '<p>' + exhibitor.topic + '</p>' : ''}
    ${user.profileImage ? `<img src="/api/user/${user.id}/image/profile" alt="${user.fullName}" />` : ''}
    ${user.bio ? '<p>' + user.bio + '</p>' : ''}
    ${tables.length ? '<p>Tische: ' + tables.map((table) => table.number).join(', ') + '</p>' : ''}
    ${exhibits.length ? '<p>Exponate:<p><ul><li>' + [...exhibits].sort(compareExhibits).map(makeExhibitLink).join('</li><li>') + '</li></ul>' : ''}
    ${user.allowEmailContact ? await makeEmailContactElements() : ''}
  </div>`
}

const makeMenuHtml = () => {
  return `
    <div>
      <a href="/home.html">Start</a> |
      <a href="/exhibits.html">Exponate</a> |
      <a href="/exhibitors.html">Mitwirkende</a> |
      <a href="/schedule.html">Zeitplan</a>
    </div>
    <hr/>
  `
}

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

  // Add browser detection middleware
  app.addHook('onRequest', async (request, reply) => {
    const userAgent = request.headers['user-agent'] || ''
    const accept = request.headers.accept
    const isHtmlRequest = accept?.includes('text/html')
    const isApiRequest = request.url.startsWith('/api/') || request.url.startsWith('/auth/')

    // Skip browser detection for API requests and non-HTML requests
    if (!isHtmlRequest || isApiRequest) {
      return
    }

    // For HTML requests, check if the browser is modern enough
    if (!isModernBrowser(userAgent, accept)) {
      // For the root path, redirect to the server-side home page
      if (request.url === '/') {
        return reply.redirect('/home.html')
      }
      // For other paths, ensure they end with .html
      if (!request.url.endsWith('.html')) {
        const path = request.url.replace(/\/$/, '') // Remove trailing slash if present
        return reply.redirect(`${path}.html`)
      }
    }
  })

  for (const key of ['home', 'schedule']) {
    app.get(`/${key}.html`, async (request, reply) => {
      const exhibition = request.apolloContext.exhibition
      return servePageHtml(reply, await serverContentPageHtml({ request, exhibition, db }, key))
    })
  }

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
