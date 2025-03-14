import { GraphQLJSON } from 'graphql-type-json'
import {
  ExhibitionResolvers,
  ExhibitorResolvers,
  ExhibitResolvers,
  MutationResolvers,
  QueryResolvers,
  RegistrationResolvers,
  RegistrationStatus,
  TableResolvers,
  UserResolvers,
} from './generated/graphql.js'
import { Context } from './app/context.js'
import { wrap } from '@mikro-orm/core'
import { GraphQLError } from 'graphql/error/index.js'
import { requireAdmin } from './db.js'
import { Exhibit } from './entities.js'
import DOMPurify from 'isomorphic-dompurify'
import GraphQLDate from './modules/common/GraphQLDate.js'

const queryResolvers: QueryResolvers<Context> = {
  getUser: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    return db.user.findOneOrFail({ id })
  },
  getUsers: async (_, _args, { db, user }) => {
    requireAdmin(user)
    return db.user.findAll()
  },
  getCurrentUser: async (_, _args, { user }) => user,
  getUserByEmail: async (_, { email }, { db }) =>
    db.user.findOneOrFail({ email }),
  // @ts-expect-error ts2345
  getTable: async (_, { number }, { db }) => db.table.findOneOrFail({ number }),
  // @ts-expect-error ts2345
  getTables: async (_, _args, { db }) => db.table.findAll(),
  // @ts-expect-error ts2345
  getCurrentExhibitor: async (_, _args, { exhibitor }) => exhibitor,
  // @ts-expect-error ts2345
  getExhibitor: async (_, { id }, { db }) => db.exhibitor.findOneOrFail({ id }),
  // @ts-expect-error ts2345
  getExhibit: async (_, { id }, { db }) => db.exhibit.findOneOrFail({ id }),
  // @ts-expect-error ts2345
  getExhibits: async (_, _args, { db }) => db.exhibit.findAll(),
  // @ts-expect-error ts2345
  getExhibition: async (_, { id }, { db }) =>
    db.exhibition.findOneOrFail(
      { id },
      { populate: ['exhibits', 'exhibitors', 'tables'] },
    ),
  // @ts-expect-error ts2345
  getCurrentExhibition: async (_, _args, { exhibition }) => exhibition,
  // @ts-expect-error ts2345
  getExhibitions: async (_, _args, { db }) => db.exhibition.findAll(),
  getRegistration: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    return db.registration.findOneOrFail({ id })
  },
  getRegistrations: async (_, _args, { db, user }) => {
    requireAdmin(user)
    return db.registration.findAll()
  },
  getPage: async (_, { key }, { db, exhibition }) =>
    db.page.findOne({ exhibition, key }),
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
  logout: async (_, _args, { session }) => {
    session.userId = undefined
    return true
  },
  requestPasswordReset: async (_, { email, resetUrl }, { db }) => {
    await db.user.requestPasswordReset(email, resetUrl)
    return true
  },
  resetPassword: async (_, { token, password }, { db }) => {
    await db.user.resetPassword(token, password)
    return true
  },
  updateUserProfile: async (_, { input }, { user }) => {
    if (!user) {
      throw new Error('You must be logged in to update your profile')
    }
    wrap(user).assign(input)
    return user
  },
  // @ts-expect-error ts2345
  claimTable: async (_, { number }, { db, exhibitor }) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to claim a table')
    }
    return await db.table.claim(number, exhibitor)
  },
  // @ts-expect-error ts2345
  releaseTable: async (_, { number }, { db, exhibitor, user }) => {
    return await db.table.release(
      number,
      user?.isAdministrator ? null : exhibitor,
    )
  },
  // @ts-expect-error ts2345
  assignTable: async (_, { number, exhibitorId }, { db, exhibition }) => {
    const exhibitor = await db.exhibitor.findOneOrFail({ id: exhibitorId })
    const table = await db.table.findOneOrFail({ exhibition, number })
    table.exhibitor = exhibitor
    return table
  },
  // @ts-expect-error ts2345
  createExhibit: async (
    _,
    { title, text, table },
    { exhibition, exhibitor, db },
  ) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to create an exhibit')
    }
    const exhibit = db.em.getRepository(Exhibit).create({
      exhibition,
      title,
      text: DOMPurify.sanitize(text || ''),
      table,
      exhibitor,
    })
    await db.em.persist(exhibit).flush()
    return exhibit
  },
  // @ts-expect-error ts2345
  updateExhibit: async (_, { id, text, ...rest }, { db, exhibitor, user }) => {
    const exhibit = await db.exhibit.findOneOrFail({ id })
    if (exhibitor !== exhibit.exhibitor && !user?.isAdministrator) {
      throw new Error('You do not have permission to update this exhibit')
    }
    let table = exhibit.table || null
    if ('table' in rest) {
      table = rest.table
        ? await db.table.findOneOrFail({
            exhibition: exhibit.exhibition,
            number: rest.table,
          })
        : null
    }
    if (text) {
      text = DOMPurify.sanitize(text)
    }
    return wrap(exhibit).assign({ table, text, ...rest })
  },
  register: async (_, { input }, { exhibition, db }) => {
    const { email, message, ...rest } = input
    const existing = await db.registration.findOne({
      email: email,
      exhibition,
    })
    if (existing) {
      throw new GraphQLError('The email address is already registered', {
        extensions: { code: 'EMAIL_ADDRESS_IS_ALREADY_REGISTERED' },
      })
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
  // page resolvers
  createPage: async (_, { key, title, text }, { db, user, exhibition }) => {
    requireAdmin(user)
    const page = db.page.create({
      exhibition,
      key,
      title,
      text: DOMPurify.sanitize(text),
    })
    await db.em.persistAndFlush(page)
    return page
  },
  updatePage: async (_, { id, key, title, text }, { db, user }) => {
    requireAdmin(user)
    const page = await db.page.findOneOrFail({ id })
    if (text) {
      text = DOMPurify.sanitize(text)
    }
    wrap(page).assign({ key, title, text })
    await db.em.persistAndFlush(page)
    return page
  },
  deletePage: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    const page = await db.page.findOneOrFail({ id })
    await db.em.removeAndFlush(page)
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
  exhibits: async (table, _, { db }) => db.exhibit.find({ table: table }),
}

const exhibitorResolvers: ExhibitorResolvers = {
  user: async (exhibitor, _, { db }) =>
    db.user.findOneOrFail({ id: exhibitor.user.id }),
  exhibits: async (exhibitor, _, { db }) =>
    db.exhibit.find({
      exhibitor,
    }),
  tables: async (exhibitor, _, { db }) => db.table.find({ exhibitor }),
}

const exhibitResolvers: ExhibitResolvers = {
  exhibitor: async (exhibit, _, { db }) =>
    db.exhibitor.findOneOrFail({ id: exhibit.exhibitor.id }),
  table: async (exhibit, _, { db }) =>
    exhibit.table ? db.table.findOneOrFail({ id: exhibit.table.id }) : null,
}

const exhibitionResolvers: ExhibitionResolvers = {
  exhibitors: async (exhibition, _, { db }) =>
    db.exhibitor.find({ exhibition }),
  exhibits: async (exhibition, _, { db }) => db.exhibit.find({ exhibition }),
  tables: async (exhibition, _, { db }) => db.table.find({ exhibition }),
  pages: async (exhibition, _, { db }) => db.page.find({ exhibition }),
}

const registrationResolvers: RegistrationResolvers = {
  status: (registration) => {
    return registration.status
  },
}

const resolvers = {
  JSON: GraphQLJSON,
  Date: GraphQLDate,
  Query: queryResolvers,
  Mutation: mutationResolvers,
  User: userResolvers,
  Table: tableResolvers,
  Exhibitor: exhibitorResolvers,
  Exhibit: exhibitResolvers,
  Exhibition: exhibitionResolvers,
  Registration: registrationResolvers,
}

export default resolvers
