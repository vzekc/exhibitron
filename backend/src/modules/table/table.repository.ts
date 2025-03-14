import { EntityRepository } from '@mikro-orm/postgresql'
import { Table } from './table.entity.js'
import { PermissionDeniedError } from '../common/errors.js'
import { Exhibitor } from '../exhibitor/exhibitor.entity.js'
import { Exhibition } from '../exhibition/exhibition.entity.js'

export class TableRepository extends EntityRepository<Table> {
  async claim(
    exhibition: Exhibition,
    tableNumber: number,
    exhibitor: Exhibitor,
  ) {
    const table = await this.findOneOrFail({ exhibition, number: tableNumber })
    if (table.exhibitor && table.exhibitor !== exhibitor) {
      throw new PermissionDeniedError(
        'The requested table is assigned to another exhibitor',
      )
    }
    table.exhibitor = exhibitor
    return table
  }

  async release(
    exhibition: Exhibition,
    tableNumber: number,
    exhibitor: Exhibitor | null,
  ) {
    const table = await this.findOneOrFail({ exhibition, number: tableNumber })
    if (exhibitor && table.exhibitor !== exhibitor) {
      throw new PermissionDeniedError(
        'Cannot release table claimed by another exhibitor',
      )
    }
    table.exhibitor = undefined
    return table
  }

  async freeTables(exhibition: Exhibition) {
    const tables = await this.find({ exhibition, exhibitor: null })
    return tables.map((table) => table.id)
  }
}
