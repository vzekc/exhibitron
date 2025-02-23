import { Entity, Property } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'

@Entity()
export class Registration extends BaseEntity<'message'> {
  @Property()
  name!: string

  @Property({ unique: true })
  email!: string

  @Property()
  nickname!: string

  @Property({ columnType: 'text', nullable: true })
  message?: string

  @Property({ columnType: 'jsonb' })
  data!: Record<string, string | number | boolean>
}
