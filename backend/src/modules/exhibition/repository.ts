import { EntityRepository } from '@mikro-orm/postgresql'
import { Exhibition } from './entity.js'

export class ExhibitionRepository extends EntityRepository<Exhibition> {}
