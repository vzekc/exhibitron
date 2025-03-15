import { EntityManager, EntityRepository, MikroORM, Options } from '@mikro-orm/postgresql'
import config from './mikro-orm.config.js'
import { UserRepository } from './modules/user/repository.js'
import { ExhibitRepository } from './modules/exhibit/repository.js'
import { Exhibit } from './modules/exhibit/entity.js'
import { Table } from './modules/table/entity.js'
import { TableRepository } from './modules/table/repository.js'
import { User } from './modules/user/entity.js'
import { Registration } from './modules/registration/entity.js'
import { RegistrationRepository } from './modules/registration/repository.js'
import { Exhibitor } from './modules/exhibitor/entity.js'
import { ExhibitionRepository } from './modules/exhibition/repository.js'
import { Exhibition } from './modules/exhibition/entity.js'
import { Page } from './modules/page/entity.js'
import { ImageRepository } from './modules/image/repository.js'
import { Image } from './modules/image/entity.js'

export interface Services {
  dbName?: string
  orm: MikroORM
  em: EntityManager
  user: UserRepository
  exhibit: ExhibitRepository
  exhibitor: EntityRepository<Exhibitor>
  exhibition: ExhibitionRepository
  table: TableRepository
  registration: RegistrationRepository
  page: EntityRepository<Page>
  image: ImageRepository
}

let cache: Services

export async function initORM(options?: Options): Promise<Services> {
  if (cache) {
    return cache
  }

  if (!options?.dbName && !process.env.DATABASE_URL) {
    throw new Error('Missing dbName and no DATABASE_URL in environment')
  }
  const orm = await MikroORM.init({
    ...config,
    ...options,
  })

  // save to cache before returning
  return (cache = {
    dbName: options?.dbName || undefined,
    orm,
    em: orm.em,
    user: orm.em.getRepository(User),
    exhibit: orm.em.getRepository(Exhibit),
    exhibitor: orm.em.getRepository(Exhibitor),
    exhibition: orm.em.getRepository(Exhibition),
    table: orm.em.getRepository(Table),
    registration: orm.em.getRepository(Registration),
    page: orm.em.getRepository(Page),
    image: orm.em.getRepository(Image),
  })
}

export const requireAdmin = (user: User | null) => {
  if (!user?.isAdministrator) {
    throw new Error('You must be an administrator to perform this operation')
  }
}
