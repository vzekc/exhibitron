import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  Property,
  OneToOne,
  Cascade,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Table } from '../table/entity.js'
import { ExhibitRepository } from './repository.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Document } from '../document/entity.js'
import { ImageStorage } from '../image/entity.js'
import { Host } from '../host/entity.js'

@Entity()
export class ExhibitImage extends BaseEntity {
  @OneToOne(() => ImageStorage, { cascade: [Cascade.PERSIST], eager: true, deleteRule: 'cascade' })
  image!: ImageStorage

  @OneToOne(() => ImageStorage, {
    nullable: true,
    cascade: [Cascade.PERSIST],
    eager: true,
    deleteRule: 'cascade',
    orphanRemoval: true,
  })
  thumbnail?: ImageStorage

  @OneToOne(() => Exhibit)
  exhibit!: Exhibit
}

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

  @OneToOne(() => ExhibitImage, (image) => image.exhibit, { nullable: true, orphanRemoval: true })
  mainImage?: ExhibitImage

  @OneToOne(() => Host, { nullable: true })
  hostname?: Host
}
