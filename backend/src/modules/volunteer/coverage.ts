/*
 * How well a period is covered, minute by minute.
 *
 * Volunteers pick their own times inside a period, so coverage is not a count
 * per slot but a curve. The period is cut at every booking boundary, each
 * resulting span carries the number of people helping through the whole of it,
 * and neighbouring spans that say the same thing are joined again — so that
 * the calendar draws one block where eight quarter hours look alike.
 *
 * `neededCount` is a target, not a limit. A span with more people than asked
 * for is `over`, which the calendar shows in its own colour and nobody treats
 * as a fault.
 */

export type CoverageStatus = 'none' | 'under' | 'met' | 'over' | 'unlimited'

export interface CoveragePeriod {
  startTime: Date
  durationMinutes: number
  /* Unset means as many as register. */
  neededCount?: number
}

export interface CoverageBooking {
  startTime: Date
  durationMinutes: number
  /* False while the volunteer has not yet clicked the link in their mail. */
  confirmed: boolean
}

export interface CoverageSpan {
  startTime: Date
  endTime: Date
  /* People whose address is verified. Only these count towards the need. */
  count: number
  unconfirmed: number
  needed?: number
  status: CoverageStatus
}

const endOf = ({ startTime, durationMinutes }: CoveragePeriod | CoverageBooking) =>
  startTime.getTime() + durationMinutes * 60_000

const statusOf = (count: number, needed?: number): CoverageStatus => {
  if (count === 0) return 'none'
  if (needed === undefined) return 'unlimited'
  if (count < needed) return 'under'
  if (count === needed) return 'met'
  return 'over'
}

export const computeCoverage = (
  period: CoveragePeriod,
  bookings: CoverageBooking[],
): CoverageSpan[] => {
  const periodStart = period.startTime.getTime()
  const periodEnd = endOf(period)
  if (periodEnd <= periodStart) return []

  /* A booking reaching past either end of its period covers what lies inside. */
  const spans = bookings
    .map((booking) => ({
      start: Math.max(booking.startTime.getTime(), periodStart),
      end: Math.min(endOf(booking), periodEnd),
      confirmed: booking.confirmed,
    }))
    .filter(({ start, end }) => end > start)

  const cuts = [
    ...new Set([periodStart, periodEnd, ...spans.flatMap(({ start, end }) => [start, end])]),
  ].sort((a, b) => a - b)

  const result: CoverageSpan[] = []
  for (let i = 0; i < cuts.length - 1; i++) {
    const start = cuts[i]
    const end = cuts[i + 1]
    const covering = spans.filter((span) => span.start <= start && span.end >= end)
    const count = covering.filter(({ confirmed }) => confirmed).length
    const unconfirmed = covering.length - count

    const previous = result[result.length - 1]
    if (previous && previous.count === count && previous.unconfirmed === unconfirmed) {
      previous.endTime = new Date(end)
      continue
    }

    result.push({
      startTime: new Date(start),
      endTime: new Date(end),
      count,
      unconfirmed,
      needed: period.neededCount,
      status: statusOf(count, period.neededCount),
    })
  }
  return result
}

/* The spans that still want somebody, for the gap report and the calendar. */
export const gapsIn = (spans: CoverageSpan[]) =>
  spans.filter(({ status }) => status === 'none' || status === 'under')
