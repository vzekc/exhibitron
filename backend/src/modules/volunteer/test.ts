import { describe, expect } from 'vitest'
import { graphql } from 'gql.tada'
import { RequestContext } from '@mikro-orm/core'
import { graphqlTest, login } from '../../test/server.js'
import { initORM } from '../../db.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { ConferenceSession } from '../conferenceSession/entity.js'
import { User } from '../user/entity.js'
import { VolunteerActivity, VolunteerBooking, VolunteerPeriod } from './entity.js'

/*
 * The exhibition this fixture describes is a month off, the way it is when
 * somebody signs up: the tokens in the mails and the reminders both have
 * something ahead of them. Day 0 is the first day, day -1 the build-up.
 */
const firstDay = new Date(new Date().setHours(0, 0, 0, 0) + 30 * 24 * 3600 * 1000)

const at = (dayOffset: number, hour: number) =>
  new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + dayOffset, hour)

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
    exhibition.startDate = at(0, 0)
    exhibition.endDate = at(3, 23)
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
      startTime: at(0, 10),
      durationMinutes: 8 * 60,
      neededCount: 2,
      note: 'Treffpunkt am Tresen',
    })
    db.em.create(VolunteerBooking, {
      period,
      user: daffy,
      startTime: at(0, 10),
      durationMinutes: 3 * 60,
    })
    db.em.create(VolunteerBooking, {
      period,
      user: donald,
      startTime: at(0, 11),
      durationMinutes: 2 * 60,
    })

    /* Daffy is also giving a talk that afternoon. */
    db.em.create(ConferenceSession, {
      exhibition,
      title: 'CP/M auf dem Küchentisch',
      startTime: at(0, 14),
      durationMinutes: 60,
      exhibitors: [await db.em.findOneOrFail(Exhibitor, { user: daffy })],
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

const BOOK = graphql(`
  mutation BookVolunteerSlot($input: BookVolunteerSlotInput!) {
    bookVolunteerSlot(input: $input) {
      id
      startTime
      endTime
      isMine
      confirmed
    }
  }
`)

const REGISTER = graphql(`
  mutation RegisterVolunteer($input: RegisterVolunteerInput!) {
    registerVolunteer(input: $input) {
      outcome
      message
    }
  }
`)

const firstPeriodId = async (activityId: number) => {
  const db = await initORM()
  let periodId = 0
  await RequestContext.create(db.em, async () => {
    const period = await db.em.findOneOrFail(
      VolunteerPeriod,
      { activity: { id: activityId } },
      { orderBy: { startTime: 'asc' } },
    )
    periodId = period.id
  })
  return periodId
}

/* What the link in the mail carries. */
const tokenOf = async (email: string) => {
  const db = await initORM()
  let token = ''
  await RequestContext.create(db.em, async () => {
    const user = await db.em.findOneOrFail(
      User,
      { email },
      { populate: ['passwordResetToken'], refresh: true },
    )
    token = user.passwordResetToken ?? ''
  })
  return token
}

const isVerified = async (email: string) => {
  const db = await initORM()
  let verified = false
  await RequestContext.create(db.em, async () => {
    const user = await db.em.findOneOrFail(User, { email }, { refresh: true })
    verified = !!user.emailVerifiedAt
  })
  return verified
}

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
          startTime: at(-1, 8).toISOString(),
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
        input: { activityId, startTime: at(0, 9).toISOString(), durationMinutes: 0 },
      },
      session,
    )
    expect(empty.errors?.[0]?.message).toContain('null Minuten')

    const nobody = await graphqlRequest(
      CREATE_PERIOD,
      {
        input: {
          activityId,
          startTime: at(0, 9).toISOString(),
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

  graphqlTest('an exhibitor helps for a time of their own choosing', async (graphqlRequest) => {
    const activityId = await seedActivity()
    const periodId = await firstPeriodId(activityId)
    const session = await login('donald@example.com')

    const booked = await graphqlRequest(
      BOOK,
      { input: { periodId, startTime: at(0, 16).toISOString(), durationMinutes: 90 } },
      session,
    )
    expect(booked.errors).toBeUndefined()
    expect(hours(booked.data!.bookVolunteerSlot.startTime)).toBe(16)
    expect(booked.data!.bookVolunteerSlot.isMine).toBe(true)
  })

  graphqlTest('nobody is in two places at once', async (graphqlRequest) => {
    const activityId = await seedActivity()
    const periodId = await firstPeriodId(activityId)
    const session = await login('daffy@example.com')

    /* Daffy already helps from 10:00 to 13:00. */
    const clash = await graphqlRequest(
      BOOK,
      { input: { periodId, startTime: at(0, 12).toISOString(), durationMinutes: 60 } },
      session,
    )
    expect(clash.errors?.[0]?.message).toContain('Infotresen betreuen')

    /* And gives a talk at 14:00. */
    const talk = await graphqlRequest(
      BOOK,
      { input: { periodId, startTime: at(0, 13).toISOString(), durationMinutes: 120 } },
      session,
    )
    expect(talk.errors?.[0]?.message).toContain('CP/M auf dem Küchentisch')
  })

  graphqlTest('a shift lies in its period and on the quarter hour', async (graphqlRequest) => {
    const activityId = await seedActivity()
    const periodId = await firstPeriodId(activityId)
    const session = await login('donald@example.com')

    const late = await graphqlRequest(
      BOOK,
      { input: { periodId, startTime: at(0, 17).toISOString(), durationMinutes: 120 } },
      session,
    )
    expect(late.errors?.[0]?.message).toContain('bis 18:00')

    const odd = await graphqlRequest(
      BOOK,
      {
        input: {
          periodId,
          startTime: new Date(at(0, 13).getTime() + 20 * 60_000).toISOString(),
          durationMinutes: 60,
        },
      },
      session,
    )
    expect(odd.errors?.[0]?.message).toContain('Viertelstunde')
  })

  graphqlTest('somebody without an account signs up and confirms', async (graphqlRequest) => {
    const activityId = await seedActivity()
    const periodId = await firstPeriodId(activityId)

    const registered = await graphqlRequest(REGISTER, {
      input: {
        name: 'Erika Mustermann',
        email: 'erika@example.com',
        slot: { periodId, startTime: at(0, 15).toISOString(), durationMinutes: 120 },
      },
    })
    expect(registered.errors).toBeUndefined()
    expect(registered.data!.registerVolunteer.outcome).toBe('verificationSent')
    expect(registered.data!.registerVolunteer.message).toContain('erika@example.com')
    expect(await isVerified('erika@example.com')).toBe(false)

    /* The shift is held, and shows as not yet confirmed. */
    const held = await graphqlRequest(ACTIVITIES)
    const span = held
      .data!.getVolunteerActivities!.find((a) => a.key === 'infotresen')!
      .periods[0].coverage.find((s) => hours(s.startTime) === 15)!
    expect([span.count, span.unconfirmed]).toEqual([0, 1])

    const confirmed = await graphqlRequest(
      graphql(`
        mutation ConfirmVolunteerEmail($token: String!) {
          confirmVolunteerEmail(token: $token)
        }
      `),
      { token: await tokenOf('erika@example.com') },
    )
    expect(confirmed.errors).toBeUndefined()
    expect(await isVerified('erika@example.com')).toBe(true)

    const counted = await graphqlRequest(ACTIVITIES)
    const now = counted
      .data!.getVolunteerActivities!.find((a) => a.key === 'infotresen')!
      .periods[0].coverage.find((s) => hours(s.startTime) === 15)!
    expect([now.count, now.unconfirmed]).toEqual([1, 0])
  })

  graphqlTest('a name from the forum belongs to the forum login', async (graphqlRequest) => {
    const activityId = await seedActivity()
    const periodId = await firstPeriodId(activityId)

    const result = await graphqlRequest(REGISTER, {
      input: {
        name: 'daffy',
        email: 'someone.else@example.com',
        slot: { periodId, startTime: at(0, 15).toISOString(), durationMinutes: 60 },
      },
    })
    expect(result.errors).toBeUndefined()
    expect(result.data!.registerVolunteer.outcome).toBe('useForumLogin')
    expect(result.data!.registerVolunteer.message).toContain('Forum')
  })

  graphqlTest('an address that has an account goes to the login', async (graphqlRequest) => {
    const activityId = await seedActivity()
    const periodId = await firstPeriodId(activityId)

    const result = await graphqlRequest(REGISTER, {
      input: {
        name: 'Doppelgänger',
        email: 'meistereder@example.com',
        slot: { periodId, startTime: at(0, 15).toISOString(), durationMinutes: 60 },
      },
    })
    expect(result.data!.registerVolunteer.outcome).toBe('useForumLogin')
  })

  graphqlTest('everybody may drop their own shift, and only their own', async (graphqlRequest) => {
    const activityId = await seedActivity()
    const periodId = await firstPeriodId(activityId)
    const donald = await login('donald@example.com')
    const daffy = await login('daffy@example.com')

    const booked = await graphqlRequest(
      BOOK,
      { input: { periodId, startTime: at(0, 13).toISOString(), durationMinutes: 60 } },
      donald,
    )
    expect(booked.errors).toBeUndefined()
    const { id } = booked.data!.bookVolunteerSlot

    const CANCEL = graphql(`
      mutation CancelVolunteerBooking($id: Int!) {
        cancelVolunteerBooking(id: $id)
      }
    `)

    const stranger = await graphqlRequest(CANCEL, { id }, daffy)
    expect(stranger.errors?.[0]?.message).toContain('nicht deine Schicht')

    const own = await graphqlRequest(CANCEL, { id }, donald)
    expect(own.errors).toBeUndefined()
    expect(own.data!.cancelVolunteerBooking).toBe(true)
  })
})
