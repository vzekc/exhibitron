import { Context } from '../../app/context.js'
import {
  ConferenceSessionResolvers,
  QueryResolvers,
  MutationResolvers,
} from '../../generated/graphql.js'
import { ConferenceSession } from './entity.js'
import { wrap } from '@mikro-orm/core'
import { requireAdmin } from '../../db.js'

export const conferenceSessionQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2345
  getConferenceSession: async (_, { id }, { db }) =>
    db.conferenceSession.findOneOrFail({ id }, { populate: ['description', 'exhibitors'] }),
  // @ts-expect-error ts2345
  getConferenceSessions: async (_, _args, { db, exhibition }) =>
    db.conferenceSession.find({ exhibition }),
}

export const conferenceSessionMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createConferenceSession: async (_, { input }, { db, user, exhibition }) => {
    requireAdmin(user)
    const conferenceSession = db.conferenceSession.create({
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      exhibition,
      room: input.roomId,
    })

    if (input.exhibitorIds?.length) {
      const exhibitors = await db.exhibitor.find({ id: { $in: input.exhibitorIds } })
      exhibitors.forEach((exhibitor) => conferenceSession.exhibitors.add(exhibitor))
    }

    await db.em.persist(conferenceSession).flush()
    return conferenceSession
  },

  // @ts-expect-error ts2345
  updateConferenceSession: async (_, { id, input }, { db, exhibitor, user }) => {
    const conferenceSession = await db.conferenceSession.findOneOrFail(
      { id },
      { populate: ['exhibitors'] },
    )

    if (!user?.isAdministrator) {
      if (!exhibitor || !conferenceSession?.exhibitors.find((e) => e.id === exhibitor.id)) {
        throw new Error('You do not have permission to update this conferenceSession')
      }
    }

    const { roomId, exhibitorIds, description, ...props } = input

    wrap(conferenceSession).assign(props)

    if (roomId) {
      conferenceSession.room = await db.room.findOneOrFail({ id: roomId })
    }

    if (description) {
      conferenceSession.description = await db.document.ensureDocument(
        conferenceSession.description,
        description,
      )
    }

    if (exhibitorIds) {
      conferenceSession.exhibitors.removeAll()
      if (exhibitorIds.length) {
        const exhibitors = await db.exhibitor.find({ id: { $in: exhibitorIds } })
        if (exhibitors.length !== exhibitorIds.length) {
          throw new Error('Some exhibitors do not exist')
        }
        exhibitors.forEach((exhibitor) => conferenceSession.exhibitors.add(exhibitor))
      }
    }

    await db.em.flush()

    return conferenceSession
  },

  deleteConferenceSession: async (_, { id }, { db }) => {
    const conferenceSession = await db.conferenceSession.findOneOrFail({ id })
    db.em.remove(conferenceSession)
    return true
  },
}

export const conferenceSessionTypeResolvers: ConferenceSessionResolvers = {
  room: async (conferenceSession, _, { db }) =>
    conferenceSession.room ? db.room.findOneOrFail({ id: conferenceSession.room.id }) : null,
  exhibitors: async (conferenceSession, _, { db }) =>
    db.exhibitor.find({ conferenceSessions: conferenceSession }),
  description: (conferenceSession) => {
    const conferenceSessionEntity = conferenceSession as unknown as ConferenceSession
    return conferenceSessionEntity.description?.html ?? ''
  },
}

export const conferenceSessionResolvers = {
  Query: conferenceSessionQueries,
  Mutation: conferenceSessionMutations,
  ConferenceSession: conferenceSessionTypeResolvers,
}
