import { describe, expect, test } from 'vitest'
import { computeCoverage, gapsIn, type CoverageBooking } from './coverage.js'

const at = (hours: number, minutes = 0) => new Date(2026, 4, 16, hours, minutes)

const period = (startHour: number, endHour: number, neededCount?: number) => ({
  startTime: at(startHour),
  durationMinutes: (endHour - startHour) * 60,
  neededCount,
})

const booking = (startHour: number, endHour: number, confirmed = true): CoverageBooking => ({
  startTime: at(startHour),
  durationMinutes: (endHour - startHour) * 60,
  confirmed,
})

/* A span as 'from-to count/unconfirmed status', which reads in a diff. */
const summarize = (spans: ReturnType<typeof computeCoverage>) =>
  spans.map(
    ({ startTime, endTime, count, unconfirmed, status }) =>
      `${startTime.getHours()}-${endTime.getHours()} ${count}/${unconfirmed} ${status}`,
  )

describe('coverage', () => {
  test('an empty period is one uncovered span', () => {
    expect(summarize(computeCoverage(period(10, 18, 2), []))).toEqual(['10-18 0/0 none'])
  })

  test('counts the people helping through each span', () => {
    const spans = computeCoverage(period(10, 18, 2), [
      booking(10, 13),
      booking(11, 13),
      booking(15, 17),
      booking(15, 17),
      booking(15, 17),
    ])
    expect(summarize(spans)).toEqual([
      '10-11 1/0 under',
      '11-13 2/0 met',
      '13-15 0/0 none',
      '15-17 3/0 over',
      '17-18 0/0 none',
    ])
  })

  test('joins neighbouring spans that say the same thing', () => {
    const spans = computeCoverage(period(10, 14, 1), [booking(10, 12), booking(12, 14)])
    expect(summarize(spans)).toEqual(['10-14 1/0 met'])
  })

  test('a booking nested in another is counted for its own span only', () => {
    const spans = computeCoverage(period(10, 16, 2), [booking(10, 16), booking(12, 14)])
    expect(summarize(spans)).toEqual(['10-12 1/0 under', '12-14 2/0 met', '14-16 1/0 under'])
  })

  test('a booking reaching past the period covers what lies inside', () => {
    const spans = computeCoverage(period(10, 14, 1), [booking(8, 12), booking(13, 20)])
    expect(summarize(spans)).toEqual(['10-12 1/0 met', '12-13 0/0 none', '13-14 1/0 met'])
  })

  test('a booking entirely outside the period is ignored', () => {
    expect(summarize(computeCoverage(period(10, 14, 1), [booking(15, 17)]))).toEqual([
      '10-14 0/0 none',
    ])
  })

  test('a booking flush against each end leaves no empty span behind', () => {
    const spans = computeCoverage(period(10, 14, 1), [booking(10, 11), booking(13, 14)])
    expect(summarize(spans)).toEqual(['10-11 1/0 met', '11-13 0/0 none', '13-14 1/0 met'])
  })

  test('without a needed count, anybody helping is enough', () => {
    const spans = computeCoverage(period(10, 14), [booking(11, 13)])
    expect(summarize(spans)).toEqual(['10-11 0/0 none', '11-13 1/0 unlimited', '13-14 0/0 none'])
  })

  test('an unconfirmed booking is shown but does not count towards the need', () => {
    const spans = computeCoverage(period(10, 14, 1), [booking(10, 12, false), booking(12, 14)])
    expect(summarize(spans)).toEqual(['10-12 0/1 none', '12-14 1/0 met'])
  })

  test('quarter hours are spans like any other', () => {
    const spans = computeCoverage({ startTime: at(10), durationMinutes: 60, neededCount: 1 }, [
      { startTime: at(10, 15), durationMinutes: 30, confirmed: true },
    ])
    expect(
      spans.map(({ startTime, endTime, status }) => [
        `${startTime.getHours()}:${String(startTime.getMinutes()).padStart(2, '0')}`,
        `${endTime.getHours()}:${String(endTime.getMinutes()).padStart(2, '0')}`,
        status,
      ]),
    ).toEqual([
      ['10:00', '10:15', 'none'],
      ['10:15', '10:45', 'met'],
      ['10:45', '11:00', 'none'],
    ])
  })

  test('a period with no duration has no spans', () => {
    expect(computeCoverage({ startTime: at(10), durationMinutes: 0 }, [])).toEqual([])
  })

  test('the gap report keeps what still wants somebody', () => {
    const spans = computeCoverage(period(10, 18, 2), [
      booking(10, 13),
      booking(11, 13),
      booking(15, 17),
      booking(15, 17),
      booking(15, 17),
    ])
    expect(summarize(gapsIn(spans))).toEqual([
      '10-11 1/0 under',
      '13-15 0/0 none',
      '17-18 0/0 none',
    ])
  })
})
