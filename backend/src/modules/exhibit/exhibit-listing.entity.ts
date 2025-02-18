import { Entity, EntityManager, Property } from '@mikro-orm/core'
import { Exhibit } from './exhibit.entity.js'

@Entity({
  expression: (em: EntityManager) => {
    return em.getRepository(Exhibit).listExhibitsQuery()
  },
})
export class ExhibitListing {
  @Property()
  id!: number

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

export const exhibitListingSchema = {
  description: 'An exhibit',
  type: 'object',
  properties: {
    id: {
      description: 'Unique id of the exhibit',
      type: 'number',
      examples: [1001, 1002, 1003],
    },
    title: {
      description: 'Title',
      type: 'string',
      examples: ['The first Macintosh', 'Old DEC systems', 'IBM Mainframes'],
    },
    description: {
      description: 'Description',
      type: 'string',
      examples: [
        'A display of the first Macintosh computer released by Apple in 1984.',
        'A collection of old DEC systems from the 1970s and 1980s.',
        'An exhibit showcasing IBM mainframes from the 1960s to the 1980s.',
      ],
    },
    exhibitorId: {
      description: 'User ID of the exhibitor',
      type: 'number',
      examples: [1002, 1003, 1004],
    },
    exhibitorName: {
      description: 'Name of the exhibitor',
      type: 'string',
      examples: ['Daffy Duck', 'Donald Duck', 'Mickey Mouse'],
    },
    table: {
      description: 'Table number, if assigned to a specific table',
      type: 'number',
      nullable: true,
      examples: [1, 2, 3],
    },
  },
  required: ['id', 'title', 'exhibitorId', 'exhibitorName'],
}
