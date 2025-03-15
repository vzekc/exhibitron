import { Entity, PrimaryKey, Property } from '@mikro-orm/core'
import { FastifySessionObject } from '@fastify/session'

@Entity()
export class Session {
  @PrimaryKey()
  sid!: string

  @Property({ type: 'json' })
  sess!: FastifySessionObject

  @Property({ type: 'datetime' })
  expire!: Date
}
