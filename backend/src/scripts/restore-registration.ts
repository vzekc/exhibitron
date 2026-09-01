import { initORM } from '../db.js'
import { RequestContext } from '@mikro-orm/core'
import { RegistrationStatus } from '../generated/graphql.js'

/*
 * Recreates the registration row for an exhibitor whose registration was
 * deleted while the participation lived on. The row is created as approved
 * from what the exhibitor record still carries, so the registration UI can
 * manage the participation again. Sends no mail.
 */
const main = async () => {
  const [exhibitionKey, ...idArgs] = process.argv.slice(2)

  if (!exhibitionKey || idArgs.length === 0) {
    console.error(
      'Usage: npx tsx src/scripts/restore-registration.ts <exhibition-key> <exhibitor-id...>',
    )
    process.exit(1)
  }

  const db = await initORM({ allowGlobalContext: true })

  try {
    await new Promise<void>((resolve, reject) => {
      RequestContext.create(db.em, async () => {
        try {
          const exhibition = await db.exhibition.findOneOrFail({ key: exhibitionKey })

          for (const idArg of idArgs) {
            const exhibitor = await db.exhibitor.findOneOrFail(
              { id: parseInt(idArg, 10), exhibition },
              { populate: ['user'] },
            )
            const { user } = exhibitor

            const existing = await db.registration.findOne({
              exhibition,
              $or: [{ email: user.email }, ...(user.nickname ? [{ nickname: user.nickname }] : [])],
            })
            if (existing) {
              console.log(
                `#${exhibitor.id} ${user.fullName}: registration ${existing.id}` +
                  ` already exists (${existing.status}), skipping`,
              )
              continue
            }

            const registration = db.registration.create({
              exhibition,
              status: RegistrationStatus.Approved,
              name: user.fullName,
              email: user.email,
              nickname: user.nickname,
              topic: exhibitor.topic ?? '',
              notes:
                'Anmeldung nachträglich wiederhergestellt, der ursprüngliche Datensatz war gelöscht.',
              data: {},
            })
            db.em.persist(registration)
            console.log(`#${exhibitor.id} ${user.fullName} <${user.email}>: registration recreated`)
          }

          await db.em.flush()
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
