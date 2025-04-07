import { Entity, EntityRepositoryType, ManyToOne, Property } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { RoomRepository } from './repository.js'

@Entity()
export class Room extends BaseEntity {
  [EntityRepositoryType]?: RoomRepository

  @Property()
  name!: string

  @ManyToOne(() => Exhibition)
  exhibition!: Exhibition
}
