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
import { ExhibitionRepository } from './exhibition.repository.js'

@Entity({ repository: () => ExhibitionRepository })
export class Exhibition extends BaseEntity<'text' | 'table'> {
  [EntityRepositoryType]?: ExhibitionRepository

  @Property()
  title!: string

  @Property({ columnType: 'text', nullable: true })
  text!: string

  @OneToOne({ nullable: true })
  table!: Table

  @ManyToOne()
  exhibitor!: User
}
