import { Entity, EntityRepositoryType, Property, Unique } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { RegistrationRepository } from './registration.repository.js'

@Entity({ repository: () => RegistrationRepository })
@Unique({ properties: ['eventId', 'email'] })
export class Registration extends BaseEntity<'message'> {
  [EntityRepositoryType]?: RegistrationRepository

  @Property({ index: true })
  eventId!: string

  @Property()
  name!: string

  @Property()
  email!: string

  @Property({ nullable: true })
  nickname?: string

  @Property({ columnType: 'text', nullable: true })
  message?: string

  @Property({ columnType: 'jsonb' })
  data!: Record<string, string | number | boolean>
}
