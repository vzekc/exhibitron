import { Context } from '../../app/context.js'
import {
  CoverageStatus,
  QueryResolvers,
  VolunteerActivityResolvers,
  VolunteerBookingResolvers,
  VolunteerPeriodResolvers,
} from '../../generated/graphql.js'
import { VolunteerActivity, VolunteerBooking, VolunteerPeriod } from './entity.js'
import { computeCoverage } from './coverage.js'

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

export const volunteerResolvers = {
  Query: volunteerQueries,
  VolunteerActivity: volunteerActivityTypeResolvers,
  VolunteerPeriod: volunteerPeriodTypeResolvers,
  VolunteerBooking: volunteerBookingTypeResolvers,
}
