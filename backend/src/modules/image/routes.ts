import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { ImageService } from './service.js'
import { IMAGE_VARIANTS } from './types.js'

export async function registerImageRoutes(app: FastifyInstance) {
  const db = await initORM()
  const imageService = new ImageService(db.em)

  app.get<{ Params: { slug: string; variant?: string } }>(
    '/api/images/:slug/:variant?',
    async (request, reply) => {
      const { slug, variant } = request.params

      const image = await db.image.findOneOrFail({ slug }, { populate: ['data'] })

      if (variant) {
        if (!(variant in IMAGE_VARIANTS)) {
          return reply.code(400).send({ error: 'Invalid variant' })
        }
        const variantImage = await imageService.ensureVariant(
          image,
          variant as keyof typeof IMAGE_VARIANTS,
        )

        // Set the correct MIME type based on the variant
        const mimeType =
          IMAGE_VARIANTS[variant as keyof typeof IMAGE_VARIANTS].format === 'gif'
            ? 'image/gif'
            : 'image/jpeg'

        reply.header('Content-Type', mimeType)
        reply.header('Content-Disposition', `inline; filename="${image.filename}"`)
        return variantImage.data
      }

      reply.header('Content-Type', image.mimeType)
      reply.header('Content-Disposition', `inline; filename="${image.filename}"`)
      return image.data
    },
  )
}
