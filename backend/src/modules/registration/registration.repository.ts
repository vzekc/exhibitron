import { EntityRepository } from '@mikro-orm/postgresql'
import { Registration, RegistrationStatus } from './registration.entity.js'
import { BaseEntity } from '../common/base.entity.js'
import {
  makeNewRegistrationEmail,
  makeNewRegistrationReceivedEmail,
  makeWelcomeEmail,
} from './emails.js'
import { sendEmail } from '../common/sendEmail.js'
import { User } from '../user/user.entity.js'
import { Exhibit } from '../exhibit/exhibit.entity.js'

export type RegistrationData = Omit<Registration, keyof BaseEntity>

// extending the EntityRepository exported from driver package, so we can access things like the QB factory
export class RegistrationRepository extends EntityRepository<Registration> {
  async register(data: RegistrationData) {
    const registration = this.create(data)
    await this.em.persist(registration).flush()
    if (process.env.ADMIN_EMAIL) {
      await sendEmail(
        makeNewRegistrationEmail([process.env.ADMIN_EMAIL], registration),
      )
      await sendEmail(makeNewRegistrationReceivedEmail(registration.email))
    } else {
      console.log('ADMIN_EMAIL not set, skipping email notification')
    }
    return registration
  }

  async approve(registration: Registration) {
    registration.status = RegistrationStatus.APPROVED
    const userRepository = this.em.getRepository(User)
    let user = await userRepository.lookup(registration.email)
    if (!user) {
      user = userRepository.create({
        email: registration.email,
        fullName: registration.name,
        isAdministrator: false,
        tables: [],
        exhibits: [],
      })
    } else {
      await userRepository.populate(user, ['exhibits'])
      if (!user.exhibits.find((e) => e.title === registration.topic)) {
        const exhibit = this.em.getRepository(Exhibit).create({
          title: registration.topic,
          exhibitor: user,
        })
        user.exhibits.add(exhibit)
        this.em.persist(exhibit)
      }
    }
    this.em.persist(user)
    await this.em.flush()
    await sendEmail(
      makeWelcomeEmail(
        registration.name,
        registration.email,
        'https://example.com',
      ),
    )
  }

  async reject(registration: Registration) {
    registration.status = RegistrationStatus.REJECTED
    await this.em.flush()
  }

  async inProgress(registration: Registration) {
    registration.status = RegistrationStatus.IN_PROGRESS
    await this.em.flush()
  }
}
