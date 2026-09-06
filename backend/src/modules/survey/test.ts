import { describe, expect } from 'vitest'
import { graphql } from 'gql.tada'
import { RequestContext } from '@mikro-orm/core'
import { graphqlTest, login } from '../../test/server.js'
import { initORM } from '../../db.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { User } from '../user/entity.js'
import { SurveyAnswer, SurveyQuestion } from './entity.js'
import { SurveyQuestionType } from '../../generated/graphql.js'

const QUESTIONS = graphql(`
  query GetSurveyQuestions {
    getSurveyQuestions {
      id
      key
      ordering
      label
      type
      options {
        key
        label
      }
      required
      isClosed
      onRegistrationForm
      showIfQuestion {
        key
      }
      showIfValues
      myAnswer
      answers {
        value
        exhibitor {
          user {
            fullName
          }
        }
      }
    }
  }
`)

const CREATE = graphql(`
  mutation CreateSurveyQuestion($input: SurveyQuestionInput!) {
    createSurveyQuestion(input: $input) {
      id
      key
      options {
        key
        label
      }
      showIfQuestion {
        key
      }
      showIfValues
    }
  }
`)

const UPDATE = graphql(`
  mutation UpdateSurveyQuestion($id: Int!, $input: SurveyQuestionInput!) {
    updateSurveyQuestion(id: $id, input: $input) {
      id
      options {
        key
        label
      }
      answers {
        value
      }
    }
  }
`)

const SAVE = graphql(`
  mutation SaveSurveyAnswers($answers: [SurveyAnswerInput!]!, $exhibitorId: Int) {
    saveSurveyAnswers(answers: $answers, exhibitorId: $exhibitorId) {
      question {
        key
      }
      value
    }
  }
`)

const MY_STATE = graphql(`
  query MySurveyState {
    getCurrentExhibitor {
      unansweredRequiredSurveyQuestions
      surveyAnswers {
        question {
          key
        }
        value
      }
    }
  }
`)

type Saved = { question: { key: string }; value: unknown }[]
const byKey = (answers: Saved) =>
  Object.fromEntries(answers.map(({ question, value }) => [question.key, value]))

/*
 * Four questions, as the organisation would put them: Ethernet on the
 * registration form and required, the Friday buffet as a choice with a wish
 * that only shows for the vegetarian and vegan options, and a headcount.
 */
const seedQuestions = async () => {
  const db = await initORM()
  const ids: Record<string, number> = {}
  await RequestContext.create(db.em, async () => {
    const exhibition = await db.em.findOneOrFail(Exhibition, { key: 'cc2025' })
    exhibition.frozen = false
    const existing = await db.em.find(SurveyQuestion, { exhibition })
    if (existing.length) {
      existing.forEach((question) => (ids[question.key] = question.id))
      return
    }
    const ethernet = db.em.create(SurveyQuestion, {
      exhibition,
      key: 'ethernet',
      ordering: 0,
      label: 'Ich brauche Ethernet am Tisch',
      type: SurveyQuestionType.Checkbox,
      required: true,
      onRegistrationForm: true,
    })
    const buffet = db.em.create(SurveyQuestion, {
      exhibition,
      key: 'buffet-freitag',
      ordering: 1,
      label: 'Buffet am Freitag',
      type: SurveyQuestionType.SingleChoice,
      options: [
        { key: 'nein', label: 'Nein' },
        { key: 'normal', label: 'Normal' },
        { key: 'vegetarisch', label: 'Vegetarisch' },
        { key: 'vegan', label: 'Vegan' },
      ],
      required: true,
    })
    const wish = db.em.create(SurveyQuestion, {
      exhibition,
      key: 'buffet-wuensche',
      ordering: 2,
      label: 'Was sollen wir beachten?',
      type: SurveyQuestionType.Text,
      showIfQuestion: buffet,
      showIfValues: ['vegetarisch', 'vegan'],
    })
    const people = db.em.create(SurveyQuestion, {
      exhibition,
      key: 'personen',
      ordering: 3,
      label: 'Mit wie vielen Personen kommst du?',
      type: SurveyQuestionType.Number,
    })
    await db.em.flush()
    for (const question of [ethernet, buffet, wish, people]) ids[question.key] = question.id
  })
  return ids
}

const setClosesAt = async (key: string, closesAt: Date | undefined) => {
  const db = await initORM()
  await RequestContext.create(db.em, async () => {
    const question = await db.em.findOneOrFail(SurveyQuestion, { key })
    question.closesAt = closesAt
    await db.em.flush()
  })
}

describe('survey', () => {
  graphqlTest('the questions are public, the answers are for the exhibitors', async (request) => {
    const ids = await seedQuestions()
    const daffy = await login('daffy@example.com')
    const saved = await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'vegetarisch' },
          { questionId: ids['buffet-wuensche'], value: '  kein Sellerie ' },
          { questionId: ids.personen, value: 2 },
        ],
      },
      daffy,
    )
    expect(saved.errors).toBeUndefined()
    expect(byKey(saved.data!.saveSurveyAnswers)).toEqual({
      ethernet: true,
      'buffet-freitag': 'vegetarisch',
      'buffet-wuensche': 'kein Sellerie',
      personen: 2,
    })

    const anonymous = await request(QUESTIONS)
    expect(anonymous.errors).toBeUndefined()
    const questions = anonymous.data!.getSurveyQuestions
    expect(questions.map((question) => question.key)).toEqual([
      'ethernet',
      'buffet-freitag',
      'buffet-wuensche',
      'personen',
    ])
    expect(questions[2].showIfQuestion).toEqual({ key: 'buffet-freitag' })
    expect(questions[2].showIfValues).toEqual(['vegetarisch', 'vegan'])
    expect(questions.every((question) => question.answers.length === 0)).toBe(true)
    expect(questions.every((question) => question.myAnswer === null)).toBe(true)

    const donald = await login('donald@example.com')
    const seen = await request(QUESTIONS, {}, donald)
    expect(seen.errors).toBeUndefined()
    const buffet = seen.data!.getSurveyQuestions[1]
    expect(buffet.myAnswer).toBeNull()
    expect(buffet.answers).toEqual([
      { value: 'vegetarisch', exhibitor: { user: { fullName: 'Daffy Duck' } } },
    ])

    const own = await request(QUESTIONS, {}, daffy)
    expect(own.data!.getSurveyQuestions[1].myAnswer).toBe('vegetarisch')
  })

  graphqlTest('required questions are counted until they are answered', async (request) => {
    const ids = await seedQuestions()
    const donald = await login('donald@example.com')

    const before = await request(MY_STATE, {}, donald)
    expect(before.data!.getCurrentExhibitor!.unansweredRequiredSurveyQuestions).toBe(2)

    const missing = await request(
      SAVE,
      { answers: [{ questionId: ids.ethernet, value: false }] },
      donald,
    )
    expect(missing.errors?.[0]?.message).toBe('Bitte beantworte die Frage „Buffet am Freitag“')

    const saved = await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: false },
          { questionId: ids['buffet-freitag'], value: 'nein' },
        ],
      },
      donald,
    )
    expect(saved.errors).toBeUndefined()

    const after = await request(MY_STATE, {}, donald)
    expect(after.data!.getCurrentExhibitor!.unansweredRequiredSurveyQuestions).toBe(0)
    expect(byKey(after.data!.getCurrentExhibitor!.surveyAnswers)).toEqual({
      ethernet: false,
      'buffet-freitag': 'nein',
    })
  })

  graphqlTest('an answer has to fit its question', async (request) => {
    const ids = await seedQuestions()
    const daffy = await login('daffy@example.com')

    const wrongOption = await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'fleischig' },
        ],
      },
      daffy,
    )
    expect(wrongOption.errors?.[0]?.message).toBe(
      '„fleischig“ ist keine Auswahl bei „Buffet am Freitag“',
    )

    const wrongNumber = await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'nein' },
          { questionId: ids.personen, value: -1 },
        ],
      },
      daffy,
    )
    expect(wrongNumber.errors?.[0]?.message).toBe(
      'Bei „Mit wie vielen Personen kommst du?“ wird eine ganze Zahl ab 0 erwartet',
    )

    const wrongShape = await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: 'ja' },
          { questionId: ids['buffet-freitag'], value: 'nein' },
        ],
      },
      daffy,
    )
    expect(wrongShape.errors?.[0]?.message).toBe(
      'Die Antwort auf „Ich brauche Ethernet am Tisch“ hat nicht die erwartete Form',
    )
  })

  graphqlTest('a question its parent hides loses its answer', async (request) => {
    const ids = await seedQuestions()
    const daffy = await login('daffy@example.com')

    const vegan = await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'vegan' },
          { questionId: ids['buffet-wuensche'], value: 'ohne Nüsse' },
        ],
      },
      daffy,
    )
    expect(byKey(vegan.data!.saveSurveyAnswers)['buffet-wuensche']).toBe('ohne Nüsse')

    const none = await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'nein' },
          { questionId: ids['buffet-wuensche'], value: 'ohne Nüsse' },
        ],
      },
      daffy,
    )
    expect(none.errors).toBeUndefined()
    expect(byKey(none.data!.saveSurveyAnswers)).toEqual({
      ethernet: true,
      'buffet-freitag': 'nein',
    })
  })

  graphqlTest('a closed question keeps its answer', async (request) => {
    const ids = await seedQuestions()
    const daffy = await login('daffy@example.com')

    await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'normal' },
          { questionId: ids.personen, value: 3 },
        ],
      },
      daffy,
    )
    await setClosesAt('personen', new Date(Date.now() - 60_000))

    const closed = await request(QUESTIONS, {}, daffy)
    expect(closed.data!.getSurveyQuestions.map((question) => question.isClosed)).toEqual([
      false,
      false,
      false,
      true,
    ])

    const changed = await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'normal' },
          { questionId: ids.personen, value: 4 },
        ],
      },
      daffy,
    )
    expect(changed.errors?.[0]?.message).toBe(
      'Die Frage „Mit wie vielen Personen kommst du?“ kann nicht mehr beantwortet werden',
    )

    /* Left out of the form, the closed answer stays as it was. */
    const kept = await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: false },
          { questionId: ids['buffet-freitag'], value: 'normal' },
        ],
      },
      daffy,
    )
    expect(kept.errors).toBeUndefined()
    expect(byKey(kept.data!.saveSurveyAnswers)).toEqual({
      ethernet: false,
      'buffet-freitag': 'normal',
      personen: 3,
    })

    await setClosesAt('personen', undefined)
  })

  graphqlTest('an admin answers for somebody else, an exhibitor does not', async (request) => {
    const ids = await seedQuestions()
    const db = await initORM()
    const donaldId = (await db.em.findOneOrFail(Exhibitor, { user: { nickname: 'donald' } })).id

    const daffy = await login('daffy@example.com')
    const forbidden = await request(
      SAVE,
      {
        exhibitorId: donaldId,
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'nein' },
        ],
      },
      daffy,
    )
    expect(forbidden.errors?.[0]?.message).toBe('Du kannst nur deine eigenen Antworten ändern')

    const admin = await login('admin@example.com')
    const allowed = await request(
      SAVE,
      {
        exhibitorId: donaldId,
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'normal' },
        ],
      },
      admin,
    )
    expect(allowed.errors).toBeUndefined()
    expect(byKey(allowed.data!.saveSurveyAnswers)['buffet-freitag']).toBe('normal')
  })

  graphqlTest('only an admin shapes the questions', async (request) => {
    await seedQuestions()
    const daffy = await login('daffy@example.com')
    const refused = await request(
      CREATE,
      {
        input: {
          key: 'aufbau',
          label: 'Ich helfe beim Aufbau',
          type: SurveyQuestionType.Checkbox,
        },
      },
      daffy,
    )
    expect(refused.errors?.[0]?.message).toMatch(/administrator/)

    const admin = await login('admin@example.com')
    const created = await request(
      CREATE,
      {
        input: {
          key: 'anreise',
          label: 'Anreise',
          type: SurveyQuestionType.MultipleChoice,
          options: [{ label: 'Donnerstag Abend' }, { label: 'Freitag früh' }],
        },
      },
      admin,
    )
    expect(created.errors).toBeUndefined()
    expect(created.data!.createSurveyQuestion.options).toEqual([
      { key: 'donnerstag-abend', label: 'Donnerstag Abend' },
      { key: 'freitag-frueh', label: 'Freitag früh' },
    ])

    const duplicate = await request(
      CREATE,
      { input: { key: 'anreise', label: 'Noch einmal', type: SurveyQuestionType.Text } },
      admin,
    )
    expect(duplicate.errors?.[0]?.message).toBe(
      'Es gibt in dieser Ausstellung schon eine Frage mit dem Kürzel „anreise“',
    )

    const badKey = await request(
      CREATE,
      { input: { key: 'Anreise Zeit', label: 'Anreise', type: SurveyQuestionType.Text } },
      admin,
    )
    expect(badKey.errors?.[0]?.message).toBe(
      'Das Kürzel darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten',
    )
  })

  graphqlTest('a dependency waits for one parent, one level deep', async (request) => {
    const ids = await seedQuestions()
    const admin = await login('admin@example.com')

    const chained = await request(
      CREATE,
      {
        input: {
          key: 'sellerie',
          label: 'Auch ohne Sellerie?',
          type: SurveyQuestionType.Checkbox,
          showIfQuestionId: ids['buffet-wuensche'],
          showIfValues: ['true'],
        },
      },
      admin,
    )
    expect(chained.errors?.[0]?.message).toMatch(/keine Auswahl- oder Ja\/Nein-Frage/)

    const wrongValue = await request(
      CREATE,
      {
        input: {
          key: 'kabel',
          label: 'Wie lang soll das Kabel sein?',
          type: SurveyQuestionType.Text,
          showIfQuestionId: ids.ethernet,
          showIfValues: ['ja'],
        },
      },
      admin,
    )
    expect(wrongValue.errors?.[0]?.message).toBe(
      '„ja“ ist keine Antwort auf „Ich brauche Ethernet am Tisch“',
    )

    const cable = await request(
      CREATE,
      {
        input: {
          key: 'kabel',
          label: 'Wie lang soll das Kabel sein?',
          type: SurveyQuestionType.Text,
          showIfQuestionId: ids.ethernet,
          showIfValues: ['true'],
        },
      },
      admin,
    )
    expect(cable.errors).toBeUndefined()
    expect(cable.data!.createSurveyQuestion.showIfQuestion).toEqual({ key: 'ethernet' })

    /* A dependent question is listed right after the one it waits for. */
    const listed = await request(QUESTIONS, {}, admin)
    const keys = listed.data!.getSurveyQuestions.map((question) => question.key)
    expect(keys.indexOf('kabel')).toBe(keys.indexOf('ethernet') + 1)

    /* Ethernet now has a child, so it cannot itself become dependent. */
    const parentDependent = await request(
      UPDATE,
      {
        id: ids.ethernet,
        input: {
          key: 'ethernet',
          label: 'Ich brauche Ethernet am Tisch',
          type: SurveyQuestionType.Checkbox,
          required: true,
          onRegistrationForm: true,
          showIfQuestionId: ids['buffet-freitag'],
          showIfValues: ['nein'],
        },
      },
      admin,
    )
    expect(parentDependent.errors?.[0]?.message).toBe(
      'Von dieser Frage hängen andere Fragen ab, sie kann nicht selbst abhängig werden',
    )
  })

  graphqlTest('reworded options keep their answers, dropped ones lose them', async (request) => {
    const ids = await seedQuestions()
    const admin = await login('admin@example.com')
    const daffy = await login('daffy@example.com')
    await request(
      SAVE,
      {
        answers: [
          { questionId: ids.ethernet, value: true },
          { questionId: ids['buffet-freitag'], value: 'vegan' },
        ],
      },
      daffy,
    )

    const reworded = await request(
      UPDATE,
      {
        id: ids['buffet-freitag'],
        input: {
          key: 'buffet-freitag',
          label: 'Buffet am Freitag',
          type: SurveyQuestionType.SingleChoice,
          required: true,
          options: [
            { key: 'nein', label: 'Nein, danke' },
            { key: 'normal', label: 'Mit Fleisch' },
            { key: 'vegan', label: 'Vegan' },
          ],
        },
      },
      admin,
    )
    expect(reworded.errors).toBeUndefined()
    expect(reworded.data!.updateSurveyQuestion.options.map((option) => option.key)).toEqual([
      'nein',
      'normal',
      'vegan',
    ])
    expect(reworded.data!.updateSurveyQuestion.answers.map((answer) => answer.value)).toContain(
      'vegan',
    )

    const withoutVegan = await request(
      UPDATE,
      {
        id: ids['buffet-freitag'],
        input: {
          key: 'buffet-freitag',
          label: 'Buffet am Freitag',
          type: SurveyQuestionType.SingleChoice,
          required: true,
          options: [
            { key: 'nein', label: 'Nein' },
            { key: 'normal', label: 'Normal' },
            { key: 'vegetarisch', label: 'Vegetarisch' },
            { key: 'vegan', label: 'Vegan' },
          ],
        },
      },
      admin,
    )
    expect(withoutVegan.errors).toBeUndefined()

    const daffysState = await request(MY_STATE, {}, daffy)
    expect(byKey(daffysState.data!.getCurrentExhibitor!.surveyAnswers)['buffet-freitag']).toBe(
      'vegan',
    )
  })

  graphqlTest('answers on the form become the exhibitor’s at approval', async (request) => {
    const ids = await seedQuestions()

    const missing = await request(
      graphql(`
        mutation RegisterWithoutAnswers($input: RegisterInput!) {
          register(input: $input) {
            id
          }
        }
      `),
      {
        input: {
          name: 'Neue Ausstellerin',
          email: 'neu@example.com',
          nickname: 'neu',
          topic: 'Amiga',
          data: { tables: 1 },
          surveyAnswers: [],
        },
      },
    )
    expect(missing.errors?.[0]?.message).toBe(
      'Bitte beantworte die Frage „Ich brauche Ethernet am Tisch“',
    )

    const registered = await request(
      graphql(`
        mutation RegisterWithAnswers($input: RegisterInput!) {
          register(input: $input) {
            id
          }
        }
      `),
      {
        input: {
          name: 'Neue Ausstellerin',
          email: 'neu@example.com',
          nickname: 'neu',
          topic: 'Amiga',
          data: { tables: 1 },
          surveyAnswers: [
            { questionId: ids.ethernet, value: true },
            /* Not on the form, so it is not taken. */
            { questionId: ids.personen, value: 5 },
          ],
        },
      },
    )
    expect(registered.errors).toBeUndefined()
    const registrationId = registered.data!.register!.id

    const admin = await login('admin@example.com')
    const onFile = await request(
      graphql(`
        query GetRegistrationAnswers($id: Int!) {
          getRegistration(id: $id) {
            surveyAnswers {
              question {
                key
              }
              value
            }
          }
        }
      `),
      { id: registrationId },
      admin,
    )
    expect(onFile.errors).toBeUndefined()
    expect(byKey(onFile.data!.getRegistration!.surveyAnswers)).toEqual({ ethernet: true })

    const approved = await request(
      graphql(`
        mutation ApproveRegistration($id: Int!) {
          approveRegistration(id: $id, siteUrl: "http://localhost:3000")
        }
      `),
      { id: registrationId },
      admin,
    )
    expect(approved.errors).toBeUndefined()

    const db = await initORM()
    const exhibitor = await db.em.findOneOrFail(Exhibitor, { user: { email: 'neu@example.com' } })
    const answers = await db.em.find(SurveyAnswer, { exhibitor }, { populate: ['question'] })
    expect(answers.map((answer) => [answer.question.key, answer.value])).toEqual([
      ['ethernet', true],
    ])
  })

  graphqlTest('questions are taken over from another exhibition', async (request) => {
    await seedQuestions()
    const db = await initORM()
    let lastYear = await db.em.findOne(Exhibition, { key: 'cc2024' })
    if (!lastYear) {
      lastYear = db.em.create(Exhibition, {
        key: 'cc2024',
        title: 'Classic Computing 2024',
        hostMatch: '2024\\.classic-computing\\.de',
        startDate: new Date('2024-09-12'),
        endDate: new Date('2024-09-15'),
        frozen: true,
      })
      const strom = db.em.create(SurveyQuestion, {
        exhibition: lastYear,
        key: 'strom',
        ordering: 0,
        label: 'Ich brauche mehr als eine Steckdose',
        type: SurveyQuestionType.Checkbox,
        closesAt: new Date('2024-09-01'),
      })
      db.em.create(SurveyQuestion, {
        exhibition: lastYear,
        key: 'strom-wieviel',
        ordering: 1,
        label: 'Wie viele?',
        type: SurveyQuestionType.Number,
        showIfQuestion: strom,
        showIfValues: ['true'],
      })
      db.em.create(SurveyQuestion, {
        exhibition: lastYear,
        key: 'ethernet',
        ordering: 2,
        label: 'Ethernet, anders formuliert',
        type: SurveyQuestionType.Checkbox,
      })
      await db.em.flush()
    }

    const admin = await login('admin@example.com')
    const copied = await request(
      graphql(`
        mutation CopySurveyQuestions($fromExhibitionId: Int!) {
          copySurveyQuestions(fromExhibitionId: $fromExhibitionId) {
            key
            label
            ordering
            closesAt
            showIfQuestion {
              key
            }
          }
        }
      `),
      { fromExhibitionId: lastYear.id },
      admin,
    )
    expect(copied.errors).toBeUndefined()
    const keys = copied.data!.copySurveyQuestions.map((question) => question.key)
    expect(keys).toContain('strom')
    expect(keys).toContain('strom-wieviel')

    /* The key already here keeps its own wording. */
    const ethernet = copied.data!.copySurveyQuestions.find((q) => q.key === 'ethernet')!
    expect(ethernet.label).toBe('Ich brauche Ethernet am Tisch')

    const wieviel = copied.data!.copySurveyQuestions.find((q) => q.key === 'strom-wieviel')!
    expect(wieviel.showIfQuestion).toEqual({ key: 'strom' })
    const strom = copied.data!.copySurveyQuestions.find((q) => q.key === 'strom')!
    expect(strom.closesAt).toBeNull()
    expect(strom.ordering).toBeGreaterThanOrEqual(4)
  })

  graphqlTest('deleting a question takes its answers and frees its children', async (request) => {
    const ids = await seedQuestions()
    const admin = await login('admin@example.com')

    const deleted = await request(
      graphql(`
        mutation DeleteSurveyQuestion($id: Int!) {
          deleteSurveyQuestion(id: $id)
        }
      `),
      { id: ids['buffet-freitag'] },
      admin,
    )
    expect(deleted.errors).toBeUndefined()

    const after = await request(QUESTIONS, {}, admin)
    const keys = after.data!.getSurveyQuestions.map((question) => question.key)
    expect(keys).not.toContain('buffet-freitag')
    const wish = after.data!.getSurveyQuestions.find((q) => q.key === 'buffet-wuensche')!
    expect(wish.showIfQuestion).toBeNull()
    expect(wish.showIfValues).toEqual([])

    const db = await initORM()
    expect(await db.em.count(SurveyAnswer, { question: { id: ids['buffet-freitag'] } })).toBe(0)
  })

  graphqlTest('a frozen exhibition takes no more answers', async (request) => {
    const ids = await seedQuestions()
    const db = await initORM()
    const exhibition = await db.em.findOneOrFail(Exhibition, { key: 'cc2025' })
    exhibition.frozen = true
    await db.em.flush()

    const daffy = await login('daffy@example.com')
    const refused = await request(
      SAVE,
      { answers: [{ questionId: ids.ethernet, value: true }] },
      daffy,
    )
    expect(refused.errors?.[0]?.message).toMatch(/eingefroren/)

    exhibition.frozen = false
    await db.em.flush()
  })

  graphqlTest('an exhibitor who leaves takes their answers with them', async () => {
    await seedQuestions()
    const db = await initORM()
    const user = await db.em.findOneOrFail(User, { email: 'neu@example.com' })
    const exhibitor = await db.em.findOneOrFail(Exhibitor, { user })
    expect(await db.em.count(SurveyAnswer, { exhibitor })).toBeGreaterThan(0)
    await db.em.nativeDelete(Exhibitor, { id: exhibitor.id })
    expect(await db.em.count(SurveyAnswer, { exhibitor: { id: exhibitor.id } })).toBe(0)
  })
})
