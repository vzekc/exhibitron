import { Context } from '../../app/context.js'
import { UniqueConstraintViolationException } from '@mikro-orm/core'
import {
  CoverageStatus,
  MutationResolvers,
  QueryResolvers,
  VolunteerActivityResolvers,
  VolunteerBookingResolvers,
  VolunteerPeriodResolvers,
} from '../../generated/graphql.js'
import { VolunteerActivity, VolunteerBooking, VolunteerPeriod } from './entity.js'
import { computeCoverage } from './coverage.js'
import { requireAdmin, requireNotFrozen } from '../../db.js'
import { BadRequestError, UniqueConstraintError } from '../common/errors.js'

const endTimeOf = ({ startTime, durationMinutes }: VolunteerPeriod | VolunteerBooking) =>
  new Date(startTime.getTime() + durationMinutes * 60_000)

/* The bookings of a period, with the user each belongs to. */
const bookingsOf = async (period: VolunteerPeriod, { db }: Context) =>
  db.em.find(
    VolunteerBooking,
    { period },
    { populate: ['user'], orderBy: { startTime: 'asc', id: 'asc' } },
  )

export const volunteerQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getVolunteerActivities: async (_, _args, { db, exhibition }) =>
    db.volunteer.find(
      { exhibition },
      { populate: ['description'], orderBy: { ordering: 'asc', name: 'asc' } },
    ),

  // @ts-expect-error ts2345
  getVolunteerActivity: async (_, { key }, { db, exhibition }) =>
    db.volunteer.findOne({ exhibition, key }, { populate: ['description'] }),

  // @ts-expect-error ts2345
  getMyVolunteerBookings: async (_, _args, { db, user, exhibition }) => {
    if (!user) return []
    return db.em.find(
      VolunteerBooking,
      { user, period: { activity: { exhibition } } },
      { populate: ['user', 'period', 'period.activity'], orderBy: { startTime: 'asc' } },
    )
  },
}

export const volunteerActivityTypeResolvers: VolunteerActivityResolvers<Context> = {
  description: (activity) => (activity as unknown as VolunteerActivity).description?.html ?? null,

  // @ts-expect-error ts2345
  contact: async (activity, _, { db }) => {
    const { contact } = activity as unknown as VolunteerActivity
    return contact ? db.exhibitor.findOneOrFail({ id: contact.id }) : null
  },

  // @ts-expect-error ts2345
  periods: async (activity, _, { db }) =>
    db.em.find(
      VolunteerPeriod,
      { activity: { id: activity.id } },
      { orderBy: { startTime: 'asc' } },
    ),
}

export const volunteerPeriodTypeResolvers: VolunteerPeriodResolvers<Context> = {
  endTime: (period) => endTimeOf(period as unknown as VolunteerPeriod),

  // @ts-expect-error ts2345
  activity: async (period, _, { db }) =>
    db.volunteer.findOneOrFail(
      { id: (period as unknown as VolunteerPeriod).activity.id },
      { populate: ['description'] },
    ),

  coverage: async (period, _, context) => {
    const entity = period as unknown as VolunteerPeriod
    const bookings = await bookingsOf(entity, context)
    return computeCoverage(
      entity,
      bookings.map((booking) => ({
        startTime: booking.startTime,
        durationMinutes: booking.durationMinutes,
        confirmed: !!booking.user.emailVerifiedAt,
      })),
    ).map((span) => ({ ...span, status: span.status as CoverageStatus }))
  },

  // @ts-expect-error ts2345
  bookings: async (period, _, context) => bookingsOf(period as unknown as VolunteerPeriod, context),
}

export const volunteerBookingTypeResolvers: VolunteerBookingResolvers<Context> = {
  endTime: (booking) => endTimeOf(booking as unknown as VolunteerBooking),

  /* Coverage is public, who is helping is not. */
  name: (booking, _, { user }) =>
    user ? ((booking as unknown as VolunteerBooking).user.fullName ?? null) : null,

  confirmed: (booking) => !!(booking as unknown as VolunteerBooking).user.emailVerifiedAt,

  isMine: (booking, _, { user }) =>
    !!user && (booking as unknown as VolunteerBooking).user.id === user.id,

  // @ts-expect-error ts2345
  period: async (booking, _, { db }) =>
    db.em.findOneOrFail(VolunteerPeriod, {
      id: (booking as unknown as VolunteerBooking).period.id,
    }),
}

const KEY_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/

const checkKey = (key: string) => {
  if (!KEY_FORMAT.test(key)) {
    throw new BadRequestError(
      'Das Kürzel darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten',
    )
  }
}

const checkPeriod = ({
  durationMinutes,
  neededCount,
}: {
  durationMinutes?: number | null
  neededCount?: number | null
}) => {
  if (durationMinutes !== undefined && durationMinutes !== null && durationMinutes <= 0) {
    throw new BadRequestError('Ein Zeitraum muss länger als null Minuten sein')
  }
  if (neededCount !== undefined && neededCount !== null && neededCount < 1) {
    throw new BadRequestError(
      'Es muss mindestens eine Person gebraucht werden — ohne Angabe hilft, wer mag',
    )
  }
}

/* The flush is explicit so that a key already taken is answered, not logged. */
const flushOrExplainKey = async ({ db }: Context, key: string) => {
  try {
    await db.em.flush()
  } catch (error) {
    if (error instanceof UniqueConstraintViolationException) {
      throw new UniqueConstraintError(
        `Es gibt in dieser Ausstellung schon eine Tätigkeit mit dem Kürzel „${key}“`,
        'key',
        key,
      )
    }
    throw error
  }
}

const contactOf = async ({ db, exhibition }: Context, contactId?: number | null) => {
  if (contactId === undefined) return undefined
  if (contactId === null) return null
  return db.exhibitor.findOneOrFail({ id: contactId, exhibition })
}

/* An activity of another exhibition is none of this host's business. */
const activityOf = async ({ db, exhibition }: Context, id: number) =>
  db.volunteer.findOneOrFail({ id, exhibition }, { populate: ['description'] })

const periodOf = async (context: Context, id: number) => {
  const period = await context.db.em.findOneOrFail(
    VolunteerPeriod,
    { id },
    { populate: ['activity'] },
  )
  await activityOf(context, period.activity.id)
  return period
}

export const volunteerMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createVolunteerActivity: async (_, { input }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)
    checkKey(input.key)

    const activity = db.volunteer.create({
      exhibition,
      key: input.key,
      name: input.name,
      summary: input.summary,
      ordering: input.ordering ?? 0,
      contact: await contactOf(context, input.contactId),
    })
    if (input.description) {
      activity.description = await db.document.ensureDocument(null, input.description)
    }

    db.em.persist(activity)
    await flushOrExplainKey(context, input.key)
    return activity
  },

  // @ts-expect-error ts2345
  updateVolunteerActivity: async (_, { id, input }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)

    const activity = await activityOf(context, id)
    if (input.key !== undefined && input.key !== null) {
      checkKey(input.key)
      activity.key = input.key
    }
    if (input.name !== undefined && input.name !== null) activity.name = input.name
    if (input.summary !== undefined && input.summary !== null) activity.summary = input.summary
    if (input.ordering !== undefined && input.ordering !== null) activity.ordering = input.ordering
    if (input.contactId !== undefined) {
      activity.contact = (await contactOf(context, input.contactId)) ?? undefined
    }
    if (input.description !== undefined && input.description !== null) {
      activity.description = await db.document.ensureDocument(
        activity.description ?? null,
        input.description,
      )
    }

    await flushOrExplainKey(context, activity.key)
    return activity
  },

  deleteVolunteerActivity: async (_, { id }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)

    const activity = await activityOf(context, id)
    const bookings = await db.em.count(VolunteerBooking, { period: { activity } })
    if (bookings) {
      throw new BadRequestError(
        `Für diese Tätigkeit sind ${bookings} Schichten eingetragen. Sie müssen erst abgesagt werden.`,
      )
    }

    await db.em.remove(activity).flush()
    return true
  },

  // @ts-expect-error ts2345
  createVolunteerPeriod: async (_, { input }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)
    checkPeriod(input)

    const activity = await activityOf(context, input.activityId)
    const period = db.em.create(VolunteerPeriod, {
      activity,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      neededCount: input.neededCount ?? undefined,
      note: input.note ?? undefined,
    })

    await db.em.persist(period).flush()
    return period
  },

  // @ts-expect-error ts2345
  updateVolunteerPeriod: async (_, { id, input }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)
    checkPeriod(input)

    const period = await periodOf(context, id)
    if (input.startTime !== undefined && input.startTime !== null)
      period.startTime = input.startTime
    if (input.durationMinutes !== undefined && input.durationMinutes !== null) {
      period.durationMinutes = input.durationMinutes
    }
    if (input.neededCount !== undefined) period.neededCount = input.neededCount ?? undefined
    if (input.note !== undefined) period.note = input.note ?? undefined

    await db.em.flush()
    return period
  },

  deleteVolunteerPeriod: async (_, { id }, context) => {
    const { db, user, exhibition } = context
    requireNotFrozen(exhibition)
    requireAdmin(user, exhibition)

    const period = await periodOf(context, id)
    const bookings = await db.em.count(VolunteerBooking, { period })
    if (bookings) {
      throw new BadRequestError(
        `In diesem Zeitraum sind ${bookings} Schichten eingetragen. Sie müssen erst abgesagt werden.`,
      )
    }

    await db.em.remove(period).flush()
    return true
  },
}

export const volunteerResolvers = {
  Query: volunteerQueries,
  Mutation: volunteerMutations,
  VolunteerActivity: volunteerActivityTypeResolvers,
  VolunteerPeriod: volunteerPeriodTypeResolvers,
  VolunteerBooking: volunteerBookingTypeResolvers,
}
