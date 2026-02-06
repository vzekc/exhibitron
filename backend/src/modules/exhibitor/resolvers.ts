import { Context } from '../../app/context.js'
import { ExhibitorResolvers, MutationResolvers, QueryResolvers } from '../../generated/graphql.js'
import { QueryOrder, wrap } from '@mikro-orm/core'
import { GraphQLError } from 'graphql'
import { requireNotFrozen, isAdmin } from '../../db.js'

export const exhibitorQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getCurrentExhibitor: async (_, _args, { exhibitor }) => exhibitor,
  // @ts-expect-error ts2345
  getExhibitor: async (_, { id }, { db }) => db.exhibitor.findOneOrFail({ id }),
}

export const exhibitorMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  updateExhibitor: async (_, { id, ...props }, { db, user, exhibition }) => {
    requireNotFrozen(exhibition)
    const exhibitor = await db.exhibitor.findOneOrFail({ id })
    if (exhibitor.user !== user && !isAdmin(user, exhibition)) {
      throw new Error('You do not have permission to update this exhibitor')
    }

    const updatedExhibitor = wrap(exhibitor).assign(props)
    await db.em.persist(updatedExhibitor).flush()
    return updatedExhibitor
  },
  // @ts-expect-error ts2322
  switchExhibitor: async (_, { exhibitorId }, { session, db }) => {
    if (!session.canSwitchExhibitor) {
      throw new GraphQLError('You must be an administrator to use this feature', {
        extensions: {
          code: 'FORBIDDEN',
          http: { status: 403 },
        },
      })
    }
    const newExhibitor = await db.exhibitor.findOneOrFail({ id: exhibitorId })
    session.userId = newExhibitor.user.id
    // The session.canSwitchExhibitor is not set here, so that we can still switch back users
    return newExhibitor
  },
}

export const exhibitorTypeResolvers: ExhibitorResolvers = {
  user: async (exhibitor, _, { db }) => db.user.findOneOrFail({ id: exhibitor.user.id }),
  exhibits: async (exhibitor, _, { db }) =>
    db.exhibit.find({ exhibitor }, { orderBy: { title: QueryOrder.ASC } }),
  tables: async (exhibitor, _, { db }) => db.table.find({ exhibitor }),
  canSwitchExhibitor: async (exhibitor, _, { canSwitchExhibitor }) => !!canSwitchExhibitor,
}

export const exhibitorResolvers = {
  Mutation: exhibitorMutations,
  Query: exhibitorQueries,
  Exhibitor: exhibitorTypeResolvers,
}
