import { EntityRepository } from '@mikro-orm/postgresql'
import { Table } from './table.entity.js'
import { PermissionDeniedError } from '../common/errors.js'
import { Exhibitor } from '../exhibitor/exhibitor.entity.js'

export class TableRepository extends EntityRepository<Table> {
  async claim(tableNumber: number, exhibitor: Exhibitor) {
    const table = await this.findOneOrFail({ id: tableNumber })
    if (table.exhibitor && table.exhibitor !== exhibitor) {
      throw new PermissionDeniedError(
        'The requested table is assigned to another exhibitor',
      )
    }
    table.exhibitor = exhibitor
    return table
  }

  async release(tableNumber: number, exhibitor?: Exhibitor) {
    const table = await this.findOneOrFail({ id: tableNumber })
    if (exhibitor && table.exhibitor !== exhibitor) {
      throw new PermissionDeniedError(
        'Cannot release table claimed by another exhibitor',
      )
    }
    table.exhibitor = undefined
    return table
  }

  async freeTables() {
    const tables = await this.find({ exhibitor: null })
    return tables.map((table) => table.id)
  }
}
