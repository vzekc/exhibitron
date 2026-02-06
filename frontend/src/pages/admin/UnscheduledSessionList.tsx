import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import PageHeading from '@components/PageHeading.tsx'
import { DataTable, TableRow, TableCell } from '@components/Table.tsx'
import Card from '@components/Card.tsx'
import LoadInProgress from '@components/LoadInProgress'

const GET_UNSCHEDULED_SESSIONS = graphql(`
  query GetUnscheduledConferenceSessions {
    getUnscheduledConferenceSessions {
      id
      title
      description
      exhibitors {
        id
        user {
          id
          nickname
          fullName
        }
      }
    }
  }
`)

const tableColumns = ['title', 'presenters', 'description'] as const

type TableColumn = (typeof tableColumns)[number]

const getColumnHeader = (column: TableColumn) => {
  switch (column) {
    case 'title':
      return 'Titel'
    case 'presenters':
      return 'Vortragende'
    case 'description':
      return 'Beschreibung'
    default:
      return column
  }
}

const TruncatedText = ({
  text,
  maxLength = 50,
}: {
  text: string | null | undefined
  maxLength?: number
}) => {
  if (!text) {
    return <span className="text-gray-400">-</span>
  }

  // Strip HTML tags for display
  const plainText = text.replace(/<[^>]*>/g, '')
  const truncated =
    plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText

  if (plainText.length <= maxLength) {
    return <span>{plainText}</span>
  }

  return (
    <div className="group relative">
      <span className="cursor-help">{truncated}</span>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 max-w-xs -translate-x-1/2 transform whitespace-pre-wrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {plainText}
        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )
}

const UnscheduledSessionList = () => {
  const { data, loading, error } = useQuery(GET_UNSCHEDULED_SESSIONS)
  type Sessions = NonNullable<typeof data>['getUnscheduledConferenceSessions']
  const [sortedSessions, setSortedSessions] = useState<Sessions | null>(null)
  const navigate = useNavigate()

  const handleSort = (sorter: (data: NonNullable<Sessions>) => NonNullable<Sessions>) => {
    if (data?.getUnscheduledConferenceSessions) {
      setSortedSessions(sorter(data?.getUnscheduledConferenceSessions))
    }
  }

  if (loading) {
    return <LoadInProgress />
  }

  if (error) {
    return (
      <Card>
        <p className="text-red-600">Fehler beim Laden der Sessions: {error.message}</p>
      </Card>
    )
  }

  const sessions = sortedSessions ?? data?.getUnscheduledConferenceSessions ?? []

  const tableHeaders = tableColumns.map((column) => ({
    key: column,
    content: getColumnHeader(column),
    sortable: column !== 'presenters',
    sortKey: column,
  }))

  const getPresentersDisplay = (
    exhibitors:
      | Array<{ id: number; user: { id: number; nickname: string | null; fullName: string } }>
      | null
      | undefined,
  ) => {
    if (!exhibitors || exhibitors.length === 0) {
      return <span className="text-gray-400">-</span>
    }
    return exhibitors.map((e) => e.user.nickname || e.user.fullName).join(', ')
  }

  return (
    <Card>
      <header className="mb-3">
        <PageHeading>Sessions ohne Termin</PageHeading>
        <p className="mt-2 text-base text-gray-700">
          Sessions, die noch keinen Termin haben. Klicke auf eine Session, um sie zu bearbeiten.
        </p>
      </header>

      {sessions.length === 0 ? (
        <p className="py-8 text-center text-gray-500">Keine Sessions ohne Termin vorhanden.</p>
      ) : (
        <DataTable
          headers={tableHeaders}
          onSort={handleSort}
          defaultSortKey="title"
          defaultSortDirection="asc">
          {sessions.map((session, index) => (
            <TableRow
              key={session.id}
              onClick={() => navigate('/admin/session/' + session.id)}
              index={index}>
              <TableCell>{session.title}</TableCell>
              <TableCell>{getPresentersDisplay(session.exhibitors)}</TableCell>
              <TableCell>
                <TruncatedText text={session.description} />
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </Card>
  )
}

export default UnscheduledSessionList
