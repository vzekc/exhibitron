import { useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import { useBreadcrumb } from '@contexts/BreadcrumbContext'
import { useEffect } from 'react'
import LoadInProgress from '@components/LoadInProgress'
import Card from '@components/Card'
import ServerHtmlContent from '@components/ServerHtmlContent'
import { KeyValueTable, TableRow, TableCell } from '@components/Table'
import { useExhibitor } from '@contexts/ExhibitorContext'
import ActionBar from '@components/ActionBar'
import Button from '@components/Button'
import { useNavigate } from 'react-router-dom'
import { getDisplayName } from '@utils/displayName'
import { useIsMobile } from '@hooks/useIsMobile'

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
  const { exhibitor } = useExhibitor()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
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
    ?.map((exhibitor) => getDisplayName(exhibitor.user))
    .join(', ')

  const isPresenter = exhibitor && session.exhibitors?.some((e) => e.id === exhibitor.id)
  const canEdit = exhibitor?.user.isAdministrator || isPresenter

  return (
    <div className="container mx-auto p-4">
      <Card>
        <h1 className="mb-6 text-2xl font-bold">{session.title}</h1>

        <KeyValueTable mobile={isMobile}>
          {presenters && (
            <TableRow mobile={isMobile}>
              <TableCell mobile={isMobile} isLabel>
                Präsentierende
              </TableCell>
              <TableCell mobile={isMobile}>{presenters}</TableCell>
            </TableRow>
          )}
          <TableRow mobile={isMobile}>
            <TableCell mobile={isMobile} isLabel>
              Datum
            </TableCell>
            <TableCell mobile={isMobile}>
              {startTime.toLocaleDateString('de-DE', {
                weekday: 'long',
              })}
            </TableCell>
          </TableRow>
          <TableRow mobile={isMobile}>
            <TableCell mobile={isMobile} isLabel>
              Zeit
            </TableCell>
            <TableCell mobile={isMobile}>
              {startTime.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ({duration} Minuten)
            </TableCell>
          </TableRow>
          <TableRow mobile={isMobile}>
            <TableCell mobile={isMobile} isLabel>
              Raum
            </TableCell>
            <TableCell mobile={isMobile}>{session.room?.name}</TableCell>
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

      {canEdit && (
        <ActionBar>
          <Button onClick={() => navigate(`/session/${id}/edit`)} icon="edit">
            Bearbeiten
          </Button>
        </ActionBar>
      )}
    </div>
  )
}

export default Session
