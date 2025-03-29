import {
  Entity,
  OptionalProps,
  PrimaryKey,
  Property,
  BeforeCreate,
  BeforeUpdate,
  AfterCreate,
  AfterUpdate,
} from '@mikro-orm/core'

@Entity({ abstract: true })
export abstract class BaseEntity<Optional = never> {
  [OptionalProps]?: 'createdAt' | 'updatedAt' | Optional

  @PrimaryKey()
  id!: number

  @Property()
  createdAt = new Date()

  @Property({ nullable: true, onUpdate: () => new Date() })
  updatedAt?: Date

  @BeforeCreate()
  beforeCreateBase(): void {}

  @AfterCreate()
  afterCreateBase(): void {}

  @BeforeUpdate()
  beforeUpdateBase(): void {}

  @AfterUpdate()
  afterUpdateBase(): void {}
}
