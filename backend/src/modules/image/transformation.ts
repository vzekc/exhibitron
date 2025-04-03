import { EntityManager } from '@mikro-orm/core'
import { ImageStorage } from './entity.js'
import { ImageVariantName } from './types.js'
import { ImageService } from './service.js'

/**
 * Ensures a transformed image variant exists and returns its dimensions
 * @param em The entity manager
 * @param imageId The ID of the original image
 * @param variantName The name of the variant to ensure exists
 * @returns A promise that resolves to the dimensions of the transformed image
 */
export async function ensureTransformedImage(
  em: EntityManager,
  imageId: number,
  variantName: ImageVariantName,
): Promise<{ width: number; height: number }> {
  const image = await em.findOneOrFail(ImageStorage, imageId, {
    populate: ['variants'],
  })

  // Check if variant already exists
  const existingVariant = image.variants.getItems().find((v) => v.variantName === variantName)
  if (existingVariant) {
    return {
      width: existingVariant.width,
      height: existingVariant.height,
    }
  }

  // Generate new variant if it doesn't exist
  const imageService = new ImageService(em)
  const variant = await imageService.generateVariant(image, variantName)
  await em.persistAndFlush(variant)

  return {
    width: variant.width,
    height: variant.height,
  }
}
