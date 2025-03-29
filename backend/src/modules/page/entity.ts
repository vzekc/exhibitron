import { Entity, ManyToOne, OneToOne, Property, Unique } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibition } from '../../entities.js'
import { Document } from '../document/entity.js'

@Entity()
@Unique({ properties: ['exhibition', 'key'] })
export class Page extends BaseEntity {
  @Property({ unique: true })
  key!: string

  @ManyToOne()
  exhibition!: Exhibition

  @Property()
  title!: string

  @OneToOne(() => Document, { nullable: true, orphanRemoval: true, eager: true })
  content!: Document | null
}
