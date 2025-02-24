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
    validateStatus: (status) => status == 200,
  })
  return result.data?.items || []
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
  'status',
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
    key: TableColumn
    direction: 'ascending' | 'descending'
  } | null>(null)
  const [popupRegistration, setPopupRegistration] =
    useState<Registration | null>(null)

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

  const makePopup = () => {
    console.log('makePopup', popupRegistration)
    return (
      popupRegistration && (
        <dialog
          className="registration-details"
          open
          onClick={() => setPopupRegistration(null)}>
          <article>
            <p>{popupRegistration.message}</p>
            <table>
              <tbody>
                {Object.entries(popupRegistration.data)
                  .filter(([, v]) => !!v)
                  .map(([key, value]) => (
                    <tr key={key}>
                      <th>{key}</th>
                      <td>
                        {formatValue(key, value as string | number | boolean)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </article>
        </dialog>
      )
    )
  }

  const formatValue = (key: string, value: string | number | boolean) => {
    if (key === 'createdAt' || key === 'updatedAt') {
      return new Date(String(value)).toLocaleString()
    } else if (key === 'status') {
      switch (String(value)) {
        case 'new':
          return 'Neu'
        case 'approved':
          return 'Angenommen'
        case 'rejected':
          return 'Abgelehnt'
      }
      return value
    } else if (typeof value === 'boolean') {
      return value ? 'Ja' : 'Nein'
    } else {
      return value
    }
  }

  return (
    <article>
      {popupRegistration && makePopup()}
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
            <tr key={index} onClick={() => setPopupRegistration(registration)}>
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

export default Registration
