import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'

export async function registerImageRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.get<{ Params: { slug: string } }>('/api/images/:slug', async (request, reply) => {
    const { slug } = request.params

    const image = await db.image.findOneOrFail({ slug }, { populate: ['data'] })

    reply.header('Content-Type', image.mimeType)
    reply.header('Content-Disposition', `inline; filename="${image.filename}"`)
    return image.data
  })
}
