import { readFile } from 'fs/promises'
import { initORM } from '../db.js'
import { RequestContext } from '@mikro-orm/core'

const main = async () => {
  const [exhibitionKey, svgPath] = process.argv.slice(2)

  if (!exhibitionKey || !svgPath) {
    console.error('Usage: npm run import-seatplan <exhibition-key> <svg-file>')
    console.error('Example: npm run import-seatplan cc2025 ../frontend/public/seatplan-cc2025.svg')
    process.exit(1)
  }

  const svgContent = await readFile(svgPath, 'utf8')
  const db = await initORM({ allowGlobalContext: true })

  try {
    await new Promise<void>((resolve, reject) => {
      RequestContext.create(db.em, async () => {
        try {
          const exhibition = await db.exhibition.findOne({ key: exhibitionKey })
          if (!exhibition) {
            console.error(`Exhibition with key "${exhibitionKey}" not found`)
            process.exit(1)
          }

          exhibition.seatplanSvg = svgContent
          await db.em.flush()
          console.log(
            `Imported ${svgContent.length} bytes of SVG into exhibition "${exhibition.title}" (${exhibitionKey})`,
          )
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    })
  } finally {
    await db.orm.close()
  }
}

main().catch((error) => {
  console.error('Failed:', error)
  process.exit(1)
})
