/*
 * What the client knows about a question and an answer. The shapes mirror the
 * backend: an answer is a boolean for a checkbox, an option key for a single
 * choice, option keys for a multiple choice, a string for text, a number for a
 * number.
 */
export type QuestionType = 'checkbox' | 'singleChoice' | 'multipleChoice' | 'text' | 'number'

export type AnswerValue = boolean | string | number | string[]

export type Option = { key: string; label: string }

export type Question = {
  id: number
  key: string
  label: string
  description?: string | null
  type: QuestionType
  options: Option[]
  required: boolean
  isClosed: boolean
  showIfQuestion?: { id: number } | null
  showIfValues: string[]
}

/* Answers by question id. Undefined is no answer. */
export type Answers = Record<number, AnswerValue | undefined>

export const typeLabel: Record<QuestionType, string> = {
  checkbox: 'Ja/Nein',
  singleChoice: 'Eine Auswahl',
  multipleChoice: 'Mehrere Auswahlen',
  text: 'Freitext',
  number: 'Zahl',
}

export const isChoice = (type: QuestionType) => type === 'singleChoice' || type === 'multipleChoice'

/* Whether other questions can wait for this one's answer. */
export const canBeParent = (question: Question) =>
  (question.type === 'checkbox' || isChoice(question.type)) && !question.showIfQuestion

/* The values a dependent question may wait for, with what to call them. */
export const parentValuesOf = (parent: Question): Option[] =>
  parent.type === 'checkbox'
    ? [
        { key: 'true', label: 'Ja' },
        { key: 'false', label: 'Nein' },
      ]
    : parent.options

/*
 * A question with a parent is shown while the parent's answer is one of the
 * values it waits for. A parent without an answer shows none of its children.
 */
export const isVisible = (question: Question, answers: Answers) => {
  const parent = question.showIfQuestion
  if (!parent) return true
  const value = answers[parent.id]
  if (value === undefined) return false
  const given = Array.isArray(value) ? value : [String(value)]
  return given.some((each) => question.showIfValues.includes(each))
}

/* Whether the question has been answered. A checkbox always has. */
export const isAnswered = (question: Question, value: AnswerValue | undefined) => {
  if (question.type === 'checkbox') return true
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return true
}

/*
 * The answers of a form as the backend takes them: every visible question,
 * an unticked checkbox as false, closed questions left out because they keep
 * what they have.
 */
export const collectAnswers = (questions: Question[], answers: Answers) =>
  questions
    .filter((question) => !question.isClosed && isVisible(question, answers))
    .map((question) => ({
      questionId: question.id,
      value: (answers[question.id] ??
        (question.type === 'checkbox' ? false : null)) as AnswerValue | null,
    }))

/* The visible required questions that still have no answer. */
export const missingAnswers = (questions: Question[], answers: Answers) =>
  questions.filter(
    (question) =>
      question.required &&
      isVisible(question, answers) &&
      !isAnswered(question, answers[question.id]),
  )

/* An answer as a person reads it: 'Ja', 'Vegetarisch, Vegan', '3'. */
export const formatAnswer = (question: Question, value: AnswerValue | null | undefined) => {
  if (value === undefined || value === null) return '—'
  const labelOf = (key: string) =>
    question.options.find((option) => option.key === key)?.label ?? key
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein'
  if (Array.isArray(value)) return value.map(labelOf).join(', ')
  if (question.type === 'singleChoice') return labelOf(String(value))
  return String(value)
}

/* 'Do., 11.09.2025, 18:00' */
export const formatClosesAt = (value: string) =>
  new Date(value).toLocaleString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
