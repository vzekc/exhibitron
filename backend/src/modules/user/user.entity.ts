import {
  BeforeCreate,
  BeforeUpdate,
  Collection,
  Embeddable,
  Embedded,
  Entity,
  EntityRepositoryType,
  EventArgs,
  OneToMany,
  Property,
} from '@mikro-orm/core';
import { BaseEntity } from '../common/base.entity.js';
import { hash, verify } from 'argon2';
import { UserRepository } from './user.repository.js';
import { Exhibition } from '../exhibition/exhibition.entity.js';
import { Table } from '../exhibition/table.entity.js';

@Embeddable()
export class Contacts {
  @Property()
  mastodon?: string;

  @Property()
  phone?: string;

  @Property()
  email?: string;

  @Property()
  website?: string;

  @Property()
  twitter?: string;

  @Property()
  facebook?: string;

  @Property()
  linkedin?: string;
}

@Entity({ repository: () => UserRepository })
export class User extends BaseEntity<'isAdministrator' | 'fullName' | 'bio'> {
  // for automatic inference via `em.getRepository(User)`
  [EntityRepositoryType]?: UserRepository;

  @Property({ persist: false })
  token?: string;

  @Property()
  fullName: string = '';

  @Property({ unique: true, index: true })
  username!: string;

  @Property({ lazy: true })
  password!: string;

  @Property({ type: 'text' })
  bio: string = '';

  @Property()
  isAdministrator: boolean = false;

  @Embedded(() => Contacts, { object: true })
  contacts?: Contacts;

  @OneToMany({ mappedBy: 'exhibitor' })
  exhibitions = new Collection<Exhibition>(this);

  @OneToMany({ mappedBy: 'exhibitor' })
  tables = new Collection<Table>(this);

  constructor(username: string, password: string) {
    super();
    this.username = username;
    this.password = password; // keep plain text, will be hashed via hooks
  }

  @BeforeCreate()
  @BeforeUpdate()
  async hashPassword(args: EventArgs<User>) {
    // hash only if the password was changed
    const password = args.changeSet?.payload.password;

    if (password) {
      this.password = await hash(password);
    }
  }

  async verifyPassword(password: string) {
    return verify(this.password, password);
  }
}
