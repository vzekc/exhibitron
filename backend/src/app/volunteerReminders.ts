import cron from 'node-cron'
import { RequestContext } from '@mikro-orm/core'
import { initORM, Services } from '../db.js'
import { logger } from './logger.js'
import { sendEmail } from '../modules/common/sendEmail.js'
import { makeDigestEmail, makeReminderEmail } from '../modules/volunteer/emails.js'
import { VolunteerBooking } from '../modules/volunteer/entity.js'
import { Exhibition } from '../modules/exhibition/entity.js'
import { User } from '../modules/user/entity.js'
import { Exhibitor } from '../modules/exhibitor/entity.js'

const reminderLogger = logger.child({ module: 'volunteerReminders' })

/* The evening digest goes out at this hour, local time. */
const DIGEST_HOUR = 20

/*
 * How far ahead the short reminder looks. It is wider than the quarter hour
 * between two runs so that a run the machine missed is caught by the next one;
 * the stamp on the booking keeps anybody from being told twice.
 */
const REMINDER_MINUTES = 75

/* An address nobody confirmed in this long is nobody's address. */
const UNVERIFIED_HOURS = 48

const MINUTE = 60_000
const HOUR = 60 * MINUTE

const siteUrlFor = (exhibition: Exhibition) =>
  process.env.SITE_URL ?? (exhibition.dnsZone ? `https://${exhibition.dnsZone}` : '')

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const bookingPopulate = [
  'user',
  'period',
  'period.activity',
  'period.activity.exhibition',
  'period.activity.contact.user',
] as const

/*
 * Everything the reminders do at one reading of the clock. `now` is passed in
 * rather than read, so that a test can stand at eight in the evening.
 */
export const sendVolunteerReminders = async (db: Services, now: Date) => {
  const counts = { digests: 0, reminders: 0, deletedAccounts: 0 }

  if (now.getHours() === DIGEST_HOUR) {
    const tomorrow = startOfDay(new Date(now.getTime() + 24 * HOUR))
    const dayAfter = new Date(tomorrow.getTime() + 24 * HOUR)

    const bookings = await db.em.find(
      VolunteerBooking,
      {
        digestSentAt: null,
        startTime: { $gte: tomorrow, $lt: dayAfter },
        user: { emailVerifiedAt: { $ne: null } },
      },
      { populate: bookingPopulate, orderBy: { startTime: 'asc' } },
    )

    const byUser = new Map<number, VolunteerBooking[]>()
    for (const booking of bookings) {
      byUser.set(booking.user.id, [...(byUser.get(booking.user.id) ?? []), booking])
    }

    for (const [, ownBookings] of byUser) {
      const { user } = ownBookings[0]
      const { exhibition } = ownBookings[0].period.activity
      await sendEmail(
        makeDigestEmail(
          user.fullName,
          user.email,
          ownBookings,
          siteUrlFor(exhibition) && `${siteUrlFor(exhibition)}/mitmachen`,
          exhibition.title,
        ),
      )
      ownBookings.forEach((booking) => (booking.digestSentAt = now))
      counts.digests++
    }
  }

  const soon = await db.em.find(
    VolunteerBooking,
    {
      reminderSentAt: null,
      startTime: { $gt: now, $lte: new Date(now.getTime() + REMINDER_MINUTES * MINUTE) },
      user: { emailVerifiedAt: { $ne: null } },
    },
    { populate: bookingPopulate },
  )
  for (const booking of soon) {
    const { user } = booking
    await sendEmail(
      makeReminderEmail(
        user.fullName,
        user.email,
        booking,
        booking.period.activity.exhibition.title,
      ),
    )
    booking.reminderSentAt = now
    counts.reminders++
  }

  /* An account made for a booking that was never confirmed, with its bookings. */
  const stale = await db.em.find(User, {
    emailVerifiedAt: null,
    nickname: null,
    password: null,
    createdAt: { $lt: new Date(now.getTime() - UNVERIFIED_HOURS * HOUR) },
  })
  for (const user of stale) {
    if (await db.em.count(Exhibitor, { user })) continue
    db.em.remove(user)
    counts.deletedAccounts++
  }

  await db.em.flush()
  if (counts.digests || counts.reminders || counts.deletedAccounts) {
    reminderLogger.info(counts, 'volunteer reminders sent')
  }
  return counts
}

export const runVolunteerReminders = async () => {
  const db = await initORM({ allowGlobalContext: true })
  await RequestContext.create(db.em, async () => {
    await sendVolunteerReminders(db, new Date()).catch((error) =>
      reminderLogger.error({ error }, 'volunteer reminders failed'),
    )
  })
}

export const startVolunteerReminderScheduler = () => {
  cron.schedule('*/15 * * * *', runVolunteerReminders)
  reminderLogger.info('Volunteer reminder scheduler started (runs every 15 minutes)')
}
