import { EntityRepository } from '@mikro-orm/postgresql'
import { Image } from './entity.js'

export class ImageRepository extends EntityRepository<Image> {}
