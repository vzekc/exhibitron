import {
  EntityManager,
  EntityRepository,
  MikroORM,
  Options,
} from '@mikro-orm/postgresql'
import config from './mikro-orm.config.js'
import { UserRepository } from './modules/user/user.repository.js'
import { ExhibitRepository } from './modules/exhibit/exhibit.repository.js'
import { Exhibit } from './modules/exhibit/exhibit.entity.js'
import { Table } from './modules/table/table.entity.js'
import { TableRepository } from './modules/table/table.repository.js'
import { User } from './modules/user/user.entity.js'
import { Registration } from './modules/registration/registration.entity.js'
import { RegistrationRepository } from './modules/registration/registration.repository.js'
import { Exhibitor } from './modules/exhibitor/exhibitor.entity.js'
import { ExhibitionRepository } from './modules/exhibition/exhibition.repository.js'
import { Exhibition } from './modules/exhibition/exhibition.entity.js'

export interface Services {
  orm: MikroORM
  em: EntityManager
  user: UserRepository
  exhibit: ExhibitRepository
  exhibitor: EntityRepository<Exhibitor>
  exhibition: ExhibitionRepository
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
    exhibitor: orm.em.getRepository(Exhibitor),
    exhibition: orm.em.getRepository(Exhibition),
    table: orm.em.getRepository(Table),
    registration: orm.em.getRepository(Registration),
  })
}
