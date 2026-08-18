import { Context } from '../../app/context.js'
import { User } from '../user/entity.js'
import { ConferenceSession } from '../conferenceSession/entity.js'
import { VolunteerBooking, VolunteerPeriod } from './entity.js'
import { BadRequestError } from '../common/errors.js'

/* Volunteers pick their own times, but only on the quarter hour. */
const SLOT_MINUTES = 15

export interface SlotInput {
  periodId: number
  startTime: Date
  durationMinutes: number
}

const endOf = (startTime: Date, durationMinutes: number) =>
  new Date(startTime.getTime() + durationMinutes * 60_000)

const time = (date: Date) =>
  date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

const day = (date: Date) => date.toLocaleDateString('de-DE', { weekday: 'long' })

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart < bEnd && bStart < aEnd

/*
 * Everything that has to hold for somebody to help at a given time. The times
 * come from a calendar the visitor dragged in, so each refusal says what is in
 * the way rather than that something is wrong.
 */
export const bookSlot = async (context: Context, user: User, input: SlotInput) => {
  const { db, exhibition } = context

  if (input.durationMinutes <= 0) {
    throw new BadRequestError('Eine Schicht dauert länger als null Minuten')
  }
  if (input.startTime.getMinutes() % SLOT_MINUTES || input.durationMinutes % SLOT_MINUTES) {
    throw new BadRequestError('Schichten beginnen und enden zur Viertelstunde')
  }

  const period = await db.em.findOneOrFail(
    VolunteerPeriod,
    { id: input.periodId, activity: { exhibition } },
    { populate: ['activity'] },
  )

  const start = input.startTime
  const end = endOf(start, input.durationMinutes)
  const periodEnd = endOf(period.startTime, period.durationMinutes)
  if (start < period.startTime || end > periodEnd) {
    throw new BadRequestError(
      `Hilfe wird hier von ${time(period.startTime)} bis ${time(periodEnd)} gebraucht`,
    )
  }

  const ownBookings = await db.em.find(
    VolunteerBooking,
    { user, period: { activity: { exhibition } } },
    { populate: ['period', 'period.activity'] },
  )
  const clash = ownBookings.find((booking) =>
    overlaps(start, end, booking.startTime, endOf(booking.startTime, booking.durationMinutes)),
  )
  if (clash) {
    throw new BadRequestError(
      `Du hilfst am ${day(clash.startTime)} um ${time(clash.startTime)} schon bei „${clash.period.activity.name}“`,
    )
  }

  /* Somebody who is giving a talk cannot be at the Infotresen at the same time. */
  const talks = await db.em.find(
    ConferenceSession,
    { exhibition, exhibitors: { user }, startTime: { $ne: null } },
    { populate: ['exhibitors'] },
  )
  const talk = talks.find(
    (session) =>
      session.startTime &&
      overlaps(
        start,
        end,
        session.startTime,
        endOf(session.startTime, session.durationMinutes ?? 0),
      ),
  )
  if (talk) {
    throw new BadRequestError(
      `Du hältst am ${day(talk.startTime!)} um ${time(talk.startTime!)} den Vortrag „${talk.title}“`,
    )
  }

  /*
   * A stretch that begins where one of this volunteer's own ends, or ends
   * where one begins, is the same shift said twice. They become one, however
   * many they are — filling a gap between two joins all three.
   */
  const touching = ownBookings.filter(
    (booking) =>
      booking.period.id === period.id &&
      (endOf(booking.startTime, booking.durationMinutes).getTime() === start.getTime() ||
        booking.startTime.getTime() === end.getTime()),
  )
  if (touching.length) {
    const [kept, ...swallowed] = touching
    const from = new Date(Math.min(start.getTime(), ...touching.map((b) => b.startTime.getTime())))
    const to = new Date(
      Math.max(
        end.getTime(),
        ...touching.map((b) => endOf(b.startTime, b.durationMinutes).getTime()),
      ),
    )
    kept.startTime = from
    kept.durationMinutes = Math.round((to.getTime() - from.getTime()) / 60_000)
    swallowed.forEach((booking) => db.em.remove(booking))
    await db.em.flush()
    return kept
  }

  const booking = db.em.create(VolunteerBooking, {
    period,
    user,
    startTime: start,
    durationMinutes: input.durationMinutes,
  })
  await db.em.persist(booking).flush()
  return booking
}
