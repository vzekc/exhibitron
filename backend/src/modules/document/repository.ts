import { EntityManager, EntityRepository } from '@mikro-orm/core'
import { Document, DocumentImage } from './entity.js'

import { JSDOM } from 'jsdom'
import DOMPurify from 'isomorphic-dompurify'
import { randomUUID } from 'crypto'
import { ImageStorage } from '../image/entity.js'
import { RequestContext } from '@mikro-orm/core'

// Function to generate a UUID for the image slug
const generateSlug = (): string => {
  return randomUUID()
}

// DOMPurify configuration for whitelisting specific elements and attributes
const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'i',
    'a',
    'img',
    'code',
    'blockquote',
    'hr',
    'p',
    'br',
    'pre',
  ],
  ALLOWED_ATTR: ['href', 'src', 'target', 'rel', 'alt'],
  ALLOWED_TAG_ATTR: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
  },
}

// extending the EntityRepository exported from driver package, so we can access things like the QB factory
export class DocumentRepository extends EntityRepository<Document> {
  /**
   * Processes HTML content: sanitizes it, extracts base64 images, and tracks existing image references
   */
  private async processHtml(
    document: Document,
    htmlContent: string,
    em: EntityManager,
  ): Promise<{
    sanitizedHtml: string
    newImages: DocumentImage[]
    referencedImageSlugs: Set<string>
  }> {
    // Setup DOM environment for DOMPurify
    const window = new JSDOM('').window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalAny = global as any
    globalAny.window = window
    globalAny.document = window.document
    globalAny.DocumentFragment = window.DocumentFragment

    // Sanitize the HTML with whitelist configuration
    const sanitizedHtml = DOMPurify.sanitize(htmlContent, DOMPURIFY_CONFIG)

    // Create a new DOM for processing the sanitized HTML
    const contentDom = new JSDOM(sanitizedHtml)
    const domDocument = contentDom.window.document
    const newImages: DocumentImage[] = []
    const referencedImageSlugs = new Set<string>()

    // Find all img elements and process them
    const imgElements = domDocument.getElementsByTagName('img')

    for (const img of Array.from(imgElements)) {
      const src = img.getAttribute('src')

      // Process base64 images
      if (src?.startsWith('data:image/')) {
        // Extract mime type and base64 data
        const matches = src.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          const [, mimeType, base64Data] = matches

          // Generate a slug for the image
          const slug = generateSlug()

          // Create new Image entity
          const imageData = Buffer.from(base64Data, 'base64')
          const image = await em
            .getRepository(ImageStorage)
            .createImage(imageData, mimeType, `image_${Date.now()}.${mimeType.split('/')[1]}`, slug)
          const documentImage = em.create(DocumentImage, {
            document,
            image,
          })

          // Add the image to the document's collection
          document.images.add(documentImage)

          // Replace base64 data with a URL to the image using the slug
          img.setAttribute('src', `/api/images/${slug}`)
          newImages.push(documentImage)
          referencedImageSlugs.add(slug)
        }
      }
      // Track existing image references by slug
      else if (src?.startsWith('/api/images/')) {
        const imageSlug = src.replace('/api/images/', '')
        referencedImageSlugs.add(imageSlug)
      }
    }

    // Find all anchor elements and make them open in a new window
    const anchorElements = domDocument.getElementsByTagName('a')
    for (const anchor of Array.from(anchorElements)) {
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noopener noreferrer')
    }

    // Clean up global namespace
    delete globalAny.window
    delete globalAny.document
    delete globalAny.DocumentFragment

    return {
      sanitizedHtml: domDocument.body.innerHTML,
      newImages,
      referencedImageSlugs,
    }
  }

  /**
   * Process HTML content for a document
   *
   * This method must be called explicitly by resolvers and controllers
   * instead of relying on ORM lifecycle hooks
   */
  private async processHtmlContent(document: Document) {
    if (!document.html) {
      return
    }

    const { sanitizedHtml, referencedImageSlugs } = await this.processHtml(
      document,
      document.html,
      this.em,
    )

    // Update the document's HTML content
    document.html = sanitizedHtml

    // Remove images that are no longer referenced in the HTML
    const imagesToRemove = []
    for (const image of [...document.images.getItems()]) {
      // Check if the image's slug is not in the referenced slugs
      if (image.image.slug && !referencedImageSlugs.has(image.image.slug)) {
        imagesToRemove.push(image)
      }
    }

    for (const image of imagesToRemove) {
      document.images.remove(image)
      this.em.remove(image)
    }
  }

  async ensureDocument(
    document: Document | null,
    htmlContent: string,
    em?: EntityManager,
  ): Promise<Document> {
    const entityManager = em || RequestContext.getEntityManager()
    if (!entityManager) throw new Error('Entity manager not available')

    if (!document) {
      document = this.create({ html: '' })
    }

    const result = await this.processHtml(document, htmlContent, entityManager)
    document.html = result.sanitizedHtml

    // Remove images that are no longer referenced
    const existingImages = await entityManager.find(DocumentImage, { document })
    for (const existingImage of existingImages) {
      if (!result.referencedImageSlugs.has(existingImage.image.slug)) {
        document.images.remove(existingImage)
        entityManager.remove(existingImage)
      }
    }

    // Add new images
    for (const newImage of result.newImages) {
      document.images.add(newImage)
    }

    await entityManager.persistAndFlush(document)
    return document
  }
}
