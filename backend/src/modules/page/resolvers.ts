import { Context } from '../../app/context.js'
import { MutationResolvers, QueryResolvers, PageResolvers } from '../../generated/graphql.js'
import { requireAdmin } from '../../db.js'
import { wrap } from '@mikro-orm/core'
import { Document } from '../document/entity.js'
import { Page } from './entity.js'

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
      text: '', // Keep for backward compatibility
    })

    if (text) {
      // Create Document entity with HTML
      page.content = db.em.create(Document, { html: text })

      // Process the HTML content explicitly
      await db.document.processHtmlContent(page.content)

      // Keep text in sync for backward compatibility
      page.text = text
    }

    await db.em.persistAndFlush(page)
    return page
  },
  updatePage: async (_, { id, key, title, text }, { db, user }) => {
    requireAdmin(user)
    const page = await db.page.findOneOrFail({ id })

    if (text) {
      // Create or update Document entity
      if (!page.content) {
        page.content = db.em.create(Document, { html: text })
      } else {
        page.content.html = text
      }

      // Process the HTML content explicitly
      await db.document.processHtmlContent(page.content)

      // Keep text in sync for backward compatibility
      page.text = text
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
  text: (page) => {
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
