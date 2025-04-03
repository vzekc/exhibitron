import { GeneratePageHtmlContext } from '../utils.js'

export const homeHtml = async ({ db, exhibition }: GeneratePageHtmlContext) => {
  const page = await db.page.findOneOrFail({ exhibition, key: 'home' })
  return page.content?.html || ''
}
