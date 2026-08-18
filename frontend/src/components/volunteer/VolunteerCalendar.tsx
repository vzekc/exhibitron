import { useMemo, useRef, useState } from 'react'
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

/* A shift of the person looking at the plan, whatever activity it belongs to. */
export interface OwnShift {
  id: number
  startTime: string
  endTime: string
  activityName: string
}

interface VolunteerCalendarProps {
  activities: CalendarActivity[]
  ownShifts?: OwnShift[]
  canBook?: boolean
  onPick?: (activity: CalendarActivity, period: CalendarPeriod, startTime: Date) => void
  onShowDetails?: (activity: CalendarActivity) => void
}

const hourOf = (value: string) => {
  const date = new Date(value)
  return date.getHours() + date.getMinutes() / 60
}

const overlaps = (aFrom: string, aTo: string, bFrom: string, bTo: string) =>
  new Date(aFrom) < new Date(bTo) && new Date(bFrom) < new Date(aTo)

/* A stretch this long has room for its numbers written into it. */
const LABELLED_HOURS = 1.5

/* With a dozen hours in a day, every hour written out crowds a narrow screen.
   Below that width only every second one is shown. */
const isQuietHour = (hour: number) => hour % 2 === 1

/* Diagonal lines over whatever colour the stretch has, so that one's own
   shifts are told apart from the state of the plan rather than instead of it. */
const OWN_SHIFT_HATCH =
  'repeating-linear-gradient(45deg, rgba(17, 24, 39, 0.55) 0 3px, transparent 3px 8px)'

interface HoverCard {
  x: number
  y: number
  activity: string
  time: string
  status: string
  people: string[]
  mine?: string
}

/*
 * The plan of all days at once: a day per row, the clock from left to right,
 * and under each day one bar per activity that wants help that day. The bars
 * are painted from the coverage the server counted — where nobody is, where
 * too few are, where it is done, and where more than enough have come.
 *
 * Days downwards rather than sideways is what keeps it dense: another activity
 * costs one thin bar, not another column, so a day with fifteen of them still
 * fits on a phone. The days come from the periods themselves, so the build-up
 * before the doors open and the last evening are simply there.
 *
 * The shifts of whoever is looking are hatched across the colours, and the
 * times they cover cannot be signed up for a second time.
 */
const VolunteerCalendar = ({
  activities,
  ownShifts = [],
  canBook = false,
  onPick,
  onShowDetails,
}: VolunteerCalendarProps) => {
  const frame = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverCard | null>(null)

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

  const shiftsIn = (from: string, to: string) =>
    ownShifts.filter((shift) => overlaps(from, to, shift.startTime, shift.endTime))

  const showHover = (
    event: React.MouseEvent,
    activity: CalendarActivity,
    period: CalendarPeriod,
    stretch: CoverageSpan,
  ) => {
    const box = frame.current?.getBoundingClientRect()
    if (!box) return

    const mine = shiftsIn(stretch.startTime, stretch.endTime)
    setHover({
      x: event.clientX - box.left,
      y: event.clientY - box.top,
      activity: activity.name,
      time: `${clock(stretch.startTime)}–${clock(stretch.endTime)}`,
      status: `${coverageLabel[stretch.status as CoverageStatus]}${
        stretch.needed ? ` (${stretch.count} von ${stretch.needed})` : ''
      }`,
      /* Names are only there for somebody who is logged in. */
      people: (period.bookings ?? [])
        .filter((booking) =>
          overlaps(stretch.startTime, stretch.endTime, booking.startTime, booking.endTime),
        )
        .map((booking) => booking.name)
        .filter((name): name is string => !!name),
      mine: mine.length
        ? mine
            .map(
              (shift) => `${shift.activityName}, ${clock(shift.startTime)}–${clock(shift.endTime)}`,
            )
            .join('; ')
        : undefined,
    })
  }

  return (
    <div className="relative space-y-3" ref={frame} onMouseLeave={() => setHover(null)}>
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
                  <button
                    type="button"
                    onClick={() => onShowDetails?.(activity)}
                    className="text-xs w-24 shrink-0 truncate text-left text-blue-700 hover:underline sm:w-36 dark:text-blue-300"
                    title={`${activity.name} — was dabei zu tun ist`}>
                    {activity.name}
                  </button>

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
                        const taken = shiftsIn(stretch.startTime, stretch.endTime).length > 0
                        return (
                          <button
                            key={`${period.id}-${index}`}
                            type="button"
                            /* Not `disabled`: a disabled button reports no
                               mouse events, and hovering a stretch one is
                               already signed up for is exactly when the
                               overlay has something to say. */
                            aria-disabled={!canBook || taken}
                            onMouseMove={(event) => showHover(event, activity, period, stretch)}
                            onClick={() =>
                              canBook &&
                              !taken &&
                              onPick?.(activity, period, new Date(stretch.startTime))
                            }
                            className={`absolute top-0 h-full overflow-hidden rounded-sm text-[10px] leading-5 text-gray-700 dark:text-gray-100 ${coverageFill[status]} ${
                              canBook && !taken ? 'cursor-pointer' : 'cursor-default'
                            }`}
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

                    {/* One's own shifts, over the colours rather than instead of them */}
                    {onDay(activity, day).flatMap((period) =>
                      shiftsIn(period.startTime, period.endTime)
                        .filter((shift) => shift.activityName === activity.name)
                        .map((shift) => (
                          <div
                            key={shift.id}
                            className="pointer-events-none absolute top-0 h-full rounded-sm ring-2 ring-gray-900 dark:ring-white"
                            style={{
                              left: `${percentOf(hourOf(shift.startTime))}%`,
                              width: `${((hourOf(shift.endTime) - hourOf(shift.startTime)) / span) * 100}%`,
                              backgroundImage: OWN_SHIFT_HATCH,
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

      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        {(['none', 'under', 'met', 'over'] as CoverageStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-2">
            <span className={`inline-block h-3 w-6 rounded-sm ${coverageFill[status]}`} />
            {coverageLabel[status]}
          </span>
        ))}
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-6 rounded-sm bg-gray-200 ring-2 ring-gray-900 dark:bg-gray-700 dark:ring-white"
            style={{ backgroundImage: OWN_SHIFT_HATCH }}
          />
          deine Schicht
        </span>
      </div>

      {hover && (
        <div
          className="text-xs pointer-events-none absolute z-20 max-w-64 rounded-md bg-gray-900/95 px-3 py-2 text-white shadow-lg"
          style={{ left: Math.max(0, hover.x - 60), top: hover.y + 16 }}>
          <div className="font-semibold">{hover.activity}</div>
          <div>
            {hover.time} — {hover.status}
          </div>
          {hover.people.length > 0 && <div className="mt-1">dabei: {hover.people.join(', ')}</div>}
          {hover.mine && <div className="mt-1 font-semibold">Du hilfst hier: {hover.mine}</div>}
        </div>
      )}
    </div>
  )
}

export default VolunteerCalendar
