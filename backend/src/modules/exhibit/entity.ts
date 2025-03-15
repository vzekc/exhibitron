import { Entity, EntityRepositoryType, ManyToOne, Property } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Table } from '../table/entity.js'
import { ExhibitRepository } from './repository.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'

@Entity({ repository: () => ExhibitRepository })
export class Exhibit extends BaseEntity<'text' | 'table'> {
  [EntityRepositoryType]?: ExhibitRepository

  @ManyToOne()
  exhibition!: Exhibition

  @Property()
  title!: string

  @Property({ columnType: 'text', nullable: true })
  text!: string

  @ManyToOne({ nullable: true })
  table?: Table

  @ManyToOne()
  exhibitor!: Exhibitor
}
