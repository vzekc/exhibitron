import { describe, expect, test } from 'vitest'
import { RequestContext } from '@mikro-orm/core'
import { initORM, Services } from '../../db.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { User } from '../user/entity.js'
import { SurveyAnswer, SurveyQuestion } from './entity.js'
import { sendSurveyDigest } from './digest.js'
import { SurveyQuestionType } from '../../generated/graphql.js'

const inContext = async (fn: (db: Services) => Promise<void>) => {
  const db = await initORM()
  await RequestContext.create(db.em, async () => fn(db))
}

/*
 * One question, answered by Daffy and Donald, neither answer told to anybody
 * yet. The admin account is made the exhibition's admin.
 */
const seed = async (db: Services) => {
  await db.em.nativeDelete(SurveyAnswer, {})
  await db.em.nativeDelete(SurveyQuestion, {})
  db.em.clear()

  const exhibition = await db.em.findOneOrFail(
    Exhibition,
    { key: 'cc2025' },
    {
      populate: ['admins'],
    },
  )
  const admin = await db.em.findOneOrFail(User, { nickname: 'admin' })
  if (!exhibition.admins.contains(admin)) exhibition.admins.add(admin)

  const question = db.em.create(SurveyQuestion, {
    exhibition,
    key: 'buffet-freitag',
    ordering: 0,
    label: 'Buffet am Freitag',
    type: SurveyQuestionType.SingleChoice,
    options: [
      { key: 'nein', label: 'Nein' },
      { key: 'vegan', label: 'Vegan' },
    ],
  })
  const answers = {
    daffy: db.em.create(SurveyAnswer, {
      question,
      exhibitor: await db.em.findOneOrFail(Exhibitor, { user: { nickname: 'daffy' } }),
      value: 'vegan',
    }),
    donald: db.em.create(SurveyAnswer, {
      question,
      exhibitor: await db.em.findOneOrFail(Exhibitor, { user: { nickname: 'donald' } }),
      value: 'nein',
    }),
  }
  await db.em.flush()
  return { exhibition, answers }
}

describe('survey digest', () => {
  test('changed answers are told once, in one mail per exhibition', async () => {
    await inContext(async (db) => {
      const { answers } = await seed(db)

      const morning = new Date()
      expect(await sendSurveyDigest(db, morning)).toEqual({ mails: 1, answers: 2 })
      expect(answers.daffy.notifiedAt).toEqual(morning)
      expect(answers.donald.notifiedAt).toEqual(morning)

      /* Nothing new, nothing sent. */
      expect(await sendSurveyDigest(db, new Date())).toEqual({ mails: 0, answers: 0 })

      /* A changed answer is told again, the unchanged one is not. */
      answers.daffy.value = 'nein'
      answers.daffy.notifiedAt = undefined
      await db.em.flush()
      expect(await sendSurveyDigest(db, new Date())).toEqual({ mails: 1, answers: 1 })
    })
  })

  test('an exhibition without admins still clears the queue', async () => {
    await inContext(async (db) => {
      const { exhibition } = await seed(db)
      exhibition.admins.removeAll()
      await db.em.flush()
      const adminEmail = process.env.ADMIN_EMAIL
      delete process.env.ADMIN_EMAIL

      expect(await sendSurveyDigest(db, new Date())).toEqual({ mails: 0, answers: 2 })
      expect(await sendSurveyDigest(db, new Date())).toEqual({ mails: 0, answers: 0 })

      if (adminEmail !== undefined) process.env.ADMIN_EMAIL = adminEmail
    })
  })
})
