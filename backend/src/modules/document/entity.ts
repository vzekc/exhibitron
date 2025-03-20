import {
  Entity,
  EntityRepositoryType,
  Property,
  OneToMany,
  Collection,
  BeforeUpdate,
  EventArgs,
  BeforeCreate,
  AfterCreate,
} from '@mikro-orm/core'
import { BaseEntity } from '../common/base.entity.js'
import { Image } from '../image/entity.js'
import { DocumentRepository } from './repository.js'
import { JSDOM } from 'jsdom'
import DOMPurify from 'isomorphic-dompurify'
import { EntityManager } from '@mikro-orm/core'

@Entity({ repository: () => DocumentRepository })
export class Document extends BaseEntity<'text'> {
  [EntityRepositoryType]?: DocumentRepository

  @Property({ columnType: 'text', nullable: true })
  html!: string

  @OneToMany(() => Image, (image) => image.document, { orphanRemoval: true })
  images: Collection<Image> = new Collection<Image>(this)

  private originalHtml?: string

  /**
   * Processes HTML content: sanitizes it, extracts base64 images, and tracks existing image references
   */
  private async processHtml(
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
    const document = contentDom.window.document
    const newImages: Image[] = []
    const referencedImageIds = new Set<string>()

    // Find all img elements and process them
    const imgElements = document.getElementsByTagName('img')
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
          this.images.add(image)

          // Persist the image - but don't flush within the method
          em.persist(image)

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
    const anchorElements = document.getElementsByTagName('a')
    for (const anchor of Array.from(anchorElements)) {
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noopener noreferrer')
    }

    // Clean up global namespace
    delete globalAny.window
    delete globalAny.document
    delete globalAny.DocumentFragment

    return {
      sanitizedHtml: document.body.innerHTML,
      newImages,
      referencedImageIds,
    }
  }

  @BeforeCreate()
  @BeforeUpdate()
  async processHtmlContent({ em, changeSet }: EventArgs<Document>) {
    console.log('Hook executed! Processing HTML content...')
    // Skip processing if html is empty or hasn't changed
    if (!this.html || (changeSet && !changeSet.payload.html) || this.html === this.originalHtml) {
      console.log('Skipping HTML processing: no change detected')
      return
    }

    // Process the HTML content and get both new images and referenced image IDs
    const { sanitizedHtml, newImages, referencedImageIds } = await this.processHtml(this.html, em)
    console.log(
      `Processed HTML with ${newImages.length} new images and ${referencedImageIds.size} referenced images`,
    )

    // Update the HTML with sanitized version
    this.html = sanitizedHtml

    // Remove images that are no longer referenced in the HTML
    if (this.images.isInitialized()) {
      const imagesToRemove = []
      for (const image of [...this.images.getItems()]) {
        if (image.id && !referencedImageIds.has(String(image.id))) {
          imagesToRemove.push(image)
        }
      }

      if (imagesToRemove.length > 0) {
        console.log(`Removing ${imagesToRemove.length} images that are no longer referenced`)
        for (const image of imagesToRemove) {
          this.images.remove(image)
        }
      }
    }

    // Save the current HTML to detect changes in future
    this.originalHtml = sanitizedHtml
    console.log('HTML processing complete')
  }

  /**
   * Post-processing to update image IDs in HTML after flush
   * This should be called after the entity manager has been flushed
   */
  async updateImageReferences(em: EntityManager): Promise<void> {
    if (!this.html) return

    // Parse the HTML to find temporary image IDs
    const dom = new JSDOM(this.html)
    const document = dom.window.document
    let updated = false

    // Find all images with data-temp-id attribute
    const imgElements = document.querySelectorAll('img[data-temp-id]')
    for (const img of Array.from(imgElements)) {
      const tempId = img.getAttribute('data-temp-id')
      if (!tempId) continue

      // Find the corresponding image in the collection
      const imageIndex = [...this.images.getItems()].findIndex(
        (img) => !img.id && img.filename.includes(tempId.split('_')[0]),
      )

      if (imageIndex >= 0) {
        const image = this.images.getItems()[imageIndex]
        if (image.id) {
          // Update the src attribute with the real ID
          img.setAttribute('src', `/api/images/${image.id}`)
          img.removeAttribute('data-temp-id')
          updated = true
        }
      }
    }

    if (updated) {
      // Update the HTML with the updated image references
      this.html = document.body.innerHTML
      await em.persistAndFlush(this)
    }
  }
}
