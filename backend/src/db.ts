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
import { ExhibitAttributeRepository } from './modules/exhibitAttribute/repository.js'
import { ExhibitAttribute } from './modules/exhibitAttribute/entity.js'
import { Document } from './modules/document/entity.js'
import { DocumentRepository } from './modules/document/repository.js'
import { ImageStorage } from './modules/image/entity.js'
import { ImageRepository } from './modules/image/repository.js'
import { Room } from './modules/room/entity.js'
import { RoomRepository } from './modules/room/repository.js'
import { ConferenceSession } from './modules/conferenceSession/entity.js'
import { ConferenceSessionRepository } from './modules/conferenceSession/repository.js'

export interface Services {
  dbName?: string
  orm: MikroORM
  em: EntityManager
  image: ImageRepository
  user: UserRepository
  exhibit: ExhibitRepository
  exhibitor: EntityRepository<Exhibitor>
  exhibition: ExhibitionRepository
  table: TableRepository
  registration: RegistrationRepository
  page: EntityRepository<Page>
  document: DocumentRepository
  exhibitAttribute: ExhibitAttributeRepository
  room: RoomRepository
  conferenceSession: ConferenceSessionRepository
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
    image: orm.em.getRepository(ImageStorage),
    user: orm.em.getRepository(User),
    exhibit: orm.em.getRepository(Exhibit),
    exhibitor: orm.em.getRepository(Exhibitor),
    exhibition: orm.em.getRepository(Exhibition),
    table: orm.em.getRepository(Table),
    registration: orm.em.getRepository(Registration),
    page: orm.em.getRepository(Page),
    document: orm.em.getRepository(Document),
    exhibitAttribute: orm.em.getRepository(ExhibitAttribute),
    room: orm.em.getRepository(Room),
    conferenceSession: orm.em.getRepository(ConferenceSession),
  })
}

export const requireAdmin = (user: User | null) => {
  if (!user?.isAdministrator) {
    throw new Error('You must be an administrator to perform this operation')
  }
}
