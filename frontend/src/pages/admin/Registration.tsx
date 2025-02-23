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

const Registration = () => {
  const registrations = use(data)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'ascending' | 'descending'
  } | null>(null)
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number
    y: number
  }>({ x: 0, y: 0 })

  const sortedRegistrations = React.useMemo(() => {
    if (sortConfig !== null) {
      return [...registrations].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return registrations
  }, [registrations, sortConfig])

  const requestSort = (key: string) => {
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

  const handleMouseMove = (event: React.MouseEvent) => {
    setTooltipPosition({ x: event.clientX, y: event.clientY })
  }

  const columns = [
    'id',
    'name',
    'email',
    'nickname',
    'message',
    'createdAt',
    'updatedAt',
  ]

  const handleDownload = () => {
    const csv = generateCSV(registrations)
    downloadCSV(csv, 'registrations.csv')
  }

  return (
    <article>
      <h2>Anmeldungen verwalten</h2>
      <button onClick={handleDownload}>Download CSV</button>
      <p></p>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} onClick={() => requestSort(column)}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRegistrations.map((registration, index) => (
            <tr
              key={registration.id}
              onMouseEnter={() => setHoveredRow(index)}
              onMouseLeave={() => setHoveredRow(null)}
              onMouseMove={handleMouseMove}>
              {columns.map((column) => (
                <td key={column}>{registration[column]}</td>
              ))}
              {hoveredRow === index && (
                <td
                  className="tooltip"
                  style={{ top: tooltipPosition.y, left: tooltipPosition.x }}>
                  <table>
                    {columns.map((column) => (
                      <tr key={column}>
                        <td>{column}</td>
                        <td>{registration[column]}</td>
                      </tr>
                    ))}
                  </table>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  )
}

export default Registration
