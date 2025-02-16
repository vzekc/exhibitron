import { Entity, ManyToOne, Property } from '@mikro-orm/core'
import { User } from '../user/user.entity.js'
import { BaseEntity } from '../common/base.entity.js'

@Entity()
export class Table extends BaseEntity<'exhibitor'> {
  @Property({ unique: true })
  number!: number

  @ManyToOne({ nullable: true })
  exhibitor!: User
}
