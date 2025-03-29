import { Entity, Property, Unique, EntityRepositoryType } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { ImageRepository } from './repository.js'

@Entity({ repository: () => ImageRepository })
export class ImageStorage extends BaseEntity {
  [EntityRepositoryType]?: ImageRepository

  @Property({ columnType: 'bytea', lazy: true })
  data!: Buffer

  @Property()
  mimeType!: string

  @Property()
  filename!: string

  @Property()
  @Unique()
  slug!: string

  @Property()
  width!: number

  @Property()
  height!: number
}
