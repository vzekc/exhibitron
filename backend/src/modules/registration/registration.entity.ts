import {
  Entity,
  EntityRepositoryType,
  Enum,
  Property,
  Unique,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { RegistrationRepository } from './registration.repository.js'

export enum RegistrationStatus {
  NEW = 'new',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ repository: () => RegistrationRepository })
@Unique({ properties: ['eventId', 'email'] })
export class Registration extends BaseEntity<'message'> {
  [EntityRepositoryType]?: RegistrationRepository

  @Property({ index: true })
  eventId!: string

  @Enum({
    items: () => RegistrationStatus,
    default: RegistrationStatus.NEW,
    nativeEnumName: 'registration_status',
  })
  status!: RegistrationStatus

  @Property()
  name!: string

  @Property()
  email!: string

  @Property({ nullable: true })
  nickname?: string

  @Property({ columnType: 'text', nullable: true })
  message?: string

  @Property({ columnType: 'text', nullable: true })
  notes?: string

  @Property({ columnType: 'jsonb' })
  data!: Record<string, string | number | boolean>
}
