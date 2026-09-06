import { Services } from '../../db.js'
import { logger } from '../../app/logger.js'
import { sendEmail } from '../common/sendEmail.js'
import { Exhibition } from '../exhibition/entity.js'
import { SurveyAnswer } from './entity.js'
import { formatAnswer } from './answers.js'
import { DigestRow, makeSurveyDigestEmail } from './emails.js'

const digestLogger = logger.child({ module: 'surveyDigest' })

const siteUrlFor = (exhibition: Exhibition) =>
  process.env.SITE_URL ?? (exhibition.dnsZone ? `https://${exhibition.dnsZone}` : '')

/*
 * Who hears about the answers of an exhibition: its admins, and the site's
 * address when it has none of its own.
 */
const recipientsOf = (exhibition: Exhibition) => {
  const admins = exhibition.admins.getItems().map((admin) => admin.email)
  if (admins.length) return admins
  return process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : []
}

/*
 * Every answer given or changed since the last digest, told to the admins of
 * its exhibition in one mail, then stamped so it is told once. `now` is passed
 * in rather than read, so that a test can stand at any hour. A day without
 * changes sends nothing.
 */
export const sendSurveyDigest = async (db: Services, now: Date) => {
  const counts = { mails: 0, answers: 0 }

  const pending = await db.em.find(
    SurveyAnswer,
    { notifiedAt: null },
    {
      populate: ['question', 'question.exhibition.admins', 'exhibitor.user'],
      orderBy: { question: { ordering: 'asc', id: 'asc' }, id: 'asc' },
    },
  )

  const byExhibition = new Map<number, SurveyAnswer[]>()
  for (const answer of pending) {
    const { id } = answer.question.exhibition
    byExhibition.set(id, [...(byExhibition.get(id) ?? []), answer])
    answer.notifiedAt = now
    counts.answers++
  }

  for (const answers of byExhibition.values()) {
    const { exhibition } = answers[0].question
    const recipients = recipientsOf(exhibition)
    if (!recipients.length) {
      digestLogger.warn({ exhibition: exhibition.key }, 'no admin to send the survey digest to')
      continue
    }
    const rows: DigestRow[] = answers.map((answer) => ({
      exhibitorName: answer.exhibitor.user.fullName || answer.exhibitor.user.nickname || '',
      questionLabel: answer.question.label,
      answer: formatAnswer(answer.question, answer.value),
    }))
    const siteUrl = siteUrlFor(exhibition)
    await sendEmail(
      makeSurveyDigestEmail(
        recipients,
        rows,
        siteUrl && `${siteUrl}/admin/umfrage`,
        exhibition.title,
      ),
    )
    counts.mails++
  }

  await db.em.flush()
  if (counts.answers) digestLogger.info(counts, 'survey digest sent')
  return counts
}
