import { EntityRepository } from '@mikro-orm/postgresql'
import { Exhibition } from './exhibition.entity.js'

export class ExhibitionRepository extends EntityRepository<Exhibition> {}
