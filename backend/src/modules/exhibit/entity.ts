import { Entity, EntityRepositoryType, ManyToOne, Property, OneToOne } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Table } from '../table/entity.js'
import { ExhibitRepository } from './repository.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Image } from '../image/entity.js'
import { Document } from '../document/entity.js'

@Entity({ repository: () => ExhibitRepository })
export class Exhibit extends BaseEntity<'text' | 'table' | 'attributes'> {
  [EntityRepositoryType]?: ExhibitRepository

  @ManyToOne()
  exhibition!: Exhibition

  @Property()
  title!: string

  @OneToOne(() => Document, { nullable: true, orphanRemoval: true, eager: true })
  description!: Document | null

  @OneToOne(() => Document, { nullable: true, orphanRemoval: true, eager: true })
  descriptionExtension!: Document | null

  @ManyToOne({ nullable: true })
  table?: Table

  @ManyToOne()
  exhibitor!: Exhibitor

  @Property({ type: 'json', nullable: true })
  attributes?: [string, string][]

  @OneToOne(() => Image, { nullable: true, orphanRemoval: true })
  mainImage?: Image
}
