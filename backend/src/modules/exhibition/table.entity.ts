import { Entity, ManyToOne } from '@mikro-orm/core'
import { User } from '../user/user.entity.js'
import { BaseEntity } from '../common/base.entity.js'

@Entity()
export class Table extends BaseEntity<'exhibitor'> {
  @ManyToOne({ nullable: true })
  exhibitor!: User
}
