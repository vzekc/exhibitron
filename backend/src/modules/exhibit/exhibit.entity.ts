import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToOne,
  Property,
} from '@mikro-orm/core'
import { User } from '../user/user.entity.js'
import { BaseEntity } from '../common/base.entity.js'
import { Table } from '../table/table.entity.js'
import { ExhibitRepository } from './exhibit.repository.js'

@Entity({ repository: () => ExhibitRepository })
export class Exhibit extends BaseEntity<'text' | 'table'> {
  [EntityRepositoryType]?: ExhibitRepository

  @Property()
  title!: string

  @Property({ columnType: 'text', nullable: true })
  text!: string

  @OneToOne({ nullable: true })
  table!: Table

  @ManyToOne()
  exhibitor!: User
}
