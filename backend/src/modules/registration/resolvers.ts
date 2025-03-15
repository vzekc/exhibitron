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
  getRegistration: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    return db.registration.findOneOrFail({ id })
  },
  getRegistrations: async (_, _args, { db, user }) => {
    requireAdmin(user)
    return db.registration.findAll()
  },
}

export const registrationMutations: MutationResolvers<Context> = {
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
  updateRegistrationNotes: async (_, { id, notes }, { db, user }) => {
    requireAdmin(user)
    const registration = await db.registration.findOneOrFail({ id })
    wrap(registration).assign({ notes })
    return registration
  },
  approveRegistration: async (_, { id, siteUrl }, { db, user }) => {
    requireAdmin(user)
    const registration = await db.registration.findOneOrFail({ id })
    await db.registration.approve(registration, siteUrl)
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
}

export const registrationResolvers = {
  Query: registrationQueries,
  Mutation: registrationMutations,
  Registration: registrationTypeResolvers,
}
