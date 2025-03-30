import { ReactNode } from 'react'

type KeyValueHeaders = [ReactNode, ReactNode]

interface KeyValueTableProps {
  headers: KeyValueHeaders
  children: ReactNode
  className?: string
}

export const KeyValueTable = ({ headers, children, className = '' }: KeyValueTableProps) => {
  const [keyHeader, valueHeader] = headers

  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{keyHeader}</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">{valueHeader}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
      </table>
    </div>
  )
}

export default KeyValueTable
