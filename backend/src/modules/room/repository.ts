import { EntityRepository } from '@mikro-orm/core'
import { Room } from './entity.js'

export class RoomRepository extends EntityRepository<Room> {}
