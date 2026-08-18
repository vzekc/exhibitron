import { useMemo, useState } from 'react'
import { useIsMobile } from '@hooks/useIsMobile'
import DaySelector from '@components/DaySelector'
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

/* Dense enough that four days fit on a screen, wide enough to hit with a finger. */
const HOUR_HEIGHT = 44

const hourOf = (value: string) => {
  const date = new Date(value)
  return date.getHours() + date.getMinutes() / 60
}

/*
 * The plan of all days at once. Each day carries a lane per activity that
 * wants help that day, painted from the coverage the server counted: where
 * nobody is, where too few are, where it is done, and where more than enough
 * have come.
 *
 * The days come from the periods themselves, so the build-up before the doors
 * open and the last evening are simply there.
 */
const VolunteerCalendar = ({ activities, onPick }: VolunteerCalendarProps) => {
  const isMobile = useIsMobile()

  const days = useMemo(() => {
    const dates = activities.flatMap((activity) =>
      activity.periods.map((period) => toLocalDateString(new Date(period.startTime))),
    )
    return [...new Set(dates)].sort()
  }, [activities])

  const [selectedDay, setSelectedDay] = useState('')
  const shownDays = isMobile ? [selectedDay || days[0]].filter(Boolean) : days

  const { startHour, endHour } = useMemo(() => {
    const periods = activities.flatMap((activity) => activity.periods)
    if (!periods.length) return { startHour: 9, endHour: 18 }
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

  const height = (endHour - startHour) * HOUR_HEIGHT
  const offsetOf = (value: string) => (hourOf(value) - startHour) * HOUR_HEIGHT
  const heightOf = (from: string, to: string) => (hourOf(to) - hourOf(from)) * HOUR_HEIGHT

  const onDay = (activity: CalendarActivity, day: string) =>
    activity.periods.filter((period) => toLocalDateString(new Date(period.startTime)) === day)

  return (
    <div className="space-y-3">
      {isMobile && (
        <DaySelector
          availableDates={days}
          selectedDate={selectedDay || days[0]}
          onChange={setSelectedDay}
        />
      )}

      <div className="overflow-x-auto">
        <div className="flex gap-4">
          {/* The clock down the left-hand side. It carries the same two header
              rows as a day column, so that every hour stands beside its own
              stretch of the lanes rather than half an hour above it. */}
          <div className="w-12 shrink-0">
            <div className="invisible mb-1 text-sm font-medium">.</div>
            <div className="text-xs invisible">.</div>
            <div style={{ height }}>
              {Array.from({ length: endHour - startHour }, (_, index) => (
                <div
                  key={index}
                  className="text-xs text-gray-500 dark:text-gray-400"
                  style={{ height: HOUR_HEIGHT }}>
                  {String(startHour + index).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {shownDays.map((day) => {
            const withPeriods = activities.filter((activity) => onDay(activity, day).length)
            return (
              <div key={day} className="min-w-0 grow">
                <div className="mb-1 text-sm font-medium">
                  {new Date(day).toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </div>
                <div className="flex gap-1">
                  {withPeriods.map((activity) => (
                    <div key={activity.id} className="min-w-16 grow">
                      <div
                        className="text-xs truncate text-gray-600 dark:text-gray-400"
                        title={activity.name}>
                        {activity.name}
                      </div>
                      <div
                        className="relative rounded bg-gray-100 dark:bg-gray-800"
                        style={{ height }}>
                        {onDay(activity, day).flatMap((period) =>
                          period.coverage.map((span, index) => (
                            <button
                              key={`${period.id}-${index}`}
                              type="button"
                              onClick={() => onPick?.(activity, period, new Date(span.startTime))}
                              title={`${activity.name}, ${clock(span.startTime)}–${clock(span.endTime)}: ${
                                coverageLabel[span.status as CoverageStatus]
                              }${span.needed ? ` (${span.count} von ${span.needed})` : ''}`}
                              className={`absolute w-full rounded-sm border border-white/40 dark:border-black/20 ${
                                coverageFill[span.status as CoverageStatus]
                              }`}
                              style={{
                                top: offsetOf(span.startTime),
                                height: heightOf(span.startTime, span.endTime),
                              }}
                            />
                          )),
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

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
