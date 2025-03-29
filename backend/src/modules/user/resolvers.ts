import { GraphQLError } from 'graphql'
import { Context } from '../../app/context.js'
import { MutationResolvers, QueryResolvers, UserResolvers } from '../../generated/graphql.js'
import { requireAdmin } from '../../db.js'
import { wrap } from '@mikro-orm/core'
import { ProfileImage } from './entity.js'

export const userQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2322
  getUser: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    return db.user.findOneOrFail({ id })
  },
  // @ts-expect-error ts2322
  getUsers: async (_, _args, { db, user }) => {
    requireAdmin(user)
    return db.user.findAll()
  },
  // @ts-expect-error ts2322
  getCurrentUser: async (_, _args, { user }) => user,
  // @ts-expect-error ts2322
  getUserByEmail: async (_, { email }, { db }) => db.user.findOneOrFail({ email }),
  getTokenEmail: async (_, { token }, { db }) => {
    const userWithToken = await db.user.findOne({ passwordResetToken: token })
    return userWithToken?.email || null
  },
  isForumUser: async (_, { email }, { db }) => {
    const user = await db.user.findOne({ email })
    return !!user?.nickname
  },
}

export const userMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2322
  login: async (_, { email, password }, { db, session }) => {
    const user = await db.user.login(email, password)
    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 1000))

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
  // @ts-expect-error ts2322
  updateUserProfile: async (_, { input }, { user }) => {
    if (!user) {
      throw new Error('You must be logged in to update your profile')
    }
    wrap(user).assign(input)
    return user
  },
}

export const userTypeResolvers: UserResolvers = {
  contacts: async (user) => user.contacts || {},
  profileImage: (exhibit) => {
    if (!exhibit.profileImage) return null

    const image = exhibit.profileImage as unknown as ProfileImage
    return image.id
  },
}

export const userResolvers = {
  Query: userQueries,
  Mutation: userMutations,
  User: userTypeResolvers,
}
