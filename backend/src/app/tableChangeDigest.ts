import cron from 'node-cron'
import { RequestContext } from '@mikro-orm/core'
import { initORM, Services } from '../db.js'
import { logger } from './logger.js'
import { sendEmail } from '../modules/common/sendEmail.js'
import { makeTableChangeDigestEmail } from '../modules/table/emails.js'
import { TableAssignmentChange } from '../modules/table/entity.js'
import { Exhibition } from '../modules/exhibition/entity.js'
import { Exhibitor } from '../modules/exhibitor/entity.js'

const digestLogger = logger.child({ module: 'tableChangeDigest' })

const siteUrlFor = (exhibition: Exhibition) =>
  process.env.SITE_URL ?? (exhibition.dnsZone ? `https://${exhibition.dnsZone}` : '')

const changePopulate = [
  'exhibition',
  'previousExhibitor.user',
  'newExhibitor.user',
  'actor',
] as const

/*
 * Who hears about one change. A table moving between two exhibitors concerns
 * both of them, the one it went to and the one it came from. Whoever made the
 * change already knows.
 */
const recipientsOf = (change: TableAssignmentChange) =>
  [change.previousExhibitor, change.newExhibitor]
    .filter((exhibitor) => exhibitor != null)
    .filter((exhibitor) => exhibitor.user.id !== change.actor?.id)

/*
 * The day's table movement, told to the exhibitors it happened to. `now` is
 * passed in rather than read, so that a test can stand at any hour.
 *
 * Once an exhibition is under way the tables are settled at the desk and a
 * mail the next morning about yesterday says nothing anybody still needs, so
 * its changes are stamped and left unsent.
 */
export const sendTableChangeDigest = async (db: Services, now: Date) => {
  const counts = { mails: 0, changes: 0, skipped: 0 }

  const pending = await db.em.find(
    TableAssignmentChange,
    { notifiedAt: null },
    { populate: changePopulate, orderBy: { tableNumber: 'asc' } },
  )

  /* One exhibitor, one mail, however many of their tables moved. */
  const byExhibitor = new Map<
    number,
    { user: Exhibitor['user']; changes: TableAssignmentChange[] }
  >()
  for (const change of pending) {
    change.notifiedAt = now
    if (change.exhibition.startDate <= now) {
      counts.skipped++
      continue
    }
    counts.changes++
    for (const exhibitor of recipientsOf(change)) {
      const entry = byExhibitor.get(exhibitor.id) ?? { user: exhibitor.user, changes: [] }
      entry.changes.push(change)
      byExhibitor.set(exhibitor.id, entry)
    }
  }

  for (const [exhibitorId, { user, changes }] of byExhibitor) {
    const { exhibition } = changes[0]
    const siteUrl = siteUrlFor(exhibition)
    await sendEmail(
      makeTableChangeDigestEmail(
        user.fullName || user.nickname || '',
        user.email,
        changes,
        exhibitorId,
        siteUrl && `${siteUrl}/tables`,
        exhibition.title,
      ),
    )
    counts.mails++
  }

  await db.em.flush()
  if (counts.mails || counts.skipped) {
    digestLogger.info(counts, 'table change digest sent')
  }
  return counts
}

export const runTableChangeDigest = async () => {
  const db = await initORM({ allowGlobalContext: true })
  await RequestContext.create(db.em, async () => {
    await sendTableChangeDigest(db, new Date()).catch((error) =>
      digestLogger.error({ error }, 'table change digest failed'),
    )
  })
}

export const startTableChangeDigestScheduler = () => {
  cron.schedule('0 3 * * *', runTableChangeDigest)
  digestLogger.info('Table change digest scheduler started (runs daily at 03:00)')
}
