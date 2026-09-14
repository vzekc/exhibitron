import { EntityRepository } from '@mikro-orm/postgresql'
import { ExhibitAttribute } from './entity.js'
import { Exhibit } from '../exhibit/entity.js'

/*
 * The data sheet of an exhibit stores its attributes as [name, value] pairs in
 * a JSON column, so the attribute table is the list of names to choose from
 * and the sheets refer to it by name. Renaming one therefore rewrites the
 * sheets, and counting its uses looks into them.
 */
export class ExhibitAttributeRepository extends EntityRepository<ExhibitAttribute> {
  /* The raw queries run inside the request's transaction, so they see sheets
     rewritten and flushed a moment ago. */
  private async exhibitIdsUsing(name: string): Promise<number[]> {
    const rows = await this.em.getConnection().execute<{ id: number }[]>(
      `select e.id from exhibit e
       where exists (select 1 from jsonb_array_elements(e.attributes) a where a->>0 = ?)`,
      [name],
      'all',
      this.em.getTransactionContext(),
    )
    return rows.map((row) => row.id)
  }

  /* One pass over all sheets serves every attribute of the request; the
     repository lives one request, so the memo does too. */
  private counts?: Promise<Map<string, number>>

  private async loadCounts(): Promise<Map<string, number>> {
    const rows = await this.em.getConnection().execute<{ name: string; count: number }[]>(
      `select a->>0 as name, count(distinct e.id)::int as count
       from exhibit e, jsonb_array_elements(e.attributes) a
       group by a->>0`,
      [],
      'all',
      this.em.getTransactionContext(),
    )
    return new Map(rows.map((row) => [row.name, row.count]))
  }

  async countExhibits(name: string): Promise<number> {
    this.counts ??= this.loadCounts()
    return (await this.counts).get(name) ?? 0
  }

  /*
   * Moves every data sheet from the attribute's name to `name`, renaming the
   * attribute along with them. When an attribute of that name already exists,
   * the sheets move over to it and the renamed one is removed. Returns the
   * attribute the sheets now carry.
   */
  async rename(attribute: ExhibitAttribute, name: string): Promise<ExhibitAttribute> {
    const oldName = attribute.name
    const ids = await this.exhibitIdsUsing(oldName)
    const exhibits = ids.length ? await this.em.find(Exhibit, { id: { $in: ids } }) : []
    for (const exhibit of exhibits) {
      exhibit.attributes = exhibit.attributes?.map(([key, value]) =>
        key === oldName ? [name, value] : [key, value],
      )
    }
    const existing = await this.findOne({ name, id: { $ne: attribute.id } })
    if (existing) {
      this.em.remove(attribute)
    } else {
      attribute.name = name
    }
    await this.em.flush()
    this.counts = undefined
    return existing ?? attribute
  }
}
