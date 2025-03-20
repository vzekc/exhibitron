import {
  Entity,
  EntityRepositoryType,
  Property,
  OneToMany,
  Collection,
  BeforeUpdate,
  BeforeCreate,
  Cascade,
  AfterCreate,
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
  })
  images: Collection<Image> = new Collection<Image>(this)

  @BeforeUpdate()
  @BeforeCreate()
  async processHtmlContent(): Promise<void> {
    // Skip if there's no HTML content to process
    if (!this.html) {
      return
    }

    // Get the repository and process the HTML
    const repository = this.__em?.getRepository(Document) as DocumentRepository
    if (repository) {
      await repository.processHtmlContent(this)
    }
  }
}
