import { Context } from '../../app/context.js'
import {
  ExhibitAttributeResolvers,
  MutationResolvers,
  QueryResolvers,
} from '../../generated/graphql.js'
import { ExhibitAttribute } from './entity.js'
import { requireGlobalAdmin } from '../../db.js'
import { QueryOrder } from '@mikro-orm/core'
import { BadRequestError } from '../common/errors.js'

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
  // @ts-expect-error ts2345
  renameExhibitAttribute: async (_, { id, name }, { db, user }) => {
    requireGlobalAdmin(user)
    const trimmed = name.trim()
    if (!trimmed) {
      throw new BadRequestError('Der Name darf nicht leer sein')
    }
    const attribute = await db.exhibitAttribute.findOneOrFail({ id })
    if (attribute.name === trimmed) return attribute
    return db.exhibitAttribute.rename(attribute, trimmed)
  },
  deleteExhibitAttribute: async (_, { id }, { db, user }) => {
    requireGlobalAdmin(user)
    const attribute = await db.exhibitAttribute.findOneOrFail({ id })
    const count = await db.exhibitAttribute.countExhibits(attribute.name)
    if (count > 0) {
      throw new BadRequestError(
        `„${attribute.name}“ steht noch auf dem Datenblatt von ${count} Exponat${count === 1 ? '' : 'en'} und kann nicht gelöscht werden`,
      )
    }
    await db.em.removeAndFlush(attribute)
    return true
  },
}

export const exhibitAttributeTypeResolvers: ExhibitAttributeResolvers<Context> = {
  exhibitCount: async (attribute, _args, { db }) =>
    db.exhibitAttribute.countExhibits(attribute.name),
}

export const exhibitAttributeResolvers = {
  Query: exhibitAttributeQueries,
  Mutation: exhibitAttributeMutations,
  ExhibitAttribute: exhibitAttributeTypeResolvers,
}
