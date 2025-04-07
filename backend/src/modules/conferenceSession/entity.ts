import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToMany,
  ManyToOne,
  Property,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../../entities.js'
import { Room } from '../room/entity.js'
import { Document } from '../document/entity.js'
import { ConferenceSessionRepository } from './repository.js'

@Entity()
export class ConferenceSession extends BaseEntity {
  [EntityRepositoryType]?: ConferenceSessionRepository

  @Property()
  title!: string

  @Property({ nullable: true })
  startTime?: Date

  @Property({ nullable: true })
  endTime?: Date

  @ManyToOne(() => Exhibition)
  exhibition!: Exhibition

  @ManyToOne(() => Room, { nullable: true })
  room?: Room

  @ManyToMany(() => Exhibitor)
  exhibitors = new Collection<Exhibitor>(this)

  @ManyToOne(() => Document, { nullable: true })
  description!: Document | null
}
