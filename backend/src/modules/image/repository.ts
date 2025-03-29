import { EntityRepository } from '@mikro-orm/postgresql'
import { ImageStorage } from './entity.js'
import { getImageDimensions } from './utils.js'

export class ImageRepository extends EntityRepository<ImageStorage> {
  /**
   * Creates a new image storage entity with the given properties
   * @param data The image data buffer
   * @param mimeType The MIME type of the image
   * @param filename The filename of the image
   * @param slug A unique slug for the image
   * @returns A promise that resolves to the created ImageStorage entity
   */
  async createImage(
    data: Buffer,
    mimeType: string,
    filename: string,
    slug: string,
  ): Promise<ImageStorage> {
    const dimensions = await getImageDimensions(data)
    return this.create({
      data,
      mimeType,
      filename,
      slug,
      width: dimensions.width,
      height: dimensions.height,
    })
  }
}
