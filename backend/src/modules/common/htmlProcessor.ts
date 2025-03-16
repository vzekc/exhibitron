import DOMPurify from 'isomorphic-dompurify'
import { EntityManager } from '@mikro-orm/core'
import { Image } from '../image/entity.js'
import { Exhibit } from '../exhibit/entity.js'
import { Page } from '../page/entity.js'
import { JSDOM } from 'jsdom'

interface ProcessedHtml {
  sanitizedHtml: string
  images: Image[]
}

export async function processHtml(
  html: string,
  em: EntityManager,
  context?: { exhibit?: Exhibit; page?: Page },
): Promise<ProcessedHtml> {
  // Create a virtual DOM using JSDOM
  const window = new JSDOM('').window

  // Add window properties that DOMPurify needs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalAny = global as any
  globalAny.window = window
  globalAny.document = window.document
  globalAny.DocumentFragment = window.DocumentFragment

  // Sanitize the HTML
  const sanitizedHtml = DOMPurify.sanitize(html)

  // Create a new DOM for processing the sanitized HTML
  const contentDom = new JSDOM(sanitizedHtml)
  const document = contentDom.window.document
  const images: Image[] = []

  // Find all img elements with base64 src
  const imgElements = document.getElementsByTagName('img')
  for (const img of Array.from(imgElements)) {
    const src = img.getAttribute('src')
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
          ...context,
        })
        await em.persistAndFlush(image)

        // Replace base64 data with a URL to the image
        img.setAttribute('src', `/api/images/${image.id}`)
        images.push(image)
      }
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
    images,
  }
}
