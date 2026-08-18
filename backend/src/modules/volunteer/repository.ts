import { EntityRepository } from '@mikro-orm/core'
import { VolunteerActivity } from './entity.js'

export class VolunteerRepository extends EntityRepository<VolunteerActivity> {}
