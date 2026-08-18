import { useMemo } from 'react'
import { toLocalDateString } from '@utils/date'
import {
  clock,
  coverageFill,
  coverageLabel,
  type CoverageSpan,
  type CoverageStatus,
} from './coverage'

export interface CalendarBooking {
  id: number
  startTime: string
  endTime: string
  name?: string | null
  confirmed: boolean
  isMine: boolean
}

export interface CalendarPeriod {
  id: number
  startTime: string
  endTime: string
  neededCount?: number | null
  note?: string | null
  coverage: CoverageSpan[]
  bookings?: CalendarBooking[]
}

/* What every view of an activity reads. The calendar itself uses the periods;
   the pages beside it show the rest. */
export interface CalendarActivity {
  id: number
  key: string
  name: string
  summary?: string
  description?: string | null
  contact?: { user: { fullName: string } } | null
  periods: CalendarPeriod[]
}

interface VolunteerCalendarProps {
  activities: CalendarActivity[]
  onPick?: (activity: CalendarActivity, period: CalendarPeriod, startTime: Date) => void
}

const hourOf = (value: string) => {
  const date = new Date(value)
  return date.getHours() + date.getMinutes() / 60
}

/* A stretch this long has room for its numbers written into it. */
const LABELLED_HOURS = 1.5

/* With a dozen hours in a day, every hour written out crowds a narrow screen.
   Below that width only every second one is shown. */
const isQuietHour = (hour: number) => hour % 2 === 1

/*
 * The plan of all days at once: a day per row, the clock from left to right,
 * and under each day one bar per activity that wants help that day. The bars
 * are painted from the coverage the server counted — where nobody is, where
 * too few are, where it is done, and where more than enough have come.
 *
 * Days downwards rather than sideways is what keeps it dense: another activity
 * costs one thin bar, not another column, so a day with six of them still fits
 * on a phone. The days come from the periods themselves, so the build-up
 * before the doors open and the last evening are simply there.
 */
const VolunteerCalendar = ({ activities, onPick }: VolunteerCalendarProps) => {
  const days = useMemo(() => {
    const dates = activities.flatMap((activity) =>
      activity.periods.map((period) => toLocalDateString(new Date(period.startTime))),
    )
    return [...new Set(dates)].sort()
  }, [activities])

  const { startHour, endHour } = useMemo(() => {
    const periods = activities.flatMap((activity) => activity.periods)
    if (!periods.length) return { startHour: 9, endHour: 22 }
    return {
      startHour: Math.floor(Math.min(...periods.map((period) => hourOf(period.startTime)))),
      endHour: Math.ceil(Math.max(...periods.map((period) => hourOf(period.endTime)))),
    }
  }, [activities])

  if (!days.length) {
    return (
      <p className="text-gray-500 dark:text-gray-400">
        Für diese Ausstellung sind noch keine Zeiten eingetragen.
      </p>
    )
  }

  /* Everything is placed in percent of the day, so the bars follow the window. */
  const span = endHour - startHour
  const percentOf = (hour: number) => ((hour - startHour) / span) * 100
  const hours = Array.from({ length: span + 1 }, (_, index) => startHour + index)

  const onDay = (activity: CalendarActivity, day: string) =>
    activity.periods.filter((period) => toLocalDateString(new Date(period.startTime)) === day)

  return (
    <div className="space-y-3">
      {/* The clock, once, above everything it applies to */}
      <div className="flex items-end gap-2">
        <div className="w-24 shrink-0 sm:w-36" />
        <div className="relative h-4 grow">
          {hours.map((hour) => (
            <span
              key={hour}
              className={`text-xs absolute -translate-x-1/2 text-gray-500 dark:text-gray-400 ${
                isQuietHour(hour) ? 'hidden sm:inline' : ''
              }`}
              style={{ left: `${percentOf(hour)}%` }}>
              {hour}
            </span>
          ))}
        </div>
      </div>

      {days.map((day) => {
        const withPeriods = activities.filter((activity) => onDay(activity, day).length)
        return (
          <div key={day}>
            <div className="border-b border-gray-200 pb-0.5 text-sm font-semibold dark:border-gray-700">
              {new Date(day).toLocaleDateString('de-DE', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
              })}
            </div>

            <div className="mt-1 space-y-0.5">
              {withPeriods.map((activity) => (
                <div key={activity.id} className="flex items-center gap-2">
                  <div
                    className="text-xs w-24 shrink-0 truncate text-gray-600 sm:w-36 dark:text-gray-400"
                    title={activity.name}>
                    {activity.name}
                  </div>

                  <div className="relative h-5 grow rounded-sm bg-gray-100 dark:bg-gray-800">
                    {/* An hour line, so that a bar can be read against the clock */}
                    {hours.slice(1, -1).map((hour) => (
                      <div
                        key={hour}
                        className="absolute top-0 h-full w-px bg-white dark:bg-gray-900"
                        style={{ left: `${percentOf(hour)}%` }}
                      />
                    ))}

                    {onDay(activity, day).flatMap((period) =>
                      period.coverage.map((stretch, index) => {
                        const status = stretch.status as CoverageStatus
                        const from = hourOf(stretch.startTime)
                        const to = hourOf(stretch.endTime)
                        return (
                          <button
                            key={`${period.id}-${index}`}
                            type="button"
                            onClick={() => onPick?.(activity, period, new Date(stretch.startTime))}
                            title={`${activity.name}, ${clock(stretch.startTime)}–${clock(
                              stretch.endTime,
                            )}: ${coverageLabel[status]}${
                              stretch.needed ? ` (${stretch.count} von ${stretch.needed})` : ''
                            }`}
                            className={`absolute top-0 h-full overflow-hidden rounded-sm text-[10px] leading-5 text-gray-700 dark:text-gray-100 ${coverageFill[status]}`}
                            style={{
                              left: `${percentOf(from)}%`,
                              width: `${((to - from) / span) * 100}%`,
                            }}>
                            {to - from >= LABELLED_HOURS &&
                              `${stretch.count}${stretch.needed ? `/${stretch.needed}` : ''}`}
                          </button>
                        )
                      }),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
        {(['none', 'under', 'met', 'over'] as CoverageStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-2">
            <span className={`inline-block h-3 w-6 rounded-sm ${coverageFill[status]}`} />
            {coverageLabel[status]}
          </span>
        ))}
      </div>
    </div>
  )
}

export default VolunteerCalendar
