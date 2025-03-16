import { Entity, EntityRepositoryType, Property, Unique } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { ExhibitAttributeRepository } from './repository.js'

@Entity({ repository: () => ExhibitAttributeRepository })
export class ExhibitAttribute extends BaseEntity {
  [EntityRepositoryType]?: ExhibitAttributeRepository

  @Property()
  @Unique()
  name!: string
}
