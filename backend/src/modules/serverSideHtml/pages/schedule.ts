import { GeneratePageHtmlContext } from '../utils.js'

export const scheduleHtml = async ({ db, exhibition }: GeneratePageHtmlContext) => {
  const page = await db.page.findOneOrFail({ exhibition, key: 'schedule' })
  return page.content?.html || ''
}
