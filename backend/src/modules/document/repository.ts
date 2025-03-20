import { EntityRepository } from '@mikro-orm/postgresql'
import { Document } from './entity.js'

// extending the EntityRepository exported from driver package, so we can access things like the QB factory
export class DocumentRepository extends EntityRepository<Document> {}
