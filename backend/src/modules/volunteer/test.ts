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

const CREATE_ACTIVITY = graphql(`
  mutation CreateVolunteerActivity($input: CreateVolunteerActivityInput!) {
    createVolunteerActivity(input: $input) {
      id
      key
      name
      description
    }
  }
`)

const CREATE_PERIOD = graphql(`
  mutation CreateVolunteerPeriod($input: CreateVolunteerPeriodInput!) {
    createVolunteerPeriod(input: $input) {
      id
      startTime
      endTime
      durationMinutes
      neededCount
      note
      coverage {
        count
        needed
        status
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
  graphqlTest('an administrator lays out an activity and its periods', async (graphqlRequest) => {
    const session = await login('admin@example.com')

    const created = await graphqlRequest(
      CREATE_ACTIVITY,
      {
        input: {
          key: 'elektro-aufbau',
          name: 'Elektro-Aufbau',
          summary: 'Strom in die Halle bringen',
          description: '<p>Kabeltrommeln, Verteiler, und wer sich damit auskennt.</p>',
          ordering: 9,
        },
      },
      session,
    )
    expect(created.errors).toBeUndefined()
    const activity = created.data!.createVolunteerActivity!
    expect(activity.name).toBe('Elektro-Aufbau')
    expect(activity.description).toContain('Kabeltrommeln')

    const period = await graphqlRequest(
      CREATE_PERIOD,
      {
        input: {
          activityId: activity.id,
          startTime: at(12, 8).toISOString(),
          durationMinutes: 6 * 60,
          neededCount: 4,
          note: 'Treffpunkt am Lastenaufzug',
        },
      },
      session,
    )
    expect(period.errors).toBeUndefined()
    expect(period.data!.createVolunteerPeriod).toMatchObject({
      durationMinutes: 360,
      neededCount: 4,
      note: 'Treffpunkt am Lastenaufzug',
    })

    /* Nobody has signed up yet, so the whole period wants people. */
    expect(period.data!.createVolunteerPeriod.coverage).toEqual([
      expect.objectContaining({ count: 0, needed: 4, status: 'none' }),
    ])
  })

  graphqlTest('only administrators lay out activities', async (graphqlRequest) => {
    const daffy = await login('daffy@example.com')

    for (const session of [undefined, daffy]) {
      const result = await graphqlRequest(
        CREATE_ACTIVITY,
        {
          input: { key: 'heimlich', name: 'Heimlich', summary: 'Nicht erlaubt' },
        },
        session,
      )
      expect(result.errors?.[0]?.message).toMatch(/administrator/i)
    }
  })

  graphqlTest('a key belongs to one activity, and reads like a key', async (graphqlRequest) => {
    const session = await login('admin@example.com')

    const duplicate = await graphqlRequest(
      CREATE_ACTIVITY,
      {
        input: { key: 'infotresen', name: 'Noch ein Infotresen', summary: 'Doppelt' },
      },
      session,
    )
    expect(duplicate.errors?.[0]?.message).toContain('infotresen')

    const shouted = await graphqlRequest(
      CREATE_ACTIVITY,
      {
        input: { key: 'Fotofix Betreuen', name: 'Fotofix', summary: 'Falsches Kürzel' },
      },
      session,
    )
    expect(shouted.errors?.[0]?.message).toContain('Kleinbuchstaben')
  })

  graphqlTest('a period lasts longer than nothing and wants somebody', async (graphqlRequest) => {
    const session = await login('admin@example.com')
    const activityId = await seedActivity()

    const empty = await graphqlRequest(
      CREATE_PERIOD,
      {
        input: { activityId, startTime: at(13, 9).toISOString(), durationMinutes: 0 },
      },
      session,
    )
    expect(empty.errors?.[0]?.message).toContain('null Minuten')

    const nobody = await graphqlRequest(
      CREATE_PERIOD,
      {
        input: {
          activityId,
          startTime: at(13, 9).toISOString(),
          durationMinutes: 60,
          neededCount: 0,
        },
      },
      session,
    )
    expect(nobody.errors?.[0]?.message).toContain('mindestens eine Person')
  })

  graphqlTest(
    'what somebody signed up for is not deleted underneath them',
    async (graphqlRequest) => {
      const session = await login('admin@example.com')
      const activityId = await seedActivity()

      const result = await graphqlRequest(
        graphql(`
          mutation DeleteVolunteerActivity($id: Int!) {
            deleteVolunteerActivity(id: $id)
          }
        `),
        { id: activityId },
        session,
      )
      expect(result.errors?.[0]?.message).toContain('Schichten eingetragen')
    },
  )

  graphqlTest('an activity nobody signed up for is changed and dropped', async (graphqlRequest) => {
    const session = await login('admin@example.com')

    const created = await graphqlRequest(
      CREATE_ACTIVITY,
      {
        input: { key: 'abbau', name: 'Abbau', summary: 'Alles wieder einpacken', ordering: 9 },
      },
      session,
    )
    const { id } = created.data!.createVolunteerActivity!

    const updated = await graphqlRequest(
      graphql(`
        mutation UpdateVolunteerActivity($id: Int!, $input: UpdateVolunteerActivityInput!) {
          updateVolunteerActivity(id: $id, input: $input) {
            summary
          }
        }
      `),
      { id, input: { summary: 'Alles wieder einpacken, am Sonntagabend' } },
      session,
    )
    expect(updated.errors).toBeUndefined()
    expect(updated.data!.updateVolunteerActivity.summary).toBe(
      'Alles wieder einpacken, am Sonntagabend',
    )

    const deleted = await graphqlRequest(
      graphql(`
        mutation DeleteVolunteerActivity($id: Int!) {
          deleteVolunteerActivity(id: $id)
        }
      `),
      { id },
      session,
    )
    expect(deleted.errors).toBeUndefined()
    expect(deleted.data!.deleteVolunteerActivity).toBe(true)
  })
})
