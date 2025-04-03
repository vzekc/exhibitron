import {
  GeneratePageHtmlContext,
  ITEMS_PER_PAGE,
  makeExhibitorLink,
  makePaginationControls,
} from '../utils.js'

export const exhibitorsHtml = async ({ db, exhibition, request }: GeneratePageHtmlContext) => {
  const page = parseInt((request.query as { page?: string }).page || '1')
  const offset = (page - 1) * ITEMS_PER_PAGE

  const [exhibitors, total] = await Promise.all([
    db.exhibitor.findAll({
      where: { exhibition },
      populate: ['user', 'exhibits'],
      limit: ITEMS_PER_PAGE,
      offset,
      orderBy: { user: { fullName: 'asc' } },
    }),
    db.exhibitor.count({ exhibition }),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const paginationControls = makePaginationControls(page, totalPages, '/exhibitors.html')

  const exhibitorsList = exhibitors
    .map((exhibitor) => {
      return `<div>
      <h2>${makeExhibitorLink(exhibitor)}</h2>
      ${exhibitor.topic ? '<p>' + exhibitor.topic + '</p>' : ''}
    </div>`
    })
    .join('')

  return `${paginationControls}${exhibitorsList}${paginationControls}`
}
