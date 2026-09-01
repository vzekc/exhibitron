import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  ManyToMany,
  Property,
} from '@mikro-orm/core'
import { User } from '../user/entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibit } from '../exhibit/entity.js'
import { Table } from '../table/entity.js'
import { ConferenceSession } from '../conferenceSession/entity.js'
import { Host } from '../host/entity.js'
import { ExhibitorRepository } from './repository.js'

@Entity({ repository: () => ExhibitorRepository })
export class Exhibitor extends BaseEntity<'nameTagShowNickname'> {
  [EntityRepositoryType]?: ExhibitorRepository

  @ManyToOne()
  exhibition!: Exhibition

  @ManyToOne()
  user!: User

  @Property({ nullable: true })
  topic?: string

  // Name to print on the name tag.  Falls back to the user's fullName when unset.
  @Property({ nullable: true })
  nameTagName?: string

  @Property()
  nameTagShowNickname: boolean = true

  @OneToMany({ mappedBy: 'exhibitor' })
  exhibits = new Collection<Exhibit>(this)

  @OneToMany({ mappedBy: 'exhibitor' })
  tables = new Collection<Table>(this)

  @ManyToMany(() => ConferenceSession, (conferenceSession) => conferenceSession.exhibitors)
  conferenceSessions = new Collection<ConferenceSession>(this)

  @OneToMany(() => Host, (hostname) => hostname.exhibitor)
  hostnames = new Collection<Host>(this)
}
