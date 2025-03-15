import { Entity, ManyToOne, Property, Unique } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibition } from '../../entities.js'

@Entity()
@Unique({ properties: ['exhibition', 'key'] })
export class Page extends BaseEntity {
  @Property({ unique: true })
  key!: string

  @ManyToOne()
  exhibition!: Exhibition

  @Property()
  title!: string

  @Property({ columnType: 'text' })
  text!: string
}
