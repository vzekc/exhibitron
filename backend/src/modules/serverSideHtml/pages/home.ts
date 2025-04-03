import { GeneratePageHtmlContext, transformImageUrls } from '../utils.js'

export const homeHtml = async ({ db, exhibition, gifSuffix }: GeneratePageHtmlContext) => {
  const page = await db.page.findOneOrFail({ exhibition, key: 'home' })
  if (!page.content?.html) return ''
  return await transformImageUrls(page.content.html, db, 'htmlSmall', gifSuffix)
}
