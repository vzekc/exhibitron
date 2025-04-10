import { EntityRepository } from '@mikro-orm/core'
import { Host } from './entity.js'

export class HostRepository extends EntityRepository<Host> {}
