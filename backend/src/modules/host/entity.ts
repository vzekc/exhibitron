import { Entity, Property, ManyToOne, OneToOne, Unique } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Exhibit } from '../exhibit/entity.js'
import { Exhibition } from '../exhibition/entity.js'

@Entity()
export class Host extends BaseEntity {
  @Property()
  @Unique()
  name!: string

  @Property()
  @Unique()
  ipAddress!: string

  @Property()
  services: string[] = []

  @ManyToOne(() => Exhibition)
  exhibition!: Exhibition

  @ManyToOne(() => Exhibitor, { nullable: true })
  exhibitor?: Exhibitor

  @OneToOne(() => Exhibit, { nullable: true })
  exhibit?: Exhibit
}
