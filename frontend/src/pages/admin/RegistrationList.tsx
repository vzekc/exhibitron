import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { downloadCSV, formatValue } from './utils'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'
import PageHeading from '@components/PageHeading.tsx'
import ActionBar from '@components/ActionBar.tsx'
import Button from '@components/Button.tsx'
import { Table, TableRow, TableCell } from '@components/Table.tsx'
import Card from '@components/Card.tsx'

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
    }
  }
`)

const tableColumns = ['status', 'nickname', 'name', 'email', 'createdAt', 'updatedAt'] as const

type TableColumn = (typeof tableColumns)[number]

const getColumnHeader = (column: TableColumn) => {
  switch (column) {
    case 'createdAt':
      return 'Eingegangen'
    case 'updatedAt':
      return 'Geändert'
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

const RegistrationList = () => {
  const { data } = useQuery(GET_REGISTRATIONS)
  type Registrations = NonNullable<typeof data>['getRegistrations']
  const [sortConfig, setSortConfig] = useState<{
    key: TableColumn
    direction: 'asc' | 'desc'
  }>({ key: 'createdAt', direction: 'desc' })
  const [sortedRegistrations, setSortedRegistrations] = useState<Registrations>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (data?.getRegistrations) {
      // Use current sorted data as the base for the next sort to maintain stability
      // When we have a previous sort result and it's not empty
      const dataToSort =
        sortedRegistrations && sortedRegistrations.length > 0
          ? [...sortedRegistrations] // Create a copy to avoid mutation
          : [...data.getRegistrations]

      // Create a copy of the data with original indices to ensure stable sort
      const dataWithIndices = dataToSort.map((item, index) => ({ item, index }))

      // Perform the sort, using original index as a tiebreaker for stability
      dataWithIndices.sort((a, b) => {
        // Convert values to lowercase strings for case-insensitive comparison
        const valueA = String(a.item[sortConfig.key]).toLowerCase()
        const valueB = String(b.item[sortConfig.key]).toLowerCase()

        if (valueA < valueB) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (valueA > valueB) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        // If values are equal, maintain original order (stable sort)
        return a.index - b.index
      })

      // Extract the sorted items
      setSortedRegistrations(dataWithIndices.map(({ item }) => item))
    } else {
      // Reset sorted data if original data is not available
      setSortedRegistrations([])
    }
  }, [sortConfig, data])

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
      'updatedAt',
      ...Array.from(keys).sort(),
    ]
    return Papa.unparse(registrations, { columns })
  }

  const requestSort = (key: TableColumn) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handleDownload = () => {
    const csv = generateCSV(data?.getRegistrations || [])
    downloadCSV(csv, 'registrations.csv')
  }

  if (!data?.getRegistrations) {
    return <p>Loading...</p>
  }

  const tableHeaders = tableColumns.map((column) => ({
    key: column,
    content: getColumnHeader(column),
    onClick: () => requestSort(column),
    sortDirection: sortConfig.key === column ? sortConfig.direction : null,
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

      <Table headers={tableHeaders} variant="data">
        {sortedRegistrations?.map((registration, index) => (
          <TableRow
            key={registration.id}
            onClick={() => navigate('/admin/registration/' + registration.id)}
            index={index}>
            {tableColumns.map((column) => (
              <TableCell key={column}>
                {column === 'status' ? (
                  <StatusChip status={registration[column] as string} />
                ) : (
                  formatValue(column, registration[column] as string | number | boolean)
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </Table>

      <ActionBar>
        <Button onClick={handleDownload}>Daten als CSV herunterladen</Button>
      </ActionBar>
    </Card>
  )
}

export default RegistrationList
