import React, { ReactNode } from 'react'

interface TableRowProps {
  children: ReactNode
  onClick?: () => void
  className?: string
  index?: number
  mobile?: boolean
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  onClick,
  className = '',
  index,
  mobile = false,
}) => {
  if (mobile) {
    return (
      <div
        onClick={onClick}
        className={`${className} ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''} ${
          index !== undefined && index % 2 === 0
            ? 'bg-white dark:bg-gray-900'
            : 'bg-gray-50 dark:bg-gray-800'
        } rounded-lg p-4`}>
        {children}
      </div>
    )
  }

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
  mobile?: boolean
  isLabel?: boolean
}

export const TableCell: React.FC<TableCellProps> = ({
  children,
  className = '',
  mobile = false,
  isLabel = false,
}) => {
  if (mobile) {
    if (isLabel) {
      return (
        <div className={`mb-1 text-sm font-medium text-gray-500 dark:text-gray-400 ${className}`}>
          {children}
        </div>
      )
    }
    return (
      <div className={`text-base text-gray-900 dark:text-gray-100 ${className}`}>{children}</div>
    )
  }

  return (
    <td
      className={`whitespace-nowrap px-4 py-4 text-base text-gray-900 dark:text-gray-100 ${className}`}>
      {children}
    </td>
  )
}
