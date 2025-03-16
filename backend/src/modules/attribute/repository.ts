import { EntityRepository } from '@mikro-orm/postgresql'
import { Attribute } from './entity.js'

export class AttributeRepository extends EntityRepository<Attribute> {}
