import { Context } from '../../app/context.js'
import { ExhibitResolvers, MutationResolvers, QueryResolvers } from '../../generated/graphql.js'
import { Exhibit } from '../../entities.js'
import { processHtml } from '../common/htmlProcessor.js'
import { wrap } from '@mikro-orm/core'

export const exhibitQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getExhibit: async (_, { id }, { db }) => db.exhibit.findOneOrFail({ id }),
  // @ts-expect-error ts2345
  getExhibits: async (_, _args, { db }) => db.exhibit.findAll(),
}

export const exhibitMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createExhibit: async (_, { title, text, table }, { exhibition, exhibitor, db }) => {
    if (!exhibitor) {
      throw new Error('You must be logged in to create an exhibit')
    }
    const exhibit = db.em.getRepository(Exhibit).create({
      exhibition,
      title,
      text: '', // Will be set after processing
      table,
      exhibitor,
    })

    if (text) {
      const { sanitizedHtml, images } = await processHtml(text, db.em, { exhibit })
      exhibit.text = sanitizedHtml
      db.em.persist(images)
    }

    await db.em.persist(exhibit).flush()
    return exhibit
  },
  // @ts-expect-error ts2345
  updateExhibit: async (_, { id, text, ...rest }, { db, exhibitor, user }) => {
    const exhibit = await db.exhibit.findOneOrFail({ id })
    if (exhibitor !== exhibit.exhibitor && !user?.isAdministrator) {
      throw new Error('You do not have permission to update this exhibit')
    }
    let table = exhibit.table || null
    if ('table' in rest) {
      table = rest.table
        ? await db.table.findOneOrFail({
            exhibition: exhibit.exhibition,
            number: rest.table,
          })
        : null
    }

    if (text) {
      const { sanitizedHtml, images } = await processHtml(text, db.em, { exhibit })
      text = sanitizedHtml
      db.em.persist(images)
    }

    return wrap(exhibit).assign({ table, text, ...rest })
  },
  deleteExhibit: async (_, { id }, { db, exhibitor, user }) => {
    const exhibit = await db.exhibit.findOneOrFail({ id })
    if (exhibitor !== exhibit.exhibitor && !user?.isAdministrator) {
      throw new Error('You do not have permission to delete this exhibit')
    }
    db.em.remove(exhibit)
    return true
  },
}

export const exhibitTypeResolvers: ExhibitResolvers = {
  exhibitor: async (exhibit, _, { db }) => db.exhibitor.findOneOrFail({ id: exhibit.exhibitor.id }),
  table: async (exhibit, _, { db }) =>
    exhibit.table ? db.table.findOneOrFail({ id: exhibit.table.id }) : null,
}

export const exhibitResolvers = {
  Query: exhibitQueries,
  Mutation: exhibitMutations,
  Exhibit: exhibitTypeResolvers,
}
