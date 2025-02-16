import { FindOptions, sql, EntityRepository } from '@mikro-orm/postgresql'
import { Exhibition } from './exhibition.entity.js'
import { ExhibitionListing } from './exhibition-listing.entity.js'

// extending the EntityRepository exported from driver package, so we can access things like the QB factory
export class ExhibitionRepository extends EntityRepository<Exhibition> {
  listExhibitionsQuery() {
    // build final query
    return this.createQueryBuilder('e')
      .select(['id', 'title', 'text'])
      .addSelect(sql.ref('u.full_name').as('"exhibitorName"'))
      .addSelect(sql.ref('u.id').as('"exhibitorId"'))
      .addSelect(sql.ref('t.number').as('"table"'))
      .join('exhibitor', 'u')
      .leftJoin('table', 't')
      .orderBy({ id: 'asc' })
  }

  async listExhibitions(options: FindOptions<ExhibitionListing>) {
    const [items, total] = await this.em.findAndCount(
      ExhibitionListing,
      {},
      options,
    )
    return { items, total }
  }
}
