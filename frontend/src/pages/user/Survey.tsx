import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { useNavigate } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import LoadInProgress from '@components/LoadInProgress'
import QuestionField from '@components/survey/QuestionField'
import {
  Answers,
  AnswerValue,
  Audience,
  audienceLabel,
  collectAnswers,
  isVisible,
  missingAnswers,
  Question,
} from '@components/survey/answers'
import { showMessage } from '@components/MessageModalUtil'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'

const GET_QUESTIONS = graphql(`
  query GetSurveyQuestionsForMe {
    getCurrentExhibition {
      id
      frozen
    }
    getSurveyQuestions {
      id
      key
      label
      description
      type
      options {
        key
        label
      }
      required
      isClosed
      audience
      appliesToMe
      showIfQuestion {
        id
      }
      showIfValues
      myAnswer
    }
  }
`)

const SAVE_ANSWERS = graphql(`
  mutation SaveMySurveyAnswers($answers: [SurveyAnswerInput!]!) {
    saveSurveyAnswers(answers: $answers) {
      id
      value
    }
  }
`)

/*
 * The form on which an exhibitor answers what the organisation asks. It is
 * saved as a whole; a question hidden by its parent loses its answer.
 */
const Survey = () => {
  const { exhibitor, reloadExhibitor } = useExhibitor()
  const navigate = useNavigate()
  const { loading, error, data, refetch } = useQuery(GET_QUESTIONS, {
    fetchPolicy: 'cache-and-network',
  })
  const [saveAnswers] = useMutation(SAVE_ANSWERS)
  const [answers, setAnswers] = useState<Answers>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [loaded, setLoaded] = useState(false)

  const questions = (data?.getSurveyQuestions ?? []) as Question[]

  /* What is already answered fills the form once; typing is not overwritten
     by a later refetch. */
  useEffect(() => {
    if (!data || loaded) return
    const given: Answers = {}
    for (const question of data.getSurveyQuestions) {
      if (question.myAnswer !== null && question.myAnswer !== undefined) {
        given[question.id] = question.myAnswer as AnswerValue
      }
    }
    setAnswers(given)
    setLoaded(true)
  }, [data, loaded])

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  if (!exhibitor) {
    return (
      <>
        <PageHeading>Fragen der Orga</PageHeading>
        <p className="text-gray-700 dark:text-gray-300">
          Diese Fragen richten sich an die Aussteller. Du bist bei dieser Ausstellung nicht als
          Aussteller eingetragen.
        </p>
      </>
    )
  }

  const frozen = data?.getCurrentExhibition?.frozen ?? false
  const visible = questions.filter((question) => isVisible(question, answers))
  /* The general questions first, then each audience's questions under its name. */
  const general = visible.filter((question) => !question.audience)
  const audiences = [...new Set(visible.map((q) => q.audience).filter(Boolean))] as Audience[]
  const canSave = !frozen && visible.some((question) => !question.isClosed)

  const setAnswer = (question: Question, value: AnswerValue | undefined) => {
    setAnswers((current) => ({ ...current, [question.id]: value }))
    setErrors((current) => {
      if (!current[question.id]) return current
      const next = { ...current }
      delete next[question.id]
      return next
    })
  }

  const field = (question: Question) => (
    <QuestionField
      key={question.id}
      question={frozen ? { ...question, isClosed: true } : question}
      value={answers[question.id]}
      onChange={(value) => setAnswer(question, value)}
      error={errors[question.id]}
    />
  )

  const save = async () => {
    const missing = missingAnswers(questions, answers).filter((question) => !question.isClosed)
    if (missing.length) {
      setErrors(
        Object.fromEntries(
          missing.map((question) => [question.id, 'Bitte beantworte diese Frage']),
        ),
      )
      return
    }
    const result = await saveAnswers({
      variables: { answers: collectAnswers(questions, answers) },
    })
    if (result.errors?.length) {
      await showMessage(
        'Das ging nicht',
        result.errors[0]?.message ?? 'Die Antworten konnten nicht gespeichert werden.',
        'OK',
      )
      return
    }
    await Promise.all([refetch(), reloadExhibitor()])
    await showMessage('Gespeichert', 'Danke, deine Antworten sind gespeichert.', 'OK')
  }

  return (
    <article className="space-y-6">
      <header>
        <PageHeading>Fragen der Orga</PageHeading>
        <p className="mt-2 text-base text-gray-700 dark:text-gray-300">
          Damit die Orga planen kann, bitten wir dich, diese Fragen zu beantworten. Du kannst deine
          Antworten später ändern, solange eine Frage nicht geschlossen ist.
        </p>
        {frozen && (
          <p className="mt-2 text-base text-gray-700 dark:text-gray-300">
            Diese Ausstellung ist abgeschlossen. Deine Antworten können nur noch angesehen werden.
          </p>
        )}
      </header>

      {questions.length === 0 ? (
        <Card>
          <p className="text-gray-600 dark:text-gray-400">
            Zurzeit gibt es keine Fragen an die Aussteller.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">{general.map(field)}</div>
          {audiences.map((audience) => (
            <section
              key={audience}
              className="rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900">
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {audienceLabel[audience]}
              </h2>
              <div className="space-y-2">
                {visible.filter((question) => question.audience === audience).map(field)}
              </div>
            </section>
          ))}
        </div>
      )}

      <ActionBar>
        {canSave && <Button onClick={save}>Antworten speichern</Button>}
        <Button variant="secondary" onClick={() => navigate('/user/umfrage/ergebnisse')}>
          Antworten der anderen
        </Button>
      </ActionBar>
    </article>
  )
}

export default Survey
