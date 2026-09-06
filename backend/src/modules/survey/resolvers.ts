import { UniqueConstraintViolationException } from '@mikro-orm/core'
import { Context } from '../../app/context.js'
import {
  ExhibitorResolvers,
  MutationResolvers,
  QueryResolvers,
  SurveyAnswerResolvers,
  SurveyOptionInput,
  SurveyQuestionInput,
  SurveyQuestionResolvers,
  SurveyQuestionType,
} from '../../generated/graphql.js'
import { isAdmin, requireAdmin, requireNotFrozen } from '../../db.js'
import { AuthError, BadRequestError, UniqueConstraintError } from '../common/errors.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { SurveyAnswer, SurveyOptionRow, SurveyQuestion } from './entity.js'
import {
  AnswerMap,
  canBeParent,
  checkAnswers,
  inAnswerOrder,
  isChoice,
  isClosed,
  normaliseAnswer,
  parentValuesOf,
  sameAnswer,
  slugOf,
  unansweredRequired,
} from './answers.js'

const KEY_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/

/* The questions of an exhibition, in the order they are asked. */
export const questionsOf = async ({ db }: Context, exhibition: Exhibition) =>
  inAnswerOrder(
    await db.em.find(
      SurveyQuestion,
      { exhibition },
      { populate: ['showIfQuestion'], orderBy: { ordering: 'asc', id: 'asc' } },
    ),
  )

/* A question of another exhibition is none of this host's business. */
const questionOf = async ({ db, exhibition }: Context, id: number) =>
  db.em.findOneOrFail(SurveyQuestion, { id, exhibition }, { populate: ['showIfQuestion'] })

export const answersOf = async ({ db }: Context, exhibitor: Exhibitor) =>
  db.em.find(
    SurveyAnswer,
    { exhibitor },
    { populate: ['question'], orderBy: { question: { ordering: 'asc', id: 'asc' } } },
  )

const toMap = (answers: SurveyAnswer[]): AnswerMap =>
  new Map(answers.map((answer) => [answer.question.id, answer.value]))

const checkKey = (key: string) => {
  if (!KEY_FORMAT.test(key)) {
    throw new BadRequestError(
      'Das Kürzel darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten',
    )
  }
}

/*
 * The options as they are stored: existing ones keep their key, new ones get
 * one from their label, and no two share a key.
 */
const optionsFrom = (type: SurveyQuestionType, given?: SurveyOptionInput[] | null) => {
  if (!isChoice(type)) return []
  const options: SurveyOptionRow[] = []
  for (const { key, label } of given ?? []) {
    const trimmed = label.trim()
    if (!trimmed) throw new BadRequestError('Eine Auswahl braucht eine Beschriftung')
    const taken = options.map((option) => option.key)
    if (key && taken.includes(key)) {
      throw new BadRequestError(`Die Auswahl „${key}“ kommt doppelt vor`)
    }
    options.push({ key: key || slugOf(trimmed, taken), label: trimmed })
  }
  if (options.length < 2) {
    throw new BadRequestError('Eine Auswahlfrage braucht mindestens zwei Möglichkeiten')
  }
  return options
}

/*
 * The parent a question waits for. It has to be a question of this exhibition
 * with an answer that can be waited for, it must not be waiting for a parent
 * itself, and the values have to be ones it can take.
 */
const parentFrom = async (
  context: Context,
  input: SurveyQuestionInput,
  self: SurveyQuestion | null,
) => {
  if (input.showIfQuestionId === undefined || input.showIfQuestionId === null) {
    return { showIfQuestion: undefined, showIfValues: [] as string[] }
  }
  if (self && input.showIfQuestionId === self.id) {
    throw new BadRequestError('Eine Frage kann nicht von sich selbst abhängen')
  }
  const parent = await questionOf(context, input.showIfQuestionId)
  if (!canBeParent(parent.type)) {
    throw new BadRequestError(
      `„${parent.label}“ ist keine Auswahl- oder Ja/Nein-Frage, andere Fragen können nicht davon abhängen`,
    )
  }
  if (parent.showIfQuestion) {
    throw new BadRequestError(
      `„${parent.label}“ hängt selbst von einer anderen Frage ab; Abhängigkeiten gehen nur eine Stufe tief`,
    )
  }
  if (self && (await context.db.em.count(SurveyQuestion, { showIfQuestion: self }))) {
    throw new BadRequestError(
      'Von dieser Frage hängen andere Fragen ab, sie kann nicht selbst abhängig werden',
    )
  }
  const allowed = parentValuesOf(parent)
  const values = [...new Set(input.showIfValues ?? [])]
  if (!values.length) {
    throw new BadRequestError('Bitte gib an, bei welchen Antworten die Frage erscheinen soll')
  }
  const unknown = values.find((value) => !allowed.includes(value))
  if (unknown !== undefined) {
    throw new BadRequestError(`„${unknown}“ ist keine Antwort auf „${parent.label}“`)
  }
  return { showIfQuestion: parent, showIfValues: values }
}

/* The flush is explicit so that a key already taken is answered, not logged. */
const flushOrExplainKey = async ({ db }: Context, key: string) => {
  try {
    await db.em.flush()
  } catch (error) {
    if (error instanceof UniqueConstraintViolationException) {
      throw new UniqueConstraintError(
        `Es gibt in dieser Ausstellung schon eine Frage mit dem Kürzel „${key}“`,
        'key',
        key,
      )
    }
    throw error
  }
}

const fieldsFrom = async (
  context: Context,
  input: SurveyQuestionInput,
  self: SurveyQuestion | null,
) => {
  checkKey(input.key)
  const label = input.label.trim()
  if (!label) throw new BadRequestError('Eine Frage braucht einen Text')
  return {
    key: input.key,
    label,
    description: input.description?.trim() || undefined,
    type: input.type,
    options: optionsFrom(input.type, input.options),
    required: input.required ?? false,
    closesAt: input.closesAt ?? undefined,
    onRegistrationForm: input.onRegistrationForm ?? false,
    ...(await parentFrom(context, input, self)),
  }
}

/*
 * Writes a whole set of answers for one exhibitor. Questions the parent hides,
 * or that were left out, lose their answer. A closed question keeps what it
 * has, and a changed answer to one is refused.
 */
export const storeAnswers = async (
  context: Context,
  exhibitor: Exhibitor,
  given: Map<number, unknown>,
  now = new Date(),
) => {
  const { db, exhibition } = context
  const questions = inAnswerOrder(await questionsOf(context, exhibition))
  const existing = await answersOf(context, exhibitor)
  const byQuestion = new Map(existing.map((answer) => [answer.question.id, answer]))

  for (const id of given.keys()) {
    if (!questions.some((question) => question.id === id)) {
      throw new BadRequestError(`Es gibt keine Frage mit der Nummer ${id}`)
    }
  }

  /* What a closed question already has is what it keeps. */
  const effective = new Map(given)
  for (const question of questions) {
    if (!isClosed(question, now)) continue
    const stored = byQuestion.get(question.id)?.value
    if (
      given.has(question.id) &&
      !sameAnswer(normaliseAnswer(question, given.get(question.id)), stored)
    ) {
      throw new BadRequestError(`Die Frage „${question.label}“ kann nicht mehr beantwortet werden`)
    }
    effective.set(question.id, stored)
  }

  const wanted = checkAnswers(questions, effective)
  for (const question of questions) {
    const value = wanted.get(question.id)
    const answer = byQuestion.get(question.id)
    if (value === undefined) {
      if (answer) db.em.remove(answer)
    } else if (!answer) {
      db.em.persist(db.em.create(SurveyAnswer, { exhibitor, question, value }))
    } else if (!sameAnswer(answer.value, value)) {
      answer.value = value
      answer.notifiedAt = undefined
    }
  }
  await db.em.flush()
  return answersOf(context, exhibitor)
}

export const surveyQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getSurveyQuestions: async (_, _args, context) => questionsOf(context, context.exhibition),

  // @ts-expect-error ts2345
  getSurveyQuestion: async (_, { id }, { db, exhibition }) =>
    db.em.findOne(SurveyQuestion, { id, exhibition }, { populate: ['showIfQuestion'] }),
}

export const surveyQuestionTypeResolvers: SurveyQuestionResolvers<Context> = {
  options: (question) => (question as unknown as SurveyQuestion).options,

  showIfValues: (question) => (question as unknown as SurveyQuestion).showIfValues,

  isClosed: (question, _, { exhibition }) =>
    exhibition.frozen || isClosed(question as unknown as SurveyQuestion),

  // @ts-expect-error ts2345
  showIfQuestion: async (question, _, { db }) => {
    const parent = (question as unknown as SurveyQuestion).showIfQuestion
    return parent ? db.em.findOneOrFail(SurveyQuestion, { id: parent.id }) : null
  },

  myAnswer: async (question, _, { db, exhibitor }) => {
    if (!exhibitor) return null
    const answer = await db.em.findOne(SurveyAnswer, { exhibitor, question: { id: question.id } })
    return answer?.value ?? null
  },

  /* The questions are public, who answered what is for the people exhibiting. */
  // @ts-expect-error ts2345
  answers: async (question, _, { db, user }) => {
    if (!user) return []
    return db.em.find(
      SurveyAnswer,
      { question: { id: question.id } },
      { populate: ['exhibitor.user'], orderBy: { exhibitor: { user: { fullName: 'asc' } } } },
    )
  },
}

export const surveyAnswerTypeResolvers: SurveyAnswerResolvers<Context> = {
  // @ts-expect-error ts2345
  exhibitor: async (answer, _, { db }) =>
    db.exhibitor.findOneOrFail({ id: (answer as unknown as SurveyAnswer).exhibitor.id }),

  // @ts-expect-error ts2345
  question: async (answer, _, { db }) =>
    db.em.findOneOrFail(
      SurveyQuestion,
      { id: (answer as unknown as SurveyAnswer).question.id },
      { populate: ['showIfQuestion'] },
    ),
}

export const surveyExhibitorTypeResolvers: ExhibitorResolvers<Context> = {
  // @ts-expect-error ts2345
  surveyAnswers: async (exhibitor, _, context) =>
    answersOf(context, exhibitor as unknown as Exhibitor),

  unansweredRequiredSurveyQuestions: async (exhibitor, _, context) => {
    const questions = await questionsOf(context, context.exhibition)
    const answers = await answersOf(context, exhibitor as unknown as Exhibitor)
    return unansweredRequired(questions, toMap(answers)).length
  },
}

const adminSurveyMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createSurveyQuestion: async (_, { input }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)

    const last = await db.em.findOne(
      SurveyQuestion,
      { exhibition },
      { orderBy: { ordering: 'desc' } },
    )
    const question = db.em.create(SurveyQuestion, {
      exhibition,
      ...(await fieldsFrom(context, input, null)),
      ordering: input.ordering ?? (last ? last.ordering + 1 : 0),
    })
    db.em.persist(question)
    await flushOrExplainKey(context, input.key)
    return question
  },

  // @ts-expect-error ts2345
  updateSurveyQuestion: async (_, { id, input }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)

    const question = await questionOf(context, id)
    const fields = await fieldsFrom(context, input, question)

    /* Answers already given are kept only while they still fit the question. */
    if (fields.type !== question.type) {
      await db.em.nativeDelete(SurveyAnswer, { question })
    } else if (isChoice(fields.type)) {
      const keys = fields.options.map((option) => option.key)
      for (const answer of await db.em.find(SurveyAnswer, { question })) {
        const chosen = Array.isArray(answer.value) ? answer.value : [String(answer.value)]
        const kept = chosen.filter((each) => keys.includes(each))
        if (!kept.length) db.em.remove(answer)
        else answer.value = Array.isArray(answer.value) ? kept : kept[0]
      }
    }

    Object.assign(question, fields)
    if (input.ordering !== undefined && input.ordering !== null) question.ordering = input.ordering
    await flushOrExplainKey(context, input.key)
    return question
  },

  deleteSurveyQuestion: async (_, { id }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)

    const question = await questionOf(context, id)
    await db.em.nativeDelete(SurveyAnswer, { question })
    await db.em.nativeUpdate(
      SurveyQuestion,
      { showIfQuestion: question },
      {
        showIfQuestion: null,
        showIfValues: [],
      },
    )
    await db.em.remove(question).flush()
    return true
  },

  // @ts-expect-error ts2345
  reorderSurveyQuestions: async (_, { ids }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)

    const questions = await questionsOf(context, exhibition)
    const byId = new Map(questions.map((question) => [question.id, question]))
    if (ids.length !== byId.size || ids.some((id) => !byId.has(id))) {
      throw new BadRequestError('Die Reihenfolge muss jede Frage genau einmal nennen')
    }
    ids.forEach((id, index) => (byId.get(id)!.ordering = index))
    await db.em.flush()
    return questionsOf(context, exhibition)
  },

  // @ts-expect-error ts2345
  copySurveyQuestions: async (_, { fromExhibitionId }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)
    if (fromExhibitionId === exhibition.id) {
      throw new BadRequestError('Die Fragen dieser Ausstellung sind schon da')
    }

    const source = await db.exhibition.findOneOrFail({ id: fromExhibitionId })
    const theirs = await questionsOf(context, source)
    const ours = await questionsOf(context, exhibition)
    const byKey = new Map(ours.map((question) => [question.key, question]))
    let ordering = ours.reduce((max, question) => Math.max(max, question.ordering + 1), 0)

    /* Parents first, so a child copied after finds its parent under our keys. */
    for (const original of inAnswerOrder(theirs)) {
      if (byKey.has(original.key)) continue
      const parent = original.showIfQuestion && byKey.get(original.showIfQuestion.key)
      const question = db.em.create(SurveyQuestion, {
        exhibition,
        key: original.key,
        ordering: ordering++,
        label: original.label,
        description: original.description,
        type: original.type,
        options: original.options.map((option) => ({ ...option })),
        required: original.required,
        onRegistrationForm: original.onRegistrationForm,
        showIfQuestion: parent ?? undefined,
        showIfValues: parent ? [...original.showIfValues] : [],
      })
      db.em.persist(question)
      byKey.set(question.key, question)
    }
    await db.em.flush()
    return questionsOf(context, exhibition)
  },
}

const exhibitorSurveyMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  saveSurveyAnswers: async (_, { answers, exhibitorId }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    if (!user) throw new AuthError('Bitte melde dich an')

    let exhibitor = context.exhibitor
    if (exhibitorId !== undefined && exhibitorId !== null && exhibitorId !== exhibitor?.id) {
      if (!isAdmin(user, exhibition)) {
        throw new AuthError('Du kannst nur deine eigenen Antworten ändern')
      }
      exhibitor = await db.exhibitor.findOneOrFail({ id: exhibitorId, exhibition })
    }
    if (!exhibitor) {
      throw new BadRequestError('Du bist bei dieser Ausstellung nicht als Aussteller eingetragen')
    }

    const given = new Map<number, unknown>()
    for (const { questionId, value } of answers) {
      if (given.has(questionId)) {
        throw new BadRequestError(`Die Frage ${questionId} ist doppelt beantwortet`)
      }
      given.set(questionId, value)
    }
    return storeAnswers(context, exhibitor, given)
  },
}

export const surveyMutations: MutationResolvers<Context> = {
  ...adminSurveyMutations,
  ...exhibitorSurveyMutations,
}

export const surveyResolvers = {
  Query: surveyQueries,
  Mutation: surveyMutations,
  SurveyQuestion: surveyQuestionTypeResolvers,
  SurveyAnswer: surveyAnswerTypeResolvers,
  Exhibitor: surveyExhibitorTypeResolvers,
}
