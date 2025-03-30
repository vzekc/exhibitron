import React, { ReactNode, useState, useEffect } from 'react'

type DataTableHeader = {
  key?: string
  content: ReactNode
  onClick?: () => void
  className?: string
  sortDirection?: 'asc' | 'desc' | null
  sortable?: boolean
  sortKey?: string
}

type KeyValueHeaders = [ReactNode, ReactNode]

interface TableProps<T extends { id: string | number; [key: string]: unknown }> {
  headers: Array<DataTableHeader> | KeyValueHeaders
  children: ReactNode
  className?: string
  onRowClick?: (index: number) => void
  variant?: 'data' | 'keyValue'
  maxHeight?: string
  onSort: (sorter: (data: T[]) => T[]) => void
  defaultSortKey: string
  defaultSortDirection?: 'asc' | 'desc'
}

export const Table = <T extends { id: string | number; [key: string]: unknown }>({
  headers,
  children,
  className = '',
  variant = 'data',
  maxHeight,
  onSort,
  defaultSortKey,
  defaultSortDirection = 'asc',
}: TableProps<T>) => {

  type SortConfig = {
    key: string
    direction: 'asc' | 'desc'
  }

  const [sortHistory, setSortHistory] = useState<SortConfig[]>([ { key: defaultSortKey, direction: defaultSortDirection } ])

  const isKeyValueTable = variant === 'keyValue'

  useEffect(() => {
    const sorter = (data: T[]) => [...data].sort((a, b) => {
      for (const sortConfig of sortHistory) {
        const historyValueA = String(a[sortConfig.key]).toLowerCase()
        const historyValueB = String(b[sortConfig.key]).toLowerCase()

        if (historyValueA !== historyValueB) {
          if (historyValueA < historyValueB) {
            return sortConfig.direction === 'asc' ? -1 : 1
          }
          return sortConfig.direction === 'asc' ? 1 : -1
        }
      }
      return 0
    })
    onSort(sorter)
  }, [sortHistory])

  const handleSort = (clickedOnKey: string) => {
    let columnSortConfig = sortHistory.find((h) => h.key === clickedOnKey)
    if (columnSortConfig) {
      if (columnSortConfig === sortHistory[0]) {
        columnSortConfig.direction = columnSortConfig.direction === 'asc' ? 'desc' : 'asc'
      }
    } else {
      columnSortConfig = { key: clickedOnKey, direction: 'asc' }
    }
    setSortHistory([columnSortConfig, ...sortHistory.filter(h => h.key !== clickedOnKey)])
  }

  // Create the table headers based on the variant
  const renderHeaders = () => {
    if (isKeyValueTable && Array.isArray(headers) && headers.length === 2) {
      // KeyValue variant with simple key-value column headers
      const [keyHeader, valueHeader] = headers as KeyValueHeaders
      return (
        <tr>
          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{keyHeader}</th>
          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{valueHeader}</th>
        </tr>
      )
    } else if (!isKeyValueTable && Array.isArray(headers)) {
      // Data table variant with sortable headers
      const sortConfig = sortHistory[0]
      return (
        <tr>
          {(headers as Array<DataTableHeader>).map((header, index) => (
            <th
              key={header.key || index}
              onClick={
                header.sortable
                  ? () => handleSort(header.sortKey || header.key || '')
                  : header.onClick
              }
              className={`px-4 py-3 text-left text-sm font-medium text-gray-500 ${
                header.sortable || header.onClick ? 'cursor-pointer hover:bg-gray-100' : ''
              } ${header.className || ''}`}>
              <div className="flex items-center gap-2">
                {header.content}
                {header.sortable && (
                  <div className="ml-2 flex flex-col">
                    <svg
                      className={`h-5 w-5 ${sortConfig?.key === (header.sortKey || header.key) && sortConfig?.direction === 'asc' ? 'text-black' : 'text-gray-200'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1">
                      <path d="M7 14l5-5 5 5z" />
                    </svg>
                    <svg
                      className={`-mt-2 h-5 w-5 ${sortConfig?.key === (header.sortKey || header.key) && sortConfig?.direction === 'desc' ? 'text-black' : 'text-gray-200'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1">
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </div>
                )}
              </div>
            </th>
          ))}
        </tr>
      )
    }

    return null
  }

  if (isKeyValueTable) {
    // For key-value tables, maintain the original layout
    return (
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
          <thead className="bg-gray-50">{renderHeaders()}</thead>
          <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
        </table>
      </div>
    )
  }

  // For data tables, implement fixed header with scrollable body
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div
        className="flex-grow overflow-auto"
        style={maxHeight ? { maxHeight } : { height: 'calc(100vh - 200px)' }}>
        <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
          <thead className="sticky top-0 z-10 bg-gray-50">{renderHeaders()}</thead>
          <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

interface TableRowProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  index?: number
}

export const TableRow: React.FC<TableRowProps> = ({ children, onClick, className = '', index }) => {
  return (
    <tr
      onClick={onClick}
      className={`${className} ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${
        index !== undefined && index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      }`}>
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: ReactNode
  className?: string
}

export const TableCell: React.FC<TableCellProps> = ({ children, className = '' }) => {
  return (
    <td className={`whitespace-nowrap px-4 py-4 text-base text-gray-900 ${className}`}>
      {children}
    </td>
  )
}

export default Table
