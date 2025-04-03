import { GeneratePageHtmlContext, transformImageUrls } from '../utils.js'

export const scheduleHtml = async ({ db, exhibition, gifSuffix }: GeneratePageHtmlContext) => {
  const page = await db.page.findOneOrFail({ exhibition, key: 'schedule' })
  if (!page.content?.html) return ''
  return await transformImageUrls(page.content.html, db, 'htmlSmall', gifSuffix)
}
