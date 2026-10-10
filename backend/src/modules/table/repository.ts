import { EntityRepository } from '@mikro-orm/postgresql'
import { Table, TableAssignmentChange } from './entity.js'
import { PermissionDeniedError } from '../common/errors.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { User } from '../user/entity.js'

export class TableRepository extends EntityRepository<Table> {
  /*
   * Every hand a table passes through is written down as it happens, because
   * the assignment itself is a single column that the next change overwrites.
   * A table set to the exhibitor it already has leaves nothing behind.
   *
   * Whether the table shows visitor photos is its holder's statement about
   * their own machine, so it goes with them and a new holder starts without it.
   */
  private handOver(table: Table, next: Exhibitor | undefined, actor: User) {
    const previous = table.exhibitor
    table.exhibitor = next
    if (previous?.id === next?.id) return
    table.showsVisitorPhotos = false
    this.getEntityManager().persist(
      this.getEntityManager().create(TableAssignmentChange, {
        exhibition: table.exhibition,
        tableNumber: table.number,
        previousExhibitor: previous,
        newExhibitor: next,
        actor,
      }),
    )
  }

  async claim(exhibition: Exhibition, tableNumber: number, exhibitor: Exhibitor, actor: User) {
    const table = await this.findOneOrFail({ exhibition, number: tableNumber })
    if (table.exhibitor && table.exhibitor !== exhibitor) {
      throw new PermissionDeniedError('The requested table is assigned to another exhibitor')
    }
    this.handOver(table, exhibitor, actor)
    return table
  }

  async release(
    exhibition: Exhibition,
    tableNumber: number,
    exhibitor: Exhibitor | null,
    actor: User,
  ) {
    const table = await this.findOneOrFail({ exhibition, number: tableNumber })
    if (exhibitor && table.exhibitor !== exhibitor) {
      throw new PermissionDeniedError('Cannot release table claimed by another exhibitor')
    }
    this.handOver(table, undefined, actor)
    return table
  }

  /* What the desk does for somebody: a table handed straight to an exhibitor,
     whoever held it before. */
  async assignTo(exhibition: Exhibition, tableNumber: number, exhibitor: Exhibitor, actor: User) {
    const table = await this.findOneOrFail({ exhibition, number: tableNumber })
    this.handOver(table, exhibitor, actor)
    return table
  }

  async freeTables(exhibition: Exhibition) {
    const tables = await this.find({ exhibition, exhibitor: null })
    return tables.map((table) => table.id)
  }
}
