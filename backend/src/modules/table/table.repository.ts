import { EntityRepository } from '@mikro-orm/postgresql'
import { PermissionDeniedError } from '../common/utils.js'
import { User } from '../user/user.entity.js'
import { Table } from './table.entity.js'

export class TableRepository extends EntityRepository<Table> {
  async claim(tableNumber: number, user: User) {
    const table = await this.findOneOrFail({ id: tableNumber })
    if (table.exhibitor && table.exhibitor !== user) {
      throw new PermissionDeniedError(
        'The requested table is assigned to another exhibitor',
      )
    }
    table.exhibitor = user
    return table
  }

  async release(tableNumber: number, user?: User) {
    const table = await this.findOneOrFail({ id: tableNumber })
    if (user && table.exhibitor !== user) {
      throw new PermissionDeniedError(
        'Cannot release table claimed by another exhibitor',
      )
    }
    table.exhibitor = undefined
    return table
  }
}
