import { Entity, Index, ManyToOne, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core'
import { Exhibitor } from '../exhibitor/entity.js'

/*
 * What lets fotofix-serial, the command-line client, speak for an exhibitor.
 *
 * The browser page needs none of this: it is already inside a session. The
 * client is a binary on somebody's laptop with no way to hold one, so it
 * carries a token instead — generated here, shown once, and good for the
 * months between now and the exhibition.
 *
 * Only the hash is kept. Somebody reading this table cannot connect with what
 * they find in it, and an exhibitor who loses their token generates another
 * rather than being told the old one.
 */
@Entity()
export class SerialToken {
  [OptionalProps]?: 'createdAt' | 'lastUsedAt' | 'revokedAt'

  @PrimaryKey()
  id!: number

  @ManyToOne()
  exhibitor!: Exhibitor

  /* SHA-256 of the token, which is what a connection is checked against. */
  @Property({ length: 64 })
  @Index()
  tokenHash!: string

  /* The first characters of the token, so a list can be read and recognised. */
  @Property({ length: 16 })
  prefix!: string

  /* The exhibitor's own name for it — "thinkpad at home". */
  @Property({ length: 100 })
  label!: string

  @Property()
  createdAt: Date = new Date()

  @Property()
  expiresAt!: Date

  /* What tells an exhibitor which of their tokens is the one still in use. */
  @Property({ nullable: true })
  lastUsedAt?: Date

  @Property({ nullable: true })
  revokedAt?: Date
}
