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

  /**
   * Removes images together with their variants. A variant references its image without a
   * cascade, so the variants go first.
   */
  async removeImages(...images: (ImageStorage | undefined | null)[]) {
    const present = images.filter((image): image is ImageStorage => !!image)
    await this.em.populate(present, ['variants'])
    for (const image of present) {
      this.em.remove(image.variants.getItems())
      this.em.remove(image)
    }
  }

  /**
   * Removes a picture holder, a profile or exhibit image, along with the image and thumbnail
   * it holds, so that nothing of the picture stays in storage.
   */
  async removePicture<T extends { image: ImageStorage; thumbnail?: ImageStorage }>(picture: T) {
    // A holder reached through its owner's inverse side carries the relations unloaded.
    await this.em.populate(picture, ['image', 'thumbnail'] as never)
    await this.removeImages(picture.image, picture.thumbnail)
    this.em.remove(picture)
  }
}
