import { describe, expect } from 'vitest'
import { RequestContext, wrap } from '@mikro-orm/core'
import { Document } from './entity.js'
import { Image } from '../image/entity.js'
import { graphqlTest } from '../../test/apollo.js'

describe('Document', () => {
  graphqlTest('extracts and stores base64 images from HTML content', async () => {
    // Create a small base64 encoded 1x1 pixel PNG image
    const base64Image =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const htmlWithImage = `<p>Test content with image:</p><img src="data:image/png;base64,${base64Image}" alt="test image">`

    const em = RequestContext.getEntityManager()!
    const documentRepo = em.getRepository(Document)

    const document = em.create(Document, {
      html: htmlWithImage,
    })

    await documentRepo.processHtmlContent(document)

    await em.persistAndFlush(document)

    em.clear()

    const reloadedDocument = await em.findOneOrFail(
      Document,
      { id: document.id },
      { populate: ['images'] },
    )

    // Verify images were created and associated with the document
    const images = await em.find(Image, { document: reloadedDocument })
    expect(images).toHaveLength(1)

    const image = images[0]
    expect(image.mimeType).toBe('image/png')
    expect(image.filename).toMatch(/^image_.*\.png$/)

    // Verify the image data was correctly stored
    const storedImageData = image.data.toString('base64')
    expect(storedImageData).toBe(base64Image)

    // Verify the HTML was updated to reference the stored image
    expect(reloadedDocument.html).toContain(`/api/images/${image.id}`)
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

    // Create a document with two embedded images
    const document = em.create(Document, {
      html: htmlWithTwoImages,
    })

    await documentRepo.processHtmlContent(document)

    await em.persistAndFlush(document)

    em.clear()

    const reloadedDocument = await em.findOneOrFail(
      Document,
      { id: document.id },
      { populate: ['images'] },
    )
    const reloadedDocumentRepo = em.getRepository(Document)

    // Verify both images were created
    const images = await em.find(Image, { document: reloadedDocument })
    expect(images).toHaveLength(2)

    // Get image IDs for later verification
    const imageIds = images.map((image) => image.id)

    // Now update the document to remove the second image
    const htmlWithOneImage = `
      <p>First image only:</p>
      <img src="/api/images/${imageIds[0]}" alt="first test image">
      <p>Second image was removed.</p>
    `

    // Update document with new HTML
    wrap(reloadedDocument).assign({ html: htmlWithOneImage })

    await reloadedDocumentRepo.processHtmlContent(reloadedDocument)

    await em.persistAndFlush(reloadedDocument)

    // Clear entity manager
    em.clear()

    // Reload the document again
    const updatedDocument = await em.findOneOrFail(Document, { id: document.id })

    // Verify only one image remains in the database
    const remainingImages = await em.find(Image, { document: updatedDocument })
    expect(remainingImages).toHaveLength(1)
    expect(remainingImages[0].id).toBe(imageIds[0])

    // Verify the second image was deleted
    const secondImage = await em.findOne(Image, { id: imageIds[1] })
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

    const document = em.create(Document, {
      html: htmlWithImage,
    })

    await documentRepo.processHtmlContent(document)

    await em.persistAndFlush(document)

    em.clear()

    const reloadedDocument = await em.findOneOrFail(Document, { id: document.id })
    const reloadedDocumentRepo = em.getRepository(Document)

    // Verify initial image was created
    const initialImages = await em.find(Image, { document: reloadedDocument })
    expect(initialImages).toHaveLength(1)
    const initialImageId = initialImages[0].id

    // Now replace the image with a new base64 image
    const base64Image2 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12P4//8/AAX+Av7czFnnAAAAAElFTkSuQmCC'
    const htmlWithReplacedImage = `<p>Replaced image:</p><img src="data:image/png;base64,${base64Image2}" alt="replaced image">`

    // Update document with new HTML containing the new base64 image
    wrap(reloadedDocument).assign({ html: htmlWithReplacedImage })

    await reloadedDocumentRepo.processHtmlContent(reloadedDocument)

    await em.persistAndFlush(reloadedDocument)

    em.clear()

    const finalDocument = await em.findOneOrFail(Document, { id: document.id })

    // Verify the old image was removed and the new one was added
    const updatedImages = await em.find(Image, { document: finalDocument })
    expect(updatedImages).toHaveLength(1)
    expect(updatedImages[0].id).not.toBe(initialImageId)

    // Verify the initial image was deleted
    const deletedImage = await em.findOne(Image, { id: initialImageId })
    expect(deletedImage).toBeNull()

    // Verify the new image has the correct data
    const newImage = updatedImages[0]
    const storedImageData = newImage.data.toString('base64')
    expect(storedImageData).toBe(base64Image2)
  })
})
