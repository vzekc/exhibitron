// src/modules/user/user.repository.ts
import { EntityRepository } from '@mikro-orm/postgresql'
import { NotFoundError } from '@mikro-orm/core'
import { User } from './user.entity.js'
import { AuthError, PermissionDeniedError } from '../common/errors.js'
import { match, P } from 'ts-pattern'

import pino from 'pino'
import { sendEmail } from '../common/sendEmail.js'
import { makePasswordResetEmail } from '../registration/emails.js'

// @ts-expect-error ts2349
const logger = pino()

export class UserRepository extends EntityRepository<User> {
  async exists(email: string) {
    logger.info(`Checking if user exists: ${email}`)
    const count = await this.count({ email })
    return count > 0
  }

  async login(email: string, password: string) {
    logger.info(`Attempting login for user: ${email}`)
    const err = new AuthError(
      'Invalid combination of email address and password',
    )

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
    logger.info(`Looking up user by id: ${id}`)
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

  async ensureVzEkCUser(
    nickname: string,
    email: string,
    isAdministrator: boolean,
  ) {
    let user = await this.findOne({ nickname })
    if (user) {
      logger.debug(
        `ensureUser found existing user: @{user.nickname} (${user.email})`,
      )
      if (isAdministrator) {
        // Administrator rights are only granted, but never revoked from the forum
        user.isAdministrator = true
      }
    } else {
      logger.info(`ensureUser created user: @{nickname} (${email})`)
      user = this.create({ nickname, email, isAdministrator })
      this.getEntityManager().persist(user)
    }
    await this.getEntityManager().flush()
    return user
  }

  async requestPasswordReset(email: string, resetUrl: string) {
    const user = await this.findOne({ email })
    if (user) {
      logger.info(`Requested password reset for user: ${email}`)
      user.passwordResetToken = Math.random().toString(36).slice(2)
      user.passwordResetTokenExpires = new Date(Date.now() + 3600000)
      await this.getEntityManager().flush()
      await sendEmail(
        makePasswordResetEmail(user.email, resetUrl + user.passwordResetToken),
      )
    } else {
      logger.warn(`Password reset requested for unknown user: ${email}`)
    }
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
    user.password = password
    user.passwordResetToken = undefined
    user.passwordResetTokenExpires = undefined
    await this.getEntityManager().flush()
  }
}
