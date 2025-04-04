import { Collection, Entity, ManyToOne, OneToMany, Property } from '@mikro-orm/core'
import { User } from '../user/entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibit } from '../exhibit/entity.js'
import { Table } from '../table/entity.js'

@Entity()
export class Exhibitor extends BaseEntity {
  @ManyToOne()
  exhibition!: Exhibition

  @ManyToOne()
  user!: User

  @Property({ nullable: true })
  topic?: string

  @OneToMany({ mappedBy: 'exhibitor' })
  exhibits = new Collection<Exhibit>(this)

  @OneToMany({ mappedBy: 'exhibitor' })
  tables = new Collection<Table>(this)
}
