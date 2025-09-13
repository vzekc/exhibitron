import Icon from './Icon'
import Card from '@components/Card.tsx'

interface TouchMeChipProps {
  touchMe: boolean
}

const TouchMeChip = ({ touchMe }: TouchMeChipProps) => {
  const backgroundColor = touchMe ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'

  const iconColor = touchMe
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <Card className="mb-3">
      <div className="flex h-[100px] flex-col items-center gap-4">
        <div className="flex-shrink-0">
          <div
            className={`flex h-[50px] w-[50px] items-center justify-center rounded-md ${backgroundColor}`}>
            <Icon
              name={touchMe ? 'touch' : 'no-touch'}
              alt={
                touchMe
                  ? 'Dieses Exponat darf ausprobiert werden'
                  : 'Bitte frag nach, bevor du dieses Exponat anfasst'
              }
              className={`h-6 w-6 ${iconColor}`}
            />
          </div>
        </div>
        <div className={`text-4xl font-medium ${iconColor}`}>{touchMe ? 'Los!' : 'Frag!'}</div>
      </div>
    </Card>
  )
}

export default TouchMeChip
