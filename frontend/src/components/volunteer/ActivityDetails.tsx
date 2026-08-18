import Modal from '@components/Modal'
import Button from '@components/Button'
import ServerHtmlContent from '@components/ServerHtmlContent'
import { clock, coverageChip, joinAdjacent, wantsPeople, weekday } from './coverage'
import type { CalendarActivity, CalendarPeriod } from './VolunteerCalendar'

interface ActivityDetailsProps {
  activity: CalendarActivity
  canBook?: boolean
  onClose: () => void
  onPick?: (activity: CalendarActivity, period: CalendarPeriod, startTime: Date) => void
}

/*
 * What an activity is, opened from its name in the plan: the long text, who to
 * ask, and its periods with the times somebody is still missing.
 */
const ActivityDetails = ({ activity, canBook, onClose, onPick }: ActivityDetailsProps) => (
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
        {activity.periods.map((period) => {
          const gaps = joinAdjacent(period.coverage.filter(wantsPeople))
          return (
            <li
              key={period.id}
              className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
              <span className="font-medium">
                {weekday(period.startTime)}, {clock(period.startTime)}–{clock(period.endTime)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {period.neededCount
                  ? `${period.neededCount} Leute gebraucht`
                  : 'beliebig viele willkommen'}
                {period.note ? ` — ${period.note}` : ''}
              </span>
              <span
                className={`text-xs rounded px-2 py-1 ${coverageChip[gaps.length ? 'under' : 'met']}`}>
                {gaps.length
                  ? `noch frei: ${gaps
                      .map((gap) => `${clock(gap.startTime)}–${clock(gap.endTime)}`)
                      .join(', ')}`
                  : 'besetzt'}
              </span>
              {canBook && (
                <Button onClick={() => onPick?.(activity, period, new Date(period.startTime))}>
                  Eintragen
                </Button>
              )}
            </li>
          )
        })}
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
