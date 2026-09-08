import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { AuthError, errorSchema } from '../common/errors.js'
import { User, ProfileImage } from './entity.js'
import { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'crypto'
import { generateThumbnail, sendMutableImage } from '../image/utils.js'

export async function registerUserRoutes(app: FastifyInstance) {
  const db = await initORM()

  /**
   * Check if the user is authorized to modify the profile
   * @returns The user if authorized, otherwise sends an error response
   */
  async function checkUserAuthorization(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<User | null> {
    const { id } = request.params
    const userId = request.session.userId

    if (!userId) {
      reply.code(401).send({ error: 'Authentication required' })
      return null
    }
    const user = await db.user.findOneOrFail({ id: parseInt(id, 10) })

    if (!user.isAdministrator && user.id !== userId) {
      reply.code(403).send({ error: 'You do not have permission to modify this profile' })
      return null
    }

    return user
  }

  app.post(
    '/login',
    {
      schema: {
        description: 'Log in',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', examples: ['donald@example.com'] },
            password: { type: 'string', examples: ['geheim'] },
          },
          additionalProperties: false,
        },
        response: {
          204: {
            description: 'The user was logged in',
            type: 'null',
          },
          400: {
            description: 'Invalid input parameter(s).',
            ...errorSchema,
          },
          401: {
            description: 'Invalid email address or password',
            ...errorSchema,
          },
        },
      },
    },
    async (request) => {
      const { email, password } = request.body as {
        email: string
        password: string
      }
      const user = await db.user.login(email, password)
      if (!user) {
        throw new AuthError('Invalid email address or password')
      }
      request.session.userId = user.id
      request.session.canSwitchExhibitor = user.isAdministrator
    },
  )

  // Get user profile image
  app.get<{ Params: { id: string } }>('/api/user/:id/image/profile', async (request, reply) => {
    const { id } = request.params
    const user = await db.user.findOneOrFail(
      { id: parseInt(id, 10) },
      { populate: ['profileImage', 'profileImage.image.data', 'profileImage.thumbnail.data'] },
    )

    if (!user.profileImage) {
      return reply.code(404).send({ error: 'No profile image found for this user' })
    }

    return sendMutableImage(request, reply, user.profileImage.image)
  })

  // Get user profile thumbnail
  app.get<{ Params: { id: string }; Querystring: { regenerate?: boolean } }>(
    '/api/user/:id/image/thumbnail',
    async (request, reply) => {
      const { id } = request.params
      const { regenerate } = request.query
      const user = await db.user.findOneOrFail(
        { id: parseInt(id, 10) },
        { populate: ['profileImage.thumbnail.data'] },
      )

      const { profileImage } = user
      if (!profileImage) {
        return reply.code(404).send({ error: 'No profile image found for this user' })
      }

      // If thumbnail exists and regeneration is not requested, serve it
      if (profileImage.thumbnail && !regenerate) {
        return sendMutableImage(request, reply, profileImage.thumbnail)
      }

      const { image } = profileImage
      // Generate new thumbnail (either because it doesn't exist or regeneration was requested)
      await db.em.populate(profileImage, ['image.data'])
      try {
        console.log(
          `Generating thumbnail for user ${id}${regenerate ? ' (forced regeneration)' : ''}`,
        )
        const thumbnail = await generateThumbnail(image.data, image.mimeType)
        profileImage.thumbnail = await db.image.createImage(
          thumbnail,
          image.mimeType,
          image.filename,
          randomUUID(),
        )
        await db.em.flush()

        return sendMutableImage(request, reply, profileImage.thumbnail)
      } catch (error) {
        console.warn('Failed to generate thumbnail, serving original image', error)
        return sendMutableImage(request, reply, image)
      }
    },
  )

  // Upload or replace user profile image
  app.put<{ Params: { id: string } }>('/api/user/:id/image/profile', async (request, reply) => {
    const user = await checkUserAuthorization(request, reply)
    if (!user) return // Authorization failed

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

    const { profileImage } = user
    // Create new image or update existing one
    if (profileImage) {
      await db.em.populate(profileImage, ['image', 'thumbnail'])
      const { image } = profileImage
      // Update existing image
      image.data = buffer
      image.mimeType = mimeType
      image.filename = filename
      const oldThumbnail = profileImage.thumbnail
      profileImage.thumbnail = await db.image.createImage(
        thumbnailData,
        mimeType,
        filename,
        randomUUID(),
      )
      // The row points at the new thumbnail before the old one goes, since the old one's
      // deletion cascades to whatever still references it.
      await db.em.flush()
      await db.image.removeImages(oldThumbnail)
    } else {
      // Create new image
      const image = await db.image.createImage(buffer, mimeType, filename, randomUUID())
      const thumbnail = await db.image.createImage(thumbnailData, mimeType, filename, randomUUID())
      user.profileImage = db.em.create(ProfileImage, {
        user,
        image,
        thumbnail,
      })
      db.em.persist(user.profileImage)
    }

    await db.em.flush()
    return { success: true, imageId: user.profileImage!.id }
  })

  // Delete user profile image
  app.delete<{ Params: { id: string } }>('/api/user/:id/image/profile', async (request, reply) => {
    const user = await checkUserAuthorization(request, reply)
    if (!user) return // Authorization failed

    if (user.profileImage) {
      const imageToRemove = user.profileImage
      user.profileImage = undefined
      await db.image.removePicture(imageToRemove)
      await db.em.flush()
    }

    return reply.code(204).send()
  })
}
