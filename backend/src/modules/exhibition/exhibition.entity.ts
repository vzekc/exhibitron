import { Entity, EntityRepositoryType, Property } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { ExhibitionRepository } from './exhibition.repository.js'

@Entity({ repository: () => ExhibitionRepository })
export class Exhibition extends BaseEntity {
  [EntityRepositoryType]?: ExhibitionRepository
  @Property({ unique: true })
  key!: string

  @Property()
  title!: string

  @Property()
  hostMatch!: string
}
