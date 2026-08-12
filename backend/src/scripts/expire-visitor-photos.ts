/*
 * Delete every visitor photo from an exhibition, three months after it ended.
 *
 * The promise made to visitors is about the exhibition, not about each photo:
 * everything from that show goes on one date. So this is a single job on a
 * one-shot timer rather than something that runs daily and does nothing for
 * three months — a job that does nothing for ninety days is a job nobody
 * notices has stopped working.
 *
 *   pnpm expire-visitor-photos cc2026 [--days 90] [--dry-run] [--force]
 *                                     [--self-destruct]
 *
 * It refuses to run before the date it is meant to, because a timer written
 * with the wrong date would otherwise wipe an exhibition in progress. --force
 * is there for when that refusal is wrong.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { RequestContext } from '@mikro-orm/core'
import { initORM } from '../db.js'
import { VisitorPhoto } from '../modules/visitorPhoto/entity.js'
import { PHOTO_ROOT } from '../modules/visitorPhoto/storage.js'

const run = promisify(execFile)

const UNITS = ['expire-visitor-photos.timer', 'expire-visitor-photos.service']

/*
 * Left behind when the job has done its work. The units remove themselves, so
 * without this the next deployment would put them straight back and the job
 * would run again on every deploy for ever.
 */
const doneMarker = (key: string) => `/var/lib/exhibitron/visitor-photos-expired-${key}`

type Options = {
  key: string
  days: number
  dryRun: boolean
  force: boolean
  selfDestruct: boolean
}

function parseArgs(argv: string[]): Options {
  const key = argv.find((a) => !a.startsWith('--'))
  if (!key) {
    console.error('Usage: expire-visitor-photos <exhibition-key> [--days 90] [--dry-run]')
    console.error('                             [--force] [--self-destruct]')
    process.exit(1)
  }
  const flag = (name: string) => argv.includes(`--${name}`)
  const value = (name: string, fallback: number) => {
    const at = argv.indexOf(`--${name}`)
    return at >= 0 && argv[at + 1] ? Number(argv[at + 1]) : fallback
  }
  return {
    key,
    days: value('days', 90),
    dryRun: flag('dry-run'),
    force: flag('force'),
    selfDestruct: flag('self-destruct'),
  }
}

/*
 * Take the units out of the way once the work is done, so next year's timer is
 * not competing with a stale one. Only ever after a successful deletion: a job
 * that removed its own reminder on the way to failing would leave the photos
 * there for good.
 */
async function removeOwnUnits() {
  for (const cmd of [
    ['systemctl', ['disable', '--now', UNITS[0]]],
    ['rm', ['-f', ...UNITS.map((u) => `/etc/systemd/system/${u}`)]],
    ['systemctl', ['daemon-reload']],
  ] as [string, string[]][]) {
    const done = await run(cmd[0], cmd[1])
      .then(() => true)
      .catch((err: Error) => {
        console.error(`  could not ${cmd[0]} ${cmd[1].join(' ')}: ${err.message}`)
        return false
      })
    if (!done) {
      console.error('  the photos are gone; remove the units by hand:')
      console.error(`    sudo systemctl disable --now ${UNITS[0]}`)
      console.error(`    sudo rm -f ${UNITS.map((u) => `/etc/systemd/system/${u}`).join(' ')}`)
      console.error('    sudo systemctl daemon-reload')
      return
    }
  }
  console.log('the timer has removed itself')
}

const main = async () => {
  const opt = parseArgs(process.argv.slice(2))
  const db = await initORM({ allowGlobalContext: true })

  await new Promise<void>((resolve, reject) => {
    RequestContext.create(db.em, async () => {
      const exhibition = await db.exhibition.findOne({ key: opt.key })
      if (!exhibition) {
        console.error(`no exhibition with the key ${opt.key}`)
        process.exit(1)
      }

      const due = new Date(exhibition.endDate)
      due.setDate(due.getDate() + opt.days)

      console.log(`${exhibition.title} ended ${exhibition.endDate.toISOString().slice(0, 10)}`)
      console.log(`photos expire ${due.toISOString().slice(0, 10)} (${opt.days} days later)`)

      if (Date.now() < due.getTime() && !opt.force) {
        console.error('that date has not arrived — refusing. Use --force if this is deliberate.')
        process.exit(1)
      }

      const photos = await db.em.find(VisitorPhoto, { exhibition })
      console.log(`${photos.length} photo(s) to remove`)

      let files = 0
      for (const photo of photos) {
        const dir = path.join(PHOTO_ROOT, photo.id)
        const kept = await fs
          .readdir(dir)
          .then((f) => f.length)
          .catch(() => 0)
        files += kept

        if (opt.dryRun) {
          console.log(`  would remove ${dir} (${kept} file(s)) and its record`)
          continue
        }
        await fs.rm(dir, { recursive: true, force: true })
      }

      if (opt.dryRun) {
        console.log(`dry run: ${photos.length} record(s), ${files} file(s) would go`)
        resolve()
        return
      }

      await db.em.nativeDelete(VisitorPhoto, { exhibition })
      await db.em.flush()
      console.log(`removed ${photos.length} record(s) and ${files} file(s)`)

      /* Anything left in the root without a record — a conversion that landed
         after its photo was deleted, say — goes too, but only once no records
         remain at all, so another exhibition's photos are never touched. */
      const remaining = await db.em.count(VisitorPhoto, {})
      if (remaining === 0) {
        const strays = await fs.readdir(PHOTO_ROOT).catch(() => [])
        for (const stray of strays) {
          await fs.rm(path.join(PHOTO_ROOT, stray), { recursive: true, force: true })
          console.log(`  removed the stray directory ${stray}`)
        }
      }

      const marker = doneMarker(opt.key)
      await fs.mkdir(path.dirname(marker), { recursive: true })
      await fs.writeFile(marker, `${new Date().toISOString()} ${photos.length} photo(s)\n`)

      if (opt.selfDestruct) await removeOwnUnits()
      resolve()
    }).catch(reject)
  })

  await db.orm.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
