import {
  Entity,
  EntityRepositoryType,
  Property,
  OneToMany,
  Collection,
  Cascade,
  OneToOne,
  ManyToOne,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { DocumentRepository } from './repository.js'
import { ImageStorage } from '../image/entity.js'

@Entity()
export class DocumentImage extends BaseEntity {
  @OneToOne(() => ImageStorage, {
    cascade: [Cascade.PERSIST],
    eager: true,
    orphanRemoval: true,
    deleteRule: 'cascade',
  })
  image!: ImageStorage

  @ManyToOne(() => Document, { deleteRule: 'cascade', nullable: false })
  document!: Document
}

@Entity({ repository: () => DocumentRepository })
export class Document extends BaseEntity<'text'> {
  [EntityRepositoryType]?: DocumentRepository

  @Property({ columnType: 'text', nullable: true })
  html!: string

  @OneToMany(() => DocumentImage, (image) => image.document, {
    cascade: [Cascade.PERSIST],
    eager: true,
  })
  images: Collection<DocumentImage> = new Collection<DocumentImage>(this)
}
