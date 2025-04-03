import {
  GeneratePageHtmlContext,
  ITEMS_PER_PAGE,
  makeExhibitorLink,
  makePaginationControls,
} from '../utils.js'
import { FilterQuery } from '@mikro-orm/core'
import { Exhibitor } from '../../exhibitor/entity.js'

export const exhibitorsHtml = async ({ db, exhibition, request }: GeneratePageHtmlContext) => {
  const page = parseInt((request.query as { page?: string }).page || '1')
  const searchTerm = (request.query as { q?: string }).q || ''
  const offset = (page - 1) * ITEMS_PER_PAGE

  const where: FilterQuery<Exhibitor> = { exhibition }
  if (searchTerm) {
    where.user = {
      $or: [
        { fullName: { $ilike: `%${searchTerm}%` } },
        { nickname: { $ilike: `%${searchTerm}%` } },
      ],
    }
  }

  const [exhibitors, total] = await Promise.all([
    db.exhibitor.findAll({
      where,
      populate: ['user', 'exhibits', 'tables'],
      limit: ITEMS_PER_PAGE,
      offset,
      orderBy: { user: { fullName: 'asc' } },
    }),
    db.exhibitor.count(where),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const paginationControls = makePaginationControls(
    page,
    totalPages,
    '/exhibitors.html',
    searchTerm,
  )

  const searchForm = `
    <form method="GET" style="margin-bottom: 20px;">
      <input type="text" name="q" value="${searchTerm}" placeholder="Suche nach Name oder Nickname..." />
      <button type="submit">Suchen</button>
    </form>
  `

  const exhibitorsList = exhibitors.length
    ? exhibitors
        .map((exhibitor) => {
          return `<div>
                    <h2>${makeExhibitorLink(exhibitor)}  ${
                      exhibitor.tables.length
                        ? 'Tisch(e): ' +
                          exhibitor.tables
                            .map((table) => table.number)
                            .sort()
                            .join(', ')
                        : ''
                    }</h2>
                    ${exhibitor.topic ? '<p>' + exhibitor.topic + '</p>' : ''}
                  </div>`
        })
        .join('')
    : '<p>Keine Aussteller gefunden.</p>'

  return `${searchForm}${paginationControls}${exhibitorsList}${paginationControls}`
}
