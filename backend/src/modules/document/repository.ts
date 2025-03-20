import {
  EntityManager,
  EntityRepository,
  wrap,
  CreateOptions,
  RequiredEntityData,
  EntityData,
} from '@mikro-orm/core'
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
    console.log('processHtml method started')
    // Setup DOM environment for DOMPurify
    const window = new JSDOM('').window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalAny = global as any
    globalAny.window = window
    globalAny.document = window.document
    globalAny.DocumentFragment = window.DocumentFragment

    // Sanitize the HTML
    const sanitizedHtml = DOMPurify.sanitize(htmlContent)
    console.log('HTML sanitized')

    // Create a new DOM for processing the sanitized HTML
    const contentDom = new JSDOM(sanitizedHtml)
    const domDocument = contentDom.window.document
    const newImages: Image[] = []
    const referencedImageIds = new Set<string>()

    // Find all img elements and process them
    const imgElements = domDocument.getElementsByTagName('img')
    console.log(`Found ${imgElements.length} img elements in the HTML`)

    for (const img of Array.from(imgElements)) {
      const src = img.getAttribute('src')
      console.log(`Processing image with src: ${src?.substring(0, 30)}...`)

      // Process base64 images
      if (src?.startsWith('data:image/')) {
        console.log('Found base64 image')
        // Extract mime type and base64 data
        const matches = src.match(/^data:([^;]+);base64,(.+)$/)
        if (matches) {
          const [, mimeType, base64Data] = matches
          console.log(`Extracted mime type: ${mimeType}`)

          // Create new Image entity
          const image = em.create(Image, {
            data: Buffer.from(base64Data, 'base64'),
            mimeType,
            filename: `image_${Date.now()}.${mimeType.split('/')[1]}`,
          })
          console.log(`Created image with filename: ${image.filename}`)

          // Add the image to the document's collection
          document.images.add(image)
          console.log('Added image to document collection')

          // Create a temporary ID for referencing in HTML (will be replaced with real ID after flush)
          const tempId = Date.now() + '_' + Math.floor(Math.random() * 1000)

          // Replace base64 data with a URL to the image
          img.setAttribute('src', `/api/images/${tempId}`)
          img.setAttribute('data-temp-id', tempId)
          newImages.push(image)
          console.log(`Image processing complete, temp ID: ${tempId}`)
        }
      }
      // Track existing image references
      else if (src?.startsWith('/api/images/')) {
        const imageId = src.replace('/api/images/', '')
        referencedImageIds.add(imageId)
        console.log(`Found reference to existing image: ${imageId}`)
      }
    }

    // Find all anchor elements and make them open in a new window
    const anchorElements = domDocument.getElementsByTagName('a')
    console.log(`Found ${anchorElements.length} anchor elements`)
    for (const anchor of Array.from(anchorElements)) {
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noopener noreferrer')
    }

    // Clean up global namespace
    delete globalAny.window
    delete globalAny.document
    delete globalAny.DocumentFragment

    console.log('processHtml method completed')
    return {
      sanitizedHtml: domDocument.body.innerHTML,
      newImages,
      referencedImageIds,
    }
  }

  /**
   * Process document HTML before creating a new document
   * Override the default create method to process HTML
   */
  create<T extends boolean = false>(
    data: RequiredEntityData<Document, never, T>,
    options?: CreateOptions<T>,
  ): Document {
    console.log('DocumentRepository.create called')
    const document = super.create(data, options)

    // We need to process HTML after the document is created
    // This will be done in a lifecycle hook on the entity
    return document
  }

  /**
   * Process HTML content when persisting a document
   */
  async processHtmlContent(document: Document): Promise<void> {
    console.log('DocumentRepository.processHtmlContent called')

    if (!document.html) {
      return
    }

    const { sanitizedHtml, referencedImageIds } = await this.processHtml(
      document,
      document.html,
      this.em,
    )

    // Update the document with processed HTML
    document.html = sanitizedHtml

    // Remove images that are no longer referenced in the HTML
    if (document.images.isInitialized()) {
      const imagesToRemove = []
      for (const image of [...document.images.getItems()]) {
        if (image.id && !referencedImageIds.has(String(image.id))) {
          imagesToRemove.push(image)
        }
      }

      if (imagesToRemove.length > 0) {
        console.log(`Removing ${imagesToRemove.length} images that are no longer referenced`)
        for (const image of imagesToRemove) {
          document.images.remove(image)
        }
      }
    }
  }
}
