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
    }
  }
`)

const tableColumns = [
  'status',
  'nickname',
  'name',
  'email',
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
      className={`text-xs inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${getStatusColor(status)}`}>
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
    const keys = registrations
      ?.map((data) => new Set(Object.keys(data)))
      .reduce((acc, set) => new Set([...acc, ...set]), new Set<string>())
    const columns = [
      'id',
      'status',
      'name',
      'email',
      'nickname',
      'message',
      'isLoggedIn',
      'tables',
      'updatedAt',
      ...Array.from(keys).sort(),
    ]
    return Papa.unparse(registrations, { columns })
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
