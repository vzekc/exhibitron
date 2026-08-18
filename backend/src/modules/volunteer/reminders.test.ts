import { describe, expect, test } from 'vitest'
import { RequestContext } from '@mikro-orm/core'
import { initORM, Services } from '../../db.js'
import { sendVolunteerReminders } from '../../app/volunteerReminders.js'
import { performCleanup } from '../../app/cleanup.js'
import { Exhibition } from '../exhibition/entity.js'
import { User } from '../user/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { VolunteerActivity, VolunteerBooking, VolunteerPeriod } from './entity.js'

/* The Saturday of the exhibition, a month off. */
const saturday = new Date(new Date().setHours(0, 0, 0, 0) + 30 * 24 * 3600 * 1000)
const on = (dayOffset: number, hour: number, minute = 0) =>
  new Date(
    saturday.getFullYear(),
    saturday.getMonth(),
    saturday.getDate() + dayOffset,
    hour,
    minute,
  )

const inContext = async (fn: (db: Services) => Promise<void>) => {
  const db = await initORM()
  await RequestContext.create(db.em, async () => fn(db))
}

/*
 * One activity with three people: Daffy, who confirmed his address, Donald,
 * who did not, and a ghost whose account was made for a booking three days
 * ago and never confirmed.
 */
const seed = async (db: Services) => {
  /* Every test in this file starts from the same empty plan. */
  await db.em.nativeDelete(VolunteerBooking, {})
  await db.em.nativeDelete(VolunteerPeriod, {})
  await db.em.nativeDelete(VolunteerActivity, {})
  await db.em.nativeDelete(User, { email: 'ghost@example.com' })
  db.em.clear()

  const exhibition = await db.em.findOneOrFail(Exhibition, { key: 'cc2025' })
  exhibition.frozen = false
  const daffy = await db.em.findOneOrFail(User, { nickname: 'daffy' })
  const donald = await db.em.findOneOrFail(User, { nickname: 'donald' })
  daffy.emailVerifiedAt = new Date()
  donald.emailVerifiedAt = undefined

  const ghost = db.em.create(User, {
    email: 'ghost@example.com',
    fullName: 'Nie Bestätigt',
    isAdministrator: false,
  })
  ghost.createdAt = on(-3, 12)

  const activity = db.em.create(VolunteerActivity, {
    exhibition,
    key: 'infotresen',
    name: 'Infotresen betreuen',
    summary: 'Fragen beantworten',
    contact: await db.em.findOneOrFail(Exhibitor, { user: { nickname: 'donald' } }),
    ordering: 1,
  })
  const period = db.em.create(VolunteerPeriod, {
    activity,
    startTime: on(0, 9),
    durationMinutes: 9 * 60,
    neededCount: 2,
  })

  const bookings = {
    daffyMorning: db.em.create(VolunteerBooking, {
      period,
      user: daffy,
      startTime: on(0, 10),
      durationMinutes: 120,
    }),
    daffyAfternoon: db.em.create(VolunteerBooking, {
      period,
      user: daffy,
      startTime: on(0, 15),
      durationMinutes: 120,
    }),
    donald: db.em.create(VolunteerBooking, {
      period,
      user: donald,
      startTime: on(0, 12),
      durationMinutes: 60,
    }),
    ghost: db.em.create(VolunteerBooking, {
      period,
      user: ghost,
      startTime: on(0, 13),
      durationMinutes: 60,
    }),
  }

  await db.em.flush()
  return bookings
}

describe('volunteer reminders', () => {
  test('the evening before, everybody gets one mail for the whole day', async () => {
    await inContext(async (db) => {
      const bookings = await seed(db)

      /* Half past six is too early for the digest. */
      expect(await sendVolunteerReminders(db, on(-1, 18, 30))).toMatchObject({ digests: 0 })

      const evening = on(-1, 20)
      expect(await sendVolunteerReminders(db, evening)).toMatchObject({ digests: 1 })
      expect(bookings.daffyMorning.digestSentAt).toEqual(evening)
      expect(bookings.daffyAfternoon.digestSentAt).toEqual(evening)

      /* Donald never confirmed his address, so he is told nothing. */
      expect(bookings.donald.digestSentAt).toBeUndefined()

      /* A second run at the same hour repeats nothing. */
      expect(await sendVolunteerReminders(db, on(-1, 20, 15))).toMatchObject({ digests: 0 })
    })
  })

  test('an hour before a shift, a short reminder', async () => {
    await inContext(async (db) => {
      const bookings = await seed(db)

      expect(await sendVolunteerReminders(db, on(0, 8))).toMatchObject({ reminders: 0 })

      const beforehand = on(0, 9, 15)
      expect(await sendVolunteerReminders(db, beforehand)).toMatchObject({ reminders: 1 })
      expect(bookings.daffyMorning.reminderSentAt).toEqual(beforehand)
      expect(bookings.daffyAfternoon.reminderSentAt).toBeUndefined()

      expect(await sendVolunteerReminders(db, on(0, 9, 30))).toMatchObject({ reminders: 0 })

      /* A run the machine missed is caught by the next one. */
      expect(await sendVolunteerReminders(db, on(0, 14, 30))).toMatchObject({ reminders: 1 })
      expect(bookings.daffyAfternoon.reminderSentAt).toEqual(on(0, 14, 30))
    })
  })

  test('an address nobody confirmed takes its account and its shift with it', async () => {
    await inContext(async (db) => {
      await seed(db)

      expect(await sendVolunteerReminders(db, on(0, 12))).toMatchObject({ deletedAccounts: 1 })
      expect(await db.em.count(User, { email: 'ghost@example.com' })).toBe(0)
      expect(await db.em.count(VolunteerBooking, { user: { email: 'ghost@example.com' } })).toBe(0)

      /* Donald is unconfirmed too, but he is an exhibitor and stays. */
      expect(await db.em.count(User, { nickname: 'donald' })).toBe(1)
    })
  })

  test('the post-event cleanup takes the shifts and the volunteer accounts', async () => {
    await inContext(async (db) => {
      await seed(db)
      const exhibition = await db.em.findOneOrFail(Exhibition, { key: 'cc2025' })

      const result = await performCleanup(db, exhibition)
      expect(result.deletedBookings).toBe(4)

      /* The ghost account went; the exhibitors kept theirs. */
      expect(result.deletedVolunteers).toBe(1)
      expect(await db.em.count(User, { email: 'ghost@example.com' })).toBe(0)
      expect(await db.em.count(User, { nickname: 'daffy' })).toBe(1)
      expect(await db.em.count(VolunteerBooking, {})).toBe(0)

      /* The activity itself is no personal data and stays as a record. */
      expect(await db.em.count(VolunteerActivity, { exhibition })).toBe(1)
    })
  })
})
