import { Context } from '../../app/context.js'
import {
  ExhibitAttributeResolvers,
  MutationResolvers,
  QueryResolvers,
} from '../../generated/graphql.js'
import { ExhibitAttribute } from './entity.js'
import { requireGlobalAdmin } from '../../db.js'
import { QueryOrder } from '@mikro-orm/core'

export const exhibitAttributeQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getExhibitAttributes: async (_, _args, { db }) =>
    db.exhibitAttribute.findAll({ orderBy: { createdAt: QueryOrder.ASC } }),
  // @ts-expect-error ts2345
  getExhibitAttribute: async (_, { id }, { db }) => db.exhibitAttribute.findOne({ id }),
}

export const exhibitAttributeMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createExhibitAttribute: async (_, { name }, { db, exhibitor }) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to create an attribute')
    }
    const attribute = db.em.create(ExhibitAttribute, { name })
    await db.em.persistAndFlush(attribute)
    return attribute
  },
  deleteExhibitAttribute: async (_, { id }, { db, user }) => {
    requireGlobalAdmin(user)
    const attribute = await db.exhibitAttribute.findOneOrFail({ id })
    await db.em.removeAndFlush(attribute)
    return true
  },
}

export const exhibitAttributeTypeResolvers: ExhibitAttributeResolvers = {}

export const exhibitAttributeResolvers = {
  Query: exhibitAttributeQueries,
  Mutation: exhibitAttributeMutations,
  ExhibitAttribute: exhibitAttributeTypeResolvers,
}
