import { Collection, Entity, EntityRepositoryType, OneToMany, Property } from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { ExhibitionRepository } from './repository.js'
import { Exhibit, Exhibitor, Table } from '../../entities.js'
import { Page } from '../page/entity.js'

@Entity({ repository: () => ExhibitionRepository })
export class Exhibition extends BaseEntity {
  [EntityRepositoryType]?: ExhibitionRepository
  @Property({ unique: true })
  key!: string

  @Property()
  title!: string

  @Property()
  hostMatch!: string

  @OneToMany(() => Table, (table) => table.exhibition)
  tables: Collection<Table> = new Collection<Table>(this)

  @OneToMany(() => Exhibit, (exhibit) => exhibit.exhibition)
  exhibits: Collection<Exhibit> = new Collection<Exhibit>(this)

  @OneToMany(() => Exhibitor, (exhibitor) => exhibitor.exhibition)
  exhibitors: Collection<Exhibitor> = new Collection<Exhibitor>(this)

  @OneToMany(() => Page, (page) => page.exhibition)
  pages: Collection<Page> = new Collection<Page>(this)
}
