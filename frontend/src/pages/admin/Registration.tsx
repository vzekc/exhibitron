import React, { useState } from 'react'
import { use } from 'react'
import * as backend from '../../api/index'
import { client as backendClient } from '../../api/client.gen'
import Papa from 'papaparse'
import './Registration.css'

backendClient.setConfig({
  baseURL: '/api',
})

const getRegistrations = async () => {
  const result = await backend.getRegistrationByEventId({
    path: { eventId: 'cc2025' },
  })
  return result.data || []
}

const data = getRegistrations()

type Registration = Awaited<typeof data>[number]

const generateCSV = (registrations: Awaited<typeof data>) => {
  const flattenedRegistrations = registrations?.map(({ data, ...rest }) => ({
    ...data,
    ...rest,
  }))
  const keys = registrations
    ?.map(({ data }) => new Set(Object.keys(data)))
    .reduce((acc, set) => new Set([...acc, ...set]), new Set<string>())
  const columns = [
    'id',
    'name',
    'email',
    'nickname',
    'message',
    'createdAt',
    'updatedAt',
    ...Array.from(keys).sort(),
  ]
  return Papa.unparse(flattenedRegistrations, { columns })
}

const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

const tableColumns = [
  'id',
  'name',
  'email',
  'nickname',
  'createdAt',
  'updatedAt',
] as const

type TableColumn = (typeof tableColumns)[number]

const Registration = () => {
  const registrations = use(data)
  const [sortConfig, setSortConfig] = useState<{
    key: (typeof tableColumns)[number]
    direction: 'ascending' | 'descending'
  } | null>(null)
  const dialogRef = React.useRef<HTMLDialogElement>(null)

  const sortedRegistrations = React.useMemo(() => {
    if (sortConfig !== null) {
      return [...registrations].sort((a, b) => {
        if (String(a[sortConfig.key]) < String(b[sortConfig.key])) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (String(a[sortConfig.key]) > String(b[sortConfig.key])) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return registrations
  }, [registrations, sortConfig])

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

  const handleRowClick = () => {
    if (dialogRef.current) {
      dialogRef.current.showModal()
    }
  }

  const makePopup = (registration: Registration) => {
    return (
      <dialog ref={dialogRef}>
        <article>
          <p>{registration.message}</p>
          <table>
            <tbody>
              {Object.entries(registration.data)
                .filter(([, v]) => !!v)
                .map(([key, value]) => (
                  <tr key={key}>
                    <th>{key}</th>
                    <td>{String(value)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </article>
      </dialog>
    )
  }

  return (
    <article>
      {dialogRef.current && makePopup(registrations[0])}
      <h2>Anmeldungen verwalten</h2>
      <button onClick={handleDownload}>Download CSV</button>
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
          {sortedRegistrations.map((registration) => (
            <tr key={registration.id} onClick={() => handleRowClick()}>
              {tableColumns.map((column) => (
                <td key={column}>{String(registration[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export default Registration
