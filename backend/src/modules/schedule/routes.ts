import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { generateICalContent, Session } from './ical.js'
import { ConferenceSession } from '../conferenceSession/entity.js'

export const registerScheduleRoutes = async (app: FastifyInstance) => {
  const db = await initORM()

  app.get('/api/schedule', async (request, reply) => {
    const { exhibition } = request.apolloContext
    await db.em.populate(exhibition, ['conferenceSessions'])
    const sessions = await Promise.all(
      exhibition.conferenceSessions
        .toArray()
        .filter(({ startTime, durationMinutes, room }) => startTime && durationMinutes && room)
        .sort((a, b) => (a.startTime?.getTime() ?? 0) - (b.startTime?.getTime() ?? 0))
        .map(async (sessionDto) => {
          const session = await db.em.findOneOrFail(
            ConferenceSession,
            { id: sessionDto.id },
            { populate: ['room', 'exhibitors.user'] },
          )
          const endTime =
            session.startTime && session.durationMinutes
              ? new Date(session.startTime.getTime() + session.durationMinutes * 60 * 1000)
              : undefined
          return {
            id: session.id.toString(),
            title: session.title,
            startTime: session.startTime,
            endTime,
            room: session.room?.name || null,
            presenters: session.exhibitors
              .toArray()
              .map(({ user }) => user.fullName + (user.nickname ? ` (${user.nickname})` : '')),
          }
        }),
    )
    reply.header('Content-Type', 'text/calendar; charset=utf-8')
    const origin = `${request.protocol}://${request.headers.host}`
    return generateICalContent(sessions as Session[], exhibition.title, exhibition.key, origin)
  })
}
