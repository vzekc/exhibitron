import {
  GeneratePageHtmlContext,
  ITEMS_PER_PAGE,
  makeExhibitLink,
  makeExhibitorLink,
  makePaginationControls,
} from '../utils.js'
import { ensureTransformedImage } from '../../image/transformation.js'

export const exhibitsHtml = async ({ db, exhibition, request }: GeneratePageHtmlContext) => {
  const page = parseInt((request.query as { page?: string }).page || '1')
  const offset = (page - 1) * ITEMS_PER_PAGE

  const [exhibits, total] = await Promise.all([
    db.exhibit.findAll({
      where: { exhibition },
      populate: ['exhibitor', 'exhibitor.user', 'mainImage', 'mainImage.image'],
      limit: ITEMS_PER_PAGE,
      offset,
      orderBy: { title: 'asc' },
    }),
    db.exhibit.count({ exhibition }),
  ])

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const paginationControls = makePaginationControls(page, totalPages, '/exhibits.html')

  const exhibitsList = exhibits.map(async (exhibit) => {
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
  const exhibitsListHtml = (await Promise.all(exhibitsList)).join('')

  return `${paginationControls}${exhibitsListHtml}${paginationControls}`
}
