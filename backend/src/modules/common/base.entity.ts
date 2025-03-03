import { OptionalProps, PrimaryKey, Property } from '@mikro-orm/core'

export abstract class BaseEntity<Optional = never> {
  [OptionalProps]?: 'createdAt' | 'updatedAt' | Optional

  @PrimaryKey()
  id!: number

  @Property({ hidden: true })
  createdAt = new Date()

  @Property({ hidden: true, nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date
}
