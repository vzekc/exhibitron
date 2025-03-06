import { GraphQLJSON } from 'graphql-type-json'
import { RegistrationStatus } from './generated/graphql.js'
import * as DB from './entities.js'

import {
  QueryResolvers,
  MutationResolvers,
  UserResolvers,
  TableResolvers,
  ExhibitorResolvers,
  ExhibitResolvers,
  RegistrationResolvers,
  Exhibit,
  User,
  Exhibitor,
  Table,
} from './generated/graphql.js'
import { wrap } from '@mikro-orm/core'
import { Context } from './app/context.js'

const transformTable = (table: DB.Table): Table => ({
  id: table.id,
  number: table.number,
  exhibitor: table.exhibitor ? transformExhibitor(table.exhibitor) : null,
})

const transformExhibitor = (exhibitor: DB.Exhibitor): Exhibitor => ({
  id: exhibitor.id,
  user: transformUser(exhibitor.user),
  tables: exhibitor.tables.map(transformTable),
})

const transformExhibit = (exhibit: DB.Exhibit): Exhibit => ({
  id: exhibit.id,
  title: exhibit.title,
  text: exhibit.text,
  table: exhibit.table ? transformTable(exhibit.table) : null,
  exhibitor: transformExhibitor(exhibit.exhibitor),
})

const transformExhibition = (exhibition: DB.Exhibition) =>
  wrap(exhibition).toJSON()

const transformUser = (user: DB.User): User => wrap(user).toJSON()

const transformRegistration = (registration: DB.Registration) =>
  wrap(registration).toJSON()

const queryResolvers: QueryResolvers<Context> = {
  getUser: async (_, { id }, { db }) => db.user.findOneOrFail({ id }),
  getUsers: async (_, _args, { db }) => db.user.findAll(),
  getTable: async (_, { number }, { db }) =>
    transformTable(await db.table.findOneOrFail({ number })),
  getTables: async (_, _args, { db }) => {
    const tables = await db.table.findAll()
    return tables.map(transformTable)
  },
  getExhibitor: async (_, { id }, { db }) =>
    transformExhibitor(await db.exhibitor.findOneOrFail({ id })),
  getExhibitors: async (_, _args, { db }) => {
    const exhibitors = await db.exhibitor.findAll()
    return exhibitors.map(transformExhibitor)
  },
  getExhibit: async (_, { id }, { db }) =>
    transformExhibit(await db.exhibit.findOneOrFail({ id })),
  getExhibits: async (_, _args, { db }) => {
    const exhibits = await db.exhibit.findAll()
    return exhibits.map(transformExhibit)
  },
  getExhibition: async (_, { id }, { db }) =>
    transformExhibition(await db.exhibition.findOneOrFail({ id })),
  getExhibitions: async (_, _args, { db }) => {
    const exhibitions = await db.exhibition.findAll()
    return exhibitions.map(transformExhibition)
  },
  getRegistration: async (_, { id }, { db }) =>
    transformRegistration(await db.registration.findOneOrFail({ id })),
  getRegistrations: async (_, _args, { db }) => {
    const registrations = await db.registration.findAll()
    return registrations.map((registration) => wrap(registration).toJSON())
  },
}

const mutationResolvers: MutationResolvers<Context> = {
  login: async (_, { email, password }, { db }) => {
    const user = await db.user.login(email, password)
    return wrap(user).toJSON()
  },
  requestPasswordReset: async (_, { email, resetUrl }, { db }) => {
    await db.user.requestPasswordReset(email, resetUrl)
    return true
  },
  resetPassword: async (_, { token, password }, { db }) => {
    await db.user.resetPassword(token, password)
    return true
  },
  claimTable: async (_, { number }, { db, exhibitor }) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to claim a table')
    }
    const table = await db.table.claim(number, exhibitor)
    return transformTable(table)
  },
  releaseTable: async (_, { number }, { db, exhibitor }) => {
    const table = await db.table.release(number, exhibitor)
    return transformTable(table)
  },
  assignTable: async (_, { number, exhibitorId }, { db, exhibition }) => {
    const exhibitor = await db.exhibitor.findOneOrFail({ id: exhibitorId })
    const table = await db.table.findOneOrFail({ exhibition, number })
    table.exhibitor = exhibitor
    return transformTable(table)
  },
  createExhibit: async (
    _,
    { title, text, table },
    { exhibition, exhibitor, db },
  ) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to create an exhibit')
    }
    const exhibit = db.exhibit.create({
      exhibition,
      title,
      text,
      table,
      exhibitor,
    })
    return transformExhibit(exhibit)
  },
  updateExhibit: async (_, { id, title, text, table }, { db }) => {
    const exhibit = await db.exhibit.findOneOrFail({ id })
    wrap(exhibit).assign({ title, text, table })
    return transformExhibit(exhibit)
  },
  createRegistration: async (
    _,
    { name, email, nickname, topic, message, data },
    { exhibition, db },
  ) => {
    const registration = db.registration.create({
      status: RegistrationStatus.New,
      exhibition,
      name,
      email,
      nickname,
      topic,
      message,
      data,
    })
    return wrap(registration).toJSON()
  },
  updateRegistration: async (_, { id, status, notes }, { db }) => {
    const registration = await db.registration.findOneOrFail({ id })
    wrap(registration).assign({ status, notes })
    return wrap(registration).toJSON()
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
  exhibitor: async (table) =>
    table.exhibitor ? wrap(table.exhibitor).toJSON() : null,
}

const exhibitorResolvers: ExhibitorResolvers = {
  user: async (exhibitor) => wrap(exhibitor.user).toJSON(),
  exhibits: async (exhibitor) => exhibitor.exhibits || [],
  tables: async (exhibitor) => exhibitor.tables || [],
}

const exhibitResolvers: ExhibitResolvers = {
  table: async (exhibit) =>
    exhibit.table ? wrap(exhibit.table).toJSON() : null,
  exhibitor: async (exhibit) => wrap(exhibit.exhibitor).toJSON(),
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
