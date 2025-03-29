import {
  Embeddable,
  Embedded,
  Entity,
  EntityRepositoryType,
  Property,
  OneToOne,
  Cascade,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { verify } from 'argon2'
import { UserRepository } from './repository.js'
import { ImageStorage } from '../image/entity.js'

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

@Entity()
export class ProfileImage extends BaseEntity {
  @OneToOne(() => ImageStorage, { cascade: [Cascade.PERSIST], eager: true, deleteRule: 'cascade' })
  image!: ImageStorage

  @OneToOne(() => ImageStorage, {
    nullable: true,
    cascade: [Cascade.PERSIST],
    eager: true,
    deleteRule: 'cascade',
  })
  thumbnail?: ImageStorage

  @OneToOne(() => User)
  user!: User
}

@Entity({ repository: () => UserRepository })
export class User extends BaseEntity<
  'password' | 'isAdministrator' | 'fullName' | 'bio' | 'contacts'
> {
  // for automatic inference via `em.getRepository(User)`
  [EntityRepositoryType]?: UserRepository

  @Property({ unique: true, index: true, columnType: 'citext' })
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

  @OneToOne(() => ProfileImage, (image) => image.user)
  profileImage?: ProfileImage

  @Embedded(() => Contacts, { object: true })
  contacts: Contacts = {}

  constructor(email: string) {
    super()
    this.email = email
  }

  async verifyPassword(password: string) {
    return this.password && verify(this.password, password)
  }
}
