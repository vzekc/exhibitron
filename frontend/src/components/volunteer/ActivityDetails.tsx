import Modal from '@components/Modal'
import Button from '@components/Button'
import ServerHtmlContent from '@components/ServerHtmlContent'
import { clock, weekday } from './coverage'
import type { CalendarActivity } from './VolunteerCalendar'

interface ActivityDetailsProps {
  activity: CalendarActivity
  onClose: () => void
}

/*
 * What an activity is, opened from its name in the plan: the long text, who to
 * ask, and when help is wanted. Signing up happens in the plan, where one can
 * see what is already taken — this only tells.
 */
const ActivityDetails = ({ activity, onClose }: ActivityDetailsProps) => (
  <Modal isOpen onClose={onClose} title={activity.name}>
    <div className="space-y-4 p-4">
      {activity.summary && <p className="text-gray-600 dark:text-gray-400">{activity.summary}</p>}

      {activity.description && <ServerHtmlContent html={activity.description} />}

      {activity.contact && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Fragen? {activity.contact.user.fullName} weiß Bescheid.
        </p>
      )}

      <ul className="space-y-2">
        {activity.periods.map((period) => (
          <li
            key={period.id}
            className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
            <span className="font-medium">
              {weekday(period.startTime)}, {clock(period.startTime)}–{clock(period.endTime)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {period.neededCount === 1
                ? 'eine Person gebraucht'
                : period.neededCount
                  ? `${period.neededCount} Leute gebraucht`
                  : 'beliebig viele willkommen'}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Schließen
        </Button>
      </div>
    </div>
  </Modal>
)

export default ActivityDetails
