import {
  Entity,
  Property,
  Unique,
  EntityRepositoryType,
  OneToMany,
  Collection,
  ManyToOne,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { ImageRepository } from './repository.js'

@Entity()
export class ImageVariant extends BaseEntity {
  @Property({ columnType: 'bytea', lazy: true })
  data!: Buffer

  @Property()
  width!: number

  @Property()
  height!: number

  @Property()
  variantName!: string

  @Property()
  mimeType!: string

  @ManyToOne(() => ImageStorage)
  originalImage!: ImageStorage
}

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

  @OneToMany(() => ImageVariant, (variant) => variant.originalImage, {
    orphanRemoval: true,
  })
  variants = new Collection<ImageVariant>(this)
}
