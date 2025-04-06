import { Context } from '../../app/context.js'
import { RoomResolvers, QueryResolvers, MutationResolvers } from '../../generated/graphql.js'
import { requireAdmin } from '../../db.js'

export const roomQueries: QueryResolvers<Context> = {
  getRoom: async (_, { id }, { db }) => db.room.findOneOrFail({ id }),
  getRooms: async (_, _args, { db, exhibition }) => db.room.find({ exhibition }),
}

export const roomMutations: MutationResolvers<Context> = {
  createRoom: async (_, { input }, { db, user, exhibition }) => {
    requireAdmin(user)
    const room = db.room.create({
      name: input.name,
      capacity: input.capacity,
      exhibition,
    })
    await db.em.persist(room).flush()
    return room
  },

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
    db.em.remove(room)
    return true
  },
}

export const roomTypeResolvers: RoomResolvers = {}

export const roomResolvers = {
  Query: roomQueries,
  Mutation: roomMutations,
  Room: roomTypeResolvers,
}
