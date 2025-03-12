import { OptionalProps, PrimaryKey, Property } from '@mikro-orm/core'

export abstract class BaseEntity<Optional = never> {
  [OptionalProps]?: 'createdAt' | 'updatedAt' | Optional

  @PrimaryKey()
  id!: number

  @Property()
  createdAt = new Date()

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date
}
