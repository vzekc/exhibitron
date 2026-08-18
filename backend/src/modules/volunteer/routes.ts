import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { generateICalContent, Session } from '../schedule/ical.js'
import { VolunteerBooking } from './entity.js'

/*
 * The volunteer's own shifts as a calendar file, so that they stand in the
 * phone people actually look at. Only ever the caller's own shifts.
 */
export const registerVolunteerRoutes = async (app: FastifyInstance) => {
  const db = await initORM()

  app.get('/api/volunteer/shifts.ics', async (request, reply) => {
    const { exhibition, user } = request.apolloContext
    if (!user) {
      return reply.code(401).send({ error: 'Bitte melde dich an' })
    }

    const bookings = await db.em.find(
      VolunteerBooking,
      { user, period: { activity: { exhibition } } },
      {
        populate: ['period', 'period.activity', 'period.activity.contact.user'],
        orderBy: { startTime: 'asc' },
      },
    )

    const events = bookings.map((booking) => ({
      id: booking.id.toString(),
      title: booking.period.activity.name,
      startTime: booking.startTime,
      endTime: new Date(booking.startTime.getTime() + booking.durationMinutes * 60_000),
      room: '',
      presenters: booking.period.activity.contact
        ? [booking.period.activity.contact.user.fullName]
        : [],
    }))

    const origin = `${request.protocol}://${request.headers.host}`
    reply.header('Content-Type', 'text/calendar; charset=utf-8')
    reply.header('Content-Disposition', 'attachment; filename="meine-schichten.ics"')
    return generateICalContent(
      events as Session[],
      `${exhibition.title} — Meine Schichten`,
      exhibition.key,
      origin,
      () => `${origin}/mitmachen`,
    )
  })
}
