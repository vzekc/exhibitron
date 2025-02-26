import { useEffect, useState } from 'react'
import * as backend from '../../api/index'
import { client as backendClient } from '../../api/client.gen'
import Papa from 'papaparse'
import './RegistrationList.css'
import { downloadCSV, formatValue } from './utils.ts'
import { useNavigate } from 'react-router-dom'

backendClient.setConfig({
  baseURL: '/api',
})

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

export type Registration = NonNullable<
  NonNullable<
    Awaited<ReturnType<typeof backend.getRegistrationByEventId>>['data']
  >['items']
>[number]

const RegistrationList = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: TableColumn
    direction: 'ascending' | 'descending'
  }>({ key: 'createdAt', direction: 'descending' })
  const [sortedRegistrations, setSortedRegistrations] = useState<
    Registration[]
  >([])
  const navigate = useNavigate()

  useEffect(() => {
    const getRegistrations = async () => {
      const result = await backend.getRegistrationByEventId({
        path: { eventId: 'cc2025' },
        validateStatus: (status) => status == 200,
      })
      setRegistrations(result.data?.items || [])
    }

    void getRegistrations()
  }, [])

  useEffect(() => {
    setSortedRegistrations(
      [...registrations].sort((a, b) => {
        if (String(a[sortConfig.key]) < String(b[sortConfig.key])) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (String(a[sortConfig.key]) > String(b[sortConfig.key])) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      }),
    )
  }, [sortConfig, registrations])

  const generateCSV = (registrations: Registration[]) => {
    const flattenedRegistrations = registrations?.map(({ data, ...rest }) => ({
      ...data,
      ...rest,
    }))
    const keys = registrations
      ?.map(({ data }) => new Set(Object.keys(data)))
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
    return Papa.unparse(flattenedRegistrations, { columns })
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
    const csv = generateCSV(registrations)
    downloadCSV(csv, 'registrations.csv')
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
          {sortedRegistrations.map((registration, index) => (
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
