import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import './RegistrationList.css'
import { downloadCSV, formatValue } from './utils.ts'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { graphql } from 'gql.tada'

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

const tableColumns = [
  'id',
  'status',
  'name',
  'email',
  'nickname',
  'createdAt',
  'updatedAt',
] as const

type TableColumn = (typeof tableColumns)[number]

const RegistrationList = () => {
  const { data } = useQuery(GET_REGISTRATIONS)
  type Registrations = NonNullable<typeof data>['getRegistrations']
  const [sortConfig, setSortConfig] = useState<{
    key: TableColumn
    direction: 'ascending' | 'descending'
  }>({ key: 'createdAt', direction: 'descending' })
  const [sortedRegistrations, setSortedRegistrations] = useState<Registrations>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (data?.getRegistrations) {
      setSortedRegistrations(
        [...data.getRegistrations].sort((a, b) => {
          if (String(a[sortConfig.key]) < String(b[sortConfig.key])) {
            return sortConfig.direction === 'ascending' ? -1 : 1
          }
          if (String(a[sortConfig.key]) > String(b[sortConfig.key])) {
            return sortConfig.direction === 'ascending' ? 1 : -1
          }
          return 0
        }),
      )
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
    let direction: 'ascending' | 'descending' = 'ascending'
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending'
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

  return (
    <article>
      <h2>Anmeldungen verwalten</h2>
      <button onClick={handleDownload}>Daten als CSV herunterladen</button>
      <p></p>
      <table>
        <thead>
          <tr>
            {tableColumns.map((column) => (
              <th key={column} onClick={() => requestSort(column)}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRegistrations?.map((registration, index) => (
            <tr
              key={index}
              onClick={() => navigate('/admin/registration/' + registration.id)}
              className="clickable-row">
              {tableColumns.map((column) => (
                <td key={column}>
                  {formatValue(
                    column,
                    registration[column] as string | number | boolean,
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export default RegistrationList
