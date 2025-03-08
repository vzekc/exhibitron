import { GraphQLJSON } from 'graphql-type-json'
import { RegistrationStatus } from './generated/graphql.js'

import {
  QueryResolvers,
  MutationResolvers,
  UserResolvers,
  TableResolvers,
  ExhibitorResolvers,
  ExhibitResolvers,
  RegistrationResolvers,
} from './generated/graphql.js'
import { Context } from './app/context.js'
import { wrap } from '@mikro-orm/core'
import { GraphQLError } from 'graphql/error/index.js'

const queryResolvers: QueryResolvers<Context> = {
  getUser: async (_, { id }, { db }) => db.user.findOneOrFail({ id }),
  getUsers: async (_, _args, { db }) => db.user.findAll(),
  getCurrentUser: async (_, _args, { user }) => user,
  getUserByEmail: async (_, { email }, { db }) =>
    db.user.findOneOrFail({ email }),
  getTable: async (_, { number }, { db }) => db.table.findOneOrFail({ number }),
  getTables: async (_, _args, { db }) => db.table.findAll(),
  getExhibitor: async (_, { id }, { db }) =>
    await db.exhibitor.findOneOrFail({ id }),
  getExhibitors: async (_, _args, { db }) => db.exhibitor.findAll(),
  getExhibit: async (_, { id }, { db }) => db.exhibit.findOneOrFail({ id }),
  getExhibits: async (_, _args, { db }) => db.exhibit.findAll(),
  getExhibition: async (_, { id }, { db }) =>
    db.exhibition.findOneOrFail({ id }),
  getExhibitions: async (_, _args, { db }) => db.exhibition.findAll(),
  getRegistration: async (_, { id }, { db }) =>
    db.registration.findOneOrFail({ id }),
  getRegistrations: async (_, _args, { db }) => db.registration.findAll(),
}

const mutationResolvers: MutationResolvers<Context> = {
  login: async (_, { email, password }, { db, session }) => {
    const user = await db.user.login(email, password)
    if (!user) {
      throw new GraphQLError('Invalid email address or password', {
        extensions: {
          code: 'UNAUTHENTICATED',
          http: { status: 401 },
        },
      })
    }
    session.userId = user.id
    return user
  },
  requestPasswordReset: async (_, { email, resetUrl }, { db }) => {
    await db.user.requestPasswordReset(email, resetUrl)
    return true
  },
  resetPassword: async (_, { token, password }, { db }) => {
    await db.user.resetPassword(token, password)
    return true
  },
  updateUserProfile: async (_, { input }, { user, db }) => {
    if (!user) {
      throw new Error('You must be logged in to update your profile')
    }
    wrap(user).assign(input)
    return user
  },
  claimTable: async (_, { number }, { db, exhibitor, user }) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to claim a table')
    }
    return await db.table.claim(number, exhibitor)
  },
  releaseTable: async (_, { number }, { db, exhibitor, user }) => {
    await db.table.release(number, user?.isAdministrator ? null : exhibitor)
  },
  assignTable: async (_, { number, exhibitorId }, { db, exhibition }) => {
    const exhibitor = await db.exhibitor.findOneOrFail({ id: exhibitorId })
    const table = await db.table.findOneOrFail({ exhibition, number })
    table.exhibitor = exhibitor
    return table
  },
  createExhibit: async (
    _,
    { title, text, table },
    { exhibition, exhibitor, db },
  ) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to create an exhibit')
    }
    return db.exhibit.create({
      exhibition,
      title,
      text,
      table,
      exhibitor,
    })
  },
  updateExhibit: async (_, { id, title, text, table }, { db }) => {
    const exhibit = await db.exhibit.findOneOrFail({ id })
    return wrap(exhibit).assign({ title, text, table })
  },
  createRegistration: async (
    _,
    { name, email, nickname, topic, message, data },
    { exhibition, db },
  ) =>
    db.registration.create({
      status: RegistrationStatus.New,
      exhibition,
      name,
      email,
      nickname,
      topic,
      message,
      data,
    }),
  updateRegistration: async (_, { id, status, notes }, { db }) => {
    const registration = await db.registration.findOneOrFail({ id })
    wrap(registration).assign({ status, notes })
    return registration
  },
  approveRegistration: async (_, { id, siteUrl }, { db }) => {
    const registration = await db.registration.findOneOrFail({ id })
    await db.registration.approve(registration, siteUrl)
    return true
  },
  rejectRegistration: async (_, { id }, { db }) => {
    const registration = await db.registration.findOneOrFail({ id })
    await db.registration.reject(registration)
    return true
  },
  deleteRegistration: async (_, { id }, { db }) => {
    const registration = await db.registration.findOneOrFail({ id })
    db.em.remove(registration)
    return true
  },
}

const userResolvers: UserResolvers = {
  contacts: async (user) => user.contacts || {},
}

const tableResolvers: TableResolvers = {
  exhibitor: async (table, _, { db }) =>
    table.exhibitor
      ? db.exhibitor.findOneOrFail({ id: table.exhibitor.id })
      : null,
}

const exhibitorResolvers: ExhibitorResolvers = {
  user: async (exhibitor, _, { db }) =>
    db.user.findOneOrFail({ id: exhibitor.user.id }),
  exhibits: async (exhibitor) => exhibitor.exhibits || [],
  tables: async (exhibitor) => exhibitor.tables || [],
}

const exhibitResolvers: ExhibitResolvers = {
  exhibitor: async (exhibit) => {
    return exhibit.exhibitor
  },
}

const registrationResolvers: RegistrationResolvers = {
  status: (registration) => {
    return registration.status
  },
}

const resolvers = {
  JSON: GraphQLJSON,
  Query: queryResolvers,
  Mutation: mutationResolvers,
  User: userResolvers,
  Table: tableResolvers,
  Exhibitor: exhibitorResolvers,
  Exhibit: exhibitResolvers,
  Registration: registrationResolvers,
}

export default resolvers
