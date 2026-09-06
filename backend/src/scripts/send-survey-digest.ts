/*
 * Send the survey digest once, by hand.
 *
 * In production a cron sends it every morning. This sends whatever has piled
 * up since the last one right now, and stamps it the same way, so a second
 * run says nothing.
 *
 *   npm run survey-digest
 */

import { RequestContext } from '@mikro-orm/core'
import { initORM } from '../db.js'
import { sendSurveyDigest } from '../modules/survey/digest.js'

const db = await initORM({ allowGlobalContext: true })
await RequestContext.create(db.em, async () => {
  const counts = await sendSurveyDigest(db, new Date())
  console.log(`${counts.answers} Antworten in ${counts.mails} Mails`)
})
await db.orm.close()
