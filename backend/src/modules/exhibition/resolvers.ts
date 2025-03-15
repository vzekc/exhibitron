import { Context } from '../../app/context.js'
import { ExhibitionResolvers, QueryResolvers } from '../../generated/graphql.js'

export const exhibitionQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getExhibition: async (_, { id }, { db }) =>
    db.exhibition.findOneOrFail({ id }, { populate: ['exhibits', 'exhibitors', 'tables'] }),
  // @ts-expect-error ts2345
  getCurrentExhibition: async (_, _args, { exhibition }) => exhibition,
  // @ts-expect-error ts2345
  getExhibitions: async (_, _args, { db }) => db.exhibition.findAll(),
}

export const exhibitionTypeResolvers: ExhibitionResolvers = {
  exhibitors: async (exhibition, _, { db }) => db.exhibitor.find({ exhibition }),
  exhibits: async (exhibition, _, { db }) => db.exhibit.find({ exhibition }),
  tables: async (exhibition, _, { db }) => db.table.find({ exhibition }),
  pages: async (exhibition, _, { db }) => db.page.find({ exhibition }),
}

export const exhibitionResolvers = {
  Query: exhibitionQueries,
  Exhibition: exhibitionTypeResolvers,
}
