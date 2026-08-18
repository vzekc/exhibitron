import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '@components/Card'
import PageHeading from '@components/PageHeading'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import FormFieldset from '@components/FormFieldset'
import FormInput from '@components/FormInput'
import ExhibitorSelector from '@components/ExhibitorSelector'
import TextEditor, { TextEditorHandle } from '@components/TextEditor'
import LoadInProgress from '@components/LoadInProgress'
import { TableRow, TableCell } from '@components/Table'
import PlainTable from '@components/volunteer/PlainTable'
import { showMessage } from '@components/MessageModalUtil'
import { showConfirm } from '@components/ConfirmUtil'
import { toLocalDateString } from '@utils/date'
import { clock, duration, minutesBetween, weekday } from '@components/volunteer/coverage'

const GET_ACTIVITY = graphql(`
  query GetVolunteerActivityForAdmin($key: String!) {
    getVolunteerActivity(key: $key) {
      id
      key
      name
      summary
      description
      contact {
        id
        user {
          fullName
        }
      }
      periods {
        id
        startTime
        endTime
        durationMinutes
        neededCount
        note
      }
    }
  }
`)

const GET_EXHIBITORS = graphql(`
  query GetExhibitorsForVolunteerActivity {
    getCurrentExhibition {
      id
      exhibitors {
        id
        user {
          id
          fullName
          nickname
        }
      }
    }
  }
`)

const CREATE_ACTIVITY = graphql(`
  mutation CreateVolunteerActivity($input: CreateVolunteerActivityInput!) {
    createVolunteerActivity(input: $input) {
      id
      key
    }
  }
`)

const UPDATE_ACTIVITY = graphql(`
  mutation UpdateVolunteerActivity($id: Int!, $input: UpdateVolunteerActivityInput!) {
    updateVolunteerActivity(id: $id, input: $input) {
      id
      key
    }
  }
`)

const DELETE_ACTIVITY = graphql(`
  mutation DeleteVolunteerActivityFromEditor($id: Int!) {
    deleteVolunteerActivity(id: $id)
  }
`)

const CREATE_PERIOD = graphql(`
  mutation CreateVolunteerPeriodFromEditor($input: CreateVolunteerPeriodInput!) {
    createVolunteerPeriod(input: $input) {
      id
    }
  }
`)

const DELETE_PERIOD = graphql(`
  mutation DeleteVolunteerPeriodFromEditor($id: Int!) {
    deleteVolunteerPeriod(id: $id)
  }
`)

const today = toLocalDateString(new Date())

const VolunteerActivityEditor = () => {
  const { key } = useParams()
  const navigate = useNavigate()
  const isNew = !key
  const descriptionRef = useRef<TextEditorHandle>(null)

  const { loading, error, data, refetch } = useQuery(GET_ACTIVITY, {
    variables: { key: key ?? '' },
    skip: isNew,
    fetchPolicy: 'cache-and-network',
  })
  const { data: exhibitorData } = useQuery(GET_EXHIBITORS)

  const [createActivity] = useMutation(CREATE_ACTIVITY)
  const [updateActivity] = useMutation(UPDATE_ACTIVITY)
  const [deleteActivity] = useMutation(DELETE_ACTIVITY)
  const [createPeriod] = useMutation(CREATE_PERIOD)
  const [deletePeriod] = useMutation(DELETE_PERIOD)

  const [name, setName] = useState('')
  const [activityKey, setActivityKey] = useState('')
  const [summary, setSummary] = useState('')
  const [contactId, setContactId] = useState<number | null>(null)

  const [periodDate, setPeriodDate] = useState(today)
  const [periodFrom, setPeriodFrom] = useState('10:00')
  const [periodTo, setPeriodTo] = useState('18:00')
  const [neededCount, setNeededCount] = useState('')
  const [note, setNote] = useState('')

  const activity = data?.getVolunteerActivity

  useEffect(() => {
    if (!activity) return
    setName(activity.name)
    setActivityKey(activity.key)
    setSummary(activity.summary)
    setContactId(activity.contact?.id ?? null)
  }, [activity])

  if (loading && !data) return <LoadInProgress />
  if (error) return <div>Fehler: {error.message}</div>

  const exhibitors = exhibitorData?.getCurrentExhibition?.exhibitors ?? []
  const contact = exhibitors.find((exhibitor) => exhibitor.id === contactId)

  const complain = async (message: string) => {
    await showMessage('Das ging nicht', message, 'OK')
  }

  const save = async () => {
    const input = {
      key: activityKey.trim(),
      name: name.trim(),
      summary: summary.trim(),
      description: descriptionRef.current?.getHTML() ?? '',
      contactId,
    }
    if (!input.key || !input.name || !input.summary) {
      await complain('Name, Kürzel und Kurzbeschreibung gehören dazu')
      return
    }

    const result = activity
      ? await updateActivity({ variables: { id: activity.id, input } })
      : await createActivity({ variables: { input } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    navigate('/admin/mitmachen')
  }

  const addPeriod = async () => {
    if (!activity) {
      await complain('Bitte speichere die Tätigkeit, bevor du Zeiträume anlegst')
      return
    }
    const startTime = new Date(`${periodDate}T${periodFrom}`)
    const durationMinutes = minutesBetween(startTime, new Date(`${periodDate}T${periodTo}`))

    const result = await createPeriod({
      variables: {
        input: {
          activityId: activity.id,
          startTime: startTime.toISOString(),
          durationMinutes,
          neededCount: neededCount ? Number(neededCount) : null,
          note: note.trim() || null,
        },
      },
    })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    setNote('')
    await refetch()
  }

  const removePeriod = async (id: number) => {
    if (!(await showConfirm('Zeitraum löschen', 'Soll dieser Zeitraum wirklich weg?'))) return
    const result = await deletePeriod({ variables: { id } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    await refetch()
  }

  const removeActivity = async () => {
    if (!activity) return
    if (!(await showConfirm('Tätigkeit löschen', `Soll „${activity.name}“ wirklich weg?`))) return
    const result = await deleteActivity({ variables: { id: activity.id } })
    if (result.errors?.length) {
      await complain(result.errors[0]?.message ?? 'Unbekannter Fehler')
      return
    }
    navigate('/admin/mitmachen')
  }

  return (
    <>
      <PageHeading>{activity ? activity.name : 'Neue Tätigkeit'}</PageHeading>

      <Card className="space-y-4">
        <FormFieldset legend="Tätigkeit">
          <div className="space-y-3">
            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-400">Name</span>
              <FormInput value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Kürzel (steht in der Adresse der Seite)
              </span>
              <FormInput
                value={activityKey}
                onChange={(e) => setActivityKey(e.target.value)}
                placeholder="infotresen"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Kurzbeschreibung, eine Zeile
              </span>
              <FormInput value={summary} onChange={(e) => setSummary(e.target.value)} />
            </label>
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Ansprechperson {contact && `— ${contact.user.fullName}`}
              </span>
              <ExhibitorSelector options={exhibitors} onSelect={setContactId} />
            </div>
          </div>
        </FormFieldset>

        <FormFieldset legend="Ausführliche Beschreibung">
          <TextEditor ref={descriptionRef} defaultValue={activity?.description ?? ''} />
        </FormFieldset>
      </Card>

      <ActionBar>
        <Button onClick={save}>Speichern</Button>
        <Button variant="secondary" onClick={() => navigate('/admin/mitmachen')}>
          Abbrechen
        </Button>
        {activity && (
          <Button variant="danger" onClick={removeActivity}>
            Löschen
          </Button>
        )}
      </ActionBar>

      {activity && (
        <>
          <PageHeading>Zeiträume</PageHeading>
          <Card>
            <PlainTable headers={['Tag', 'Von–bis', 'Dauer', 'Gebraucht', 'Hinweis', '']}>
              {activity.periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell>{weekday(period.startTime as string)}</TableCell>
                  <TableCell>
                    {clock(period.startTime as string)}–{clock(period.endTime as string)}
                  </TableCell>
                  <TableCell>{duration(period.durationMinutes)}</TableCell>
                  <TableCell>{period.neededCount ?? 'beliebig viele'}</TableCell>
                  <TableCell>{period.note ?? ''}</TableCell>
                  <TableCell>
                    <Button variant="danger" onClick={() => removePeriod(period.id)}>
                      Löschen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </PlainTable>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label>
                <span className="block text-sm text-gray-600 dark:text-gray-400">Tag</span>
                <input
                  type="date"
                  value={periodDate}
                  onChange={(e) => setPeriodDate(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600 dark:text-gray-400">Von</span>
                <input
                  type="time"
                  step={900}
                  value={periodFrom}
                  onChange={(e) => setPeriodFrom(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600 dark:text-gray-400">Bis</span>
                <input
                  type="time"
                  step={900}
                  value={periodTo}
                  onChange={(e) => setPeriodTo(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
                />
              </label>
              <label>
                <span className="block text-sm text-gray-600 dark:text-gray-400">
                  Gebraucht (leer: beliebig viele)
                </span>
                <FormInput
                  type="number"
                  min={1}
                  value={neededCount}
                  onChange={(e) => setNeededCount(e.target.value)}
                  className="w-40"
                />
              </label>
              <label className="grow">
                <span className="block text-sm text-gray-600 dark:text-gray-400">Hinweis</span>
                <FormInput
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Treffpunkt am Lastenaufzug"
                />
              </label>
              <Button icon="add" onClick={addPeriod}>
                Zeitraum hinzufügen
              </Button>
            </div>
          </Card>
        </>
      )}
    </>
  )
}

export default VolunteerActivityEditor
