import { graphqlTest } from '../../test/server.js'
import { expect } from 'vitest'
import { initORM } from '../../db.js'
import { Exhibition } from '../exhibition/entity.js'
import { VisitorPhoto } from '../visitorPhoto/entity.js'
import { ConferenceSession } from '../conferenceSession/entity.js'
import { Room } from '../room/entity.js'
import { Exhibit } from '../exhibit/entity.js'
import { Table } from '../table/entity.js'
import { Page } from '../page/entity.js'
import { Document } from '../document/entity.js'
import { INFO_PAGE_KEY } from './routes.js'

type Infodisplay = {
  photos: {
    today: number
    total: number
    byHour: { hour: number; count: number }[]
  }
  sessions: { title: string; room: string; presenters: string[] }[]
  exhibits: { title: string; exhibitor: string; table: number }[]
  info: { title: string; text: string } | null
}

const HOUR = 60 * 60 * 1000

graphqlTest(
  'the display gets the counts, what is still to come, and the info page',
  async (_execute, app) => {
    const db = await initORM()
    const em = db.em.fork()
    const exhibition = await em.findOneOrFail(Exhibition, { key: 'cc2025' })
    const room = await em.findOneOrFail(Room, { name: 'Main Hall' })
    const photo = (id: string, createdAt: Date, source: 'booth' | 'web') =>
      em.create(VisitorPhoto, { id, exhibition, codeHash: '0'.repeat(64), createdAt, source })
    photo('INFO22', new Date(), 'booth')
    photo('INFO33', new Date(), 'web')
    photo('INFO44', new Date(Date.now() - 72 * HOUR), 'booth')
    photo('INFO55', new Date(Date.now() - 72 * HOUR), 'web')
    const session = (title: string, startTime: Date) =>
      em.create(ConferenceSession, { title, startTime, durationMinutes: 60, room, exhibition })
    session('Schon vorbei', new Date(Date.now() - 3 * HOUR))
    session('Läuft gerade', new Date(Date.now() - 0.5 * HOUR))
    session('Kommt noch', new Date(Date.now() + 2 * HOUR))
    const table = await em.findOneOrFail(Table, { exhibition, number: 7 })
    const exhibit = await em.findOneOrFail(Exhibit, { exhibition }, { orderBy: { id: 'asc' } })
    exhibit.table = table
    await em.flush()

    const before = await app.inject({ method: 'GET', url: '/api/infodisplay' })
    expect(before.statusCode).toBe(200)
    const withoutInfo = before.json() as Infodisplay
    expect(withoutInfo.info).toBeNull()
    expect(withoutInfo.photos).toMatchObject({ today: 1, total: 2 })
    expect(withoutInfo.photos.byHour.reduce((sum, { count }) => sum + count, 0)).toBe(1)
    expect(withoutInfo.sessions.map(({ title }) => title)).toStrictEqual([
      'Läuft gerade',
      'Kommt noch',
    ])
    expect(withoutInfo.sessions[0].room).toBe('Main Hall')
    expect(withoutInfo.exhibits).toContainEqual({
      title: exhibit.title,
      exhibitor: expect.any(String),
      table: 7,
    })

    em.create(Page, {
      key: INFO_PAGE_KEY,
      exhibition,
      title: 'Willkommen',
      content: em.create(Document, {
        html: '<h1>Öffnungszeiten</h1><p>Samstag <a href="/x">10–18 Uhr</a></p>',
      }),
    })
    await em.flush()

    const after = (
      await app.inject({ method: 'GET', url: '/api/infodisplay' })
    ).json() as Infodisplay
    expect(after.info).toStrictEqual({
      title: 'Willkommen',
      text: 'Öffnungszeiten\n\nSamstag 10–18 Uhr',
    })
  },
)
