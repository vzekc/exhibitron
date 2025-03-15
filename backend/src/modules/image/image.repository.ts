import { EntityRepository } from '@mikro-orm/postgresql'
import { Image } from './image.entity.js'

export class ImageRepository extends EntityRepository<Image> {}
