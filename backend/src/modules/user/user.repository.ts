// src/modules/user/user.repository.ts
import { EntityRepository } from '@mikro-orm/postgresql'
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
    return await this.findOneOrFail(
      match(id)
        .with(P.string.regex(/^\d+$/), () => ({ id: +id }))
        .with(P.string.regex(/.+@.+\..+/), () => ({ email: id }))
        .otherwise(() => ({ nickname: id })),
      {
        populate: ['tables', 'exhibits'],
      },
    )
  }

  async ensureUser(nickname: string, email: string, isAdministrator: boolean) {
    let user = await this.findOne({ email })
    if (user) {
      logger.debug(`ensureUser found existing user: @{nickname} (${email})`)
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getEventAdmins(_eventId: string) {
    // fixme need to check event id
    return this.em.getRepository(User).find({
      $and: [{ isAdministrator: true }],
    })
  }
}
