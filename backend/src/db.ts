import { EntityManager, MikroORM, Options } from '@mikro-orm/postgresql'
import config from './mikro-orm.config.js'
import { UserRepository } from './modules/user/user.repository.js'
import { ExhibitRepository } from './modules/exhibit/exhibit.repository.js'
import { Exhibit } from './modules/exhibit/exhibit.entity.js'
import { Table } from './modules/table/table.entity.js'
import { TableRepository } from './modules/table/table.repository.js'
import { User } from './modules/user/user.entity.js'
import { Registration } from './modules/registration/registration.entity.js'
import { RegistrationRepository } from './modules/registration/registration.repository.js'

export interface Services {
  orm: MikroORM
  em: EntityManager
  user: UserRepository
  exhibit: ExhibitRepository
  table: TableRepository
  registration: RegistrationRepository
}

let cache: Services

export async function initORM(options?: Options): Promise<Services> {
  if (cache) {
    return cache
  }

  const orm = await MikroORM.init({
    ...config,
    ...options,
  })

  // save to cache before returning
  return (cache = {
    orm,
    em: orm.em,
    user: orm.em.getRepository(User),
    exhibit: orm.em.getRepository(Exhibit),
    table: orm.em.getRepository(Table),
    registration: orm.em.getRepository(Registration),
  })
}
