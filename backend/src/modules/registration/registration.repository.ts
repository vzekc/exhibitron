import { EntityRepository } from '@mikro-orm/postgresql'
import { Registration } from './registration.entity.js'
import { RegistrationStatus } from '../../generated/graphql.js'
import { BaseEntity } from '../common/base.entity.js'
import {
  makeNewRegistrationEmail,
  makeNewRegistrationReceivedEmail,
  makeWelcomeEmail,
} from './emails.js'
import { sendEmail } from '../common/sendEmail.js'
import { User } from '../user/user.entity.js'
import { Exhibit } from '../exhibit/exhibit.entity.js'
import { Exhibitor } from '../exhibitor/exhibitor.entity.js'

export type RegistrationData = Omit<Registration, keyof BaseEntity | 'notes'>

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

  async approve(registration: Registration, siteUrl: string) {
    registration.status = RegistrationStatus.Approved
    const userRepository = this.em.getRepository(User)
    let user = await userRepository.lookup(registration.email)
    let completeProfileUrl = `${siteUrl}/profile`
    if (!user) {
      user = userRepository.create({
        email: registration.email,
        fullName: registration.name,
        isAdministrator: false,
      })
      this.em.getRepository(Exhibitor).create({
        exhibition: registration.exhibition,
        user,
      })
      completeProfileUrl = `${siteUrl}/profile?token=${user.passwordResetToken}`
    } else {
      let exhibitor: Exhibitor | null = await this.em.getRepository(Exhibitor).findOne({
        user,
        exhibition: registration.exhibition,
      }, { populate: ['exhibits'] })
      if (!exhibitor) {
        exhibitor = this.em.getRepository(Exhibitor).create({
          exhibition: registration.exhibition,
          user,
        })
        this.em.persist(exhibitor)
      } else if (
        !exhibitor.exhibits.find((e) => e.title === registration.topic)
      ) {
        const exhibit = this.em.getRepository(Exhibit).create({
          exhibition: registration.exhibition,
          title: registration.topic,
          exhibitor,
        })
        exhibitor.exhibits.add(exhibit)
        this.em.persist(exhibit)
      }
    }
    this.em.persist(user)
    await this.em.flush()
    await sendEmail(
      makeWelcomeEmail(
        registration.name,
        registration.email,
        completeProfileUrl,
      ),
    )
  }

  async reject(registration: Registration) {
    registration.status = RegistrationStatus.Rejected
    await this.em.flush()
  }

  async inProgress(registration: Registration) {
    registration.status = RegistrationStatus.InProgress
    await this.em.flush()
  }
}
