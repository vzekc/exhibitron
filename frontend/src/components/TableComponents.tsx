import React, { ReactNode } from 'react'

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
      className={`${className} ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''} ${
        index !== undefined && index % 2 === 0
          ? 'bg-white dark:bg-gray-900'
          : 'bg-gray-50 dark:bg-gray-800'
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
    <td
      className={`whitespace-nowrap px-4 py-4 text-base text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </td>
  )
}
