import { Entity, EntityRepositoryType, Property, Unique } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { ExhibitAttributeRepository } from './repository.js'

@Entity({ repository: () => ExhibitAttributeRepository })
export class ExhibitAttribute extends BaseEntity {
  [EntityRepositoryType]?: ExhibitAttributeRepository

  @Property()
  @Unique()
  name!: string

  /*
   * A standard attribute stands on every data sheet, in this position among the
   * standard ones, whether or not the exhibit has a value for it. Null makes an
   * attribute one that an exhibitor adds by hand.
   */
  @Property({ nullable: true })
  standardOrder?: number | null
}
