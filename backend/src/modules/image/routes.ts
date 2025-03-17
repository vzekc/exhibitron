import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { Image } from './entity.js'
import fastifyMultipart from '@fastify/multipart'
import { Exhibit } from '../exhibit/entity.js'
import { FastifyReply, FastifyRequest } from 'fastify'
import { Populate } from '@mikro-orm/core'

export async function registerImageRoutes(app: FastifyInstance) {
  // Register multipart plugin for file uploads
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  })

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

  app.get<{ Params: { id: string } }>('/api/images/:id', async (request, reply) => {
    const { id } = request.params
    const image = await db.image.findOneOrFail({ id: parseInt(id, 10) })

    reply.header('Content-Type', image.mimeType)
    reply.header('Content-Disposition', `inline; filename="${image.filename}"`)
    return image.data
  })

  // Get exhibit main image
  app.get<{ Params: { id: string } }>('/api/exhibit/:id/image/main', async (request, reply) => {
    const { id } = request.params
    const exhibit = await db.exhibit.findOneOrFail(
      { id: parseInt(id, 10) },
      { populate: ['mainImage'] as unknown as Populate<Exhibit, never> },
    )

    if (!exhibit.mainImage) {
      return reply.code(404).send({ error: 'No main image found for this exhibit' })
    }

    reply.header('Content-Type', exhibit.mainImage.mimeType)
    reply.header('Content-Disposition', `inline; filename="${exhibit.mainImage.filename}"`)
    return exhibit.mainImage.data
  })

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

    // Create new image or update existing one
    if (exhibit.mainImage) {
      // Update existing image
      exhibit.mainImage.data = buffer
      exhibit.mainImage.mimeType = mimeType
      exhibit.mainImage.filename = filename
    } else {
      // Create new image
      const image = new Image()
      image.data = buffer
      image.mimeType = mimeType
      image.filename = filename
      image.exhibit = exhibit

      exhibit.mainImage = image
      db.em.persist(image)
    }

    await db.em.flush()
    return { success: true, imageId: exhibit.mainImage.id }
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
