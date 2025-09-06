import { Context } from '../../app/context.js'
import {
  MutationResolvers,
  QueryResolvers,
  RegistrationResolvers,
  RegistrationStatus,
} from '../../generated/graphql.js'
import { requireAdmin } from '../../db.js'
import { wrap } from '@mikro-orm/core'

export const registrationQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2322
  getRegistration: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    return db.registration.findOneOrFail({ id })
  },
  // @ts-expect-error ts2322
  getRegistrations: async (_, _args, { db, user }) => {
    requireAdmin(user)
    return db.registration.findAll()
  },
  isRegistered: async (_, { email }, { db, exhibition }) => {
    const registration = await db.registration.findOne({ email, exhibition })
    return !!registration
  },
}

export const registrationMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2322
  register: async (_, { input }, { exhibition, db }) => {
    const { email, message, ...rest } = input
    const existing = await db.registration.findOne({
      email: email,
      exhibition,
    })
    if (existing) {
      throw new Error('The email address is already registered')
    }
    return await db.registration.register({
      exhibition,
      status: RegistrationStatus.New,
      message: message || undefined,
      email,
      ...rest,
    })
  },
  // @ts-expect-error ts2322
  updateRegistrationNotes: async (_, { id, notes }, { db, user }) => {
    requireAdmin(user)
    const registration = await db.registration.findOneOrFail({ id })
    wrap(registration).assign({ notes })
    return registration
  },
  approveRegistration: async (_, { id, siteUrl, message }, { db, user }) => {
    requireAdmin(user)
    const registration = await db.registration.findOneOrFail({ id })
    await db.registration.approve(registration, siteUrl, message)
    return true
  },
  rejectRegistration: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    const registration = await db.registration.findOneOrFail({ id })
    await db.registration.reject(registration)
    return true
  },
  deleteRegistration: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    const registration = await db.registration.findOneOrFail({ id })
    if (registration.status === RegistrationStatus.Approved) {
      throw new Error('Cannot delete approved registration')
    }
    db.em.remove(registration)
    return true
  },
  setRegistrationInProgress: async (_, { id }, { db }) => {
    const registration = await db.registration.findOneOrFail({ id })
    await db.registration.inProgress(registration)
    return true
  },
}

export const registrationTypeResolvers: RegistrationResolvers = {
  status: (registration) => registration.status,
  isLoggedIn: async (registration, _, { db }) => {
    // Find user by email
    const user = await db.user.findOne({ email: registration.email })
    if (!user) {
      return false
    }
    // Check if user has no password reset token (meaning they've completed setup)
    return !user.passwordResetToken
  },
  tables: async (registration, _, { db, exhibition }) => {
    // Find user by email
    const user = await db.user.findOne({ email: registration.email })
    if (!user) {
      return []
    }
    // Find exhibitor for this user and exhibition
    const exhibitor = await db.exhibitor.findOne({
      user,
      exhibition,
    })
    if (!exhibitor) {
      return []
    }
    // Get tables for this exhibitor
    return db.table.find({ exhibitor })
  },
}

export const registrationResolvers = {
  Query: registrationQueries,
  Mutation: registrationMutations,
  Registration: registrationTypeResolvers,
}
