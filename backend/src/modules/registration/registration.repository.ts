import { EntityRepository } from '@mikro-orm/postgresql'
import { Registration } from './registration.entity.js'
import { BaseEntity } from '../common/base.entity.js'

export type RegistrationData = Omit<Registration, keyof BaseEntity>

// extending the EntityRepository exported from driver package, so we can access things like the QB factory
export class RegistrationRepository extends EntityRepository<Registration> {
  async register(data: RegistrationData) {
    const registration = this.create(data)
    return this.em.persist(registration).flush()
  }
}
