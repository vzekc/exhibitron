import { EntityRepository } from '@mikro-orm/postgresql'
import { Registration } from './entity.js'
import { RegistrationStatus } from '../../generated/graphql.js'
import { BaseEntity } from '../common/base.entity.js'
import {
  makeNewRegistrationEmail,
  makeNewRegistrationReceivedEmail,
  makeWelcomeEmail,
} from './emails.js'
import { sendEmail } from '../common/sendEmail.js'
import { User } from '../user/entity.js'
import { Exhibitor } from '../exhibitor/entity.js'

export type RegistrationData = Omit<Registration, keyof BaseEntity | 'notes'>

// extending the EntityRepository exported from driver package, so we can access things like the QB factory
export class RegistrationRepository extends EntityRepository<Registration> {
  async register(data: RegistrationData) {
    const registration = this.create(data)
    await this.em.persist(registration).flush()
    if (process.env.ADMIN_EMAIL) {
      await sendEmail(makeNewRegistrationEmail([process.env.ADMIN_EMAIL], registration))
      await sendEmail(makeNewRegistrationReceivedEmail(registration.email))
    } else {
      console.log('ADMIN_EMAIL not set, skipping email notification')
    }
    return registration
  }

  async approve(registration: Registration, siteUrl: string, message?: string | null) {
    const userRepository = this.em.getRepository(User)
    const exhibitorRepository = this.em.getRepository(Exhibitor)

    let completeProfileUrl = `${siteUrl}/user/profile`

    registration.status = RegistrationStatus.Approved

    let user = await userRepository.lookup(registration.email)
    if (!user) {
      user = userRepository.create({
        email: registration.email,
        fullName: registration.name,
        isAdministrator: false,
      })
      userRepository.createPasswordResetToken(user, registration.exhibition.endDate.getTime())
      completeProfileUrl = `${siteUrl}/setupExhibitor?registrationToken=${user.passwordResetToken}`
      this.em.persist(user)
    }
    let exhibitor: Exhibitor | null = await exhibitorRepository.findOne(
      {
        user,
        topic: registration.topic.replace(/^Etwas anderes \((.*)\)$/, '$1'),
        exhibition: registration.exhibition,
      },
      { populate: ['exhibits'] },
    )
    if (!exhibitor) {
      exhibitor = exhibitorRepository.create({
        exhibition: registration.exhibition,
        user,
      })
      this.em.persist(exhibitor)
    }
    await this.em.flush()
    await sendEmail(
      makeWelcomeEmail(registration.name, registration.email, completeProfileUrl, message),
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
