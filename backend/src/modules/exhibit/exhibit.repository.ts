import { FindOptions, EntityRepository } from '@mikro-orm/postgresql'
import { Exhibit } from './exhibit.entity.js'
import { Table } from '../table/table.entity.js'

// extending the EntityRepository exported from driver package, so we can access things like the QB factory
export class ExhibitRepository extends EntityRepository<Exhibit> {
  async listExhibits(options: FindOptions<Exhibit>) {
    const [items, total] = await this.em.findAndCount(Exhibit, {}, options)
    const freeTables = await this.em.getRepository(Table).freeTables()
    return { items, total, freeTables }
  }
}
