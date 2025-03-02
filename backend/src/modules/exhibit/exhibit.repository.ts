import { FindOptions, sql, EntityRepository } from '@mikro-orm/postgresql'
import { Exhibit } from './exhibit.entity.js'
import { ExhibitListing } from './exhibit-listing.entity.js'
import { Table } from '../table/table.entity.js'

// extending the EntityRepository exported from driver package, so we can access things like the QB factory
export class ExhibitRepository extends EntityRepository<Exhibit> {
  listExhibitsQuery() {
    // build final query
    return this.createQueryBuilder('e')
      .select(['id', 'title', 'text'])
      .addSelect(sql.ref('u.full_name').as('"exhibitorName"'))
      .addSelect(sql.ref('u.id').as('"exhibitorId"'))
      .addSelect(sql.ref('t.id').as('"table"'))
      .join('exhibitor', 'u')
      .leftJoin('table', 't')
      .orderBy({ id: 'asc' })
  }

  async listExhibits(options: FindOptions<ExhibitListing>) {
    const [items, total] = await this.em.findAndCount(
      ExhibitListing,
      {},
      options,
    )
    const freeTables = await this.em.getRepository(Table).freeTables()
    return { items, total, freeTables }
  }
}
