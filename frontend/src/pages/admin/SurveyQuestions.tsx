import { useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { useNavigate } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import FormSelect from '@components/FormSelect'
import LoadInProgress from '@components/LoadInProgress'
import { TableRow, TableCell } from '@components/Table'
import PlainTable from '@components/volunteer/PlainTable'
import { audienceLabel, formatClosesAt, typeLabel } from '@components/survey/answers'
import { showMessage } from '@components/MessageModalUtil'
import { showConfirm } from '@components/ConfirmUtil'

const GET_QUESTIONS = graphql(`
  query GetSurveyQuestionsForAdmin {
    getCurrentExhibition {
      id
      frozen
    }
    getExhibitions {
      id
      key
      title
    }
    getSurveyQuestions {
      id
      key
      label
      type
      required
      isClosed
      closesAt
      onRegistrationForm
      audience
      showIfQuestion {
        id
        label
      }
      answers {
        id
      }
    }
  }
`)

const REORDER = graphql(`
  mutation ReorderSurveyQuestions($ids: [Int!]!) {
    reorderSurveyQuestions(ids: $ids) {
      id
      ordering
    }
  }
`)

const COPY = graphql(`
  mutation CopySurveyQuestions($fromExhibitionId: Int!) {
    copySurveyQuestions(fromExhibitionId: $fromExhibitionId) {
      id
    }
  }
`)

/*
 * The questions of this exhibition, for the admins: what is asked, in which
 * order, and how many have answered. Questions come in from another
 * exhibition with one click; the editor makes new ones.
 */
const SurveyQuestions = () => {
  const navigate = useNavigate()
  const { loading, error, data, refetch } = useQuery(GET_QUESTIONS, {
    fetchPolicy: 'cache-and-network',
  })
  const [reorder] = useMutation(REORDER)
  const [copy] = useMutation(COPY)
  const [sourceId, setSourceId] = useState('')

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const questions = data?.getSurveyQuestions ?? []
  const currentId = data?.getCurrentExhibition?.id
  const frozen = data?.getCurrentExhibition?.frozen ?? false
  const others = (data?.getExhibitions ?? []).filter((exhibition) => exhibition.id !== currentId)

  const complain = async (message: string) => {
    await showMessage('Das ging nicht', message, 'OK')
  }

  /* A parent moves with its dependent questions; a dependent question moves
     only among the others under the same parent. */
  const parentIdOf = (index: number) => questions[index].showIfQuestion?.id ?? null
  const blockAt = (index: number) => {
    const id = questions[index].id
    const end = questions.findIndex((each, i) => i > index && each.showIfQuestion?.id !== id)
    return questions.slice(index, end === -1 ? questions.length : end)
  }
  const canMove = (index: number, direction: -1 | 1) => {
    const parent = parentIdOf(index)
    if (parent !== null) {
      const neighbour = index + direction
      return neighbour >= 0 && neighbour < questions.length && parentIdOf(neighbour) === parent
    }
    const tops = questions.filter((each) => !each.showIfQuestion)
    const position = tops.findIndex((each) => each.id === questions[index].id)
    return position + direction >= 0 && position + direction < tops.length
  }
  const move = async (index: number, direction: -1 | 1) => {
    if (!canMove(index, direction)) return
    let list: typeof questions
    if (parentIdOf(index) !== null) {
      list = [...questions]
      ;[list[index], list[index + direction]] = [list[index + direction], list[index]]
    } else {
      const blocks: (typeof questions)[] = []
      for (let i = 0; i < questions.length; ) {
        const block = blockAt(i)
        blocks.push(block)
        i += block.length
      }
      const at = blocks.findIndex((block) => block[0].id === questions[index].id)
      ;[blocks[at], blocks[at + direction]] = [blocks[at + direction], blocks[at]]
      list = blocks.flat()
    }
    const result = await reorder({ variables: { ids: list.map((question) => question.id) } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    await refetch()
  }

  const copyFrom = async () => {
    const source = others.find((exhibition) => String(exhibition.id) === sourceId)
    if (!source) return
    if (
      !(await showConfirm(
        'Fragen übernehmen',
        `Die Fragen der ${source.title} werden hier angelegt, ohne Antworten und ohne Fristen. Fragen mit einem Kürzel, das es hier schon gibt, bleiben wie sie sind.`,
        'Übernehmen',
      ))
    ) {
      return
    }
    const result = await copy({ variables: { fromExhibitionId: source.id } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    await refetch()
  }

  return (
    <>
      <PageHeading>Fragen an Aussteller</PageHeading>

      <ActionBar>
        <Button onClick={() => navigate('/admin/umfrage/neu')} disabled={frozen}>
          Neue Frage
        </Button>
        <Button variant="secondary" onClick={() => navigate('/user/umfrage/ergebnisse')}>
          Antworten ansehen
        </Button>
      </ActionBar>

      <Card>
        <PlainTable
          headers={[
            '',
            'Frage',
            'Kürzel',
            'Typ',
            'Für',
            'Pflicht',
            'Anmeldung',
            'Schließt',
            'Antworten',
          ]}>
          {questions.map((question, index) => (
            <TableRow key={question.id} onClick={() => navigate(`/admin/umfrage/${question.id}`)}>
              <TableCell>
                <span className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="rounded px-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                    disabled={frozen || !canMove(index, -1)}
                    title="Nach oben"
                    onClick={() => move(index, -1)}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                    disabled={frozen || !canMove(index, 1)}
                    title="Nach unten"
                    onClick={() => move(index, 1)}>
                    ↓
                  </button>
                </span>
              </TableCell>
              <TableCell className="whitespace-normal">
                {question.showIfQuestion && (
                  <span
                    className="mr-1 text-gray-400"
                    title={`Nur nach „${question.showIfQuestion.label}“`}>
                    ↳
                  </span>
                )}
                {question.label}
              </TableCell>
              <TableCell>{question.key}</TableCell>
              <TableCell>{typeLabel[question.type]}</TableCell>
              <TableCell>{question.audience ? audienceLabel[question.audience] : 'Alle'}</TableCell>
              <TableCell>{question.required ? 'Ja' : '—'}</TableCell>
              <TableCell>{question.onRegistrationForm ? 'Ja' : '—'}</TableCell>
              <TableCell>
                {question.closesAt ? formatClosesAt(question.closesAt as string) : '—'}
                {question.isClosed && ' (zu)'}
              </TableCell>
              <TableCell>{question.answers.length}</TableCell>
            </TableRow>
          ))}
        </PlainTable>
        {!questions.length && (
          <p className="p-4 text-gray-500 dark:text-gray-400">
            Noch keine Fragen. Lege eine an oder übernimm die einer anderen Ausstellung.
          </p>
        )}
      </Card>

      {others.length > 0 && !frozen && (
        <Card className="mt-6">
          <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Fragen einer anderen Ausstellung übernehmen
          </h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-64">
              <span className="block text-sm text-gray-600 dark:text-gray-400">Ausstellung</span>
              <FormSelect value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value=""></option>
                {others.map((exhibition) => (
                  <option key={exhibition.id} value={exhibition.id}>
                    {exhibition.title}
                  </option>
                ))}
              </FormSelect>
            </label>
            <Button onClick={copyFrom} disabled={!sourceId}>
              Übernehmen
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}

export default SurveyQuestions
