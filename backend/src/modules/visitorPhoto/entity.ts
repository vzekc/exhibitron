import { Entity, Index, ManyToOne, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core'
import { Exhibition } from '../exhibition/entity.js'

/*
 * A photo taken by a visitor at the photo booth.
 *
 * The picture itself is not here. Images elsewhere in exhibitron are bytea
 * columns, and the database is dumped to another machine — a photo stored that
 * way would live on in every backup after a visitor had asked for it to be
 * deleted, while the page told them it was gone. The files sit in a directory
 * outside the backup instead, and what remains here is a row that identifies
 * nobody: an id, a hash, and two dates.
 *
 * `deletedAt` is what makes the page say the visitor asked for their data to
 * be removed, so the row outlives the files on purpose.
 */
@Entity()
export class VisitorPhoto {
  [OptionalProps]?: 'tables' | 'createdAt' | 'deletedAt'

  /* Six characters from A-Z 2-9, printed on the visitor's slip. */
  @PrimaryKey()
  id!: string

  @ManyToOne()
  exhibition!: Exhibition

  /*
   * SHA-256 of the deletion code. The code is printed once and kept nowhere,
   * so possession of the slip is what proves the photo is yours — and nobody
   * with this database in front of them can work out what to type.
   */
  @Property({ length: 64 })
  codeHash!: string

  /* The tables printed on the slip, so the page can show the same trail. */
  @Property({ type: 'json' })
  tables: number[] = []

  @Property()
  createdAt: Date = new Date()

  @Index()
  @Property({ nullable: true })
  deletedAt?: Date
}
