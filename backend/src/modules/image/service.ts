import sharp from 'sharp'
import { IMAGE_VARIANTS, ImageVariantName } from './types.js'
import { ImageStorage, ImageVariant } from './entity.js'
import { EntityManager } from '@mikro-orm/core'

export class ImageService {
  constructor(private em: EntityManager) {}

  async generateVariant(image: ImageStorage, variantName: ImageVariantName): Promise<ImageVariant> {
    const variant = IMAGE_VARIANTS[variantName]
    await this.em.populate(image, ['data'])
    const sharpInstance = sharp(image.data)

    // Basic resize operation
    let processedImage = sharpInstance.resize(variant.maxWidth, variant.maxHeight, {
      withoutEnlargement: true,
      fit: 'inside',
    })

    // Only apply quality settings for HTML variants
    if ('quality' in variant) {
      processedImage = processedImage.flatten({ background: { r: 255, g: 255, b: 255 } }).jpeg({
        quality: variant.quality,
        progressive: true,
      })
    } else {
      // For non-HTML variants, maintain original format and quality
      processedImage = processedImage
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .toFormat(sharp.format.jpeg, {
          quality: 100,
          progressive: true,
        })
    }

    const processedBuffer = await processedImage.toBuffer()
    const dimensions = await sharp(processedBuffer).metadata()

    const variantStorage = this.em.create(ImageVariant, {
      data: processedBuffer,
      width: dimensions.width!,
      height: dimensions.height!,
      variantName,
      originalImage: image,
    })

    return variantStorage
  }

  async ensureVariant(image: ImageStorage, variantName: ImageVariantName): Promise<ImageVariant> {
    // Check if variant already exists
    const existingVariant = await this.em.findOne(ImageVariant, {
      originalImage: image,
      variantName,
    })

    if (existingVariant) {
      // Populate the data field before returning
      await this.em.populate(existingVariant, ['data'])
      return existingVariant
    }

    // Generate new variant
    const newVariant = await this.generateVariant(image, variantName)
    await this.em.persistAndFlush(newVariant)
    return newVariant
  }
}
