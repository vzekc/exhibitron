import { Context } from '../../app/context.js'
import { RoomResolvers, QueryResolvers, MutationResolvers } from '../../generated/graphql.js'
import { requireAdmin } from '../../db.js'

export const roomQueries: QueryResolvers<Context> = {
  // @ts-expect-error ts2322
  getRoom: async (_, { id }, { db }) => db.room.findOneOrFail({ id }),
  // @ts-expect-error ts2322
  getRooms: async (_, { exhibitionId }, { db }) => db.room.find({ exhibition: exhibitionId }),
}

export const roomMutations: MutationResolvers<Context> = {
  // @ts-expect-error ts2345
  createRoom: async (_, { input }, { db, user }) => {
    requireAdmin(user)
    const room = db.room.create({
      name: input.name,
      capacity: input.capacity,
      exhibition: input.exhibitionId,
    })
    db.em.persist(room)
    return room
  },

  // @ts-expect-error ts2345
  updateRoom: async (_, { id, input }, { db, user }) => {
    requireAdmin(user)
    const room = await db.room.findOneOrFail({ id })
    if (input.name) room.name = input.name
    if (input.capacity) room.capacity = input.capacity
    db.em.persist(room)
    return room
  },

  deleteRoom: async (_, { id }, { db, user }) => {
    requireAdmin(user)
    const room = await db.room.findOneOrFail({ id })
    db.em.persist(room)
    return true
  },
}

export const roomTypeResolvers: RoomResolvers = {
  exhibition: async (room, _, { db }) => db.exhibition.findOneOrFail({ id: room.exhibition.id }),
}

export const roomResolvers = {
  Query: roomQueries,
  Mutation: roomMutations,
  Room: roomTypeResolvers,
}
