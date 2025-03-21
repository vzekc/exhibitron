import { Entity, EntityRepositoryType, ManyToOne, Property, OneToOne } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Table } from '../table/entity.js'
import { ExhibitRepository } from './repository.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Image } from '../image/entity.js'

@Entity({ repository: () => ExhibitRepository })
export class Exhibit extends BaseEntity<'text' | 'table' | 'attributes'> {
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

  @Property({ type: 'json', nullable: true })
  attributes?: [string, string][]

  @OneToOne(() => Image, { nullable: true, orphanRemoval: true })
  mainImage?: Image
}
