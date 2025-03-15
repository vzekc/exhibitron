import { Entity, ManyToOne, Property } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibit } from '../exhibit/exhibit.entity.js'
import { Page } from '../page/page.entity.js'

@Entity()
export class Image extends BaseEntity {
  @Property({ columnType: 'bytea' })
  data!: Buffer

  @Property()
  mimeType!: string

  @Property()
  filename!: string

  @ManyToOne({ nullable: true })
  exhibit?: Exhibit

  @ManyToOne({ nullable: true })
  page?: Page
}
