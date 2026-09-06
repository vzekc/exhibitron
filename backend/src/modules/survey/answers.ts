import { SurveyQuestionType } from '../../generated/graphql.js'
import { BadRequestError } from '../common/errors.js'
import { SurveyAnswerValue, SurveyQuestion } from './entity.js'

/* Answers by question id, the shape both the form and the database speak. */
export type AnswerMap = Map<number, SurveyAnswerValue>

export const isChoice = (type: SurveyQuestionType) =>
  type === SurveyQuestionType.SingleChoice || type === SurveyQuestionType.MultipleChoice

/* Whether a parent question's answer switches on the questions under it. */
export const canBeParent = (type: SurveyQuestionType) =>
  type === SurveyQuestionType.Checkbox || isChoice(type)

/* The values a dependent question may wait for. */
export const parentValuesOf = (parent: SurveyQuestion) =>
  parent.type === SurveyQuestionType.Checkbox
    ? ['true', 'false']
    : parent.options.map((option) => option.key)

/*
 * A question with a parent is shown while the parent's answer is one of the
 * values it waits for. A parent without an answer shows none of its children.
 */
export const isVisible = (question: SurveyQuestion, answers: AnswerMap) => {
  const parent = question.showIfQuestion
  if (!parent) return true
  const value = answers.get(parent.id)
  if (value === undefined) return false
  const given = Array.isArray(value) ? value : [String(value)]
  return given.some((each) => question.showIfValues.includes(each))
}

export const isClosed = (question: SurveyQuestion, now = new Date()) =>
  !!question.closesAt && question.closesAt <= now

const optionKeysOf = (question: SurveyQuestion) => question.options.map((option) => option.key)

const wrongShape = (question: SurveyQuestion) =>
  new BadRequestError(`Die Antwort auf „${question.label}“ hat nicht die erwartete Form`)

/*
 * Brings a value the client sent into the shape the question stores. Undefined
 * means there is no answer: null, an empty string, an empty selection.
 */
export const normaliseAnswer = (
  question: SurveyQuestion,
  value: unknown,
): SurveyAnswerValue | undefined => {
  if (value === null || value === undefined) return undefined
  switch (question.type) {
    case SurveyQuestionType.Checkbox:
      if (typeof value !== 'boolean') throw wrongShape(question)
      return value
    case SurveyQuestionType.SingleChoice: {
      if (typeof value !== 'string') throw wrongShape(question)
      if (value === '') return undefined
      if (!optionKeysOf(question).includes(value)) {
        throw new BadRequestError(`„${value}“ ist keine Auswahl bei „${question.label}“`)
      }
      return value
    }
    case SurveyQuestionType.MultipleChoice: {
      if (!Array.isArray(value) || value.some((each) => typeof each !== 'string')) {
        throw wrongShape(question)
      }
      const keys = optionKeysOf(question)
      const unknown = value.find((each) => !keys.includes(each))
      if (unknown !== undefined) {
        throw new BadRequestError(`„${unknown}“ ist keine Auswahl bei „${question.label}“`)
      }
      /* In the order the options are listed, each once. */
      const chosen = keys.filter((key) => value.includes(key))
      return chosen.length ? chosen : undefined
    }
    case SurveyQuestionType.Text: {
      if (typeof value !== 'string') throw wrongShape(question)
      const trimmed = value.trim()
      return trimmed || undefined
    }
    case SurveyQuestionType.Number: {
      const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value
      if (typeof number !== 'number' || !Number.isInteger(number) || number < 0) {
        throw new BadRequestError(`Bei „${question.label}“ wird eine ganze Zahl ab 0 erwartet`)
      }
      return number
    }
  }
}

/*
 * The answers to keep out of a whole form: every visible question's answer in
 * its stored shape, with the hidden ones dropped. Parents come before their
 * children in `questions`, so visibility is settled by the time a child is
 * looked at. A visible required question without an answer is refused.
 */
export const checkAnswers = (questions: SurveyQuestion[], given: Map<number, unknown>) => {
  const kept: AnswerMap = new Map()
  for (const question of questions) {
    if (!isVisible(question, kept)) continue
    const value = normaliseAnswer(question, given.get(question.id))
    if (value === undefined) {
      if (question.required) {
        throw new BadRequestError(`Bitte beantworte die Frage „${question.label}“`)
      }
      continue
    }
    kept.set(question.id, value)
  }
  return kept
}

/*
 * The order the questions are asked in: by ordering, with every dependent
 * question directly after the one it waits for. A child whose parent is not
 * in the list stands on its own.
 */
export const inAnswerOrder = (questions: SurveyQuestion[]) => {
  const byOrdering = (a: SurveyQuestion, b: SurveyQuestion) =>
    a.ordering - b.ordering || a.id - b.id
  const ids = new Set(questions.map((question) => question.id))
  const isChild = (question: SurveyQuestion) =>
    !!question.showIfQuestion && ids.has(question.showIfQuestion.id)
  const children = (parent: SurveyQuestion) =>
    questions.filter((question) => question.showIfQuestion?.id === parent.id).sort(byOrdering)
  return questions
    .filter((question) => !isChild(question))
    .sort(byOrdering)
    .flatMap((question) => [question, ...children(question)])
}

/* The required questions an exhibitor still owes, given what they answered. */
export const unansweredRequired = (questions: SurveyQuestion[], answers: AnswerMap) =>
  inAnswerOrder(questions).filter(
    (question) => question.required && isVisible(question, answers) && !answers.has(question.id),
  )

export const sameAnswer = (a: SurveyAnswerValue | undefined, b: SurveyAnswerValue | undefined) =>
  JSON.stringify(a) === JSON.stringify(b)

/* An answer as a person reads it: 'Ja', 'vegetarisch, vegan', '3'. */
export const formatAnswer = (question: SurveyQuestion, value: SurveyAnswerValue) => {
  const labelOf = (key: string) =>
    question.options.find((option) => option.key === key)?.label ?? key
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein'
  if (Array.isArray(value)) return value.map(labelOf).join(', ')
  if (question.type === SurveyQuestionType.SingleChoice) return labelOf(String(value))
  return String(value)
}

/*
 * A key made from a label: 'Vegetarische Option' becomes 'vegetarische-option'.
 * `taken` makes it distinct from the keys already in use.
 */
export const slugOf = (label: string, taken: Iterable<string> = []) => {
  const base =
    label
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'option'
  const used = new Set(taken)
  let key = base
  for (let n = 2; used.has(key); n++) key = `${base}-${n}`
  return key
}
