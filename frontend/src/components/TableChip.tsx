import Icon from './Icon'
import Card from '@components/Card.tsx'

interface TableChipProps {
  number: number
}

const TableChip = ({ number }: TableChipProps) => {
  return (
    <Card to={`/table/${number}`} className="mb-3">
      <div className="flex h-[100px] flex-col items-center gap-4">
        <div className="flex-shrink-0">
          <div className="flex h-[50px] w-[50px] items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
            <Icon name="table" alt="Table" className="h-6 w-6 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
        <div className="text-4xl font-medium text-gray-900 dark:text-gray-100">{number}</div>
      </div>
    </Card>
  )
}

export default TableChip
