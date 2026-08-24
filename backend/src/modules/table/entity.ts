import {
  Collection,
  Entity,
  EntityRepositoryType,
  Index,
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
import { User } from '../user/entity.js'

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

/*
 * One table changing hands, and who did it. The exhibitors and the actor are
 * let go rather than kept alive by this row, so an account that leaves takes
 * its name out of the record but not the record itself. The table is held as
 * its number rather than as a reference, which is what the mail says anyway
 * and what survives a plan being redrawn.
 *
 * `notifiedAt` is what keeps the digest idempotent across restarts: a change
 * that has been reported leaves its date behind, and the next run passes it
 * by. A change nobody needed to hear about is stamped as well.
 */
@Entity()
export class TableAssignmentChange extends BaseEntity {
  @ManyToOne(() => Exhibition, { deleteRule: 'cascade' })
  exhibition!: Exhibition

  @Property()
  tableNumber!: number

  @ManyToOne(() => Exhibitor, { nullable: true, deleteRule: 'set null' })
  previousExhibitor?: Exhibitor

  @ManyToOne(() => Exhibitor, { nullable: true, deleteRule: 'set null' })
  newExhibitor?: Exhibitor

  @ManyToOne(() => User, { nullable: true, deleteRule: 'set null' })
  actor?: User

  @Index()
  @Property({ nullable: true })
  notifiedAt?: Date
}
