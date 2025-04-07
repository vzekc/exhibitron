import { ReactNode, useState, useEffect } from 'react'

type DataTableHeader<T> = {
  key?: string
  content: ReactNode
  onClick?: () => void
  getValue?: (data: T) => string
  className?: string
  sortDirection?: 'asc' | 'desc' | null
  sortable?: boolean
  sortKey?: string
}

interface DataTableProps<T extends { id: string | number; [key: string]: unknown }> {
  headers: Array<DataTableHeader<T>>
  children: ReactNode
  className?: string
  onRowClick?: (index: number) => void
  maxHeight?: string
  onSort: (sorter: (data: T[]) => T[]) => void
  defaultSortKey: string
  defaultSortDirection?: 'asc' | 'desc'
}

const DataTable = <T extends { id: string | number; [key: string]: unknown }>({
  headers,
  children,
  className = '',
  maxHeight,
  onSort,
  defaultSortKey,
  defaultSortDirection = 'asc',
}: DataTableProps<T>) => {
  type SortConfig = {
    key: string
    direction: 'asc' | 'desc'
  }

  const [sortHistory, setSortHistory] = useState<SortConfig[]>([
    { key: defaultSortKey, direction: defaultSortDirection },
  ])

  useEffect(() => {
    const sorter = (data: T[]) =>
      [...data].sort((a, b) => {
        for (const sortConfig of sortHistory) {
          const header = headers.find((h) => (h.sortKey || h.key) === sortConfig.key)
          const getValue = header?.getValue

          const valueA = getValue ? getValue(a) : String(a[sortConfig.key]).toLowerCase()
          const valueB = getValue ? getValue(b) : String(b[sortConfig.key]).toLowerCase()

          if (valueA !== valueB) {
            if (valueA < valueB) {
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
    setSortHistory([columnSortConfig, ...sortHistory.filter((h) => h.key !== clickedOnKey)])
  }

  const sortConfig = sortHistory[0]

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div
        className="flex-grow overflow-auto"
        style={maxHeight ? { maxHeight } : { height: 'calc(100vh - 200px)' }}>
        <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
          <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header.key || index}
                  onClick={
                    header.sortable
                      ? () => handleSort(header.sortKey || header.key || '')
                      : header.onClick
                  }
                  className={`px-4 pt-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400 ${
                    header.sortable || header.onClick
                      ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                      : ''
                  } ${header.className || ''}`}>
                  <div className="flex items-center gap-2">
                    {header.content}
                    {header.sortable && (
                      <div className="ml-2 flex flex-col">
                        <svg
                          className={`h-5 w-5 ${sortConfig?.key === (header.sortKey || header.key) && sortConfig?.direction === 'asc' ? 'text-black dark:text-white' : 'text-gray-200 dark:text-gray-600'}`}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="1">
                          <path d="M7 14l5-5 5 5z" />
                        </svg>
                        <svg
                          className={`-mt-2 h-5 w-5 ${sortConfig?.key === (header.sortKey || header.key) && sortConfig?.direction === 'desc' ? 'text-black dark:text-white' : 'text-gray-200 dark:text-gray-600'}`}
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
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
