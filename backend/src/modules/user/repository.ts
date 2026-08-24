import { EntityRepository } from '@mikro-orm/postgresql'
import { NotFoundError } from '@mikro-orm/core'
import { ProfileImage, User } from './entity.js'
import { Exhibitor } from '../exhibitor/entity.js'
import { Registration } from '../registration/entity.js'
import { VolunteerBooking } from '../volunteer/entity.js'
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
  /*
   * The address the forum holds, and permission to open an account with it.
   * Somebody who comes to help has no reason to be an exhibitor first, so the
   * volunteer pages ask for this; every other way in still expects the account
   * to be there already.
   */
  email?: string
  createIfMissing?: boolean
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

  /*
   * The forum is the authority on how a name is spelled and may hand it back
   * in a different case than the one stored here, so the name is matched
   * without regard to case. `%` and `_` are literal characters in a forum
   * name and are escaped to stay that way.
   */
  async findByNickname(nickname: string) {
    return await this.findOne({ nickname: { $ilike: nickname.replace(/[\\%_]/g, '\\$&') } })
  }

  async associateForumUser(options: AssociateForumUserOptions): Promise<AssociateForumUserResult> {
    const { nickname, isAdministrator, registrationToken, email, createIfMissing } = options
    const em = this.getEntityManager()

    if (registrationToken) {
      const tokenUser = await this.findOne({ passwordResetToken: registrationToken })
      if (!tokenUser) return null

      const nicknameUser = await this.findByNickname(nickname)

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

        /* The shifts belong to the person, and the row they hang from is about
           to go; its delete rule would take them along. */
        const bookings = await em.getRepository(VolunteerBooking).find({ user: tokenUser })
        for (const booking of bookings) {
          booking.user = nicknameUser
        }

        await em.populate(tokenUser, ['adminExhibitions'])
        await em.populate(nicknameUser, ['adminExhibitions'])
        for (const exhibition of tokenUser.adminExhibitions) {
          nicknameUser.adminExhibitions.add(exhibition)
        }

        /* A picture is held by a key that keeps the row it hangs from alive,
           and one account carries at most one. It moves across where there is
           room for it and goes with the account otherwise. */
        const images = em.getRepository(ProfileImage)
        const duplicateImage = await images.findOne({ user: tokenUser })
        if (duplicateImage) {
          if (await images.findOne({ user: nicknameUser })) {
            em.remove(duplicateImage)
          } else {
            duplicateImage.user = nicknameUser
          }
        }

        /* What the surviving row takes over: the address the person registered
           with, and the date that address was shown to be theirs. */
        const {
          email: adoptedEmail,
          fullName: adoptedFullName,
          emailVerifiedAt: adoptedVerifiedAt,
        } = tokenUser

        /* The duplicate is written away in a flush of its own, so that the
           address is free when the surviving row takes it. A single flush
           orders the update ahead of the delete and both rows would hold the
           address at once, which the unique index refuses. */
        em.remove(tokenUser)
        await em.flush()

        nicknameUser.email = adoptedEmail
        nicknameUser.emailVerifiedAt = adoptedVerifiedAt
        if (!nicknameUser.fullName && adoptedFullName) {
          nicknameUser.fullName = adoptedFullName
        }
        if (isAdministrator) {
          nicknameUser.isAdministrator = true
        }
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
    const user = await this.findByNickname(nickname)
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
    if (createIfMissing && email) {
      /* An account may exist under this address without the forum name on it
         yet — an exhibitor who registered by hand. Then the two are the same
         person and the name is simply added. */
      const byEmail = await this.findOne({ email })
      if (byEmail?.nickname && byEmail.nickname !== nickname) {
        /* That address belongs to somebody who signs in under another forum
           name. Two people, one address — nothing to do here automatically. */
        logger.warn(
          `Forum user ${nickname} has the address of ${byEmail.nickname}; not opening an account`,
        )
        return null
      }
      if (byEmail) {
        logger.info(`Linking forum user ${nickname} to the account of ${email}`)
        byEmail.nickname = nickname
        byEmail.emailVerifiedAt ??= new Date()
        if (isAdministrator) byEmail.isAdministrator = true
        await em.flush()
        return byEmail
      }

      logger.info(`Opening an account for forum user ${nickname} (${email})`)
      const created = this.create({
        email,
        fullName: nickname,
        nickname,
        isAdministrator,
      })
      /* The forum has the address confirmed already. */
      created.emailVerifiedAt = new Date()
      await em.persistAndFlush(created)
      return created
    }

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
