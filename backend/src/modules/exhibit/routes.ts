import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { Exhibit, ExhibitImage } from './entity.js'
import { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'crypto'
import { generateThumbnail } from '../image/utils.js'

export async function registerExhibitImageRoutes(app: FastifyInstance) {
  const db = await initORM()

  /**
   * Check if the user is authorized to modify the exhibit
   * @returns The exhibit if authorized, otherwise sends an error response
   */
  async function checkExhibitAuthorization(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<Exhibit | null> {
    const { id } = request.params
    const userId = request.session.userId

    if (!userId) {
      reply.code(401).send({ error: 'Authentication required' })
      return null
    }
    const user = await db.user.findOneOrFail({ id: userId })
    const exhibit = await db.exhibit.findOneOrFail(
      { id: parseInt(id, 10) },
      { populate: ['exhibitor', 'exhibitor.user'] },
    )

    if (!user.isAdministrator && exhibit.exhibitor.user.id !== userId) {
      reply.code(403).send({ error: 'You do not have permission to modify this exhibit' })
      return null
    }

    return exhibit
  }

  // Get exhibit main image
  app.get<{ Params: { id: string } }>('/api/exhibit/:id/image/main', async (request, reply) => {
    const { id } = request.params
    const exhibit = await db.exhibit.findOneOrFail(
      { id: parseInt(id, 10) },
      { populate: ['mainImage', 'mainImage.image.data', 'mainImage.thumbnail.data'] },
    )

    if (!exhibit.mainImage) {
      return reply.code(404).send({ error: 'No main image found for this exhibit' })
    }

    reply.header('Content-Type', exhibit.mainImage.image.mimeType)
    reply.header('Content-Disposition', `inline; filename="${exhibit.mainImage.image.filename}"`)
    return exhibit.mainImage.image.data
  })

  // Get exhibit thumbnail
  app.get<{ Params: { id: string }; Querystring: { regenerate?: boolean } }>(
    '/api/exhibit/:id/image/thumbnail',
    async (request, reply) => {
      const { id } = request.params
      const { regenerate } = request.query
      const exhibit = await db.exhibit.findOneOrFail(
        { id: parseInt(id, 10) },
        { populate: ['mainImage.thumbnail.data'] },
      )

      const { mainImage } = exhibit
      if (!mainImage) {
        return reply.code(404).send({ error: 'No main image found for this exhibit' })
      }

      // If thumbnail exists and regeneration is not requested, serve it
      if (mainImage.thumbnail && !regenerate) {
        reply.header('Content-Type', mainImage.thumbnail.mimeType)
        return mainImage.thumbnail.data
      }

      const { image } = mainImage
      // Generate new thumbnail (either because it doesn't exist or regeneration was requested)
      await db.em.populate(mainImage, ['image.data'])
      try {
        console.log(
          `Generating thumbnail for exhibit ${id}${regenerate ? ' (forced regeneration)' : ''}`,
        )
        const thumbnail = await generateThumbnail(image.data, image.mimeType)
        mainImage.thumbnail = await db.image.createImage(
          thumbnail,
          image.mimeType,
          image.filename,
          randomUUID(),
        )
        await db.em.flush()

        reply.header('Content-Type', image.mimeType)
        return thumbnail
      } catch (error) {
        console.warn('Failed to generate thumbnail, serving original image', error)
        reply.header('Content-Type', image.mimeType)
        return image.data
      }
    },
  )

  // Upload or replace exhibit main image
  app.put<{ Params: { id: string } }>('/api/exhibit/:id/image/main', async (request, reply) => {
    const exhibit = await checkExhibitAuthorization(request, reply)
    if (!exhibit) return // Authorization failed

    // Parse multipart form data
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' })
    }

    const buffer = await data.toBuffer()
    const filename = data.filename
    const mimeType = data.mimetype

    // Generate thumbnail and get dimensions
    const thumbnailData = await generateThumbnail(buffer, mimeType)

    const { mainImage } = exhibit
    // Create new image or update existing one
    if (mainImage) {
      const { image } = mainImage
      // Update existing image
      image.data = buffer
      image.mimeType = mimeType
      image.filename = filename
      mainImage.thumbnail = await db.image.createImage(
        thumbnailData,
        mimeType,
        filename,
        randomUUID(),
      )
    } else {
      // Create new image
      const image = await db.image.createImage(buffer, mimeType, filename, randomUUID())
      const thumbnail = await db.image.createImage(thumbnailData, mimeType, filename, randomUUID())
      exhibit.mainImage = db.em.create(ExhibitImage, {
        exhibit,
        image,
        thumbnail,
      })
      db.em.persist(exhibit.mainImage)
    }

    await db.em.flush()
    return { success: true, imageId: exhibit.mainImage!.id }
  })

  // Delete exhibit main image
  app.delete<{ Params: { id: string } }>('/api/exhibit/:id/image/main', async (request, reply) => {
    const exhibit = await checkExhibitAuthorization(request, reply)
    if (!exhibit) return // Authorization failed

    if (exhibit.mainImage) {
      const imageToRemove = exhibit.mainImage
      exhibit.mainImage = undefined
      db.em.remove(imageToRemove)
      await db.em.flush()
    }

    return reply.code(204).send()
  })
}
