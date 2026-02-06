import { initORM } from '../db.js'
import { RequestContext } from '@mikro-orm/core'

const main = async () => {
  const [action, email, exhibitionKey] = process.argv.slice(2)

  if (!action || !email || !exhibitionKey || !['add', 'remove'].includes(action)) {
    console.error('Usage: npm run manage-admin <add|remove> <user-email> <exhibition-key>')
    console.error('Example: npm run manage-admin add user@example.com cc2025')
    process.exit(1)
  }

  const db = await initORM({ allowGlobalContext: true })

  try {
    await new Promise<void>((resolve, reject) => {
      RequestContext.create(db.em, async () => {
        try {
          const user = await db.user.findOne({ email })
          if (!user) {
            console.error(`User with email "${email}" not found`)
            process.exit(1)
          }

          const exhibition = await db.exhibition.findOne({ key: exhibitionKey })
          if (!exhibition) {
            console.error(`Exhibition with key "${exhibitionKey}" not found`)
            process.exit(1)
          }

          await db.em.populate(user, ['adminExhibitions'])

          if (action === 'add') {
            if (user.adminExhibitions.contains(exhibition)) {
              console.log(
                `User "${email}" is already an admin for exhibition "${exhibition.title}"`,
              )
            } else {
              user.adminExhibitions.add(exhibition)
              await db.em.flush()
              console.log(`Added "${email}" as admin for exhibition "${exhibition.title}"`)
            }
          } else {
            if (!user.adminExhibitions.contains(exhibition)) {
              console.log(`User "${email}" is not an admin for exhibition "${exhibition.title}"`)
            } else {
              user.adminExhibitions.remove(exhibition)
              await db.em.flush()
              console.log(`Removed "${email}" as admin for exhibition "${exhibition.title}"`)
            }
          }

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
