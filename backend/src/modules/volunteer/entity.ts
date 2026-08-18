import {
  Collection,
  Entity,
  EntityRepositoryType,
  Index,
  ManyToOne,
  OneToMany,
  Property,
  Unique,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Exhibition } from '../exhibition/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Document } from '../document/entity.js'
import { User } from '../user/entity.js'
import { VolunteerRepository } from './repository.js'

/*
 * Work that needs helpers: the Elektro-Aufbau, the Infotresen, the Fotofix.
 * `summary` is the line that always stands under the name; `description` is
 * the long text a visitor unfolds when they want to know what they are
 * letting themselves in for.
 */
@Entity({ repository: () => VolunteerRepository })
@Unique({ properties: ['exhibition', 'key'] })
export class VolunteerActivity extends BaseEntity<'ordering'> {
  [EntityRepositoryType]?: VolunteerRepository

  @ManyToOne(() => Exhibition)
  exhibition!: Exhibition

  @Property()
  key!: string

  @Property()
  name!: string

  @Property()
  summary!: string

  @ManyToOne(() => Document, { nullable: true })
  description?: Document

  /* Who to ask, and who hears about a shift dropped at short notice. */
  @ManyToOne(() => Exhibitor, { nullable: true })
  contact?: Exhibitor

  @Property()
  ordering: number = 0

  @OneToMany(() => VolunteerPeriod, (period) => period.activity)
  periods = new Collection<VolunteerPeriod>(this)
}

/*
 * A stretch of time in which an activity needs help. `neededCount` is a target
 * rather than a limit — a period that already has enough people still accepts
 * another volunteer, and the calendar paints that as its own state. Unset
 * means as many as register.
 */
@Entity()
export class VolunteerPeriod extends BaseEntity {
  @ManyToOne(() => VolunteerActivity, { deleteRule: 'cascade' })
  activity!: VolunteerActivity

  @Property()
  startTime!: Date

  @Property()
  durationMinutes!: number

  @Property({ nullable: true })
  neededCount?: number

  @OneToMany(() => VolunteerBooking, (booking) => booking.period)
  bookings = new Collection<VolunteerBooking>(this)
}

/*
 * One person helping for part of a period. The times are the volunteer's own
 * choice inside the period, aligned to quarter hours.
 *
 * The two stamps are what keep the reminder job idempotent across restarts:
 * a mail that went out leaves its date behind, and the next run passes the
 * booking by.
 */
@Entity()
export class VolunteerBooking extends BaseEntity {
  @ManyToOne(() => VolunteerPeriod, { deleteRule: 'cascade' })
  period!: VolunteerPeriod

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User

  @Index()
  @Property()
  startTime!: Date

  @Property()
  durationMinutes!: number

  @Property({ nullable: true })
  reminderSentAt?: Date

  @Property({ nullable: true })
  digestSentAt?: Date
}
