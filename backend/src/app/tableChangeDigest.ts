import cron from 'node-cron'
import { RequestContext } from '@mikro-orm/core'
import { initORM, Services } from '../db.js'
import { logger } from './logger.js'
import { sendEmail } from '../modules/common/sendEmail.js'
import { makeTableChangeDigestEmail, TableChangeDigest } from '../modules/table/emails.js'
import { Table, TableAssignmentChange } from '../modules/table/entity.js'
import { Exhibition } from '../modules/exhibition/entity.js'
import { Exhibitor } from '../modules/exhibitor/entity.js'
import { User } from '../modules/user/entity.js'

const digestLogger = logger.child({ module: 'tableChangeDigest' })

const siteUrlFor = (exhibition: Exhibition) =>
  process.env.SITE_URL ?? (exhibition.dnsZone ? `https://${exhibition.dnsZone}` : '')

const changePopulate = [
  'exhibition',
  'previousExhibitor.user',
  'newExhibitor.user',
  'actor',
] as const

/* Whoever made a change, under the name the site shows them by. */
const actorName = (actor: User | undefined) =>
  actor?.fullName || actor?.nickname || 'die Organisation'

/*
 * What one table's day means to one exhibitor. The desk shuffles tables in
 * several steps, and what an exhibitor needs to hear is the difference between
 * the last state they knew of and where the table ended up. A move they made
 * themselves is a state they know; the moves after it that took the table from
 * them or gave it to them were made by others, and those are the names told.
 */
type Telling = {
  exhibitor: Exhibitor
  tableNumber: number
  gained: boolean
  actors: (User | undefined)[]
}

const tellingsOf = (steps: TableAssignmentChange[]): Telling[] => {
  const concerned = new Map<number, Exhibitor>()
  for (const step of steps) {
    for (const exhibitor of [step.previousExhibitor, step.newExhibitor]) {
      if (exhibitor) concerned.set(exhibitor.id, exhibitor)
    }
  }

  const tellings: Telling[] = []
  for (const exhibitor of concerned.values()) {
    let known = steps[0].previousExhibitor?.id === exhibitor.id
    let actors: (User | undefined)[] = []
    for (const step of steps) {
      const touched = [step.previousExhibitor?.id, step.newExhibitor?.id].includes(exhibitor.id)
      if (step.actor?.id === exhibitor.user.id) {
        known = step.newExhibitor?.id === exhibitor.id
        actors = []
      } else if (touched) {
        actors.push(step.actor)
      }
    }
    const holds = steps[steps.length - 1].newExhibitor?.id === exhibitor.id
    if (holds !== known) {
      tellings.push({ exhibitor, tableNumber: steps[0].tableNumber, gained: holds, actors })
    }
  }
  return tellings
}

/* Each table's steps in the order they happened. */
const stepsByTable = (changes: TableAssignmentChange[]) => {
  const byTable = new Map<string, TableAssignmentChange[]>()
  for (const change of changes) {
    const key = `${change.exhibition.id}:${change.tableNumber}`
    byTable.set(key, [...(byTable.get(key) ?? []), change])
  }
  return [...byTable.values()]
}

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

  /* Ordered by id within a table, so the fold walks each table's day in the
     order it happened. */
  const pending = await db.em.find(
    TableAssignmentChange,
    { notifiedAt: null },
    { populate: changePopulate, orderBy: { tableNumber: 'asc', id: 'asc' } },
  )

  const reportable: TableAssignmentChange[] = []
  for (const change of pending) {
    change.notifiedAt = now
    if (change.exhibition.startDate <= now) {
      counts.skipped++
      continue
    }
    counts.changes++
    reportable.push(change)
  }

  /* One exhibitor, one mail, however many of their tables moved. */
  type Entry = {
    exhibitor: Exhibitor
    actors: (User | undefined)[]
    released: number[]
    assigned: number[]
  }
  const byExhibitor = new Map<number, Entry>()
  for (const steps of stepsByTable(reportable)) {
    for (const { exhibitor, tableNumber, gained, actors } of tellingsOf(steps)) {
      const entry = byExhibitor.get(exhibitor.id) ?? {
        exhibitor,
        actors: [],
        released: [],
        assigned: [],
      }
      entry.actors.push(...actors)
      ;(gained ? entry.assigned : entry.released).push(tableNumber)
      byExhibitor.set(exhibitor.id, entry)
    }
  }

  for (const { exhibitor, actors, released, assigned } of byExhibitor.values()) {
    const { exhibition, user } = exhibitor
    const siteUrl = siteUrlFor(exhibition)
    const holding = await db.em.find(
      Table,
      { exhibition, exhibitor },
      { orderBy: { number: 'asc' } },
    )
    /* Each name once, in a fixed order. */
    const names = [...new Set(actors.map(actorName))].sort((a, b) => a.localeCompare(b, 'de'))
    const digest: TableChangeDigest = {
      actors: names,
      released,
      assigned,
      holding: holding.map((table) => table.number),
    }
    await sendEmail(
      makeTableChangeDigestEmail(
        user.fullName || user.nickname || '',
        user.email,
        digest,
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
