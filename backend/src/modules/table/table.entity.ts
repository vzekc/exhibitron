import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  Property,
  Unique,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { TableRepository } from './table.repository.js'
import { Exhibitor } from '../exhibitor/exhibitor.entity.js'
import { Exhibition } from '../exhibition/exhibition.entity.js'

@Entity({ repository: () => TableRepository })
@Unique({ properties: ['exhibition', 'number'] })
export class Table extends BaseEntity<'exhibitor'> {
  [EntityRepositoryType]?: TableRepository

  @ManyToOne()
  exhibition!: Exhibition

  @Property()
  number!: number

  @ManyToOne({ nullable: true })
  exhibitor?: Exhibitor = undefined
}
