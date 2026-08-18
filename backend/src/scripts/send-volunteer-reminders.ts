/*
 * Run the volunteer reminders once, by hand.
 *
 * In production a cron fires them every quarter hour, which makes them awkward
 * to look at while building something: the digest only goes out at eight in
 * the evening, and the short reminder only in the hour before a shift. This
 * takes the reading of the clock as an argument, so both can be watched
 * happening now.
 *
 *   npm run volunteer-reminders                     -- now
 *   npm run volunteer-reminders 2026-10-08T20:00    -- the evening digest
 *   npm run volunteer-reminders 2026-10-09T09:15    -- an hour before a shift
 *
 * The stamps it leaves behind are what keep anybody from being written to
 * twice, so a second run at the same reading does nothing.
 */

import { RequestContext } from '@mikro-orm/core'
import { initORM } from '../db.js'
import { sendVolunteerReminders } from '../app/volunteerReminders.js'

const [when] = process.argv.slice(2)
const now = when ? new Date(when) : new Date()

if (Number.isNaN(now.getTime())) {
  console.error(`Not a time: ${when}`)
  console.error('Usage: npm run volunteer-reminders [YYYY-MM-DDTHH:MM]')
  process.exit(1)
}

const db = await initORM({ allowGlobalContext: true })
await RequestContext.create(db.em, async () => {
  const counts = await sendVolunteerReminders(db, now)
  console.log(
    `${now.toLocaleString('de-DE')}: ${counts.digests} Tagesübersichten, ` +
      `${counts.reminders} Erinnerungen, ${counts.deletedAccounts} unbestätigte Konten gelöscht`,
  )
})
await db.orm.close()
