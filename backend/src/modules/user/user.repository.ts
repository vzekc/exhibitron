// src/modules/user/user.repository.ts
import { EntityRepository } from '@mikro-orm/postgresql'
import { NotFoundError } from '@mikro-orm/core'
import { User } from './user.entity.js'
import { AuthError } from '../common/errors.js'
import { match, P } from 'ts-pattern'

import pino from 'pino'

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
    const user = await this.findOneOrFail(
      { email },
      {
        populate: ['password'],
        failHandler: () => err,
      },
    )

    if (await user.verifyPassword(password)) {
      return user
    }

    throw err
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

  async requestPasswordReset(email: string) {
    const user = await this.findOneOrFail({ email })
    user.passwordResetToken = Math.random().toString(36).slice(2)
    user.paswordResetTokenExpires = new Date(Date.now() + 3600000)
    await this.getEntityManager().flush()
    return user.passwordResetToken
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getEventAdmins(_eventId: string) {
    // fixme need to check event id
    return this.em.getRepository(User).find({
      $and: [{ isAdministrator: true }],
    })
  }
}
