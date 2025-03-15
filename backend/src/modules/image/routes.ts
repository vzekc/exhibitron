import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'

export async function registerImageRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.get<{ Params: { id: string } }>('/api/images/:id', async (request, reply) => {
    const { id } = request.params
    const image = await db.image.findOneOrFail({ id: parseInt(id, 10) })

    reply.header('Content-Type', image.mimeType)
    reply.header('Content-Disposition', `inline; filename="${image.filename}"`)
    return image.data
  })
}
