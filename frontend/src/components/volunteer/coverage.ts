/*
 * How a stretch of a period is shown once it has been counted on the server:
 * what it is called, and what colour it gets. Every view of the volunteer plan
 * reads its colours from here, so the calendar, the activity page and the gap
 * report say the same thing in the same way.
 */

export type CoverageStatus = 'none' | 'under' | 'met' | 'over' | 'unlimited'

export interface CoverageSpan {
  startTime: string
  endTime: string
  count: number
  unconfirmed: number
  needed?: number | null
  status: CoverageStatus
}

export const coverageLabel: Record<CoverageStatus, string> = {
  none: 'niemand',
  under: 'zu wenige',
  met: 'besetzt',
  over: 'mehr als nötig',
  unlimited: 'besetzt',
}

/* The block in the calendar. */
export const coverageFill: Record<CoverageStatus, string> = {
  none: 'bg-red-100 dark:bg-red-950',
  under: 'bg-amber-200 dark:bg-amber-900',
  met: 'bg-emerald-300 dark:bg-emerald-800',
  over: 'bg-sky-300 dark:bg-sky-800',
  unlimited: 'bg-emerald-300 dark:bg-emerald-800',
}

/* The same thing as a word in a list. */
export const coverageChip: Record<CoverageStatus, string> = {
  none: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  under: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  met: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  over: 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100',
  unlimited: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
}

export const wantsPeople = ({ status }: { status: CoverageStatus }) =>
  status === 'none' || status === 'under'

/*
 * Stretches that follow one another, written as one range. A period where
 * nobody is until noon and one person is until two wants somebody from ten to
 * two, and reads better said that way.
 */
export const joinAdjacent = (spans: { startTime: string; endTime: string }[]) =>
  spans.reduce<{ startTime: string; endTime: string }[]>((joined, span) => {
    const previous = joined[joined.length - 1]
    if (previous && previous.endTime === span.startTime) {
      previous.endTime = span.endTime
      return joined
    }
    return [...joined, { ...span }]
  }, [])

export const clock = (value: string | Date) =>
  new Date(value).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

export const weekday = (value: string | Date) =>
  new Date(value).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })

export const timeRange = (from: string | Date, to: string | Date) => `${clock(from)}–${clock(to)}`

export const minutesBetween = (from: string | Date, to: string | Date) =>
  Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000)

/* 'Sa 10:00–13:00' for a chip, '3 Stunden' for a duration. */
export const duration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} Min.`
  if (!rest) return hours === 1 ? '1 Stunde' : `${hours} Stunden`
  return `${hours}:${String(rest).padStart(2, '0')} Std.`
}
