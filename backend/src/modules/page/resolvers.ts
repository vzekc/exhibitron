import { Context } from '../../app/context.js'
import { MutationResolvers, QueryResolvers, PageResolvers } from '../../generated/graphql.js'
import { requireAdmin } from '../../db.js'
import { wrap } from '@mikro-orm/core'
import { Page } from './entity.js'

export const pageQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getPage: async (_, { key }, { db, exhibition }) => db.page.findOne({ exhibition, key }),
}

export const pageMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createPage: async (_, { key, title, html }, { db, user, exhibition }) => {
    requireAdmin(user)
    const page = db.page.create({
      exhibition,
      key,
      title,
    })

    if (html) {
      // Create Document entity with HTML
      page.content = await db.document.ensureDocument(null, html)
    }

    await db.em.persistAndFlush(page)
    return page
  },
  // @ts-expect-error ts2345
  updatePage: async (_, { id, key, title, html }, { db, user }) => {
    requireAdmin(user)
    const page = await db.page.findOneOrFail({ id })

    if (html) {
      page.content = await db.document.ensureDocument(page.content, html)
    }

    wrap(page).assign({ key, title })
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

export const pageTypeResolvers: PageResolvers<Context> = {
  html: (page) => {
    // Use the Page entity type to properly access the content property
    const pageEntity = page as unknown as Page

    // Return HTML content from Document entity if it exists, otherwise return null/empty string
    return pageEntity.content?.html ?? ''
  },
}

export const pageResolvers = {
  Query: pageQueries,
  Mutation: pageMutations,
  Page: pageTypeResolvers,
}
