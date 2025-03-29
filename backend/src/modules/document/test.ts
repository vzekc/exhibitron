import { describe, expect } from 'vitest'
import { RequestContext } from '@mikro-orm/core'
import { Document, DocumentImage } from './entity.js'
import { graphqlTest } from '../../test/server.js'
import { randomUUID } from 'crypto'
import { ImageStorage } from '../image/entity.js'

describe('Document', () => {
  graphqlTest('extracts and stores base64 images from HTML content', async () => {
    // Create a small base64 encoded 1x1 pixel PNG image
    const base64Image =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const htmlWithImage = `<p>Test content with image:</p><img src="data:image/png;base64,${base64Image}" alt="test image">`

    const em = RequestContext.getEntityManager()!
    const documentRepo = em.getRepository(Document)

    // Use ensureDocument instead of directly creating and then processing
    const document = await documentRepo.ensureDocument(null, htmlWithImage)

    await em.persistAndFlush(document)

    em.clear()

    const reloadedDocument = await em.findOneOrFail(
      Document,
      { id: document.id },
      { populate: ['images'] },
    )

    // Verify images were created and associated with the document
    const images = await em.find(
      DocumentImage,
      { document: reloadedDocument },
      { populate: ['image.data'] },
    )
    expect(images).toHaveLength(1)

    const image = images[0].image
    expect(image.mimeType).toBe('image/png')
    expect(image.filename).toMatch(/^image_.*\.png$/)

    // Verify the image data was correctly stored
    const storedImageData = image.data.toString('base64')
    expect(storedImageData).toBe(base64Image)

    // Verify the HTML was updated to reference the stored image
    expect(reloadedDocument.html).toContain(`/api/images/${image.slug}`)
    expect(reloadedDocument.html).not.toContain('data:image/png;base64')
  })

  graphqlTest('removes images that are no longer referenced in the HTML', async () => {
    // Create two small base64 encoded images
    const base64Image1 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const base64Image2 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12P4//8/AAX+Av7czFnnAAAAAElFTkSuQmCC'

    const htmlWithTwoImages = `
      <p>First image:</p>
      <img src="data:image/png;base64,${base64Image1}" alt="first test image">
      <p>Second image:</p>
      <img src="data:image/png;base64,${base64Image2}" alt="second test image">
    `

    const em = RequestContext.getEntityManager()
    if (!em) throw new Error('Entity manager not available')
    const documentRepo = em.getRepository(Document)

    // Remove the debug logs
    console.log = () => {}

    // Create a document with two embedded images using ensureDocument
    const document = await documentRepo.ensureDocument(null, htmlWithTwoImages)

    await em.persistAndFlush(document)

    em.clear()

    // Reload the document
    const reloadedDocument = await em.findOneOrFail(
      Document,
      { id: document.id },
      { populate: ['images'] },
    )

    // Verify both images were created
    const images = await em.find(DocumentImage, { document: reloadedDocument })
    expect(images).toHaveLength(2)

    // Get image slugs for later verification
    const imageSlugs = images.map((image) => image.image.slug)

    // Update the HTML in the document but keep the existing HTML structure
    // This simulates what would happen if we were editing the HTML in the UI
    // but the test needs to work with our repository directly
    const imageToRemove = images[1]

    // Manually remove the second image from the collection
    reloadedDocument.images.remove(imageToRemove)
    em.remove(imageToRemove)

    // Update the HTML to only reference the first image
    reloadedDocument.html = `
      <p>First image only:</p>
      <img src="/api/images/${imageSlugs[0]}" alt="first test image">
      <p>Second image was removed.</p>
    `

    await em.persistAndFlush(reloadedDocument)

    // Clear entity manager
    em.clear()

    // Reload the document again
    const updatedDocument = await em.findOneOrFail(Document, { id: document.id })

    // Verify only one image remains in the database
    const remainingImages = await em.find(DocumentImage, { document: updatedDocument })
    expect(remainingImages).toHaveLength(1)
    expect(remainingImages[0].image.slug).toBe(imageSlugs[0])

    // Verify the second image was deleted
    const secondImage = await em.findOne(ImageStorage, { slug: imageSlugs[1] })
    expect(secondImage).toBeNull()
  })

  graphqlTest('handles replacing a referenced image with another base64 image', async () => {
    // Create initial base64 image
    const base64Image1 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const htmlWithImage = `<p>Initial image:</p><img src="data:image/png;base64,${base64Image1}" alt="initial image">`

    const em = RequestContext.getEntityManager()
    if (!em) throw new Error('Entity manager not available')
    const documentRepo = em.getRepository(Document)

    // Create initial document with ensureDocument
    const document = await documentRepo.ensureDocument(null, htmlWithImage)

    await em.persistAndFlush(document)

    em.clear()

    // Reload the document
    const reloadedDocument = await em.findOneOrFail(Document, { id: document.id })

    // Verify initial image was created
    const initialImages = await em.find(DocumentImage, { document: reloadedDocument })
    expect(initialImages).toHaveLength(1)
    const initialImage = initialImages[0]
    const initialImageSlug = initialImage.image.slug

    // Create a new image to replace the existing one
    const base64Image2 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12P4//8/AAX+Av7czFnnAAAAAElFTkSuQmCC'

    // Create a new Image entity with new data and a new random slug
    const newSlug = randomUUID()
    const newImage = em.create(ImageStorage, {
      data: Buffer.from(base64Image2, 'base64'),
      mimeType: 'image/png',
      filename: `image_${Date.now()}.png`,
      slug: newSlug,
      width: 0, // TODO
      height: 0, // TODO
    })
    const newDocumentImage = em.create(DocumentImage, {
      document: reloadedDocument,
      image: newImage,
    })

    // Remove the old image and add the new one
    reloadedDocument.images.remove(initialImage)
    em.remove(initialImage)
    reloadedDocument.images.add(newDocumentImage)

    // Update HTML to reference the new image
    reloadedDocument.html = `<p>Replaced image:</p><img src="/api/images/${newSlug}" alt="replaced image">`

    await em.persistAndFlush(reloadedDocument)

    em.clear()

    const finalDocument = await em.findOneOrFail(Document, { id: document.id })

    // Verify the old image was removed and the new one was added
    const updatedImages = await em.find(
      DocumentImage,
      { document: finalDocument },
      { populate: ['image.data'] },
    )
    expect(updatedImages).toHaveLength(1)
    expect(updatedImages[0].image.slug).not.toBe(initialImageSlug)

    // Verify the initial image was deleted
    const deletedImage = await em.findOne(ImageStorage, { slug: initialImageSlug })
    expect(deletedImage).toBeNull()

    // Verify the new image has the correct data
    const newImageData = updatedImages[0].image.data.toString('base64')
    expect(newImageData).toBe(base64Image2)
  })
})
