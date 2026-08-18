import { describe, expect } from 'vitest'
import { graphql } from 'gql.tada'
import { RequestContext } from '@mikro-orm/core'
import { graphqlTest, login } from '../../test/server.js'
import { initORM } from '../../db.js'
import { Exhibition } from '../exhibition/entity.js'
import { User } from '../user/entity.js'
import { VolunteerActivity, VolunteerBooking, VolunteerPeriod } from './entity.js'

const at = (day: number, hour: number) => new Date(2025, 8, day, hour, 0, 0)

/*
 * One activity on the Saturday, wanted by two people from 10:00 to 18:00:
 * daffy helps 10:00–13:00 with a verified address, donald 11:00–13:00 without
 * having clicked the link in his mail yet.
 */
const seedActivity = async () => {
  const db = await initORM()
  let activityId = 0
  await RequestContext.create(db.em, async () => {
    /* The suite shares one database, so the fixture is laid out once. */
    const existing = await db.em.findOne(VolunteerActivity, { key: 'infotresen' })
    if (existing) {
      activityId = existing.id
      return
    }

    const exhibition = await db.em.findOneOrFail(Exhibition, { key: 'cc2025' })
    const daffy = await db.em.findOneOrFail(User, { nickname: 'daffy' })
    const donald = await db.em.findOneOrFail(User, { nickname: 'donald' })
    daffy.emailVerifiedAt = new Date()
    donald.emailVerifiedAt = undefined

    const activity = db.em.create(VolunteerActivity, {
      exhibition,
      key: 'infotresen',
      name: 'Infotresen betreuen',
      summary: 'Fragen beantworten, Programme verteilen',
      ordering: 1,
    })
    const period = db.em.create(VolunteerPeriod, {
      activity,
      startTime: at(13, 10),
      durationMinutes: 8 * 60,
      neededCount: 2,
      note: 'Treffpunkt am Tresen',
    })
    db.em.create(VolunteerBooking, {
      period,
      user: daffy,
      startTime: at(13, 10),
      durationMinutes: 3 * 60,
    })
    db.em.create(VolunteerBooking, {
      period,
      user: donald,
      startTime: at(13, 11),
      durationMinutes: 2 * 60,
    })

    await db.em.flush()
    activityId = activity.id
  })
  return activityId
}

const ACTIVITIES = graphql(`
  query GetVolunteerActivities {
    getVolunteerActivities {
      id
      key
      name
      summary
      periods {
        id
        startTime
        endTime
        neededCount
        note
        coverage {
          startTime
          endTime
          count
          unconfirmed
          needed
          status
        }
        bookings {
          id
          startTime
          endTime
          name
          confirmed
          isMine
        }
      }
    }
  }
`)

/* The Date scalar arrives untyped from gql.tada; every value is an ISO string. */
const hours = (value: unknown) => new Date(value as string).getHours()

describe('volunteer', () => {
  graphqlTest('the plan is public, the names of the helpers are not', async (graphqlRequest) => {
    await seedActivity()

    const anonymous = await graphqlRequest(ACTIVITIES)
    expect(anonymous.errors).toBeUndefined()
    const [activity] = anonymous.data!.getVolunteerActivities!
    expect(activity.key).toBe('infotresen')

    const [period] = activity.periods
    expect(hours(period.startTime)).toBe(10)
    expect(hours(period.endTime)).toBe(18)
    expect(period.neededCount).toBe(2)

    /* Donald has not confirmed his address, so he shows but does not count. */
    expect(
      period.coverage.map((span) => [
        hours(span.startTime),
        span.count,
        span.unconfirmed,
        span.status,
      ]),
    ).toEqual([
      [10, 1, 0, 'under'],
      [11, 1, 1, 'under'],
      [13, 0, 0, 'none'],
    ])

    expect(period.bookings.map((booking) => booking.name)).toEqual([null, null])
    expect(period.bookings.map((booking) => booking.confirmed)).toEqual([true, false])
    expect(period.bookings.every((booking) => !booking.isMine)).toBe(true)
  })

  graphqlTest(
    'somebody logged in sees who is helping, and which is theirs',
    async (graphqlRequest) => {
      await seedActivity()
      const session = await login('daffy@example.com')

      const result = await graphqlRequest(ACTIVITIES, {}, session)
      expect(result.errors).toBeUndefined()
      const [period] = result.data!.getVolunteerActivities![0].periods

      expect(period.bookings.map((booking) => [booking.name, booking.isMine])).toEqual([
        ['Daffy Duck', true],
        ['Donald Duck', false],
      ])
    },
  )

  graphqlTest(
    'an activity is read by its key, with its long description',
    async (graphqlRequest) => {
      await seedActivity()

      const result = await graphqlRequest(
        graphql(`
          query GetVolunteerActivity($key: String!) {
            getVolunteerActivity(key: $key) {
              name
              description
              contact {
                id
              }
              periods {
                durationMinutes
              }
            }
          }
        `),
        { key: 'infotresen' },
      )
      expect(result.errors).toBeUndefined()
      expect(result.data!.getVolunteerActivity).toEqual({
        name: 'Infotresen betreuen',
        description: null,
        contact: null,
        periods: [{ durationMinutes: 480 }],
      })
    },
  )

  graphqlTest('an unknown key is no activity', async (graphqlRequest) => {
    const result = await graphqlRequest(
      graphql(`
        query GetUnknownVolunteerActivity {
          getVolunteerActivity(key: "gibtesnicht") {
            id
          }
        }
      `),
    )
    expect(result.errors).toBeUndefined()
    expect(result.data!.getVolunteerActivity).toBeNull()
  })

  graphqlTest('everybody sees their own shifts, nobody else sees them', async (graphqlRequest) => {
    await seedActivity()

    const MY_BOOKINGS = graphql(`
      query GetMyVolunteerBookings {
        getMyVolunteerBookings {
          startTime
          endTime
          isMine
          period {
            id
            activity {
              key
            }
          }
        }
      }
    `)

    const anonymous = await graphqlRequest(MY_BOOKINGS)
    expect(anonymous.errors).toBeUndefined()
    expect(anonymous.data!.getMyVolunteerBookings).toEqual([])

    const session = await login('daffy@example.com')
    const mine = await graphqlRequest(MY_BOOKINGS, {}, session)
    expect(mine.errors).toBeUndefined()
    const bookings = mine.data!.getMyVolunteerBookings!
    expect(bookings).toHaveLength(1)
    expect(hours(bookings[0].startTime)).toBe(10)
    expect(hours(bookings[0].endTime)).toBe(13)
    expect(bookings[0].isMine).toBe(true)
    expect(bookings[0].period.activity.key).toBe('infotresen')
  })
})
