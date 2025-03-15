import {
  BeforeCreate,
  BeforeUpdate,
  Embeddable,
  Embedded,
  Entity,
  EntityRepositoryType,
  EventArgs,
  Property,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { hash, verify } from 'argon2'
import { UserRepository } from './repository.js'

@Embeddable()
export class Contacts {
  @Property()
  email?: string

  @Property()
  mastodon?: string

  @Property()
  phone?: string

  @Property()
  website?: string
}

@Entity({ repository: () => UserRepository })
export class User extends BaseEntity<
  'password' | 'isAdministrator' | 'fullName' | 'bio' | 'contacts'
> {
  // for automatic inference via `em.getRepository(User)`
  [EntityRepositoryType]?: UserRepository

  @Property({ unique: true, index: true })
  email!: string

  @Property()
  fullName: string = ''

  @Property({ unique: true, index: true })
  nickname?: string

  @Property({ persist: false })
  token?: string

  @Property({ lazy: true })
  password?: string

  @Property({ nullable: true, lazy: true, unique: true, index: true })
  passwordResetToken?: string

  @Property({ nullable: true, lazy: true })
  passwordResetTokenExpires?: Date

  @Property({ type: 'text' })
  bio: string = ''

  @Property()
  isAdministrator: boolean = false

  @Embedded(() => Contacts, { object: true })
  contacts: Contacts = {}

  constructor(email: string, password: string) {
    super()
    this.email = email
    this.password = password // keep plain text, will be hashed via hooks
  }

  @BeforeCreate()
  @BeforeUpdate()
  async hashPassword(args: EventArgs<User>) {
    // hash only if the password was changed
    const password = args.changeSet?.payload.password

    if (password) {
      this.password = await hash(password)
    }
  }

  async verifyPassword(password: string) {
    return this.password && verify(this.password, password)
  }
}
