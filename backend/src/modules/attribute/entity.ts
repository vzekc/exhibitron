import { Entity, EntityRepositoryType, Property, Unique } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { AttributeRepository } from './repository.js'

@Entity({ repository: () => AttributeRepository })
export class Attribute extends BaseEntity {
  [EntityRepositoryType]?: AttributeRepository

  @Property()
  @Unique()
  name!: string
}
