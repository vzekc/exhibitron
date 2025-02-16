import { Entity, EntityManager, Property } from '@mikro-orm/core'
import { Exhibition } from './exhibition.entity.js'

@Entity({
  expression: (em: EntityManager) => {
    return em.getRepository(Exhibition).listExhibitionsQuery()
  },
})
export class ExhibitionListing {
  @Property()
  id!: string

  @Property()
  title!: string

  @Property()
  description!: string

  @Property()
  exhibitorId!: number

  @Property()
  exhibitorName!: string

  @Property()
  table?: number
}
