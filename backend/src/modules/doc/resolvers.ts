import { Context } from '../../app/context.js'
import { QueryResolvers } from '../../generated/graphql.js'
import { DocService } from './service.js'

const docService = new DocService()

export const docQueries: QueryResolvers<Context> = {
  doc: async (_, { name }) => {
    return docService.getDoc(name)
  },
}

export const docResolvers = {
  Query: docQueries,
}
