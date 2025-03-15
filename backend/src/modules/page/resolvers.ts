import { Context } from '../../app/context.js'
import { MutationResolvers, QueryResolvers } from '../../generated/graphql.js'
import { requireAdmin } from '../../db.js'
import { processHtml } from '../common/htmlProcessor.js'
import { wrap } from '@mikro-orm/core'

export const pageQueries: QueryResolvers<Context> = {
  getPage: async (_, { key }, { db, exhibition }) => db.page.findOne({ exhibition, key }),
}

export const pageMutations: MutationResolvers<Context> = {
  createPage: async (_, { key, title, text }, { db, user, exhibition }) => {
    requireAdmin(user)
    const page = db.page.create({
      exhibition,
      key,
      title,
      text: '', // Will be set after processing
    })

    if (text) {
      const { sanitizedHtml, images } = await processHtml(text, db.em, { page })
      page.text = sanitizedHtml
      db.em.persist(images)
    }

    await db.em.persistAndFlush(page)
    return page
  },
  updatePage: async (_, { id, key, title, text }, { db, user }) => {
    requireAdmin(user)
    const page = await db.page.findOneOrFail({ id })

    let processedText = text
    if (text) {
      const { sanitizedHtml, images } = await processHtml(text, db.em, { page })
      processedText = sanitizedHtml
      db.em.persist(images)
    }

    wrap(page).assign({ key, title, text: processedText })
    await db.em.persistAndFlush(page)
    return page
  },
  deletePage: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    const page = await db.page.findOneOrFail({ id })
    await db.em.removeAndFlush(page)
    return true
  },
}

export const pageResolvers = {
  Query: pageQueries,
  Mutation: pageMutations,
}
