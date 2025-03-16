import { Context } from '../../app/context.js'
import { AttributeResolvers, MutationResolvers, QueryResolvers } from '../../generated/graphql.js'
import { Attribute } from './entity.js'
import { requireAdmin } from '../../db.js'

export const attributeQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getAttributes: async (_, _args, { db }) => db.attribute.findAll(),
  // @ts-expect-error ts2345
  getAttribute: async (_, { id }, { db }) => db.attribute.findOne({ id }),
}

export const attributeMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createAttribute: async (_, { name }, { db, exhibitor }) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to create an attribute')
    }
    const attribute = db.em.create(Attribute, { name })
    await db.em.persistAndFlush(attribute)
    return attribute
  },
  deleteAttribute: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    const attribute = await db.attribute.findOneOrFail({ id })
    await db.em.removeAndFlush(attribute)
    return true
  },
}

export const attributeTypeResolvers: AttributeResolvers = {}

export const attributeResolvers = {
  Query: attributeQueries,
  Mutation: attributeMutations,
  Attribute: attributeTypeResolvers,
}
