import { Context } from '../../app/context.js'
import { ExhibitorResolvers, QueryResolvers } from '../../generated/graphql.js'

export const exhibitorQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getCurrentExhibitor: async (_, _args, { exhibitor }) => exhibitor,
  // @ts-expect-error ts2345
  getExhibitor: async (_, { id }, { db }) => db.exhibitor.findOneOrFail({ id }),
}

export const exhibitorTypeResolvers: ExhibitorResolvers = {
  user: async (exhibitor, _, { db }) => db.user.findOneOrFail({ id: exhibitor.user.id }),
  exhibits: async (exhibitor, _, { db }) =>
    db.exhibit.find({
      exhibitor,
    }),
  tables: async (exhibitor, _, { db }) => db.table.find({ exhibitor }),
}

export const exhibitorResolvers = {
  Query: exhibitorQueries,
  Exhibitor: exhibitorTypeResolvers,
}
