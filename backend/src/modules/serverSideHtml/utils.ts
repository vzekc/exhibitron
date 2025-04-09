import { Services } from '../../db.js'
import { Exhibition } from '../../modules/exhibition/entity.js'
import { Exhibitor } from '../../modules/exhibitor/entity.js'
import { Exhibit } from '../../modules/exhibit/entity.js'
import { FastifyRequest } from 'fastify'
import { ensureTransformedImage } from '../../modules/image/transformation.js'
import { ImageVariantName } from '../../modules/image/types.js'

export type GeneratePageHtmlContext = {
  db: Services
  exhibition: Exhibition
  request: FastifyRequest
  gifSuffix: string
}

export const ITEMS_PER_PAGE = 10

export const makeExhibitorLink = (exhibitor: Exhibitor) =>
  `<a href="/exhibitor/${exhibitor.id}.html">${exhibitor.user.fullName}${exhibitor.user.nickname ? ' (' + exhibitor.user.nickname + ')' : ''}</a>`

export const makeExhibitLink = (exhibit: Exhibit) =>
  `<a href="/exhibit/${exhibit.id}.html">${exhibit.title}</a>`

export const makePaginationControls = (
  currentPage: number,
  totalPages: number,
  baseUrl: string,
  searchTerm?: string,
) => {
  if (totalPages <= 1) return ''

  const makePageLink = (page: number, text: string) => {
    if (page === currentPage) return `<strong>${text}</strong>`
    const searchParam = searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : ''
    return `<a href="${baseUrl}?page=${page}${searchParam}">${text}</a>`
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

export const transformImageUrls = async (
  html: string,
  db: Services,
  variantName: ImageVariantName,
  gifSuffix: string,
) => {
  const imageRegex = /<img src="\/api\/images\/([^"]+)"([^>]*)>/g
  let transformedHtml = html
  let match

  while ((match = imageRegex.exec(html)) !== null) {
    const [fullMatch, imageSlug, existingAttributes] = match
    const image = await db.image.findOneOrFail({ slug: imageSlug })
    const dimensions = await ensureTransformedImage(db.em, image.id, `${variantName}${gifSuffix}`)

    const newAttributes = existingAttributes.replace(/(width|height)="[^"]*"/g, '')
    const newImgTag = `<img src="/api/images/${imageSlug}/${variantName}${gifSuffix}" width="${dimensions.width}" height="${dimensions.height}"${newAttributes}>`
    transformedHtml = transformedHtml.replace(fullMatch, newImgTag)
  }

  return transformedHtml
}

export const makeMenuHtml = (context: GeneratePageHtmlContext) => {
  return `
    <div style="display: flex; align-items: center; margin-bottom: 20px;">
      <img src="/vzekc-logo.gif" alt="Logo" width="40" height="40" style="margin-right: 20px;" />
      <h1>${context.exhibition.title}</h1>
    </div>
    <div>
      <a href="/home.html">Start</a> |
      <a href="/exhibits.html">Exponate</a> |
      <a href="/exhibitors.html">Mitwirkende</a> |
      <a href="/schedule.html">Zeitplan</a>
    </div>
    <hr/>
  `
}
