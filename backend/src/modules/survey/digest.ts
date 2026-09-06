import { Services } from '../../db.js'
import { logger } from '../../app/logger.js'
import { sendEmail } from '../common/sendEmail.js'
import { Exhibition } from '../exhibition/entity.js'
import { SurveyAnswer, SurveySubscription } from './entity.js'
import { formatAnswer } from './answers.js'
import { DigestRow, makeSurveyDigestEmail } from './emails.js'

const digestLogger = logger.child({ module: 'surveyDigest' })

const siteUrlFor = (exhibition: Exhibition) =>
  process.env.SITE_URL ?? (exhibition.dnsZone ? `https://${exhibition.dnsZone}` : '')

/*
 * The exhibition's admins hear about everything; the site's address stands in
 * when it has none of its own.
 */
const adminsOf = (exhibition: Exhibition) => {
  const admins = exhibition.admins.getItems().map((admin) => admin.email)
  if (admins.length) return admins
  return process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : []
}

const follows = (subscription: SurveySubscription, answer: SurveyAnswer) =>
  (!subscription.question || subscription.question.id === answer.question.id) &&
  (!subscription.audience || subscription.audience === answer.question.audience)

/*
 * Who hears about which of an exhibition's changed answers: the admins about
 * all of them, every subscriber about those they follow. One mail per address.
 */
const distribute = async (db: Services, exhibition: Exhibition, answers: SurveyAnswer[]) => {
  const byAddress = new Map<string, SurveyAnswer[]>()
  for (const address of adminsOf(exhibition)) byAddress.set(address, answers)

  const subscriptions = await db.em.find(
    SurveySubscription,
    { exhibition },
    { populate: ['user', 'question'] },
  )
  for (const subscription of subscriptions) {
    const theirs = answers.filter((answer) => follows(subscription, answer))
    if (!theirs.length) continue
    const address = subscription.user.email
    const already = byAddress.get(address) ?? []
    const seen = new Set(already.map((answer) => answer.id))
    byAddress.set(address, [...already, ...theirs.filter((answer) => !seen.has(answer.id))])
  }
  return byAddress
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
    const byAddress = await distribute(db, exhibition, answers)
    if (!byAddress.size) {
      digestLogger.warn({ exhibition: exhibition.key }, 'nobody to send the survey digest to')
      continue
    }
    const siteUrl = siteUrlFor(exhibition)
    for (const [address, theirs] of byAddress) {
      /* In the order the questions are asked, then as the answers came in. */
      theirs.sort(
        (a, b) =>
          a.question.ordering - b.question.ordering || a.question.id - b.question.id || a.id - b.id,
      )
      const rows: DigestRow[] = theirs.map((answer) => ({
        exhibitorName: answer.exhibitor.user.fullName || answer.exhibitor.user.nickname || '',
        questionLabel: answer.question.label,
        answer: formatAnswer(answer.question, answer.value),
      }))
      await sendEmail(
        makeSurveyDigestEmail(
          [address],
          rows,
          siteUrl && `${siteUrl}/user/umfrage/ergebnisse`,
          exhibition.title,
        ),
      )
      counts.mails++
    }
  }

  await db.em.flush()
  if (counts.answers) digestLogger.info(counts, 'survey digest sent')
  return counts
}
