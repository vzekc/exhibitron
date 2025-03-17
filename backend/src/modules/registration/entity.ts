import { Entity, EntityRepositoryType, Enum, ManyToOne, Property, Unique } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { RegistrationRepository } from './repository.js'
import { Exhibition } from '../exhibition/entity.js'

import { RegistrationStatus } from '../../generated/graphql.js'

@Entity({ repository: () => RegistrationRepository })
@Unique({ properties: ['exhibition', 'email'] })
export class Registration extends BaseEntity<'message'> {
  [EntityRepositoryType]?: RegistrationRepository

  @ManyToOne()
  exhibition!: Exhibition

  @Enum({
    items: () => RegistrationStatus,
    default: RegistrationStatus.New,
    nativeEnumName: 'registration_status',
  })
  status!: RegistrationStatus

  @Property()
  name!: string

  @Property({ columnType: 'citext' })
  email!: string

  @Property()
  topic!: string

  @Property({ nullable: true })
  nickname?: string

  @Property({ columnType: 'text', nullable: true })
  message?: string

  @Property({ columnType: 'text', nullable: true })
  notes?: string

  @Property({ columnType: 'jsonb' })
  data!: Record<string, string | number | boolean>
}
