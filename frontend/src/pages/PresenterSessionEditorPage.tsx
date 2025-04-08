import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { graphql } from 'gql.tada'
import { useBreadcrumb } from '@contexts/BreadcrumbContext'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useExhibitor } from '@contexts/ExhibitorContext'
import LoadInProgress from '@components/LoadInProgress'
import Card from '@components/Card'
import { KeyValueTable, TableRow, TableCell } from '@components/Table'
import TextEditor, { TextEditorHandle } from '@components/TextEditor'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import { useUnsavedChangesWarning } from '@hooks/useUnsavedChangesWarning'

const GET_SESSION = graphql(`
  query GetSession($id: Int!) {
    getConferenceSession(id: $id) {
      id
      title
      description
      startTime
      endTime
      room {
        id
        name
      }
      exhibitors {
        id
        user {
          fullName
          nickname
        }
      }
    }
  }
`)

const UPDATE_SESSION = graphql(`
  mutation UpdateConferenceSession($id: Int!, $input: UpdateConferenceSessionInput!) {
    updateConferenceSession(id: $id, input: $input) {
      id
      title
      description
    }
  }
`)

const PresenterSessionEditorPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { setDetailName } = useBreadcrumb()
  const { exhibitor } = useExhibitor()
  const textEditorRef = useRef<TextEditorHandle>(null)
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [isTextEdited, setIsTextEdited] = useState(false)

  const { loading, error, data } = useQuery(GET_SESSION, {
    variables: { id: parseInt(id ?? '0') },
    skip: !id,
  })

  const [updateSession] = useMutation(UPDATE_SESSION, {
    onCompleted: () => {
      navigate(`/session/${id}`)
    },
  })

  useEffect(() => {
    setDetailName(location.pathname, data?.getConferenceSession?.title ?? 'Session bearbeiten')
  }, [data?.getConferenceSession?.title, setDetailName])

  useEffect(() => {
    if (data?.getConferenceSession) {
      setDescription(data.getConferenceSession.description ?? '')
      setTitle(data.getConferenceSession.title ?? '')
      if (textEditorRef.current) {
        textEditorRef.current.resetEditState()
      }
    }
  }, [data?.getConferenceSession])

  // Check if user is authorized to edit this session
  useEffect(() => {
    if (data?.getConferenceSession && exhibitor) {
      const isPresenter = data.getConferenceSession.exhibitors?.some((e) => e.id === exhibitor.id)
      if (!exhibitor.user.isAdministrator && !isPresenter) {
        navigate(`/session/${id}`)
      }
    }
  }, [data?.getConferenceSession, exhibitor, id, navigate])

  // Track unsaved changes
  const hasChanges = useMemo(() => {
    if (!data?.getConferenceSession) return false
    return (
      description !== (data.getConferenceSession.description ?? '') ||
      title !== (data.getConferenceSession.title ?? '') ||
      isTextEdited
    )
  }, [description, title, isTextEdited, data?.getConferenceSession])

  useUnsavedChangesWarning(hasChanges)

  if (loading) return <LoadInProgress />
  if (error) return <div className="text-red-600">Error: {error.message}</div>
  if (!data?.getConferenceSession) return <div>Session nicht gefunden</div>

  const session = data.getConferenceSession
  const startTime = new Date(session.startTime as string)
  const endTime = new Date(session.endTime as string)
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // duration in minutes

  const presenters = session.exhibitors
    ?.map((exhibitor) => exhibitor.user.nickname || exhibitor.user.fullName)
    .join(', ')

  const handleSave = async () => {
    const currentDescription = textEditorRef.current?.getHTML() || ''
    await updateSession({
      variables: {
        id: parseInt(id ?? '0'),
        input: {
          title,
          description: currentDescription,
        },
      },
    })
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <div className="mb-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-b border-gray-300 bg-transparent text-2xl font-bold focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:focus:border-blue-400"
          />
        </div>

        <KeyValueTable>
          {presenters && (
            <TableRow>
              <TableCell>Präsentierende</TableCell>
              <TableCell>{presenters}</TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell>Datum</TableCell>
            <TableCell>
              {startTime.toLocaleDateString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Zeit</TableCell>
            <TableCell>
              {startTime.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              -{' '}
              {endTime.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' ('}
              {duration} Minuten{')'}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Raum</TableCell>
            <TableCell>{session.room?.name}</TableCell>
          </TableRow>
        </KeyValueTable>

        <div className="mt-6">
          <h2 className="mb-4 text-xl font-semibold">Beschreibung</h2>
          <TextEditor
            ref={textEditorRef}
            defaultValue={description}
            onEditStateChange={(edited) => setIsTextEdited(edited)}
          />
        </div>
      </Card>

      <ActionBar>
        <Button onClick={() => navigate(`/session/${id}`)} variant="secondary">
          Abbrechen
        </Button>
        {exhibitor?.user.isAdministrator && (
          <Button
            onClick={() => navigate(`/admin/session/${id}`)}
            variant="secondary"
            icon="schedule">
            Planung
          </Button>
        )}
        <Button onClick={handleSave} disabled={!hasChanges}>
          Speichern
        </Button>
      </ActionBar>
    </div>
  )
}

export default PresenterSessionEditorPage
