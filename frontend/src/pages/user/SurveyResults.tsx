import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { graphql, ResultOf } from 'gql.tada'
import { Link } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import LoadInProgress from '@components/LoadInProgress'
import PlainTable from '@components/volunteer/PlainTable'
import { TableRow, TableCell } from '@components/Table'
import {
  Audience,
  AnswerValue,
  audienceLabel,
  audienceMembersLabel,
  formatAnswer,
  Question,
} from '@components/survey/answers'
import { showMessage } from '@components/MessageModalUtil'
import { downloadCSV } from '@pages/admin/utils'
import { useExhibitor } from '@contexts/ExhibitorContext.ts'

const GET_RESULTS = graphql(`
  query GetSurveyResults {
    getCurrentExhibition {
      id
      key
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
      audienceSize
      nonRespondents {
        id
        user {
          id
          fullName
          nickname
        }
      }
      showIfQuestion {
        id
      }
      showIfValues
      answers {
        id
        value
        exhibitor {
          id
          user {
            id
            fullName
            nickname
          }
        }
      }
    }
  }
`)

const GET_SUBSCRIPTIONS = graphql(`
  query GetMySurveySubscriptions {
    getMySurveySubscriptions {
      id
      question {
        id
      }
      audience
    }
  }
`)

const SUBSCRIBE = graphql(`
  mutation SubscribeToSurveyFromResults($questionId: Int, $audience: SurveyAudience) {
    subscribeToSurvey(questionId: $questionId, audience: $audience) {
      id
    }
  }
`)

const UNSUBSCRIBE = graphql(`
  mutation UnsubscribeFromSurveyFromResults($id: Int!) {
    unsubscribeFromSurvey(id: $id)
  }
`)

type Result = ResultOf<typeof GET_RESULTS>
type QuestionWithAnswers = Result['getSurveyQuestions'][number]
type Answer = QuestionWithAnswers['answers'][number]

/* 'Daffy Duck (@daffy)', or whichever of the two is there. */
type Person = { id: number; user: { fullName?: string | null; nickname?: string | null } }

const personName = ({ id, user: { fullName, nickname } }: Person) => {
  if (fullName && nickname) return `${fullName} (@${nickname})`
  return fullName || (nickname ? `@${nickname}` : `#${id}`)
}

const nameOf = (answer: Answer) => personName(answer.exhibitor)

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`

/*
 * Every answer given, question by question: how often each option was
 * picked and by whom, the sum of the numbers, the texts as written.
 */
const SurveyResults = () => {
  const { exhibitor } = useExhibitor()
  const { loading, error, data } = useQuery(GET_RESULTS, { fetchPolicy: 'cache-and-network' })
  const { data: subscriptionData, refetch: refetchSubscriptions } = useQuery(GET_SUBSCRIPTIONS, {
    fetchPolicy: 'cache-and-network',
  })
  const [subscribe] = useMutation(SUBSCRIBE)
  const [unsubscribe] = useMutation(UNSUBSCRIBE)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [missing, setMissing] = useState<Set<number>>(new Set())
  const toggleMissing = (id: number) =>
    setMissing((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const questions = data?.getSurveyQuestions ?? []
  const subscriptions = subscriptionData?.getMySurveySubscriptions ?? []

  /* The subscription that covers a question, an audience, or everything. */
  const subscriptionFor = (questionId: number | null, audience: Audience | null) =>
    subscriptions.find(
      (each) => (each.question?.id ?? null) === questionId && (each.audience ?? null) === audience,
    )
  const followsAll = !!subscriptionFor(null, null)

  const toggleSubscription = async (questionId: number | null, audience: Audience | null) => {
    const existing = subscriptionFor(questionId, audience)
    const result = existing
      ? await unsubscribe({ variables: { id: existing.id } })
      : await subscribe({ variables: { questionId, audience } })
    if (result.errors?.length) {
      await showMessage(
        'Das ging nicht',
        result.errors[0]?.message ?? 'Die Benachrichtigung konnte nicht geändert werden.',
        'OK',
      )
      return
    }
    await refetchSubscriptions()
  }

  const FollowButton = ({
    questionId,
    audience,
    covered,
  }: {
    questionId: number | null
    audience: Audience | null
    covered?: boolean
  }) => {
    const following = !!subscriptionFor(questionId, audience)
    if (covered && !following) return null
    return (
      <button
        type="button"
        className={`rounded px-2 py-1 text-sm ${
          following
            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200'
            : 'text-blue-600 hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-gray-700'
        }`}
        title="Morgens eine Mail, wenn sich Antworten geändert haben"
        onClick={() => toggleSubscription(questionId, audience)}>
        {following ? '🔔 Benachrichtigt' : '🔕 Benachrichtigen'}
      </button>
    )
  }
  const audiences = [...new Set(questions.map((q) => q.audience).filter(Boolean))] as Audience[]

  /* One row per exhibitor, one column per question. */
  const exportCsv = () => {
    const byExhibitor = new Map<number, { name: string; answers: Map<number, string> }>()
    for (const question of questions) {
      for (const answer of question.answers) {
        const entry = byExhibitor.get(answer.exhibitor.id) ?? {
          name: nameOf(answer),
          answers: new Map(),
        }
        entry.answers.set(
          question.id,
          formatAnswer(question as Question, answer.value as AnswerValue),
        )
        byExhibitor.set(answer.exhibitor.id, entry)
      }
    }
    const rows = [...byExhibitor.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
    const lines = [
      ['Aussteller', ...questions.map((question) => question.label)].map(csvCell).join(';'),
      ...rows.map((row) =>
        [row.name, ...questions.map((question) => row.answers.get(question.id) ?? '')]
          .map(csvCell)
          .join(';'),
      ),
    ]
    downloadCSV(lines.join('\n'), `antworten-${data?.getCurrentExhibition?.key ?? 'cc'}.csv`)
  }

  /* A row of the summary: what was answered, how often. Clicking any row
     unfolds who said what to this question. */
  const summaryRows = (question: QuestionWithAnswers): [string, string][] => {
    const { answers } = question
    switch (question.type) {
      case 'checkbox':
        return [['Ja', String(answers.filter((answer) => answer.value === true).length)]]
      case 'singleChoice':
      case 'multipleChoice':
        return question.options.map((option) => [
          option.label,
          String(
            answers.filter((answer) =>
              Array.isArray(answer.value)
                ? answer.value.includes(option.key)
                : answer.value === option.key,
            ).length,
          ),
        ])
      case 'number': {
        const sum = answers.reduce((total, answer) => total + Number(answer.value), 0)
        return [
          ['Summe', String(sum)],
          ['Antworten', String(answers.length)],
        ]
      }
      case 'text':
        return [['Antworten', String(answers.length)]]
    }
  }

  const summaryOf = (question: QuestionWithAnswers) => {
    const open = expanded.has(question.id)
    const toggle = () =>
      setExpanded((current) => {
        const next = new Set(current)
        if (next.has(question.id)) next.delete(question.id)
        else next.add(question.id)
        return next
      })
    /* For a Ja/Nein question only those who said Ja are of interest, and
       the list is just their names. */
    const isYesNo = question.type === 'checkbox'
    const listed = isYesNo
      ? question.answers.filter((answer) => answer.value === true)
      : question.answers
    const sorted = [...listed].sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'de'))
    return (
      <>
        <PlainTable headers={['Antwort', 'Anzahl']}>
          {summaryRows(question).map(([label, count]) => (
            <TableRow key={label} onClick={toggle}>
              <TableCell className="whitespace-normal">{label}</TableCell>
              <TableCell>{count}</TableCell>
            </TableRow>
          ))}
        </PlainTable>
        {open && (
          <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            <PlainTable headers={isYesNo ? ['Wer'] : ['Wer', 'Antwort']}>
              {sorted.map((answer) => (
                <TableRow key={answer.id}>
                  <TableCell>{nameOf(answer)}</TableCell>
                  {!isYesNo && (
                    <TableCell className="whitespace-normal">
                      {formatAnswer(question as Question, answer.value as AnswerValue)}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </PlainTable>
          </div>
        )}
      </>
    )
  }

  return (
    <article className="space-y-6">
      <header>
        <PageHeading>Antworten der Aussteller</PageHeading>
        <p className="mt-2 text-base text-gray-700 dark:text-gray-300">
          Was die Aussteller auf die Fragen der Orga geantwortet haben.{' '}
          {exhibitor && (
            <Link to="/user/umfrage" className="text-blue-600 hover:underline dark:text-blue-400">
              Deine eigenen Antworten
            </Link>
          )}
        </p>
        {questions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Mail bei geänderten Antworten:</span>
            <span className="inline-flex items-center gap-1">
              alle Fragen <FollowButton questionId={null} audience={null} />
            </span>
            {audiences.map((audience) => (
              <span key={audience} className="inline-flex items-center gap-1">
                · {audienceLabel[audience]}{' '}
                <FollowButton questionId={null} audience={audience} covered={followsAll} />
              </span>
            ))}
          </div>
        )}
      </header>

      {questions.length === 0 && (
        <Card>
          <p className="text-gray-600 dark:text-gray-400">Zurzeit gibt es keine Fragen.</p>
        </Card>
      )}

      {questions.map((question, index) => (
        <div key={question.id} className="space-y-6">
          {question.audience && questions[index - 1]?.audience !== question.audience && (
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {audienceLabel[question.audience]}
            </h2>
          )}
          <Card>
            <div className="mb-1 flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {question.label}
              </h2>
              <FollowButton
                questionId={question.id}
                audience={null}
                covered={followsAll || !!subscriptionFor(null, question.audience ?? null)}
              />
            </div>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {question.answers.length} von {question.audienceSize}{' '}
              {question.audience ? audienceMembersLabel[question.audience] : 'Ausstellern'} haben
              geantwortet
              {question.isClosed && ' · geschlossen'}
              {question.nonRespondents.length > 0 && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                    onClick={() => toggleMissing(question.id)}>
                    {missing.has(question.id) ? 'Fehlende ausblenden' : 'Wer fehlt?'}
                  </button>
                </>
              )}
            </p>
            {missing.has(question.id) && (
              <p className="mb-3 text-sm text-gray-700 dark:text-gray-300">
                {question.nonRespondents.map(personName).join(', ')}
              </p>
            )}
            {question.answers.length ? (
              summaryOf(question)
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Noch keine Antworten.</p>
            )}
          </Card>
        </div>
      ))}

      {questions.length > 0 && (
        <ActionBar>
          <Button onClick={exportCsv}>Als CSV exportieren</Button>
        </ActionBar>
      )}
    </article>
  )
}

export default SurveyResults
