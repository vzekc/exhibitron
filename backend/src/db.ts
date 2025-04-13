import {
  EntityRepository,
  MikroORM,
  Options,
  RequestContext,
  SqlEntityManager,
} from '@mikro-orm/postgresql'
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
import { Host } from './modules/host/entity.js'
import { HostRepository } from './modules/host/repository.js'
import { loadDatabaseFunctions } from './db/loader.js'

export interface Services {
  dbName?: string
  orm: MikroORM
  em: SqlEntityManager
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
  host: HostRepository
}

let ormCache: MikroORM

export async function initORM(options?: Options): Promise<Services> {
  if (!options?.dbName && !process.env.DATABASE_URL) {
    throw new Error('Missing dbName and no DATABASE_URL in environment')
  }

  // Only cache the ORM instance
  if (!ormCache) {
    ormCache = await MikroORM.init({
      ...config,
      ...options,
    })
  }

  // Get the current transaction context or create a new one
  const em = (RequestContext.getEntityManager() || ormCache.em) as SqlEntityManager

  // Load database functions
  await loadDatabaseFunctions(em)

  // Create services with the transaction-aware entity manager
  return {
    dbName: options?.dbName || undefined,
    orm: ormCache,
    em,
    image: em.getRepository(ImageStorage),
    user: em.getRepository(User),
    exhibit: em.getRepository(Exhibit),
    exhibitor: em.getRepository(Exhibitor),
    exhibition: em.getRepository(Exhibition),
    table: em.getRepository(Table),
    registration: em.getRepository(Registration),
    page: em.getRepository(Page),
    document: em.getRepository(Document),
    exhibitAttribute: em.getRepository(ExhibitAttribute),
    room: em.getRepository(Room),
    conferenceSession: em.getRepository(ConferenceSession),
    host: em.getRepository(Host),
  }
}

export const requireAdmin = (user: User | null) => {
  if (!user?.isAdministrator) {
    throw new Error('You must be an administrator to perform this operation')
  }
}
