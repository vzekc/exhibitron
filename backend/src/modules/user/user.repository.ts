// src/modules/user/user.repository.ts
import { EntityRepository } from '@mikro-orm/postgresql'
import { wrap } from '@mikro-orm/core'
import { User } from './user.entity.js'
import { AuthError } from '../common/errors.js'

import pino from 'pino'

// @ts-expect-error ts2349
const logger = pino()

export class UserRepository extends EntityRepository<User> {
  async exists(username: string) {
    logger.info(`Checking if user exists: ${username}`)
    const count = await this.count({ username })
    return count > 0
  }

  async login(username: string, password: string) {
    logger.info(`Attempting login for user: ${username}`)
    const err = new AuthError('Invalid combination of username and password')
    const user = await this.findOneOrFail(
      { username },
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
    const where = id.match(/^\d+$/) ? { id: +id } : { username: id }
    return await this.findOneOrFail(where, {
      populate: ['tables', 'exhibits'],
    })
  }

  async ensureUser(username: string, isAdministrator: boolean) {
    let user = await this.findOne({ username })
    if (user) {
      logger.debug(`ensureUser found existing user: ${username}`)
      wrap(user).assign({ isAdministrator })
    } else {
      logger.info(`ensureUser created user: ${username}`)
      user = this.create({ username, isAdministrator })
    }
    return user
  }
}
