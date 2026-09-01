import { initORM } from '../db.js'
import { RequestContext } from '@mikro-orm/core'
import { RegistrationStatus } from '../generated/graphql.js'
import { Exhibit } from '../modules/exhibit/entity.js'

/*
 * Maintenance for exhibitor records whose registration is gone or not
 * approved — the leftovers of a rejection that predates the cancellation
 * handling. Without exhibitor ids it lists them; with ids it removes them the
 * way "hat abgesagt" does.
 */
const main = async () => {
  const [exhibitionKey, ...idArgs] = process.argv.slice(2)

  if (!exhibitionKey) {
    console.error(
      'Usage: npx tsx src/scripts/remove-exhibitor.ts <exhibition-key> [exhibitor-id...]',
    )
    console.error('Without ids, lists exhibitors that have no approved registration.')
    process.exit(1)
  }

  const db = await initORM({ allowGlobalContext: true })

  try {
    await new Promise<void>((resolve, reject) => {
      RequestContext.create(db.em, async () => {
        try {
          const exhibition = await db.exhibition.findOneOrFail({ key: exhibitionKey })

          if (idArgs.length === 0) {
            const exhibitors = await db.exhibitor.find({ exhibition }, { populate: ['user'] })
            for (const exhibitor of exhibitors) {
              const { user } = exhibitor
              const registration = await db.registration.findOne({
                exhibition,
                $or: [
                  { email: user.email },
                  ...(user.nickname ? [{ nickname: user.nickname }] : []),
                ],
              })
              if (registration?.status === RegistrationStatus.Approved) continue
              const exhibits = await db.em.count(Exhibit, { exhibitor })
              const tables = await db.table.find({ exhibitor })
              console.log(
                `#${exhibitor.id} ${user.fullName} <${user.email}>` +
                  ` registration: ${registration?.status ?? 'none'}` +
                  ` exhibits: ${exhibits}` +
                  ` tables: ${tables.map((table) => table.number).join(',') || 'none'}`,
              )
            }
            resolve()
            return
          }

          const actor = await db.user.findOneOrFail({ isAdministrator: true })
          for (const idArg of idArgs) {
            const exhibitor = await db.exhibitor.findOneOrFail(
              { id: parseInt(idArg, 10), exhibition },
              { populate: ['user'] },
            )
            console.log(
              `Removing #${exhibitor.id} ${exhibitor.user.fullName} <${exhibitor.user.email}>`,
            )
            await db.exhibitor.cancelParticipation(exhibitor, actor)
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

  process.exit(0)
}

main().catch((error) => {
  console.error('Failed:', error)
  process.exit(1)
})
