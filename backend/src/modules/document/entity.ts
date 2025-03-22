import {
  Entity,
  EntityRepositoryType,
  Property,
  OneToMany,
  Collection,
  Cascade,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Image } from '../image/entity.js'
import { DocumentRepository } from './repository.js'

@Entity({ repository: () => DocumentRepository })
export class Document extends BaseEntity<'text'> {
  [EntityRepositoryType]?: DocumentRepository

  @Property({ columnType: 'text', nullable: true })
  html!: string

  @OneToMany(() => Image, (image) => image.document, {
    cascade: [Cascade.PERSIST],
    eager: true,
  })
  images: Collection<Image> = new Collection<Image>(this)
}
