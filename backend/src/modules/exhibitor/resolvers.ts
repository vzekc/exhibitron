import { Context } from '../../app/context.js'
import { ExhibitorResolvers, MutationResolvers, QueryResolvers } from '../../generated/graphql.js'
import { QueryOrder, wrap } from '@mikro-orm/core'

export const exhibitorQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getCurrentExhibitor: async (_, _args, { exhibitor }) => exhibitor,
  // @ts-expect-error ts2345
  getExhibitor: async (_, { id }, { db }) => db.exhibitor.findOneOrFail({ id }),
}

export const exhibitorMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  updateExhibitor: async (_, { id, ...props }, { db, user }) => {
    const exhibitor = await db.exhibitor.findOneOrFail({ id })
    if (exhibitor.user !== user && !user?.isAdministrator) {
      throw new Error('You do not have permission to update this exhibitor')
    }

    const updatedExhibitor = wrap(exhibitor).assign(props)
    await db.em.persist(updatedExhibitor).flush()
    return updatedExhibitor
  },
}

export const exhibitorTypeResolvers: ExhibitorResolvers = {
  user: async (exhibitor, _, { db }) => db.user.findOneOrFail({ id: exhibitor.user.id }),
  exhibits: async (exhibitor, _, { db }) =>
    db.exhibit.find({ exhibitor }, { orderBy: { title: QueryOrder.ASC } }),
  tables: async (exhibitor, _, { db }) => db.table.find({ exhibitor }),
}

export const exhibitorResolvers = {
  Mutation: exhibitorMutations,
  Query: exhibitorQueries,
  Exhibitor: exhibitorTypeResolvers,
}
