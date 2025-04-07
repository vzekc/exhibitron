import { EntityRepository } from '@mikro-orm/core'
import { ConferenceSession } from './entity.js'

export class ConferenceSessionRepository extends EntityRepository<ConferenceSession> {}
