import { Collection, Entity, ManyToOne, OneToMany, ManyToMany, Property } from '@mikro-orm/core'
import { User } from '../user/entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibit } from '../exhibit/entity.js'
import { Table } from '../table/entity.js'
import { ConferenceSession } from '../conferenceSession/entity.js'
import { Host } from '../host/entity.js'

@Entity()
export class Exhibitor extends BaseEntity<'showsVisitorPhotos'> {
  @ManyToOne()
  exhibition!: Exhibition

  @ManyToOne()
  user!: User

  @Property({ nullable: true })
  topic?: string

  /*
   * Set by the exhibitor: their table can show a visitor's photo, so the photo
   * booth may send people to it. Without this the trail slip would print table
   * numbers at random and send visitors to machines with nothing to show.
   */
  @Property({ default: false })
  showsVisitorPhotos: boolean = false

  @OneToMany({ mappedBy: 'exhibitor' })
  exhibits = new Collection<Exhibit>(this)

  @OneToMany({ mappedBy: 'exhibitor' })
  tables = new Collection<Table>(this)

  @ManyToMany(() => ConferenceSession, (conferenceSession) => conferenceSession.exhibitors)
  conferenceSessions = new Collection<ConferenceSession>(this)

  @OneToMany(() => Host, (hostname) => hostname.exhibitor)
  hostnames = new Collection<Host>(this)
}
