import { EntityRepository } from '@mikro-orm/postgresql'
import { ExhibitAttribute } from './entity.js'

export class ExhibitAttributeRepository extends EntityRepository<ExhibitAttribute> {}
