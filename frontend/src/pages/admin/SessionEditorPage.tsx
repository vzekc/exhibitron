import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import SessionEditor from '@components/schedule/SessionEditor'
import { useBreadcrumb } from '@contexts/BreadcrumbContext'
import { useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'

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
      }
      exhibitors {
        id
        user {
          fullName
        }
      }
    }
  }
`)

const SessionEditorPage = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setDetailName } = useBreadcrumb()

  const { loading, error, data } = useQuery(GET_SESSION, {
    variables: { id: parseInt(id ?? '0') },
    skip: !id,
  })

  useEffect(() => {
    setDetailName(location.pathname, id ? 'Session bearbeiten' : 'Neue Session')
  }, [id, setDetailName])

  const roomId = searchParams.get('roomId')
  const startTime = searchParams.get('startTime')

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  const sessionToEdit = data?.getConferenceSession
    ? {
        id: data.getConferenceSession.id.toString(),
        title: data.getConferenceSession.title,
        description: data.getConferenceSession.description ?? undefined,
        startTime: new Date(data.getConferenceSession.startTime as string).getTime(),
        endTime: new Date(data.getConferenceSession.endTime as string).getTime(),
        roomId: data.getConferenceSession.room?.id.toString() ?? '',
        exhibitorIds: data.getConferenceSession.exhibitors?.map((e) => e.id.toString()) ?? [],
      }
    : undefined

  return (
    <div className="container mx-auto p-4">
      <SessionEditor
        isOpen={true}
        onClose={() => navigate('/schedule')}
        sessionToEdit={sessionToEdit}
        initialRoomId={roomId ?? undefined}
        initialStartTime={startTime ? parseInt(startTime) : undefined}
        onSessionCreated={() => navigate('/schedule')}
        onSessionUpdated={() => navigate('/schedule')}
        onSessionDeleted={() => navigate('/schedule')}
      />
    </div>
  )
}

export default SessionEditorPage
