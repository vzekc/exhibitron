import { ReactNode } from 'react'

type KeyValueHeaders = [ReactNode, ReactNode]

interface KeyValueTableProps {
  headers?: KeyValueHeaders
  children: ReactNode
  className?: string
  mobile?: boolean
}

const KeyValueTable = ({
  headers,
  children,
  className = '',
  mobile = false,
}: KeyValueTableProps) => {
  if (mobile) {
    return <div className={`space-y-4 ${className}`}>{children}</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${className}`}>
        {headers && (
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                {headers[0]}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                {headers[1]}
              </th>
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
          {children}
        </tbody>
      </table>
    </div>
  )
}

export default KeyValueTable
