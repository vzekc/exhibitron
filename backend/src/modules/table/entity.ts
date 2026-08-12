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
export class Table extends BaseEntity<'exhibitor' | 'showsVisitorPhotos'> {
  [EntityRepositoryType]?: TableRepository

  @ManyToOne()
  exhibition!: Exhibition

  @Property()
  number!: number

  @OneToMany({ mappedBy: 'table' })
  exhibits = new Collection<Exhibit>(this)

  @ManyToOne({ nullable: true })
  exhibitor?: Exhibitor = undefined

  /*
   * Set by whoever holds the table: a machine on it can show a visitor's photo
   * from the booth, so the trail slips may send people here. It belongs to the
   * table rather than the exhibitor because an exhibitor with two tables may
   * only have the right machine on one of them.
   */
  @Property({ default: false })
  showsVisitorPhotos: boolean = false
}
