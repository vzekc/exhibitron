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
