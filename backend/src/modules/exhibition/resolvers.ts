import { Context } from '../../app/context.js'
import { ExhibitionResolvers, QueryResolvers } from '../../generated/graphql.js'
import { QueryOrder } from '@mikro-orm/core'
import { Exhibit } from '../exhibit/entity.js'

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
  exhibits: async (exhibition, _, { db }) =>
    db.exhibit
      .find({ exhibition }, { orderBy: { title: QueryOrder.ASC } })
      .then((exhibits: Exhibit[]) =>
        exhibits.sort((a: Exhibit, b: Exhibit) =>
          a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
        ),
      ),
  tables: async (exhibition, _, { db }) => db.table.find({ exhibition }),
  pages: async (exhibition, _, { db }) => db.page.find({ exhibition }),
  hosts: async (exhibition, _, { db }) => db.host.find({ exhibition }),
  isClientInLan: (_1, _2, { isClientInLan }) => isClientInLan,
}

export const exhibitionResolvers = {
  Query: exhibitionQueries,
  Exhibition: exhibitionTypeResolvers,
}
