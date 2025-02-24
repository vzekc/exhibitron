import { EntityRepository } from '@mikro-orm/postgresql'
import { Registration } from './registration.entity.js'
import { BaseEntity } from '../common/base.entity.js'
import { makeNewRegistrationEmail } from './emails.js'
import { sendEmail } from '../common/sendEmail.js'
import { User } from '../user/user.entity.js'

export type RegistrationData = Omit<Registration, keyof BaseEntity>

// extending the EntityRepository exported from driver package, so we can access things like the QB factory
export class RegistrationRepository extends EntityRepository<Registration> {
  async register(data: RegistrationData) {
    const registration = this.create(data)
    await this.em.persist(registration).flush()
    const admins = await this.em
      .getRepository(User)
      .getEventAdmins(registration.eventId)
    await sendEmail(
      makeNewRegistrationEmail(
        admins.map(({ email }) => email),
        registration,
      ),
    )
  }
}
