import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { useBreadcrumb } from '@contexts/BreadcrumbContext'
import { useEffect } from 'react'
import LoadInProgress from '@components/LoadInProgress'
import Card from '@components/Card'
import ServerHtmlContent from '@components/ServerHtmlContent'
import { KeyValueTable, TableRow, TableCell } from '@components/Table'

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

const Session = () => {
  const { id } = useParams()
  const { setDetailName } = useBreadcrumb()
  const { loading, error, data } = useQuery(GET_SESSION, {
    variables: { id: parseInt(id ?? '0') },
    skip: !id,
  })

  useEffect(() => {
    setDetailName(location.pathname, data?.getConferenceSession?.title ?? 'Session')
  }, [data?.getConferenceSession?.title, setDetailName])

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

  return (
    <div className="container mx-auto p-4">
      <Card>
        <h1 className="mb-6 text-2xl font-bold">{session.title}</h1>

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

        {session.description && (
          <div className="mt-6">
            <h2 className="mb-4 text-xl font-semibold">Beschreibung</h2>
            <div className="prose max-w-none">
              <ServerHtmlContent html={session.description} />
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Session
