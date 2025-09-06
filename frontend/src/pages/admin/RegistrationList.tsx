import { useState } from 'react'
import Papa from 'papaparse'
import { downloadCSV, formatValue } from './utils'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import PageHeading from '@components/PageHeading.tsx'
import ActionBar from '@components/ActionBar.tsx'
import Button from '@components/Button.tsx'
import { DataTable, TableRow, TableCell } from '@components/Table.tsx'
import Card from '@components/Card.tsx'
import LoadInProgress from '@components/LoadInProgress'

const GET_REGISTRATIONS = graphql(`
  query GetRegistrations {
    getRegistrations {
      id
      status
      name
      email
      nickname
      createdAt
      updatedAt
      data
      isLoggedIn
      tables {
        id
        number
      }
      processedTopic
      nextTo
      hasNotes
      notes
    }
  }
`)

const tableColumns = [
  'status',
  'nickname',
  'name',
  'processedTopic',
  'nextTo',
  'hasNotes',
  'isLoggedIn',
  'tables',
  'createdAt',
  'updatedAt',
] as const

type TableColumn = (typeof tableColumns)[number]

const getColumnHeader = (column: TableColumn) => {
  switch (column) {
    case 'createdAt':
      return 'Eingegangen'
    case 'updatedAt':
      return 'Geändert'
    case 'isLoggedIn':
      return 'Eingeloggt'
    case 'tables':
      return 'Tische'
    case 'processedTopic':
      return 'Thema'
    case 'nextTo':
      return 'Neben'
    case 'hasNotes':
      return 'Notizen'
    default:
      return column.charAt(0).toUpperCase() + column.slice(1)
  }
}

const StatusChip = ({ status }: { status: string }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'inprogress':
        return 'bg-blue-100 text-blue-800'
      case 'new':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'Angenommen'
      case 'inprogress':
        return 'In Bearbeitung'
      case 'new':
        return 'Neu'
      case 'rejected':
        return 'Abgelehnt'
      default:
        return status
    }
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(status)}`}>
      {getStatusText(status)}
    </span>
  )
}

const LoginStatusChip = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const getStatusColor = (isLoggedIn: boolean) => {
    return isLoggedIn ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (isLoggedIn: boolean) => {
    return isLoggedIn ? 'Ja' : 'Nein'
  }

  return (
    <span
      className={`text-xs inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${getStatusColor(isLoggedIn)}`}>
      {getStatusText(isLoggedIn)}
    </span>
  )
}

const TablesDisplay = ({ tables }: { tables: Array<{ id: number; number: number }> }) => {
  if (!tables || tables.length === 0) {
    return <span className="text-gray-500">-</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tables.map((table) => (
        <span
          key={table.id}
          className="text-xs inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 font-medium text-blue-800">
          {table.number}
        </span>
      ))}
    </div>
  )
}

const NotesIcon = ({ hasNotes, notes }: { hasNotes: boolean; notes?: string | null }) => {
  if (!hasNotes) {
    return <span className="text-gray-400">-</span>
  }

  return (
    <div className="group relative">
      <svg
        className="h-4 w-4 cursor-help text-blue-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 max-w-xs -translate-x-1/2 transform whitespace-pre-wrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {notes}
        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )
}

const TruncatedText = ({
  text,
  maxLength = 20,
}: {
  text: string | null | undefined
  maxLength?: number
}) => {
  if (!text) {
    return <span className="text-gray-400">-</span>
  }

  const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text

  if (text.length <= maxLength) {
    return <span>{text}</span>
  }

  return (
    <div className="group relative">
      <span className="cursor-help">{truncated}</span>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 max-w-xs -translate-x-1/2 transform whitespace-pre-wrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {text}
        <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 transform border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )
}

const RegistrationList = () => {
  const { data } = useQuery(GET_REGISTRATIONS)
  type Registrations = NonNullable<typeof data>['getRegistrations']
  const [sortedRegistrations, setSortedRegistrations] = useState<Registrations | null>(null)
  const navigate = useNavigate()

  const handleSort = (sorter: (data: NonNullable<Registrations>) => NonNullable<Registrations>) => {
    if (data?.getRegistrations) {
      setSortedRegistrations(sorter(data?.getRegistrations))
    }
  }

  const generateCSV = (registrations: Registrations) => {
    if (!registrations) {
      return ''
    }

    // Define the exact columns we want in the CSV, matching the UI display
    const columns = [
      'id',
      'status',
      'name',
      'email',
      'nickname',
      'message',
      'processedTopic',
      'nextTo',
      'hasNotes',
      'isLoggedIn',
      'tables',
      'createdAt',
      'updatedAt',
    ]

    // Transform the data to include only the columns we want and format them properly
    const csvData = registrations.map((registration) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row: Record<string, any> = {}

      // Add all the basic fields
      columns.forEach((column) => {
        if (column === 'tables') {
          // Format tables as a readable string
          const tables = registration.tables || []
          row[column] = tables.length > 0 ? tables.map((t) => t.number).join(', ') : ''
        } else if (column === 'hasNotes') {
          // Convert boolean to readable text
          row[column] = registration.hasNotes ? 'Ja' : 'Nein'
        } else if (column === 'isLoggedIn') {
          // Convert boolean to readable text
          row[column] = registration.isLoggedIn ? 'Ja' : 'Nein'
        } else {
          // Use the field value directly
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          row[column] = (registration as any)[column] || ''
        }
      })

      return row
    })

    return Papa.unparse(csvData, { columns })
  }

  const handleDownload = () => {
    const csv = generateCSV(data?.getRegistrations || [])
    downloadCSV(csv, 'registrations.csv')
  }

  if (!data?.getRegistrations) {
    return <LoadInProgress />
  }

  const tableHeaders = tableColumns.map((column) => ({
    key: column,
    content: getColumnHeader(column),
    sortable: true,
    sortKey: column,
  }))

  return (
    <Card>
      <header className="mb-3">
        <PageHeading>Anmeldungen verwalten</PageHeading>
        <p className="mt-2 text-base text-gray-700">
          Hier findest Du eine Übersicht aller Anmeldungen. Du kannst sie sortieren und als CSV
          herunterladen.
        </p>
      </header>

      <DataTable
        headers={tableHeaders}
        onSort={handleSort}
        defaultSortKey="createdAt"
        defaultSortDirection="desc">
        {sortedRegistrations?.map((registration, index) => (
          <TableRow
            key={registration.id}
            onClick={() => navigate('/admin/registration/' + registration.id)}
            index={index}>
            {tableColumns.map((column) => (
              <TableCell key={column}>
                {column === 'status' ? (
                  <StatusChip status={registration[column] as string} />
                ) : column === 'isLoggedIn' ? (
                  <LoginStatusChip isLoggedIn={registration[column] as boolean} />
                ) : column === 'tables' ? (
                  <TablesDisplay
                    tables={registration[column] as Array<{ id: number; number: number }>}
                  />
                ) : column === 'hasNotes' ? (
                  <NotesIcon
                    hasNotes={registration[column] as boolean}
                    notes={registration.notes}
                  />
                ) : column === 'processedTopic' ? (
                  <TruncatedText text={registration[column] as string} />
                ) : column === 'nextTo' ? (
                  <TruncatedText text={registration[column] as string} />
                ) : (
                  formatValue(column, registration[column] as string | number | boolean)
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </DataTable>

      <ActionBar>
        <Button onClick={handleDownload}>Daten als CSV herunterladen</Button>
      </ActionBar>
    </Card>
  )
}

export default RegistrationList
