import { ReactNode } from 'react'

/*
 * A table with as many columns as it has headers, drawn like `KeyValueTable`
 * but without its two-column shape and without the sorting and full-height
 * scrolling of `DataTable`. The volunteer plan shows short lists that stand in
 * the flow of the page.
 */
const PlainTable = ({ headers, children }: { headers: ReactNode[]; children: ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
      <thead className="bg-gray-50 dark:bg-gray-800">
        <tr>
          {headers.map((header, index) => (
            <th
              key={index}
              className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
        {children}
      </tbody>
    </table>
  </div>
)

export default PlainTable
