import Modal from '@components/Modal'
import Button from '@components/Button'
import ServerHtmlContent from '@components/ServerHtmlContent'
import type { CalendarActivity } from './VolunteerCalendar'

interface ActivityDetailsProps {
  activity: CalendarActivity
  onClose: () => void
}

/*
 * What an activity is, opened from its name in the plan: the long text and
 * who to ask. When help is wanted stands in the plan itself, and signing up
 * happens there too — this only tells what the work is.
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

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Schließen
        </Button>
      </div>
    </div>
  </Modal>
)

export default ActivityDetails
