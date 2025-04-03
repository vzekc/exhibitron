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
    const metadata = await sharpInstance.metadata()

    // Basic resize operation
    let processedImage = sharpInstance.resize(variant.maxWidth, variant.maxHeight, {
      withoutEnlargement: true,
      fit: 'inside',
    })

    // Handle format-specific transformations
    if (variantName.endsWith('Gif')) {
      // For GIF variants, always convert to GIF
      processedImage = processedImage.gif()
    } else if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      // For JPEG source images, apply quality settings if specified
      const jpegOptions: sharp.JpegOptions = {
        progressive: true,
      }
      if ('quality' in variant) {
        jpegOptions.quality = variant.quality
      }
      processedImage = processedImage.jpeg(jpegOptions)
    } else if (metadata.format === 'png') {
      // For PNG source images, maintain lossless format
      processedImage = processedImage.png()
    } else if (metadata.format === 'webp') {
      // For WebP source images, maintain format
      processedImage = processedImage.webp()
    } else {
      // Default to JPEG for unknown formats
      processedImage = processedImage.jpeg({ quality: variant.quality ?? 90, progressive: true })
    }

    const processedBuffer = await processedImage.toBuffer()
    const dimensions = await sharp(processedBuffer).metadata()

    const variantStorage = this.em.create(ImageVariant, {
      data: processedBuffer,
      width: dimensions.width!,
      height: dimensions.height!,
      variantName,
      originalImage: image,
      mimeType: variantName.endsWith('Gif')
        ? 'image/gif'
        : metadata.format === 'png'
          ? 'image/png'
          : metadata.format === 'webp'
            ? 'image/webp'
            : 'image/jpeg',
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
