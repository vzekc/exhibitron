import { EntityRepository } from '@mikro-orm/postgresql'
import { NotFoundError } from '@mikro-orm/core'
import { User } from './entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Registration } from '../registration/entity.js'
import { PermissionDeniedError } from '../common/errors.js'
import { match, P } from 'ts-pattern'
import { logger } from '../../app/logger.js'
import { sendEmail } from '../common/sendEmail.js'
import { makePasswordResetEmail } from '../registration/emails.js'
import { hash } from 'argon2'
import { RegistrationStatus } from '../../generated/graphql.js'

type AssociateForumUserResult = User | 'needsSetup' | null

type AssociateForumUserOptions = {
  nickname: string
  isAdministrator: boolean
  registrationToken?: string
}

export class UserRepository extends EntityRepository<User> {
  async exists(email: string) {
    logger.info(`Checking if user exists: ${email}`)
    const count = await this.count({ email })
    return count > 0
  }

  async login(email: string, password: string) {
    logger.debug(`Attempting login for user: ${email}`)
    const user = await this.findOne(
      { email },
      {
        populate: ['password'],
      },
    )

    if (!user) {
      logger.info(`User not found: ${email}`)
      return null
    }

    if (await user.verifyPassword(password)) {
      return user
    }

    return null
  }

  async lookup(id: string) {
    logger.debug(`Looking up user by id: ${id}`)
    return await this.findOne(
      match(id)
        .with(P.string.regex(/^\d+$/), () => ({ id: +id }))
        .with(P.string.regex(/.+@.+\..+/), () => ({ email: id }))
        .otherwise(() => ({ passwordResetToken: id })),
    )
  }

  async lookupOrFail(id: string) {
    const user = await this.lookup(id)
    if (!user) {
      throw new NotFoundError(`User not found: ${id}`)
    }
    return user
  }

  async associateForumUser(options: AssociateForumUserOptions): Promise<AssociateForumUserResult> {
    const { nickname, isAdministrator, registrationToken } = options
    const em = this.getEntityManager()

    if (registrationToken) {
      const tokenUser = await this.findOne({ passwordResetToken: registrationToken })
      if (!tokenUser) return null

      const nicknameUser = await this.findOne({ nickname })

      if (nicknameUser && nicknameUser.id !== tokenUser.id) {
        // The forum nickname already belongs to a different user — merge accounts.
        // The nicknameUser is canonical (returning exhibitor), tokenUser is a duplicate
        // created because they re-registered with a different email.
        logger.info(
          `Merging user ${tokenUser.id} (${tokenUser.email}) into user ${nicknameUser.id} (${nicknameUser.email}, nickname ${nickname})`,
        )

        const exhibitors = await em.getRepository(Exhibitor).find({ user: tokenUser })
        for (const exhibitor of exhibitors) {
          exhibitor.user = nicknameUser
        }

        nicknameUser.email = tokenUser.email
        if (!nicknameUser.fullName && tokenUser.fullName) {
          nicknameUser.fullName = tokenUser.fullName
        }
        if (isAdministrator) {
          nicknameUser.isAdministrator = true
        }

        em.remove(tokenUser)
        await em.flush()
        return nicknameUser
      }

      // No conflict — normal token-based association
      logger.debug(
        `Associating forum user ${nickname} with user ${tokenUser.id} (${tokenUser.email})`,
      )
      tokenUser.nickname = nickname
      if (isAdministrator) {
        tokenUser.isAdministrator = true
      }
      await this.populate(tokenUser, ['passwordResetToken', 'passwordResetTokenExpires'])
      delete tokenUser.passwordResetToken
      delete tokenUser.passwordResetTokenExpires
      await em.flush()
      return tokenUser
    }

    // No registration token — returning forum login
    const user = await this.findOne({ nickname })
    if (user) {
      logger.debug(`Forum login for existing user: ${user.nickname} (${user.email})`)
      if (isAdministrator) {
        user.isAdministrator = true
      }
      await em.flush()
      return user
    }

    // No user found by nickname — check if there's an approved registration with this
    // nickname whose user hasn't completed setup yet (case-insensitive match).
    const registration = await em.getRepository(Registration).findOne(
      {
        nickname: { $ilike: nickname },
        status: RegistrationStatus.Approved,
      },
      { populate: ['email'] },
    )
    if (registration) {
      const registeredUser = await this.findOne({ email: registration.email })
      if (registeredUser) {
        logger.info(
          `Forum user ${nickname} has approved registration but hasn't completed setup (user ${registeredUser.id}, ${registeredUser.email})`,
        )
        return 'needsSetup'
      }
    }

    return null
  }

  async tokenToUser(token: string) {
    logger.debug(`Looking up user by token: ${token}`)
    return await this.findOneOrFail({ passwordResetToken: token })
  }

  createPasswordResetToken(user: User, expires: number) {
    logger.info(`Requested password reset for user: ${user.email}`)
    user.passwordResetToken = Math.random().toString(36).slice(2)
    user.passwordResetTokenExpires = new Date(expires)
  }

  async requestPasswordReset(email: string, resetUrl: string) {
    const user = await this.findOne({ email })
    if (user) {
      this.createPasswordResetToken(user, Date.now() + 3600000)
      await this.getEntityManager().flush()
      await sendEmail(makePasswordResetEmail(user.email, resetUrl + user.passwordResetToken))
    } else {
      logger.warn(`Password reset requested for unknown user: ${email}`)
    }
  }

  async setPassword(user: User, password: string) {
    user.password = await hash(password)
    await this.getEntityManager().flush()
  }

  async resetPassword(token: string, password: string) {
    const user = await this.findOne(
      { passwordResetToken: token },
      { populate: ['passwordResetToken', 'passwordResetTokenExpires'] },
    )
    if (!user || !user.passwordResetToken || !user.passwordResetTokenExpires) {
      throw new PermissionDeniedError('Invalid password reset token')
    }
    if (user.passwordResetTokenExpires < new Date()) {
      throw new PermissionDeniedError('Password reset token expired')
    }
    await this.setPassword(user, password)
    user.passwordResetToken = undefined
    user.passwordResetTokenExpires = undefined
    await this.getEntityManager().flush()
  }
}
