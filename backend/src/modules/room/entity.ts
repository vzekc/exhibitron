import { Entity, EntityRepositoryType, ManyToOne, Property } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibition } from '../exhibition/entity.js'

@Entity()
export class Room extends BaseEntity {
  [EntityRepositoryType]?: any

  @Property()
  name!: string

  @Property({ nullable: true })
  capacity?: number

  @ManyToOne(() => Exhibition)
  exhibition!: Exhibition
} 