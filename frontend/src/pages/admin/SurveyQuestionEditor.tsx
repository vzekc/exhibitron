import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { graphql, ResultOf } from 'gql.tada'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import FormFieldset from '@components/FormFieldset'
import FormInput from '@components/FormInput'
import FormSelect from '@components/FormSelect'
import FormTextarea from '@components/FormTextarea'
import LoadInProgress from '@components/LoadInProgress'
import { showMessage } from '@components/MessageModalUtil'
import { showConfirm } from '@components/ConfirmUtil'
import { useBreadcrumb } from '@contexts/BreadcrumbContext.ts'
import {
  Audience,
  audienceLabel,
  canBeParent,
  isChoice,
  Option,
  parentValuesOf,
  QuestionType,
  typeLabel,
} from '@components/survey/answers'

const GET_QUESTIONS = graphql(`
  query GetSurveyQuestionsForEditor {
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
      closesAt
      onRegistrationForm
      audience
      showIfQuestion {
        id
      }
      showIfValues
      answers {
        id
      }
    }
  }
`)

const CREATE = graphql(`
  mutation CreateSurveyQuestionFromEditor($input: SurveyQuestionInput!) {
    createSurveyQuestion(input: $input) {
      id
    }
  }
`)

const UPDATE = graphql(`
  mutation UpdateSurveyQuestionFromEditor($id: Int!, $input: SurveyQuestionInput!) {
    updateSurveyQuestion(id: $id, input: $input) {
      id
    }
  }
`)

const DELETE = graphql(`
  mutation DeleteSurveyQuestionFromEditor($id: Int!) {
    deleteSurveyQuestion(id: $id)
  }
`)

const TYPES: QuestionType[] = ['checkbox', 'singleChoice', 'multipleChoice', 'text', 'number']

type EditorQuestion = ResultOf<typeof GET_QUESTIONS>['getSurveyQuestions'][number]

/* A key made from a label, the way the backend makes option keys. */
const slugOf = (label: string) =>
  label
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/* 'YYYY-MM-DDTHH:MM' in local time, what a datetime-local input speaks. */
const toLocalInput = (iso: string) => {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm text-gray-600 dark:text-gray-400">{children}</span>
)

/* An option under edit: the key stays with it once it has one. */
type EditableOption = { key?: string; label: string }

/*
 * One question, new or existing. The whole form is saved at once; the backend
 * checks what it is given and says what is wrong.
 */
const SurveyQuestionEditor = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setDetailName } = useBreadcrumb()
  const isNew = !id
  const questionId = id ? Number(id) : undefined

  const { loading, error, data } = useQuery(GET_QUESTIONS, { fetchPolicy: 'cache-and-network' })
  const refetchList = {
    refetchQueries: ['GetSurveyQuestionsForAdmin', 'GetSurveyQuestionsForEditor'],
    awaitRefetchQueries: true,
  }
  const [create] = useMutation(CREATE, refetchList)
  const [update] = useMutation(UPDATE, refetchList)
  const [remove] = useMutation(DELETE, refetchList)

  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [keyTouched, setKeyTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [type, setType] = useState<QuestionType>('checkbox')
  const [options, setOptions] = useState<EditableOption[]>([{ label: '' }, { label: '' }])
  const [required, setRequired] = useState(false)
  const [onRegistrationForm, setOnRegistrationForm] = useState(false)
  const [audience, setAudience] = useState<Audience | ''>('')
  const [closesAt, setClosesAt] = useState('')
  const [parentId, setParentId] = useState('')
  const [parentValues, setParentValues] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  const questions = (data?.getSurveyQuestions ?? []) as EditorQuestion[]
  const question = questions.find((each) => each.id === questionId)

  useEffect(() => {
    if (!question || loaded) return
    setLabel(question.label)
    setKey(question.key)
    setKeyTouched(true)
    setDescription(question.description ?? '')
    setType(question.type)
    setOptions(question.options.length ? question.options : [{ label: '' }, { label: '' }])
    setRequired(question.required)
    setOnRegistrationForm(question.onRegistrationForm)
    setAudience(question.audience ?? '')
    setClosesAt(question.closesAt ? toLocalInput(question.closesAt as string) : '')
    setParentId(question.showIfQuestion ? String(question.showIfQuestion.id) : '')
    setParentValues(question.showIfValues)
    setDetailName(location.pathname, question.label)
    setLoaded(true)
  }, [question, loaded, setDetailName])

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>
  if (!isNew && data && !question) return <div>Diese Frage gibt es nicht.</div>

  /* Who this question may wait for: a checkbox or choice question that does
     not wait for anybody itself. A question with children of its own cannot
     be made to wait, so those are left out too. */
  const hasChildren =
    questionId !== undefined && questions.some((each) => each.showIfQuestion?.id === questionId)
  const parents = hasChildren
    ? []
    : questions.filter((each) => each.id !== questionId && canBeParent(each))
  const parent = parents.find((each) => String(each.id) === parentId)

  const complain = async (message: string) => {
    await showMessage('Das ging nicht', message, 'OK')
  }

  const setOption = (index: number, value: string) =>
    setOptions((current) =>
      current.map((option, i) => (i === index ? { ...option, label: value } : option)),
    )

  const save = async () => {
    const input = {
      key: key.trim(),
      label: label.trim(),
      description: description.trim() || null,
      type,
      options: isChoice(type)
        ? options
            .filter((option) => option.label.trim())
            .map((option) => ({ key: option.key ?? null, label: option.label.trim() }))
        : null,
      required,
      onRegistrationForm: audience ? false : onRegistrationForm,
      audience: audience || null,
      closesAt: closesAt ? new Date(closesAt).toISOString() : null,
      showIfQuestionId: parent ? parent.id : null,
      showIfValues: parent ? parentValues : null,
    }
    if (!input.label || !input.key) {
      await complain('Die Frage braucht einen Text und ein Kürzel')
      return
    }
    const result = question
      ? await update({ variables: { id: question.id, input } })
      : await create({ variables: { input } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    navigate('/admin/umfrage')
  }

  const removeQuestion = async () => {
    if (!question) return
    const count = question.answers.length
    const warning = count
      ? ` Die ${count} ${count === 1 ? 'Antwort' : 'Antworten'} darauf ${count === 1 ? 'geht' : 'gehen'} mit verloren.`
      : ''
    if (
      !(await showConfirm(
        'Frage löschen',
        `Soll „${question.label}“ wirklich weg?${warning}`,
        'Löschen',
      ))
    ) {
      return
    }
    const result = await remove({ variables: { id: question.id } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    navigate('/admin/umfrage')
  }

  const typeChangeWarning =
    question && question.answers.length > 0 && type !== question.type
      ? 'Mit dem Typ ändern sich die Antworten: alle bisherigen gehen verloren.'
      : null

  return (
    <>
      <PageHeading>{question ? question.label : 'Neue Frage'}</PageHeading>

      <Card className="space-y-4">
        <FormFieldset legend="Frage">
          <div className="space-y-3">
            <label className="block">
              <Label>Text der Frage</Label>
              <FormInput
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value)
                  if (!keyTouched) setKey(slugOf(e.target.value))
                }}
                placeholder="Ich brauche Ethernet am Tisch"
              />
            </label>
            <label className="block">
              <Label>Kürzel (bleibt gleich, auch wenn der Text geändert wird)</Label>
              <FormInput
                value={key}
                onChange={(e) => {
                  setKeyTouched(true)
                  setKey(e.target.value)
                }}
                placeholder="ethernet"
              />
            </label>
            <label className="block">
              <Label>Erläuterung, steht unter der Frage (optional)</Label>
              <FormTextarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block">
              <Label>Art der Antwort</Label>
              <FormSelect value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
                {TYPES.map((each) => (
                  <option key={each} value={each}>
                    {typeLabel[each]}
                  </option>
                ))}
              </FormSelect>
              {typeChangeWarning && (
                <span className="mt-1 block text-sm text-amber-700 dark:text-amber-400">
                  {typeChangeWarning}
                </span>
              )}
            </label>
          </div>
        </FormFieldset>

        {isChoice(type) && (
          <FormFieldset legend="Auswahlmöglichkeiten">
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option.key ?? `new-${index}`} className="flex items-center gap-2">
                  <FormInput
                    value={option.label}
                    onChange={(e) => setOption(index, e.target.value)}
                    placeholder={`Möglichkeit ${index + 1}`}
                  />
                  {option.key && (
                    <span className="w-40 truncate text-sm text-gray-400" title={option.key}>
                      {option.key}
                    </span>
                  )}
                  <button
                    type="button"
                    className="rounded px-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Entfernen"
                    onClick={() => setOptions((current) => current.filter((_, i) => i !== index))}>
                    ✕
                  </button>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() => setOptions((current) => [...current, { label: '' }])}>
                Möglichkeit hinzufügen
              </Button>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Eine Möglichkeit, die entfernt wird, nimmt die Antworten mit, die sie gewählt
                hatten. Umbenennen ist unschädlich.
              </p>
            </div>
          </FormFieldset>
        )}

        <FormFieldset legend="Regeln">
          <div className="space-y-3">
            <label className="flex cursor-pointer items-center">
              <FormInput
                type="checkbox"
                className="mr-2"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <span>Pflichtfrage — Aussteller werden erinnert, bis sie geantwortet haben</span>
            </label>
            <label className="block">
              <Label>Zielgruppe</Label>
              <FormSelect
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience | '')}>
                <option value="">Alle Aussteller</option>
                {(Object.keys(audienceLabel) as Audience[]).map((each) => (
                  <option key={each} value={each}>
                    {audienceLabel[each]}
                  </option>
                ))}
              </FormSelect>
            </label>
            <label className={`flex items-center ${audience ? 'opacity-50' : 'cursor-pointer'}`}>
              <FormInput
                type="checkbox"
                className="mr-2"
                checked={!audience && onRegistrationForm}
                disabled={!!audience}
                onChange={(e) => setOnRegistrationForm(e.target.checked)}
              />
              <span>
                Schon auf dem Anmeldeformular fragen
                {audience && ' — nicht für eine Zielgruppe, wer anmeldet, hat noch keinen Tisch'}
              </span>
            </label>
            <label className="block">
              <Label>Antworten möglich bis (leer: bis die Ausstellung eingefroren wird)</Label>
              <input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                className="block rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
              />
            </label>
          </div>
        </FormFieldset>

        <FormFieldset legend="Nur nach einer bestimmten Antwort zeigen">
          {hasChildren ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Von dieser Frage hängen andere Fragen ab; sie kann nicht selbst von einer abhängen.
            </p>
          ) : (
            <div className="space-y-3">
              <label className="block">
                <Label>Frage, auf die es ankommt</Label>
                <FormSelect
                  value={parentId}
                  onChange={(e) => {
                    setParentId(e.target.value)
                    setParentValues([])
                  }}>
                  <option value="">— immer zeigen —</option>
                  {parents.map((each) => (
                    <option key={each.id} value={each.id}>
                      {each.label}
                    </option>
                  ))}
                </FormSelect>
              </label>
              {parent && (
                <div>
                  <Label>Zeigen, wenn dort geantwortet wurde:</Label>
                  <div className="mt-1 space-y-1">
                    {parentValuesOf(parent).map((option: Option) => (
                      <label key={option.key} className="flex cursor-pointer items-center">
                        <FormInput
                          type="checkbox"
                          className="mr-2"
                          checked={parentValues.includes(option.key)}
                          onChange={(e) =>
                            setParentValues((current) =>
                              e.target.checked
                                ? [...current, option.key]
                                : current.filter((key) => key !== option.key),
                            )
                          }
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </FormFieldset>
      </Card>

      <ActionBar>
        <Button onClick={save}>Speichern</Button>
        <Button variant="secondary" onClick={() => navigate('/admin/umfrage')}>
          Abbrechen
        </Button>
        {question && (
          <Button variant="danger" onClick={removeQuestion}>
            Löschen
          </Button>
        )}
      </ActionBar>
    </>
  )
}

export default SurveyQuestionEditor
