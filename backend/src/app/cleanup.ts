import cron from 'node-cron'
import { initORM, Services } from '../db.js'
import { logger } from './logger.js'
import { sendEmail } from '../modules/common/sendEmail.js'
import { makeCleanupNotificationEmail } from './cleanupEmail.js'
import { Exhibition } from '../modules/exhibition/entity.js'
import { Registration } from '../modules/registration/entity.js'
import { RequestContext } from '@mikro-orm/core'

const cleanupLogger = logger.child({ module: 'cleanup' })

// Core cleanup function - can be called manually or by scheduler
export const performCleanup = async (
  db: Services,
  exhibition: Exhibition,
): Promise<{ deletedRegistrations: number }> => {
  cleanupLogger.info(
    { exhibitionId: exhibition.id, title: exhibition.title },
    `Processing exhibition: ${exhibition.title}`,
  )

  // 1. Delete all registrations
  const deletedCount = await db.em.nativeDelete(Registration, {
    exhibition: exhibition.id,
  })
  cleanupLogger.info(
    { exhibitionId: exhibition.id, deleted: deletedCount },
    `Deleted ${deletedCount} registrations`,
  )

  // 2. Freeze the exhibition
  exhibition.frozen = true
  await db.em.flush()
  cleanupLogger.info({ exhibitionId: exhibition.id }, `Froze exhibition: ${exhibition.title}`)

  // 3. Send email notification to all administrators
  const admins = await db.user.find({ isAdministrator: true })
  const adminEmails = admins.map((admin) => admin.email)

  if (adminEmails.length > 0) {
    await sendEmail(makeCleanupNotificationEmail(adminEmails, exhibition.title, deletedCount))
    cleanupLogger.info(
      { adminCount: adminEmails.length },
      `Sent cleanup notification to ${adminEmails.length} administrator(s)`,
    )
  }

  return { deletedRegistrations: deletedCount }
}

// Scheduled cleanup - finds ended exhibitions automatically
export const runScheduledCleanup = async () => {
  cleanupLogger.info('Starting scheduled post-event cleanup')

  const db = await initORM({ allowGlobalContext: true })

  await new Promise<void>((resolve, reject) => {
    RequestContext.create(db.em, async () => {
      try {
        // Find exhibitions that ended (endDate < today) and are not yet frozen
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(23, 59, 59, 999)

        const endedExhibitions = await db.exhibition.find({
          endDate: { $lte: yesterday },
          frozen: false,
        })

        for (const exhibition of endedExhibitions) {
          await performCleanup(db, exhibition)
        }

        if (endedExhibitions.length === 0) {
          cleanupLogger.debug('No exhibitions to clean up')
        } else {
          cleanupLogger.info({ count: endedExhibitions.length }, 'Post-event cleanup complete')
        }
        resolve()
      } catch (error) {
        cleanupLogger.error({ error }, 'Post-event cleanup failed')
        reject(error)
      }
    })
  })
}

export const startCleanupScheduler = () => {
  // Run daily at 3:00 AM
  cron.schedule('0 3 * * *', runScheduledCleanup)
  cleanupLogger.info('Cleanup scheduler started (runs daily at 3:00 AM)')
}
