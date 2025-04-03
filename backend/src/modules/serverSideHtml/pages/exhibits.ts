import {
  GeneratePageHtmlContext,
  ITEMS_PER_PAGE,
  makeExhibitLink,
  makeExhibitorLink,
  makePaginationControls,
} from '../utils.js'
import { ensureTransformedImage } from '../../image/transformation.js'
import { FilterQuery } from '@mikro-orm/core'
import { Exhibit } from '../../../modules/exhibit/entity.js'

export const exhibitsHtml = async ({ db, exhibition, request }: GeneratePageHtmlContext) => {
  const page = parseInt((request.query as { page?: string }).page || '1')
  const searchTerm = (request.query as { q?: string }).q || ''
  const offset = (page - 1) * ITEMS_PER_PAGE

  const where: FilterQuery<Exhibit> = { exhibition }
  if (searchTerm) {
    where.title = { $ilike: `%${searchTerm}%` }
  }

  const [exhibits, total] = await Promise.all([
    db.exhibit.findAll({
      where,
      populate: ['exhibitor', 'exhibitor.user', 'mainImage', 'mainImage.image'],
      limit: ITEMS_PER_PAGE,
      offset,
      orderBy: { title: 'asc' },
    }),
    db.exhibit.count(where),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const paginationControls = makePaginationControls(page, totalPages, '/exhibits.html', searchTerm)

  const searchForm = `
    <form method="GET" style="margin-bottom: 20px;">
      <input type="text" name="q" value="${searchTerm}" placeholder="Suche nach Exponat..." />
      <button type="submit">Suchen</button>
    </form>
  `

  const exhibitsList = exhibits.length
    ? exhibits.map(async (exhibit) => {
        let mainImageHtml = ''
        if (exhibit.mainImage) {
          const dimensions = await ensureTransformedImage(
            db.em,
            exhibit.mainImage.image.id,
            'htmlThumbnail',
          )
          mainImageHtml = `<img src="/api/images/${exhibit.mainImage.image.slug}/htmlSmall" width="${dimensions.width}" height="${dimensions.height}" alt="${exhibit.title}" /><br/>`
        }
        return `<div>
                  <h2>${makeExhibitLink(exhibit)}</h2>
                  ${mainImageHtml}
                  <p>${makeExhibitorLink(exhibit.exhibitor)}</p>
                  <hr/>
                </div>`
      })
    : '<p>Keine Exponate gefunden.</p>'
  const exhibitsListHtml = (await Promise.all(exhibitsList)).join('')

  return `${searchForm}${paginationControls}${exhibitsListHtml}${paginationControls}`
}
