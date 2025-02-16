import { FastifyInstance } from 'fastify'
import { initORM } from '../../db.js'
import { PermissionDeniedError } from '../common/utils.js'

export async function registerTableRoutes(app: FastifyInstance) {
  const db = await initORM()

  app.post('/:number/claim', async (request, reply) => {
    if (!request.user) {
      throw new PermissionDeniedError('Must be logged in to claim tables')
    }
    const { number } = request.params as { number: string }
    await db.table.claim(+number, request.user)
    await db.em.flush()
    reply.status(204).send()
  })

  app.post('/:number/release', async (request, reply) => {
    if (!request.user) {
      throw new PermissionDeniedError('Must be logged in to claim tables')
    }
    const { number } = request.params as { number: string }
    // Administrator can release any table
    await db.table.release(
      +number,
      request.user.isAdministrator ? undefined : request.user,
    )
    await db.em.flush()
    reply.status(204).send()
  })

  app.post('/:number/assign-to/:userId', async (request, reply) => {
    if (!request.user || !request.user.isAdministrator) {
      throw new PermissionDeniedError(
        'Must be logged as administrator to assign tables',
      )
    }
    const { number, userId } = request.params as {
      number: string
      userId: string
    }
    const user = await db.user.lookup(userId)
    await db.table.claim(+number, user)
    await db.em.flush()
    reply.status(204).send()
  })
}
