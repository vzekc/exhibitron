import React, { ReactNode } from 'react'

// Define types for the two table variants
type DataTableHeader = {
  key?: string
  content: ReactNode
  onClick?: () => void
  className?: string
  sortDirection?: 'asc' | 'desc' | null
}

type KeyValueHeaders = [ReactNode, ReactNode]

interface TableProps {
  headers: Array<DataTableHeader> | KeyValueHeaders
  children: ReactNode
  className?: string
  onRowClick?: (index: number) => void
  variant?: 'data' | 'keyValue'
  maxHeight?: string
}

export const Table: React.FC<TableProps> = ({
  headers,
  children,
  className = '',
  variant = 'data',
  maxHeight,
}) => {
  // For KeyValue tables, headers should be a tuple of [key, value] labels
  const isKeyValueTable = variant === 'keyValue'

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
      return (
        <tr>
          {(headers as Array<DataTableHeader>).map((header, index) => (
            <th
              key={header.key || index}
              onClick={header.onClick}
              className={`px-4 py-3 text-left text-sm font-medium text-gray-500 ${header.onClick ? 'cursor-pointer hover:bg-gray-100' : ''} ${header.className || ''}`}>
              <div className="flex items-center gap-2">
                {header.content}
                {header.onClick && (
                  <div className="ml-2 flex flex-col">
                    <svg
                      className={`h-5 w-5 ${header.sortDirection === 'asc' ? 'text-black' : 'text-gray-200'}`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      stroke="currentColor"
                      strokeWidth="1">
                      <path d="M7 14l5-5 5 5z" />
                    </svg>
                    <svg
                      className={`-mt-2 h-5 w-5 ${header.sortDirection === 'desc' ? 'text-black' : 'text-gray-200'}`}
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
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
          <thead className="sticky top-0 z-10 bg-gray-50">{renderHeaders()}</thead>
        </table>
      </div>
      <div
        className="flex-grow overflow-auto"
        style={maxHeight ? { maxHeight } : { height: 'calc(100vh - 200px)' }}>
        <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
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
      className={`${className} ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${index !== undefined && index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
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
