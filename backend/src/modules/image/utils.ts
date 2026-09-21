import { FastifyReply, FastifyRequest } from 'fastify'
import sharp from 'sharp'
import { ImageStorage } from './entity.js'
import { ImageService } from './service.js'
import { ImageVariantName } from './types.js'

export const THUMBNAIL_SIZE = 200

type SupportedFormat = 'jpeg' | 'png' | 'webp'
type FormatOptions = {
  [K in SupportedFormat]: K extends 'jpeg'
    ? sharp.JpegOptions
    : K extends 'png'
      ? sharp.PngOptions
      : sharp.WebpOptions
}

const formatOptions: FormatOptions = {
  jpeg: {
    quality: 100,
    progressive: true,
    chromaSubsampling: '4:4:4',
    mozjpeg: true,
  },
  png: {
    quality: 100,
    compressionLevel: 0,
  },
  webp: {
    quality: 100,
    lossless: true,
  },
}

/**
 * Generates a thumbnail from an image buffer
 * @param buffer The original image buffer
 * @param mimeType The MIME type of the image
 * @returns A promise that resolves to the thumbnail buffer
 */
export async function generateThumbnail(buffer: Buffer, mimeType: string): Promise<Buffer> {
  if (!mimeType.startsWith('image/')) {
    throw new Error('Unsupported image type')
  }

  const image = sharp(buffer, { animated: true })
  const { width, height, format, orientation } = await image.metadata()

  if (!width || !height) {
    throw new Error('Invalid image dimensions')
  }

  console.log(`Original dimensions: ${width}x${height} (orientation: ${orientation})`)

  // Calculate square crop dimensions
  const size = Math.min(width, height)
  const left = Math.round((width - size) / 2)
  const top = Math.round((height - size) / 2)

  console.log(`Crop area: left=${left}, top=${top}, size=${size}`)

  // Apply base transformations
  const processedImage = image
    .rotate() // Add automatic rotation based on EXIF orientation
    .extract({ left, top, width: size, height: size })
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: 'fill',
      kernel: 'lanczos3',
    })

  // Apply format-specific options if available
  if (format) {
    const normalizedFormat = format === 'jpg' ? 'jpeg' : format
    if (
      normalizedFormat in formatOptions &&
      (normalizedFormat === 'jpeg' || normalizedFormat === 'png' || normalizedFormat === 'webp')
    ) {
      const typedFormat = normalizedFormat as SupportedFormat
      return processedImage[typedFormat](formatOptions[typedFormat]).toBuffer()
    }
  }

  return processedImage.toBuffer()
}

/**
 * Extracts the dimensions of an image from its buffer
 * @param buffer The image buffer
 * @returns A promise that resolves to the image dimensions
 */
export async function getImageDimensions(
  buffer: Buffer,
): Promise<{ width: number; height: number }> {
  const image = sharp(buffer)
  const { width, height, orientation } = await image.metadata()

  if (!width || !height) {
    throw new Error('Invalid image dimensions')
  }

  // Handle orientation - if the image is rotated 90 or 270 degrees, swap width and height
  const isRotated = orientation === 5 || orientation === 6 || orientation === 7 || orientation === 8
  return {
    width: isRotated ? height : width,
    height: isRotated ? width : height,
  }
}

/**
 * Sends an image stored under a URL whose content changes when the image is replaced.
 *
 * The browser caches the picture but has to revalidate it on every use, and gets a 304
 * while the picture is unchanged, so a replaced picture shows on the next load.
 */
export const sendMutableImage = (
  request: FastifyRequest,
  reply: FastifyReply,
  image: { data: Buffer; mimeType: string; filename?: string; createdAt: Date; updatedAt?: Date },
) => {
  const lastModified = new Date(image.updatedAt ?? image.createdAt)
  lastModified.setMilliseconds(0)
  reply.header('Cache-Control', 'no-cache')
  reply.header('Last-Modified', lastModified.toUTCString())
  const ifModifiedSince = request.headers['if-modified-since']
  if (ifModifiedSince && lastModified.getTime() <= new Date(ifModifiedSince).getTime()) {
    return reply.code(304).send()
  }
  reply.header('Content-Type', image.mimeType)
  if (image.filename) {
    reply.header('Content-Disposition', `inline; filename="${image.filename}"`)
  }
  return reply.send(image.data)
}

/**
 * Sends a picture in one of its sizes, made on first use and kept with the picture. The
 * picture's own dates govern the revalidation, so the size is as fresh as the upload.
 */
export const sendMutableImageVariant = async (
  request: FastifyRequest,
  reply: FastifyReply,
  imageService: ImageService,
  image: ImageStorage,
  variantName: ImageVariantName,
) => {
  const variant = await imageService.ensureVariant(image, variantName)
  return sendMutableImage(request, reply, {
    data: variant.data,
    mimeType: variant.mimeType,
    filename: image.filename,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  })
}
