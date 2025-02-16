import { Entity, EntityRepositoryType, ManyToOne } from '@mikro-orm/core'
import { User } from '../user/user.entity.js'
import { BaseEntity } from '../common/base.entity.js'
import { TableRepository } from './table.repository.js'

@Entity({ repository: () => TableRepository })
export class Table extends BaseEntity<'exhibitor'> {
  [EntityRepositoryType]?: TableRepository

  @ManyToOne({ nullable: true })
  exhibitor?: User = undefined
}
