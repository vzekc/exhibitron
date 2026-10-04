import { FastifyInstance } from 'fastify'
import { convert } from 'html-to-text'
import { initORM } from '../../db.js'
import { VisitorPhoto } from '../visitorPhoto/entity.js'
import { ConferenceSession } from '../conferenceSession/entity.js'
import { Exhibit } from '../exhibit/entity.js'
import { Page } from '../page/entity.js'

/*
 * What the information display in the hall shows: a 40-column terminal that
 * polls this once a minute and turns it into pages of its own. Everything here
 * is public already — the schedule and the exhibits are on the site, and the
 * photo counts name nobody.
 *
 * The hand-written page is the Page with the key below, edited in the site's
 * page editor, so its text can change during the show without a deploy. It is
 * sent as plain text with paragraphs on lines of their own; the display wraps it
 * to its own width.
 */
export const INFO_PAGE_KEY = 'infodisplay'

const ZONE = 'Europe/Berlin'
const UPCOMING_SESSIONS = 8

const dayAndHour = (date: Date) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  )
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) }
}

export const registerInfodisplayRoutes = async (app: FastifyInstance) => {
  const db = await initORM()

  app.get('/api/infodisplay', async (request) => {
    const { exhibition } = request.apolloContext
    const now = new Date()
    const today = dayAndHour(now).day

    // Every photo taken counts, including those whose owners had them deleted
    const recent = await db.em.find(VisitorPhoto, {
      exhibition,
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    })
    const takenToday = recent.filter(({ createdAt }) => dayAndHour(createdAt).day === today)
    const byHour = new Map<number, number>()
    for (const { createdAt } of takenToday) {
      const { hour } = dayAndHour(createdAt)
      byHour.set(hour, (byHour.get(hour) ?? 0) + 1)
    }

    const sessions = await db.em.find(
      ConferenceSession,
      { exhibition, startTime: { $ne: null }, durationMinutes: { $ne: null }, room: { $ne: null } },
      { populate: ['room', 'exhibitors.user'], orderBy: { startTime: 'asc' } },
    )
    const upcoming = sessions
      .map((session) => ({
        session,
        endTime: new Date(session.startTime!.getTime() + session.durationMinutes! * 60 * 1000),
      }))
      .filter(({ endTime }) => endTime > now)
      .slice(0, UPCOMING_SESSIONS)

    const exhibits = await db.em.find(
      Exhibit,
      { exhibition, table: { $ne: null } },
      { populate: ['table', 'exhibitor.user'], orderBy: { table: { number: 'asc' } } },
    )

    const infoPage = await db.em.findOne(Page, { exhibition, key: INFO_PAGE_KEY })

    return {
      now: now.toISOString(),
      exhibition: exhibition.title,
      photos: {
        today: takenToday.length,
        todayBooth: takenToday.filter(({ source }) => source === 'booth').length,
        todayWeb: takenToday.filter(({ source }) => source === 'web').length,
        total: await db.em.count(VisitorPhoto, { exhibition }),
        byHour: [...byHour.entries()]
          .sort(([a], [b]) => a - b)
          .map(([hour, count]) => ({ hour, count })),
      },
      sessions: upcoming.map(({ session, endTime }) => ({
        title: session.title,
        startTime: session.startTime!.toISOString(),
        endTime: endTime.toISOString(),
        room: session.room!.name,
        presenters: session.exhibitors.getItems().map(({ user }) => user.fullName),
      })),
      exhibits: exhibits.map(({ title, exhibitor, table }) => ({
        title,
        exhibitor: exhibitor.user.fullName,
        table: table!.number,
      })),
      info: infoPage && {
        title: infoPage.title,
        text: convert(infoPage.content?.html ?? '', {
          wordwrap: false,
          selectors: [
            { selector: 'img', format: 'skip' },
            { selector: 'a', options: { ignoreHref: true } },
            { selector: 'h1', options: { uppercase: false } },
            { selector: 'h2', options: { uppercase: false } },
            { selector: 'h3', options: { uppercase: false } },
          ],
        }),
      },
    }
  })
}
