import { initORM } from '../db.js'
import { performCleanup } from '../app/cleanup.js'
import { RequestContext } from '@mikro-orm/core'

const main = async () => {
  const exhibitionId = parseInt(process.argv[2], 10)

  if (!exhibitionId || isNaN(exhibitionId)) {
    console.error('Usage: npx tsx src/scripts/cleanup-exhibition.ts <exhibition-id>')
    console.error('Example: npx tsx src/scripts/cleanup-exhibition.ts 1')
    process.exit(1)
  }

  console.log(`Starting cleanup for exhibition ${exhibitionId}...`)

  const db = await initORM({ allowGlobalContext: true })

  try {
    await new Promise<void>((resolve, reject) => {
      RequestContext.create(db.em, async () => {
        try {
          const exhibition = await db.exhibition.findOne({ id: exhibitionId })

          if (!exhibition) {
            console.error(`Exhibition with ID ${exhibitionId} not found`)
            process.exit(1)
          }

          if (exhibition.frozen) {
            console.log(`Exhibition "${exhibition.title}" is already frozen, skipping`)
            process.exit(0)
          }

          console.log(`Processing exhibition: ${exhibition.title}`)
          const result = await performCleanup(db, exhibition)

          console.log(`Deleted ${result.deletedRegistrations} registration(s)`)
          console.log(`Exhibition frozen`)
          console.log(`Admin notification email sent`)
          console.log('Cleanup complete!')
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    })
  } finally {
    await db.orm.close()
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('Cleanup failed:', error)
  process.exit(1)
})
