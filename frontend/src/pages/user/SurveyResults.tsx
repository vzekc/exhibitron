import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { graphql, ResultOf } from 'gql.tada'
import { Link } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import LoadInProgress from '@components/LoadInProgress'
import PlainTable from '@components/volunteer/PlainTable'
import { TableRow, TableCell } from '@components/Table'
import { AnswerValue, formatAnswer, Question } from '@components/survey/answers'
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

type Result = ResultOf<typeof GET_RESULTS>
type QuestionWithAnswers = Result['getSurveyQuestions'][number]
type Answer = QuestionWithAnswers['answers'][number]

/* 'Daffy Duck (@daffy)', or whichever of the two is there. */
const nameOf = (answer: Answer) => {
  const { fullName, nickname } = answer.exhibitor.user
  if (fullName && nickname) return `${fullName} (@${nickname})`
  return fullName || (nickname ? `@${nickname}` : `#${answer.exhibitor.id}`)
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`

/*
 * Every answer given, question by question: how often each option was
 * picked and by whom, the sum of the numbers, the texts as written.
 */
const SurveyResults = () => {
  const { exhibitor } = useExhibitor()
  const { loading, error, data } = useQuery(GET_RESULTS, { fetchPolicy: 'cache-and-network' })
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const questions = data?.getSurveyQuestions ?? []

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
      </header>

      {questions.length === 0 && (
        <Card>
          <p className="text-gray-600 dark:text-gray-400">Zurzeit gibt es keine Fragen.</p>
        </Card>
      )}

      {questions.map((question) => (
        <Card key={question.id}>
          <h2 className="mb-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
            {question.label}
          </h2>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {question.answers.length} {question.answers.length === 1 ? 'Antwort' : 'Antworten'}
            {question.isClosed && ' · geschlossen'}
          </p>
          {question.answers.length ? (
            summaryOf(question)
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Noch keine Antworten.</p>
          )}
        </Card>
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
