import { EntityManager, EntityRepository } from '@mikro-orm/core'
import { Document } from './entity.js'
import { Image } from '../image/entity.js'
import { JSDOM } from 'jsdom'
import DOMPurify from 'isomorphic-dompurify'

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
    newImages: Image[]
    referencedImageIds: Set<string>
  }> {
    // Setup DOM environment for DOMPurify
    const window = new JSDOM('').window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalAny = global as any
    globalAny.window = window
    globalAny.document = window.document
    globalAny.DocumentFragment = window.DocumentFragment

    // Sanitize the HTML
    const sanitizedHtml = DOMPurify.sanitize(htmlContent)

    // Create a new DOM for processing the sanitized HTML
    const contentDom = new JSDOM(sanitizedHtml)
    const domDocument = contentDom.window.document
    const newImages: Image[] = []
    const referencedImageIds = new Set<string>()

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

          // Create new Image entity
          const image = em.create(Image, {
            data: Buffer.from(base64Data, 'base64'),
            mimeType,
            filename: `image_${Date.now()}.${mimeType.split('/')[1]}`,
          })

          // Add the image to the document's collection
          document.images.add(image)

          // Create a temporary ID for referencing in HTML (will be replaced with real ID after flush)
          const tempId = Date.now() + '_' + Math.floor(Math.random() * 1000)

          // Replace base64 data with a URL to the image
          img.setAttribute('src', `/api/images/${tempId}`)
          img.setAttribute('data-temp-id', tempId)
          newImages.push(image)
        }
      }
      // Track existing image references
      else if (src?.startsWith('/api/images/')) {
        const imageId = src.replace('/api/images/', '')
        referencedImageIds.add(imageId)
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
      referencedImageIds,
    }
  }

  /**
   * Process HTML content for a document
   *
   * This method must be called explicitly by resolvers and controllers
   * instead of relying on ORM lifecycle hooks
   */
  async processHtmlContent(document: Document): Promise<void> {
    if (!document.html) {
      return
    }

    const { sanitizedHtml, referencedImageIds } = await this.processHtml(
      document,
      document.html,
      this.em,
    )

    document.html = sanitizedHtml

    // Remove images that are no longer referenced in the HTML
    const imagesToRemove = []
    for (const image of [...document.images.getItems()]) {
      if (image.id && !referencedImageIds.has(String(image.id))) {
        imagesToRemove.push(image)
      }
    }

    for (const image of imagesToRemove) {
      document.images.remove(image)
      this.em.remove(image)
    }
  }
}
