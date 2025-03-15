import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { TableRepository } from './repository.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibit } from '../exhibit/entity.js'

@Entity({ repository: () => TableRepository })
@Unique({ properties: ['exhibition', 'number'] })
export class Table extends BaseEntity<'exhibitor'> {
  [EntityRepositoryType]?: TableRepository

  @ManyToOne()
  exhibition!: Exhibition

  @Property()
  number!: number

  @OneToMany({ mappedBy: 'table' })
  exhibits = new Collection<Exhibit>(this)

  @ManyToOne({ nullable: true })
  exhibitor?: Exhibitor = undefined
}
