import cron from 'node-cron'
import { RequestContext } from '@mikro-orm/core'
import { initORM } from '../db.js'
import { logger } from './logger.js'
import { sendSurveyDigest } from '../modules/survey/digest.js'

const digestLogger = logger.child({ module: 'surveyDigest' })

export const runSurveyDigest = async () => {
  const db = await initORM({ allowGlobalContext: true })
  await RequestContext.create(db.em, async () => {
    await sendSurveyDigest(db, new Date()).catch((error) =>
      digestLogger.error({ error }, 'survey digest failed'),
    )
  })
}

export const startSurveyDigestScheduler = () => {
  cron.schedule('0 6 * * *', runSurveyDigest)
  digestLogger.info('Survey digest scheduler started (runs daily at 06:00)')
}
