import { beforeEach, expect, MockedFunction, vi, beforeAll } from 'vitest'
import { graphqlTest } from '../../test/server.js'
import { initORM, Services } from '../../db.js'
import { sendEmail } from '../common/sendEmail.js'
import { sendTableChangeDigest } from '../../app/tableChangeDigest.js'
import { Table, TableAssignmentChange } from './entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { User } from '../user/entity.js'

let mockedSendEmail: MockedFunction<typeof sendEmail>

beforeAll(async () => {
  mockedSendEmail = vi.spyOn(await import('../common/sendEmail.js'), 'sendEmail') as MockedFunction<
    typeof sendEmail
  >
  mockedSendEmail.mockImplementation(async () => {})
})

beforeEach(() => {
  mockedSendEmail.mockClear()
})

/* Well before any exhibition starts, so the digest has something to say. */
const NOW = new Date('2026-06-01T03:00:00Z')

type Cast = {
  exhibition: Exhibition
  anna: Exhibitor
  bernd: Exhibitor
  admin: User
  table: Table
  other: Table
}

/*
 * Two exhibitors, one table and somebody at the desk. Every test starts from
 * the same empty record of changes.
 */
const seed = async (db: Services): Promise<Cast> => {
  const cast = ['anna-tisch@example.com', 'bernd-tisch@example.com', 'desk-tisch@example.com']
  await db.em.nativeDelete(TableAssignmentChange, {})
  await db.em.nativeDelete(Exhibitor, { user: { email: { $in: cast } } })
  await db.em.nativeDelete(User, { email: { $in: cast } })
  db.em.clear()

  const exhibition = await db.em.findOneOrFail(Exhibition, { key: 'cc2025' })
  exhibition.frozen = false
  exhibition.startDate = new Date('2026-09-12T08:00:00Z')

  const make = async (email: string, fullName: string) => {
    const user = db.em.create(User, { email, fullName, isAdministrator: false })
    const exhibitor = db.em.create(Exhibitor, { exhibition, user })
    db.em.persist([user, exhibitor])
    return exhibitor
  }

  const anna = await make('anna-tisch@example.com', 'Anna Adler')
  const bernd = await make('bernd-tisch@example.com', 'Bernd Bauer')
  const admin = db.em.create(User, {
    email: 'desk-tisch@example.com',
    fullName: 'Hilde Helfer',
    isAdministrator: true,
  })
  db.em.persist(admin)

  /* The seed lays out tables 1 to 10; two of them are this file's to move
     about, handed back unheld at the start of every test. */
  const table = await db.em.findOneOrFail(Table, { exhibition, number: 9 })
  const other = await db.em.findOneOrFail(Table, { exhibition, number: 10 })
  table.exhibitor = undefined
  other.exhibitor = undefined
  await db.em.flush()

  return { exhibition, anna, bernd, admin, table, other }
}

const recipients = () =>
  mockedSendEmail.mock.calls.map((call) => (call[0] as { to: string[] }).to[0]).sort()

/*
 * The plain-text rendering of the mail on one line: html-to-text wraps at
 * eighty columns, which would otherwise cut a sentence an assertion looks for.
 */
const bodyFor = (email: string) => {
  const call = mockedSendEmail.mock.calls.find((c) => (c[0] as { to: string[] }).to[0] === email)
  const text = (call?.[0] as { body: { text: string } } | undefined)?.body.text ?? ''
  return text.replace(/\s+/g, ' ')
}

/*
 * A table handed from one exhibitor to another concerns both of them: the one
 * it went to and the one it came from.
 */
graphqlTest('a reassignment reaches both the old and the new holder', async () => {
  const db = await initORM()
  const { exhibition, anna, bernd, admin, table } = await seed(db)

  await db.table.claim(exhibition, table.number, anna, anna.user)
  await db.em.flush()
  await db.table.assignTo(exhibition, table.number, bernd, admin)
  await db.em.flush()

  const counts = await sendTableChangeDigest(db, NOW)

  expect(counts.mails).toBe(2)
  expect(recipients()).toEqual(['anna-tisch@example.com', 'bernd-tisch@example.com'])
  expect(bodyFor('bernd-tisch@example.com')).toContain('Tisch 9 wurde Dir von Hilde Helfer')
  expect(bodyFor('bernd-tisch@example.com')).toContain('vorher stand er bei Anna Adler')
  expect(bodyFor('anna-tisch@example.com')).toContain('an Bernd Bauer vergeben')
})

/*
 * Somebody claiming a table for themselves already knows they did, so the
 * change is written down and nothing is sent.
 */
graphqlTest('a change made by the exhibitor themselves is not mailed back to them', async () => {
  const db = await initORM()
  const { exhibition, anna, table } = await seed(db)

  await db.table.claim(exhibition, table.number, anna, anna.user)
  await db.em.flush()

  const counts = await sendTableChangeDigest(db, NOW)

  expect(counts.mails).toBe(0)
  expect(mockedSendEmail).not.toHaveBeenCalled()
  /* Written down all the same, and stamped so it is never reconsidered. */
  const change = await db.em.findOneOrFail(TableAssignmentChange, { tableNumber: table.number })
  expect(change.notifiedAt).toEqual(NOW)
})

/* A change that has been reported is passed by on the next run. */
graphqlTest('a second run says nothing', async () => {
  const db = await initORM()
  const { exhibition, anna, admin, table } = await seed(db)

  await db.table.assignTo(exhibition, table.number, anna, admin)
  await db.em.flush()

  expect((await sendTableChangeDigest(db, NOW)).mails).toBe(1)
  mockedSendEmail.mockClear()
  expect((await sendTableChangeDigest(db, NOW)).mails).toBe(0)
  expect(mockedSendEmail).not.toHaveBeenCalled()
})

/*
 * Once the doors are open the tables are settled at the desk, so the changes
 * are stamped and left unsent.
 */
graphqlTest('an exhibition that has started gets no digest', async () => {
  const db = await initORM()
  const { exhibition, anna, admin, table } = await seed(db)

  await db.table.assignTo(exhibition, table.number, anna, admin)
  await db.em.flush()

  const counts = await sendTableChangeDigest(db, new Date('2026-09-13T03:00:00Z'))

  expect(counts.mails).toBe(0)
  expect(counts.skipped).toBe(1)
  expect(mockedSendEmail).not.toHaveBeenCalled()
})

/* Several tables moving for one exhibitor make one mail, not several. */
graphqlTest('one exhibitor hears about all their tables in a single mail', async () => {
  const db = await initORM()
  const { exhibition, anna, admin, table, other } = await seed(db)

  await db.table.assignTo(exhibition, table.number, anna, admin)
  await db.table.assignTo(exhibition, other.number, anna, admin)
  await db.em.flush()

  const counts = await sendTableChangeDigest(db, NOW)

  expect(counts.mails).toBe(1)
  const body = bodyFor('anna-tisch@example.com')
  expect(body).toContain('Tisch 9')
  expect(body).toContain('Tisch 10')
})

/* Releasing a table the desk took back says so to the exhibitor who held it. */
graphqlTest('a release by the desk reaches the exhibitor who held the table', async () => {
  const db = await initORM()
  const { exhibition, anna, admin, table } = await seed(db)

  await db.table.claim(exhibition, table.number, anna, anna.user)
  await db.em.flush()
  await db.table.release(exhibition, table.number, null, admin)
  await db.em.flush()

  const counts = await sendTableChangeDigest(db, NOW)

  expect(counts.mails).toBe(1)
  expect(recipients()).toEqual(['anna-tisch@example.com'])
  expect(bodyFor('anna-tisch@example.com')).toContain('Tisch 9 wurde von Hilde Helfer freigegeben')
})

/* Setting a table to the exhibitor it already has is not a change. */
graphqlTest('reassigning a table to its current holder records nothing', async () => {
  const db = await initORM()
  const { exhibition, anna, admin, table } = await seed(db)

  await db.table.claim(exhibition, table.number, anna, anna.user)
  await db.em.flush()
  await db.table.assignTo(exhibition, table.number, anna, admin)
  await db.em.flush()

  expect(await db.em.count(TableAssignmentChange, { tableNumber: table.number })).toBe(1)
})
