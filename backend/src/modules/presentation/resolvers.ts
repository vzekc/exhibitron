import { Context } from '../../app/context.js'
import { PresentationResolvers, QueryResolvers, MutationResolvers } from '../../generated/graphql.js'
import { Presentation } from './entity.js'
import { wrap } from '@mikro-orm/core'
import { requireAdmin } from '../../db.js'

export const presentationQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getPresentation: async (_, { id }, { db }) => db.presentation.findOneOrFail({ id }),
  // @ts-expect-error ts2345
  getPresentations: async (_, { exhibitionId }, { db }) => db.presentation.find({ exhibition: exhibitionId }),
}

export const presentationMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createPresentation: async (_, { input }, { db, user }) => {
    requireAdmin(user)
    const presentation = db.presentation.create({
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      exhibition: input.exhibitionId,
      room: input.roomId,
    })

    if (input.exhibitorIds?.length) {
      const exhibitors = await db.exhibitor.find({ id: { $in: input.exhibitorIds } })
      exhibitors.forEach(exibitor => presentation.exhibitors.add(exibitor))
    }

    db.em.persist(presentation)
    return presentation
  },

  // @ts-expect-error ts2345
  updatePresentation: async (_, { id, input }, { db, exhibitor, user }) => {
    const presentation = await db.presentation.findOneOrFail({ id })

    if (!user?.isAdministrator) {
      if (!exhibitor || !presentation?.exhibitors.find(e => e.id === exhibitor.id)) {
        throw new Error('You do not have permission to update this presentation')
      }
    }

    const { roomId, exhibitorIds, description, ...props } = input

    wrap(presentation).assign(props)

    if (roomId) {
      presentation.room = await db.room.findOneOrFail({ id: roomId })
    }

    if (description) {
      presentation.description = await db.document.ensureDocument(presentation.description, description)
    }

    if (exhibitorIds) {
      presentation.exhibitors.removeAll()
      if (exhibitorIds.length) {
        const exhibitors = await db.exhibitor.find({ id: { $in: exhibitorIds } })
        exhibitors.forEach(exibitor => presentation.exhibitors.add(exibitor))
      }
    }

    return presentation
  },

  deletePresentation: async (_, { id }, { db }) => {
    const presentation = await db.presentation.findOneOrFail({ id })
    db.em.remove(presentation)
    return true
  },
}

export const presentationTypeResolvers: PresentationResolvers = {
  exhibition: async (presentation, _, { db }) => db.exhibition.findOneOrFail({ id: presentation.exhibition.id }),
  room: async (presentation, _, { db }) => presentation.room ? db.room.findOneOrFail({ id: presentation.room.id }) : null,
  exhibitors: async (presentation, _, { db }) => db.exhibitor.find({ presentations: presentation }),
  description: (presentation) => {
    const presentationEntity = presentation as unknown as Presentation
    return presentationEntity.description?.html ?? ''
  },
}

export const presentationResolvers = {
  Query: presentationQueries,
  Mutation: presentationMutations,
  Presentation: presentationTypeResolvers,
}
